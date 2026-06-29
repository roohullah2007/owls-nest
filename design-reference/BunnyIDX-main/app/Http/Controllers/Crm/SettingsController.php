<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\EmailAccount;
use App\Models\EmailSendLog;
use App\Models\LeadImport;
use App\Models\PhoneNumber;
use App\Models\Plan;
use App\Models\User;
use App\Rules\NotDisposableEmail;
use App\Rules\NotReservedName;
use App\Services\Billing\CreditService;
use App\Services\Email\BrandedEmailResolver;
use App\Services\Email\ResendClient;
use App\Services\Email\SenderAliasService;
use App\Services\PropertyAlerts\PropertyAlertFrequency;
use App\Services\PropertyAlerts\PropertyAlertQuota;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function modules(Request $request, string $module): Response
    {
        return $this->index($request, 'modules', $module);
    }

    public function index(Request $request, ?string $tab = null, ?string $module = null): Response
    {
        $user = $request->user();

        $settings = $user->settings ?? [];

        $aliases = app(SenderAliasService::class);

        return Inertia::render('Crm/Settings/Index', [
            'initialTab' => $tab,
            'initialModule' => $module,
            'moduleFields' => [
                'contact' => $settings['custom_fields'] ?? [],
                'deal' => $settings['custom_fields_deals'] ?? [],
                'listing' => $settings['custom_fields_listings'] ?? [],
            ],
            'listingTaxonomy' => [
                'types' => $user->getListingTypes(),
                'statuses' => $user->getListingStatuses(),
                'default_types' => User::DEFAULT_LISTING_TYPES,
                'default_statuses' => User::DEFAULT_LISTING_STATUSES,
            ],
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'notificationPreferences' => $user->notification_preferences ?? [
                'email_new_contact' => false,
                'email_deal_created' => false,
                'email_task_assigned' => false,
                'email_team_mention' => false,
                'email_reminders' => true,
            ],
            // Property-alert settings + read-only monthly usage/overage. Free
            // plans see an "upgrade required" state in the UI (paid === false).
            'propertyAlerts' => [
                'frequency' => PropertyAlertFrequency::forUser($user),
                'default_frequency' => config('property_alerts.default_frequency'),
                'paid' => $user->isPro(),
                'usage' => app(PropertyAlertQuota::class)->summary($user),
            ],
            'subscription' => [
                'tier' => $user->subscription_tier ?? 'free',
                'effective_tier' => $user->effectivePlanKey(),
                'is_lifetime' => $user->isLifetime(),
                'trialing' => $user->isTrialing(),
                'trial_plan' => $user->trial_plan,
                'trial_ends_at' => $user->trial_ends_at?->toISOString(),
                'trial_days_remaining' => $user->trialDaysRemaining(),
                'trial_used' => (bool) $user->trial_used,
                'stripe_configured' => ! empty(config('services.stripe.secret')),
                // Only users who actually went through Stripe checkout have a
                // customer record — admin-granted / lifetime / trial Pro users
                // do not, so they have no billing portal to manage.
                'has_billing_account' => ! empty($user->stripe_customer_id),
            ],
            'plans' => Plan::active()->ordered()->get([
                'key', 'name', 'description', 'monthly_price', 'is_paid', 'trial_days', 'features',
            ]),
            'featureCatalog' => Plan::featureCatalog(),
            'phoneNumbers' => PhoneNumber::where('user_id', $user->id)
                ->where('status', '!=', 'released')
                ->orderByDesc('is_default')
                ->orderBy('created_at')
                ->get(),
            'telnyxConfigured' => ! empty(config('telnyx.api_key')),
            // Phone-credit balance + buyable top-up packages (Phase 2 billing).
            'creditBalanceCents' => app(CreditService::class)->balanceCents($user),
            'creditPackages' => collect(config('billing.packages', []))
                ->map(fn ($p, $key) => [
                    'key' => $key,
                    'label' => $p['label'],
                    'price_cents' => $p['price_cents'],
                    'credit_cents' => $p['credit_cents'],
                ])->values(),
            'stripeConfigured' => ! empty(config('services.stripe.secret')),
            // Branded-email (Resend) status. The key itself is never exposed —
            // only a masked "ending in" hint and the last test result.
            'resendStatus' => [
                'configured' => $user->hasBrandedResendKey(),
                'last_four' => $user->resend_last_four,
                'from_email' => $user->resend_from_email,
                'from_name' => $user->resend_from_name,
                'test_status' => $user->resend_test_status,
                'last_tested_at' => $user->resend_last_tested_at?->toISOString(),
                'platform_from' => config('mail.from.address'),
                'platform_configured' => ! empty(config('services.resend.key')),
            ],
            // Per-user platform sending alias ({alias}.updates@{domain}). Used
            // for non-branded transactional + property-alert sends; blank → the
            // default platform sender is used.
            'senderAlias' => [
                'alias' => $user->sender_alias,
                'email' => $aliases->emailFor($user),
                'display_name' => $user->sender_alias_display_name,
                'default_sender' => $aliases->defaultSender(),
                'default_name' => $aliases->defaultDisplayName(),
                'domain' => $aliases->domain(),
                'suggested' => $aliases->generateFor($user),
            ],
            'emailAccounts' => EmailAccount::where('user_id', $user->id)
                ->orderByDesc('is_default')
                ->orderBy('email_address')
                ->get(),
            // Fall back to services.google so admin-saved OAuth creds (which
            // populate config('services.google.*') at boot) are detected too.
            'googleConfigured' => ! empty(config('google.client_id') ?: config('services.google.client_id')),
            'leadImports' => LeadImport::forUser($user)
                ->orderByDesc('created_at')
                ->limit(25)
                ->get(['id', 'original_filename', 'row_count', 'imported_count', 'skipped_count', 'status', 'error', 'created_at', 'completed_at']),
            // MLS Connections tab (moved here from the old /crm/idx page).
            // Loaded on every settings view because tab switches are
            // client-side only (history.replaceState, no Inertia visit).
            'idxConnections' => IdxController::getUserConnections($user),
            'availableMlses' => IdxController::getAvailableMlses(),
            'mlsRequests' => IdxController::getUserMlsRequests($user),
        ]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name' => ['nullable', 'string', 'max:120', new NotReservedName],
            'last_name' => ['nullable', 'string', 'max:120', new NotReservedName],
            'name' => ['nullable', 'string', 'max:255', new NotReservedName],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id), new NotDisposableEmail],
            'mobile' => 'nullable|string|max:30',
            'phone' => 'nullable|string|max:30',
            'company' => 'nullable|string|max:255',
            'nickname' => 'nullable|string|max:120',
            'city' => 'nullable|string|max:120',
            'state' => 'nullable|string|max:120',
            'country' => 'nullable|in:US,CA',
            'time_format' => 'nullable|in:12h,24h',
            'date_format' => 'nullable|in:MM/DD/YYYY,DD/MM/YYYY,YYYY-MM-DD',
            'timezone' => 'nullable|string|max:64',
            'email_signature' => 'nullable|string|max:20000',
        ]);

        // Build name from first/last if provided, else fall back to incoming name.
        $name = trim(($validated['first_name'] ?? '').' '.($validated['last_name'] ?? ''));
        if ($name === '') {
            $name = $validated['name'] ?? $user->name;
        }

        $emailChanged = $validated['email'] !== $user->email;

        $userCols = [
            'name' => $name,
            'email' => $validated['email'],
            'phone' => $validated['mobile'] ?? $validated['phone'] ?? $user->phone,
        ];

        if ($emailChanged && $user instanceof MustVerifyEmail) {
            $userCols['email_verified_at'] = null;
        }

        $settings = $user->settings ?? [];
        foreach (['first_name', 'last_name', 'nickname', 'city', 'state', 'country', 'time_format', 'date_format', 'timezone', 'email_signature'] as $k) {
            if (array_key_exists($k, $validated)) {
                $settings[$k] = $validated[$k];
            }
        }

        $user->forceFill(array_merge($userCols, ['settings' => $settings]))->save();

        return back()->with('success', 'Profile updated.');
    }

    /**
     * Events the UI exposes. Adding a new one here is enough — validation and
     * the UI both iterate this list.
     */
    public const NOTIFICATION_EVENTS = [
        'new_contact',
        'contact_assigned',
        'deal_created',
        'deal_won',
        'deal_lost',
        'deal_stage_changed',
        'task_assigned',
        'task_due_soon',
        'task_overdue',
        'team_mention',
        'missed_call',
        'daily_digest',
        'weekly_digest',
        // Legacy alias kept so old notification classes that read
        // `email_reminders` continue to work.
        'reminders',
    ];

    public const NOTIFICATION_CHANNELS = ['email', 'in_app'];

    public function updateNotificationPreferences(Request $request): RedirectResponse
    {
        $rules = [
            'quiet_hours_enabled' => 'nullable|boolean',
            'quiet_hours_start' => 'nullable|date_format:H:i',
            'quiet_hours_end' => 'nullable|date_format:H:i',
            // Property-alert cadence. Only property alerts honour this setting.
            'property_alert_frequency' => 'nullable|in:'.implode(',', array_keys(config('property_alerts.frequencies'))),
        ];

        foreach (self::NOTIFICATION_EVENTS as $event) {
            foreach (self::NOTIFICATION_CHANNELS as $channel) {
                $rules["{$channel}_{$event}"] = 'nullable|boolean';
            }
        }

        $validated = $request->validate($rules);

        $prefs = $request->user()->notification_preferences ?? [];

        $stringKeys = ['quiet_hours_start', 'quiet_hours_end', 'property_alert_frequency'];
        foreach ($validated as $key => $value) {
            if ($key === 'property_alert_frequency' && $value === null) {
                continue; // absent in payload → leave the existing cadence intact
            }
            // String settings pass through; everything else is a boolean toggle.
            $prefs[$key] = in_array($key, $stringKeys, true) ? $value : (bool) $value;
        }

        $request->user()->update(['notification_preferences' => $prefs]);

        return back()->with('success', 'Notification preferences updated.');
    }

    /**
     * Upload (or replace) the user's avatar. Stored under storage/app/public/avatars
     * and served via the /storage symlink.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,gif,webp|max:4096',
        ]);

        $user = $request->user();

        // Remove the previous avatar if we own it (skip if it's a remote URL,
        // e.g. one set by the Google login flow).
        if ($user->avatar && ! str_starts_with($user->avatar, 'http')) {
            $oldPath = ltrim(str_replace('/storage/', '', $user->avatar), '/');
            Storage::disk('public')->delete($oldPath);
        }

        $path = $request->file('avatar')->store("avatars/{$user->id}", 'public');
        $user->forceFill(['avatar' => Storage::url($path)])->save();

        return response()->json(['avatar' => $user->avatar]);
    }

    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->avatar && ! str_starts_with($user->avatar, 'http')) {
            $oldPath = ltrim(str_replace('/storage/', '', $user->avatar), '/');
            Storage::disk('public')->delete($oldPath);
        }
        $user->forceFill(['avatar' => null])->save();

        return response()->json(['avatar' => null]);
    }

    /**
     * Persist per-user email preferences (sending defaults + auto-reply) into
     * the user.settings JSON column.
     */
    public function updateEmailSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_from_name' => 'nullable|string|max:120',
            'bcc_self' => 'boolean',
            'track_opens' => 'boolean',
            'track_clicks' => 'boolean',
            'auto_reply_enabled' => 'boolean',
            'auto_reply_subject' => 'nullable|string|max:200',
            'auto_reply_message' => 'nullable|string|max:5000',
            'auto_reply_start_at' => 'nullable|date',
            'auto_reply_end_at' => 'nullable|date|after_or_equal:auto_reply_start_at',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];

        $settings['email'] = [
            'default_from_name' => $validated['default_from_name'] ?? null,
            'bcc_self' => (bool) ($validated['bcc_self'] ?? false),
            'track_opens' => (bool) ($validated['track_opens'] ?? false),
            'track_clicks' => (bool) ($validated['track_clicks'] ?? false),
            'auto_reply' => [
                'enabled' => (bool) ($validated['auto_reply_enabled'] ?? false),
                'subject' => $validated['auto_reply_subject'] ?? null,
                'message' => $validated['auto_reply_message'] ?? null,
                'start_at' => $validated['auto_reply_start_at'] ?? null,
                'end_at' => $validated['auto_reply_end_at'] ?? null,
            ],
        ];

        $user->forceFill(['settings' => $settings])->save();

        return back()->with('success', 'Email settings updated.');
    }

    /**
     * Save (or replace) the user's own Resend API key for branded notification
     * emails. The key is stored encrypted (model cast) and never read back to
     * the client — only its last four chars are kept for a status hint. Saving
     * is via forceFill so the secret can't be set through normal mass-assignment.
     */
    public function updateResendKey(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'resend_api_key' => 'required|string|min:10|max:255',
            'resend_from_email' => 'nullable|email|max:255',
            'resend_from_name' => 'nullable|string|max:120',
        ]);

        $key = trim($validated['resend_api_key']);

        $request->user()->forceFill([
            'resend_api_key' => $key,
            'resend_last_four' => substr($key, -4),
            'resend_from_email' => $validated['resend_from_email'] ?? null,
            'resend_from_name' => $validated['resend_from_name'] ?? null,
            'resend_test_status' => 'untested',
            'resend_last_tested_at' => null,
        ])->save();

        return back()->with('success', 'Resend key saved. Send a test email to verify it.');
    }

    /**
     * Validate the stored key by sending a real test email to the user's own
     * address through Resend. Records pass/fail; never logs the key.
     */
    public function testResend(Request $request, BrandedEmailResolver $resolver, ResendClient $client): RedirectResponse
    {
        $user = $request->user();

        if (! $user->hasBrandedResendKey()) {
            return back()->with('error', 'Add and save a Resend API key first.');
        }

        $resolved = $resolver->for($user);
        $appName = config('app.name', 'BunnyIDX');
        $html = '<p style="font-family:sans-serif">This is a test email confirming your Resend API key is working for '
            .e($appName).'. Branded notification emails will be sent from <strong>'.e($resolved['from_email']).'</strong>.</p>';

        try {
            $messageId = $client->send(
                $resolved['key'],
                $resolved['from_email'],
                $resolved['from_name'],
                $user->email,
                "Test email from {$appName}",
                $html,
            );

            $user->forceFill(['resend_test_status' => 'passed', 'resend_last_tested_at' => now()])->save();

            EmailSendLog::create([
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'provider' => 'resend',
                'template_type' => 'test',
                'recipient' => $user->email,
                'sender' => $resolved['from_email'],
                'subject' => "Test email from {$appName}",
                'status' => EmailSendLog::STATUS_SENT,
                'provider_message_id' => $messageId,
                'branded' => true,
                'quota_category' => 'test',
                'counts_toward_quota' => false,
                'sent_at' => now(),
            ]);

            return back()->with('success', "Test email sent to {$user->email}.");
        } catch (\Throwable $e) {
            $user->forceFill(['resend_test_status' => 'failed', 'resend_last_tested_at' => now()])->save();

            return back()->with('error', 'Test failed: '.$e->getMessage());
        }
    }

    /**
     * Save the user's optional platform sending alias ({alias}.updates@{domain})
     * and display name. The username is sanitised (lowercase, [a-z0-9.] only)
     * and must be unique across accounts; blank clears it back to the default
     * platform sender. Alias only ever produces an address on the verified
     * platform domain — it can't be used to spoof another domain.
     */
    public function updateSenderAlias(Request $request, SenderAliasService $aliases): RedirectResponse
    {
        $validated = $request->validate([
            'sender_alias' => 'nullable|string|max:64',
            'sender_alias_display_name' => 'nullable|string|max:120',
        ]);

        $user = $request->user();
        $raw = $validated['sender_alias'] ?? null;

        $alias = null;
        if ($raw !== null && trim($raw) !== '') {
            $alias = $aliases->sanitize($raw);

            if ($alias === null) {
                return back()->withErrors(['sender_alias' => 'That alias has no usable characters. Use letters, numbers, and dots.']);
            }

            $taken = User::where('sender_alias', $alias)->where('id', '!=', $user->id)->exists();
            if ($taken) {
                return back()->withErrors(['sender_alias' => 'That sending alias is already taken. Try another.']);
            }
        }

        $user->forceFill([
            'sender_alias' => $alias,
            'sender_alias_display_name' => $validated['sender_alias_display_name'] ?? null,
        ])->save();

        return back()->with('success', $alias
            ? 'Sending alias updated.'
            : 'Sending alias cleared — emails will use the default platform sender.');
    }

    public function removeResendKey(Request $request): RedirectResponse
    {
        $request->user()->forceFill([
            'resend_api_key' => null,
            'resend_last_four' => null,
            'resend_from_email' => null,
            'resend_from_name' => null,
            'resend_test_status' => null,
            'resend_last_tested_at' => null,
        ])->save();

        return back()->with('success', 'Resend key removed. Branded emails will use the platform sender.');
    }
}
