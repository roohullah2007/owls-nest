<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Jobs\SyncGmailMessages;
use App\Models\EmailAccount;
use Google\Client as GoogleClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailAccountController extends Controller
{
    public function redirectToGoogle(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (!$user->hasFeature('email')) {
            return back()->with('error', 'Upgrade your plan to connect your email account.');
        }

        $client = new GoogleClient();
        $client->setClientId(config('google.client_id'));
        $client->setClientSecret(config('google.client_secret'));
        $client->setRedirectUri(url(config('google.gmail_redirect')));
        $client->setScopes(config('google.gmail_scopes'));
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setState(csrf_token());

        return redirect()->away($client->createAuthUrl());
    }

    public function handleGoogleCallback(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($request->has('error')) {
            return redirect()->route('crm.settings')
                ->with('error', 'Gmail authorization was cancelled.');
        }

        $code = $request->get('code');
        if (!$code) {
            return redirect()->route('crm.settings')
                ->with('error', 'Invalid authorization response.');
        }

        try {
            $client = new GoogleClient();
            $client->setClientId(config('google.client_id'));
            $client->setClientSecret(config('google.client_secret'));
            $client->setRedirectUri(url(config('google.gmail_redirect')));

            $token = $client->fetchAccessTokenWithAuthCode($code);

            if (isset($token['error'])) {
                return redirect()->route('crm.settings')
                    ->with('error', 'Failed to authenticate with Google: '.$token['error_description'] ?? $token['error']);
            }

            $client->setAccessToken($token);

            // Get the user's email address from Gmail profile
            $gmail = new \Google\Service\Gmail($client);
            $profile = $gmail->users->getProfile('me');
            $emailAddress = $profile->getEmailAddress();

            // Create or update the email account
            $account = EmailAccount::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'email_address' => $emailAddress,
                ],
                [
                    'team_id' => $user->team_id,
                    'provider' => 'google',
                    'provider_account_id' => $emailAddress,
                    'access_token' => $token['access_token'],
                    'refresh_token' => $token['refresh_token'] ?? null,
                    'token_expires_at' => now()->addSeconds($token['expires_in'] ?? 3600),
                    'sync_state' => 'pending',
                    'is_active' => true,
                ]
            );

            // Set as default if it's the only account
            if (EmailAccount::where('user_id', $user->id)->active()->count() === 1) {
                $account->update(['is_default' => true]);
            }

            // Dispatch initial sync
            SyncGmailMessages::dispatch($user->id, $emailAddress);

            return redirect()->route('crm.settings')
                ->with('success', "Gmail account ({$emailAddress}) connected. Syncing your emails...");
        } catch (\Exception $e) {
            return redirect()->route('crm.settings')
                ->with('error', 'Failed to connect Gmail account: '.$e->getMessage());
        }
    }

    public function index(Request $request): JsonResponse
    {
        $accounts = EmailAccount::where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->orderBy('email_address')
            ->get();

        return response()->json($accounts);
    }

    public function disconnect(Request $request, EmailAccount $emailAccount): RedirectResponse
    {
        if ($emailAccount->user_id !== $request->user()->id) {
            abort(403);
        }

        // Try to revoke the token
        try {
            $client = new GoogleClient();
            $client->revokeToken($emailAccount->access_token);
        } catch (\Exception) {
            // Token may already be invalid, that's fine
        }

        $emailAccount->delete();

        return back()->with('success', 'Email account disconnected.');
    }

    public function setDefault(Request $request, EmailAccount $emailAccount): RedirectResponse
    {
        if ($emailAccount->user_id !== $request->user()->id) {
            abort(403);
        }

        // Unset other defaults
        EmailAccount::where('user_id', $request->user()->id)
            ->where('id', '!=', $emailAccount->id)
            ->update(['is_default' => false]);

        $emailAccount->update(['is_default' => true]);

        return back()->with('success', 'Default email account updated.');
    }

    public function triggerSync(Request $request, EmailAccount $emailAccount): RedirectResponse
    {
        if ($emailAccount->user_id !== $request->user()->id) {
            abort(403);
        }

        SyncGmailMessages::dispatch($request->user()->id, $emailAccount->email_address);

        return back()->with('info', 'Email sync started.');
    }
}
