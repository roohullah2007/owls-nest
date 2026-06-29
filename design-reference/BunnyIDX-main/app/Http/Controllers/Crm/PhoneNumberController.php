<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\AreaCodePrice;
use App\Models\PhoneNumber;
use App\Models\User;
use App\Services\Telnyx\TelnyxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhoneNumberController extends Controller
{
    public function __construct(
        private TelnyxService $telnyx,
    ) {}

    /**
     * Search available phone numbers by area code.
     */
    public function searchAvailable(Request $request): JsonResponse
    {
        $request->validate([
            'area_code' => 'required|string|digits:3',
            'limit' => 'nullable|integer|min:1|max:25',
        ]);

        $areaCode = $request->input('area_code');

        $results = $this->telnyx->searchAvailableNumbers(
            $areaCode,
            $request->integer('limit', 10),
        );

        // Admin-set override price for this area code, if any (else use Telnyx's cost).
        $overridePrice = AreaCodePrice::priceFor($areaCode);

        $numbers = collect($results)->map(fn ($n) => [
            'phone_number' => $n['phone_number'] ?? '',
            'locality' => $n['locality'] ?? null,
            'region' => $n['region_information'][0]['region_name'] ?? null,
            'monthly_cost' => $overridePrice ?? $n['cost_information']['monthly_cost'] ?? $n['monthly_cost'] ?? '1.00',
            'features' => $n['features'] ?? [],
        ]);

        return response()->json(['numbers' => $numbers]);
    }

    /**
     * Purchase a phone number from Telnyx.
     */
    public function purchase(Request $request): JsonResponse
    {
        $request->validate([
            'phone_number' => 'required|string|starts_with:+',
        ]);

        $user = $request->user();
        $phoneNumber = $request->input('phone_number');

        // Check if number already provisioned
        if (PhoneNumber::where('phone_number', $phoneNumber)->exists()) {
            return response()->json(['error' => 'Number already provisioned.'], 422);
        }

        // Enforce the plan's included phone-number limit (null = unlimited). The
        // limit belongs to the billing owner and is shared across a team.
        $limit = $user->billingOwner()->effectivePlan()->phone_number_limit ?? null;
        if ($limit !== null) {
            $activeCount = $this->activeNumberQuery($user)->count();
            if ($activeCount >= $limit) {
                return response()->json([
                    'error' => $limit === 0
                        ? 'Your plan does not include a phone number. Upgrade to add one.'
                        : "Your plan includes {$limit} phone number(s). Upgrade to add more.",
                ], 422);
            }
        }

        $result = $this->telnyx->purchaseNumber($phoneNumber);

        if (! $result) {
            return response()->json(['error' => 'Failed to purchase number from Telnyx.'], 500);
        }

        $isFirstNumber = ! PhoneNumber::where('user_id', $user->id)->active()->exists();

        // Prefer the admin-set price for this number's area code; otherwise the
        // cost Telnyx reported on the order, falling back to a $1.00 default.
        $overridePrice = AreaCodePrice::priceFor(AreaCodePrice::areaCodeFromNumber($phoneNumber));
        $monthlyCost = $overridePrice ?? $result['phone_numbers'][0]['monthly_cost'] ?? 1.00;

        $record = PhoneNumber::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'telnyx_phone_number_id' => $result['phone_numbers'][0]['id'] ?? $result['id'] ?? null,
            'telnyx_messaging_profile_id' => config('telnyx.messaging_profile_id'),
            'phone_number' => $phoneNumber,
            'friendly_name' => $phoneNumber,
            'capabilities' => ['sms', 'voice'],
            'monthly_cost' => $monthlyCost,
            'status' => 'active',
            'number_type' => $user->isInTeamContext() ? 'team' : 'personal',
            'is_default' => $isFirstNumber,
            'provisioned_at' => now(),
        ]);

        return response()->json(['phone_number' => $record], 201);
    }

    /**
     * Active numbers counted against the plan limit: all of a team's numbers
     * when the user is on a team, otherwise the solo user's own numbers.
     */
    private function activeNumberQuery(User $user)
    {
        $query = PhoneNumber::query()->active();

        if ($user->team_id) {
            return $query->where('team_id', $user->team_id);
        }

        return $query->where('user_id', $user->id)->whereNull('team_id');
    }

    /**
     * Release a phone number back to Telnyx.
     */
    public function release(Request $request, PhoneNumber $phoneNumber): JsonResponse
    {
        $user = $request->user();

        if ($phoneNumber->user_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        if ($phoneNumber->telnyx_phone_number_id) {
            $this->telnyx->releaseNumber($phoneNumber->telnyx_phone_number_id);
        }

        $phoneNumber->update([
            'status' => 'released',
            'released_at' => now(),
            'is_default' => false,
        ]);

        // If this was default, promote another
        if (! PhoneNumber::where('user_id', $user->id)->where('is_default', true)->exists()) {
            PhoneNumber::where('user_id', $user->id)->active()->first()?->update(['is_default' => true]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Set a phone number as the default outbound number.
     */
    public function setDefault(Request $request, PhoneNumber $phoneNumber): JsonResponse
    {
        $user = $request->user();

        if ($phoneNumber->user_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        // Unset previous default
        PhoneNumber::where('user_id', $user->id)->where('is_default', true)->update(['is_default' => false]);

        $phoneNumber->update(['is_default' => true]);

        return response()->json(['success' => true]);
    }
}
