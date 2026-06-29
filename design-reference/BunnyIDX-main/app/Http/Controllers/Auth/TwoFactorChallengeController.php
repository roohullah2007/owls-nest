<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\LoginActivity;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorChallengeController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('login.id')) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/TwoFactorChallenge');
    }

    /**
     * Abandon a pending 2FA challenge and return to the login screen. The user
     * isn't signed in yet — this just clears the stashed pending login so the
     * back-to-login button doesn't leave a dangling challenge in the session.
     */
    public function cancel(Request $request): RedirectResponse
    {
        $request->session()->forget(['login.id', 'login.remember']);

        return redirect()->route('login');
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = $request->session()->get('login.id');
        if (! $userId) {
            return redirect()->route('login');
        }

        $request->validate([
            'code' => 'nullable|string|max:11',
            'recovery_code' => 'nullable|string|max:11',
        ]);

        $code = $request->input('code');
        $recovery = $request->input('recovery_code');

        if (! $code && ! $recovery) {
            throw ValidationException::withMessages([
                'code' => 'Enter the 6-digit code or a recovery code.',
            ]);
        }

        /** @var User|null $user */
        $user = User::find($userId);
        if (! $user) {
            $request->session()->forget(['login.id', 'login.remember']);
            return redirect()->route('login');
        }

        // Account locked from too many wrong codes (or failed logins) — reject
        // until the lock expires.
        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'code' => $this->lockMessage($user),
            ]);
        }

        $verified = false;

        if ($code) {
            $google2fa = new Google2FA();
            $verified = $google2fa->verifyKey($user->two_factor_secret, $code);
        } elseif ($recovery) {
            $recoveryCodes = $user->two_factor_recovery_codes ?? [];
            if (in_array($recovery, $recoveryCodes, true)) {
                $verified = true;
                // Burn the used recovery code
                $user->forceFill([
                    'two_factor_recovery_codes' => array_values(array_diff($recoveryCodes, [$recovery])),
                ])->save();
            }
        }

        if (! $verified) {
            LoginActivity::create([
                'user_id' => $user->id,
                'event' => LoginActivity::EVENT_TWO_FACTOR_FAILED,
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'occurred_at' => now(),
            ]);

            // Count the failure and lock the account on the Nth wrong code.
            $user->registerFailedTwoFactor();

            throw ValidationException::withMessages([
                'code' => $user->isLocked()
                    ? $this->lockMessage($user)
                    : 'That code is invalid. Try the most recent one shown by your app.',
            ]);
        }

        // Success — clear any failed-attempt counters / lock.
        $user->clearAuthLock();

        $remember = (bool) $request->session()->pull('login.remember', false);
        $request->session()->forget('login.id');

        Auth::login($user, $remember);
        $request->session()->regenerate();

        return redirect()->intended(route('crm.dashboard', absolute: false));
    }

    /** Human-readable "account locked for N minutes" message. */
    private function lockMessage(User $user): string
    {
        $minutes = max(1, (int) ceil($user->lockSecondsRemaining() / 60));

        return "Too many incorrect codes. This account is locked for {$minutes} minute(s) — please try again later.";
    }
}
