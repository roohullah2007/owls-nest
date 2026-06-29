<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * Returns true when the user is fully signed in. Returns false when the
     * credentials are valid but the user has 2FA enabled — the caller must
     * then redirect them to the 2FA challenge.
     *
     * @throws ValidationException
     */
    public function authenticate(): bool
    {
        $this->ensureIsNotRateLimited();

        $credentials = $this->only('email', 'password');

        // Resolve the account up front so we can apply the per-account lockout
        // (this survives IP changes, unlike the IP throttle above).
        $user = User::where('email', (string) $this->string('email'))->first();

        if ($user?->isLocked()) {
            throw ValidationException::withMessages([
                'email' => $this->lockMessage($user),
            ]);
        }

        // Look up the user without logging them in, so we can branch on 2FA.
        // Auth::validate() doesn't fire the Failed event the way Auth::attempt
        // does, so we dispatch it ourselves to keep the access-history listener
        // recording bad-credential attempts.
        if (! Auth::validate($credentials)) {
            Event::dispatch(new Failed('web', $user, $credentials));
            RateLimiter::hit($this->throttleKey());

            // Count the failure against the account and lock it on the Nth miss.
            $user?->registerFailedLogin();

            throw ValidationException::withMessages([
                'email' => $user?->isLocked()
                    ? $this->lockMessage($user)
                    : trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        // Valid password — clear any prior failed attempts / lock.
        $user?->clearAuthLock();

        // If 2FA is enabled, stash a challenge in the session and ask the
        // caller to redirect to the challenge screen instead of logging in.
        if ($user && method_exists($user, 'hasTwoFactorEnabled') && $user->hasTwoFactorEnabled()) {
            $this->session()->put('login.id', $user->getAuthIdentifier());
            $this->session()->put('login.remember', $this->boolean('remember'));
            return false;
        }

        Auth::login($user, $this->boolean('remember'));
        return true;
    }

    /** Human-readable "account locked for N minutes" message. */
    private function lockMessage(User $user): string
    {
        $minutes = max(1, (int) ceil($user->lockSecondsRemaining() / 60));

        return "Too many failed attempts. This account is locked for {$minutes} minute(s) — please try again later.";
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
