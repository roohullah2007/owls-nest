<?php

namespace App\Http\Middleware;

use App\Models\DialerSession;
use App\Models\EmailAccount;
use App\Models\MlsConnectionRequest;
use App\Models\PhoneNumber;
use App\Models\Plan;
use App\Models\TeamInvitation;
use App\Models\TeamMember;
use App\Models\TelnyxBrand;
use App\Models\TelnyxCampaign;
use App\Models\User;
use App\Services\Billing\CreditService;
use App\Services\Email\EmailQuota;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $teamMember = null;

        if ($user?->team_id) {
            $teamMember = TeamMember::where('team_id', $user->team_id)
                ->where('user_id', $user->id)
                ->first();
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'team' => $user?->team_id ? $user->team?->load('members.user:id,name,email') : null,
                'teamMember' => $teamMember ? [
                    'id' => $teamMember->id,
                    'role' => $teamMember->role,
                    'permissions' => $teamMember->team ? $teamMember->team->getPermissionsForRole($teamMember->role) : TeamMember::DEFAULT_PERMISSIONS,
                    'is_active' => $teamMember->is_active,
                ] : null,
                'active_context' => $user?->active_context ?? 'personal',
                'is_admin' => $user?->isAdmin() ?? false,
                // Effective subscription + resolved feature map (override/trial/lifetime aware).
                'subscription' => $user ? [
                    'tier' => $user->subscription_tier ?? 'free',
                    'effective_tier' => $user->effectivePlanKey(),
                    'is_lifetime' => $user->isLifetime(),
                    'trialing' => $user->isTrialing(),
                    'trial_plan' => $user->trial_plan,
                    'trial_ends_at' => $user->trial_ends_at?->toISOString(),
                    'trial_days_remaining' => $user->trialDaysRemaining(),
                ] : null,
                'features' => $user
                    ? collect(Plan::featureCatalog())->keys()
                        ->mapWithKeys(fn ($key) => [$key => $user->hasFeature($key)])
                        ->all()
                    : [],
            ],
            'unreadNotifications' => fn () => $request->user()?->unreadNotifications()->count() ?? 0,
            'hasPhoneNumber' => fn () => $user ? PhoneNumber::where('user_id', $user->id)->active()->exists() : false,
            'hasEmailAccount' => fn () => $user ? EmailAccount::where('user_id', $user->id)->active()->exists() : false,
            'phoneNumber' => fn () => $user
                ? PhoneNumber::where('user_id', $user->id)
                    ->active()
                    ->orderByDesc('is_default')
                    ->first(['id', 'phone_number', 'friendly_name', 'status'])
                : null,
            'tenDlcStatus' => fn () => $user ? $this->resolveTenDlcStatus($user->id) : 'not_started',
            'adminMlsRequestsPending' => fn () => ($user?->isAdmin() ?? false)
                ? MlsConnectionRequest::whereIn('status', [
                    MlsConnectionRequest::STATUS_PENDING,
                    MlsConnectionRequest::STATUS_IN_PROCESS,
                    MlsConnectionRequest::STATUS_COMPLETED,
                ])->count()
                : 0,
            'activeDialerSession' => fn () => $user
                ? DialerSession::query()
                    ->where('user_id', $user->id)
                    ->whereIn('status', [DialerSession::STATUS_ACTIVE, DialerSession::STATUS_PAUSED])
                    ->latest()
                    ->first(['id', 'name', 'status', 'total_contacts', 'current_position'])
                : null,
            // Credit balance + plan limits/usage for the billing owner. Lazy so
            // it only runs when a page actually reads it.
            'billing' => fn () => $user ? $this->resolveBilling($user) : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
        ];
    }

    /**
     * Credit balance + plan limits and current usage for the billing owner.
     * Numbers/seats are counted team-wide on a team, personal otherwise.
     *
     * @return array<string, mixed>
     */
    private function resolveBilling(User $user): array
    {
        $plan = $user->billingOwner()->effectivePlan();
        $credits = app(CreditService::class);
        $emailQuota = app(EmailQuota::class);

        $numbersQuery = PhoneNumber::query()->active();
        if ($user->team_id) {
            $numbersQuery->where('team_id', $user->team_id);
        } else {
            $numbersQuery->where('user_id', $user->id)->whereNull('team_id');
        }

        $seatsUsed = null;
        $seatLimit = null;
        if ($user->team_id) {
            $seatsUsed = TeamMember::where('team_id', $user->team_id)->where('is_active', true)->count()
                + TeamInvitation::where('team_id', $user->team_id)
                    ->whereNull('accepted_at')
                    ->where('expires_at', '>', now())
                    ->count();
            $seatLimit = (int) ($plan->included_seats ?? 1) + (int) ($user->team?->purchased_seats ?? 0);
        }

        return [
            'credit_balance_cents' => $credits->balanceCents($user),
            'plan_key' => $plan?->key,
            'limits' => [
                'phone_numbers' => $plan?->phone_number_limit,
                'websites' => $plan?->website_limit,
                'email_monthly' => $plan?->email_quota_monthly,
                'seats' => $seatLimit,
            ],
            'usage' => [
                'phone_numbers' => $numbersQuery->count(),
                'emails_this_month' => $emailQuota->usedThisMonth($user),
                'seats' => $seatsUsed,
            ],
            // Seat-management detail for the team owner UI (null when not on a team).
            'seats' => $user->team_id ? [
                'included' => (int) ($plan?->included_seats ?? 1),
                'purchased' => (int) ($user->team?->purchased_seats ?? 0),
                'used' => $seatsUsed,
                'limit' => $seatLimit,
                'extra_seat_price_cents' => (int) ($plan?->extra_seat_price_cents ?? 0),
            ] : null,
        ];
    }

    /**
     * Returns one of: 'approved', 'pending', 'not_started'.
     * Used by the UI to gate SMS sending and show the right prompt.
     */
    private function resolveTenDlcStatus(int $userId): string
    {
        $brand = TelnyxBrand::where('user_id', $userId)->latest('id')->first();
        if (! $brand) {
            return 'not_started';
        }

        $campaign = TelnyxCampaign::where('user_id', $userId)->latest('id')->first();
        if (! $campaign) {
            return 'pending';
        }

        if ($brand->status === 'approved' && $campaign->status === 'approved') {
            return 'approved';
        }

        return 'pending';
    }
}
