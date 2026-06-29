<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\EmailAccount;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

/**
 * Manages identity providers + linked external accounts from the Profile >
 * Connected Accounts pane. Distinct from /auth/google/* which is used for
 * first-time sign-in; here we only LINK or UNLINK against the already
 * authenticated user.
 */
class ConnectedAccountsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $emailAccounts = EmailAccount::where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderBy('email_address')
            ->get(['id', 'provider', 'email_address', 'is_default', 'is_active', 'last_synced_at']);

        return response()->json([
            'is_admin' => $user->isAdmin(),
            'sso' => [
                [
                    'provider' => 'google',
                    'label' => 'Google',
                    'connected' => ! is_null($user->google_id),
                    'configured' => ! empty(config('services.google.client_id')),
                    'identifier' => $user->google_id ? $user->email : null,
                ],
                [
                    'provider' => 'microsoft',
                    'label' => 'Microsoft',
                    'connected' => false,
                    'configured' => ! empty(config('services.microsoft.client_id')),
                    'identifier' => null,
                ],
            ],
            'email_accounts' => $emailAccounts,
        ]);
    }

    /**
     * Return the current OAuth credentials for a provider so an admin can
     * edit them. Secrets are masked — the client just gets "configured/not"
     * for the secret and the actual client_id which is publicly safe.
     */
    public function oauthConfig(Request $request, string $provider): JsonResponse
    {
        $this->assertAdmin($request);
        $this->assertSupportedProvider($provider);

        // Google has a real link callback; Microsoft connect isn't wired yet,
        // so fall back to a sensible placeholder path the admin can copy.
        $redirectUri = $provider === 'google'
            ? route('crm.accounts.google.link.callback', absolute: true)
            : url("/auth/{$provider}/callback");

        return response()->json([
            'provider' => $provider,
            'client_id' => SystemSetting::get("{$provider}_client_id", config("services.{$provider}.client_id") ?? ''),
            'has_client_secret' => ! empty(SystemSetting::get("{$provider}_client_secret") ?: config("services.{$provider}.client_secret")),
            'redirect_uri' => $redirectUri,
        ]);
    }

    public function updateOauthConfig(Request $request, string $provider): JsonResponse
    {
        $this->assertAdmin($request);
        $this->assertSupportedProvider($provider);

        $validated = $request->validate([
            'client_id' => 'required|string|max:500',
            'client_secret' => 'nullable|string|max:500',
        ]);

        SystemSetting::set("{$provider}_client_id", $validated['client_id'] ?: null);

        // Only overwrite the secret if a new one was provided — leaves the
        // stored secret in place when admin re-saves just the client_id.
        if (! empty($validated['client_secret'])) {
            SystemSetting::set("{$provider}_client_secret", $validated['client_secret'], encrypt: true);
        }

        // Apply immediately so this same request's response sees the new value
        // without waiting for the next boot.
        config([
            "services.{$provider}.client_id" => $validated['client_id'],
        ]);
        if (! empty($validated['client_secret'])) {
            config(["services.{$provider}.client_secret" => $validated['client_secret']]);
        }

        return response()->json(['ok' => true]);
    }

    private function assertAdmin(Request $request): void
    {
        abort_unless($request->user() && $request->user()->isAdmin(), 403, 'Admin role required.');
    }

    private function assertSupportedProvider(string $provider): void
    {
        abort_unless(in_array($provider, ['google', 'microsoft'], true), 404, 'Unknown provider.');
    }

    public function linkGoogleRedirect(Request $request): RedirectResponse
    {
        // Stash a marker so the callback knows this is a LINK flow, not a
        // sign-in attempt that should create or replace a user.
        $request->session()->put('google.link_user_id', $request->user()->id);

        return Socialite::driver('google')
            ->redirectUrl(route('crm.accounts.google.link.callback'))
            ->redirect();
    }

    public function linkGoogleCallback(Request $request): RedirectResponse
    {
        $linkUserId = $request->session()->pull('google.link_user_id');
        $user = $request->user();
        if (! $linkUserId || ! $user || $linkUserId !== $user->id) {
            return redirect()
                ->route('crm.settings.tab', 'profile')
                ->with('error', 'Connection request expired. Please try again.');
        }

        try {
            $googleUser = Socialite::driver('google')
                ->redirectUrl(route('crm.accounts.google.link.callback'))
                ->user();
        } catch (\Throwable $e) {
            return redirect()
                ->route('crm.settings.tab', 'profile')
                ->with('error', 'Could not link Google account: ' . $e->getMessage());
        }

        $request->user()->forceFill([
            'google_id' => $googleUser->getId(),
            // Pick up the avatar if we don't have one yet.
            'avatar' => $request->user()->avatar ?: $googleUser->getAvatar(),
        ])->save();

        return redirect()
            ->route('crm.settings.tab', 'profile')
            ->with('success', 'Google account linked.');
    }

    public function disconnectGoogle(Request $request): JsonResponse
    {
        $request->user()->forceFill(['google_id' => null])->save();

        return response()->json(['ok' => true]);
    }
}
