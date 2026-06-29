<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request)
    {
        $googleUser = Socialite::driver('google')->user();

        $user = User::firstOrNew(['email' => $googleUser->getEmail()]);

        if (! $user->exists) {
            // Brand-new OAuth account. Give it a random password (they sign in via
            // Google) and a sensible default country so downstream onboarding/MLS
            // isn't a silent US guess — the user can change it in settings.
            $user->name = $googleUser->getName();
            $user->avatar = $googleUser->getAvatar();
            $user->password = bcrypt(Str::random(40));
            $user->settings = array_merge($user->settings ?? [], ['country' => 'US']);
        }

        // Always keep the Google linkage current, but never overwrite an existing
        // account's name or password — otherwise a user who set a password and
        // later "Sign in with Google" would have it silently reset every login.
        $user->google_id = $googleUser->getId();
        $user->save();

        // Google has already confirmed ownership of the email, so OAuth users
        // skip our email-verification step. email_verified_at is not mass
        // assignable (guarded), so set it explicitly via markEmailAsVerified().
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        // Enforce 2FA for OAuth logins too. If enabled, don't sign in yet —
        // stash the pending login and send the user through the same
        // two-factor challenge screen the password flow uses.
        if ($user->hasTwoFactorEnabled()) {
            $request->session()->put('login.id', $user->getAuthIdentifier());
            $request->session()->put('login.remember', true);

            return redirect()->route('two-factor.challenge');
        }

        Auth::login($user, remember: true);

        return redirect()->intended(route('crm.dashboard'));
    }
}
