<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\TelnyxBrand;
use App\Models\TelnyxCampaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TenDlcController extends Controller
{
    /**
     * Store a new 10DLC brand registration.
     */
    public function storeBrand(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'ein' => 'nullable|string|max:20',
            'entity_type' => 'required|in:PRIVATE_PROFIT,PUBLIC_PROFIT,NON_PROFIT,GOVERNMENT,SOLE_PROPRIETOR',
            'vertical' => 'required|string|max:100',
            'website' => 'nullable|url|max:255',
        ]);

        $user = $request->user();

        // Submit to Telnyx
        $response = Http::withToken(config('telnyx.api_key'))
            ->post(config('telnyx.api_base') . '/10dlc/brand', [
                'entity_type' => $validated['entity_type'],
                'display_name' => $validated['company_name'],
                'ein' => $validated['ein'] ?? null,
                'vertical' => $validated['vertical'],
                'website' => $validated['website'] ?? null,
            ]);

        $brand = TelnyxBrand::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'telnyx_brand_id' => $response->json('data.id'),
            'company_name' => $validated['company_name'],
            'ein' => $validated['ein'] ?? null,
            'entity_type' => $validated['entity_type'],
            'vertical' => $validated['vertical'],
            'website' => $validated['website'] ?? null,
            'status' => $response->successful() ? 'pending' : 'failed',
            'rejection_reasons' => $response->failed() ? [$response->json('errors.0.detail', 'Submission failed')] : null,
        ]);

        return response()->json(['brand' => $brand], $response->successful() ? 201 : 422);
    }

    /**
     * Store a new 10DLC campaign.
     */
    public function storeCampaign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'telnyx_brand_id' => 'required|exists:telnyx_brands,id',
            'use_case' => 'required|string|max:50',
            'description' => 'required|string|max:500',
            'sample_message_1' => 'required|string|max:320',
            'sample_message_2' => 'nullable|string|max:320',
        ]);

        $user = $request->user();
        $brand = TelnyxBrand::findOrFail($validated['telnyx_brand_id']);

        $response = Http::withToken(config('telnyx.api_key'))
            ->post(config('telnyx.api_base') . '/10dlc/campaign', [
                'brand_id' => $brand->telnyx_brand_id,
                'usecase' => $validated['use_case'],
                'description' => $validated['description'],
                'sample1' => $validated['sample_message_1'],
                'sample2' => $validated['sample_message_2'] ?? null,
                'subscriber_optin' => true,
                'subscriber_optout' => true,
                'subscriber_help' => true,
            ]);

        $campaign = TelnyxCampaign::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'telnyx_brand_id' => $brand->id,
            'telnyx_campaign_id' => $response->json('data.id'),
            'use_case' => $validated['use_case'],
            'description' => $validated['description'],
            'sample_message_1' => $validated['sample_message_1'],
            'sample_message_2' => $validated['sample_message_2'] ?? null,
            'status' => $response->successful() ? 'pending' : 'failed',
            'rejection_reasons' => $response->failed() ? [$response->json('errors.0.detail', 'Submission failed')] : null,
        ]);

        return response()->json(['campaign' => $campaign], $response->successful() ? 201 : 422);
    }

    /**
     * Check status of brand and/or campaign.
     */
    public function checkStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        $brand = TelnyxBrand::where('user_id', $user->id)
            ->latest()
            ->first();

        $campaign = TelnyxCampaign::where('user_id', $user->id)
            ->latest()
            ->first();

        // Refresh from Telnyx if pending
        if ($brand && $brand->status === 'pending' && $brand->telnyx_brand_id) {
            try {
                $response = Http::withToken(config('telnyx.api_key'))
                    ->get(config('telnyx.api_base') . "/10dlc/brand/{$brand->telnyx_brand_id}");

                if ($response->successful()) {
                    $status = strtolower($response->json('data.status', 'pending'));
                    $brand->update(['status' => $status === 'verified' ? 'verified' : ($status === 'failed' ? 'failed' : 'pending')]);
                }
            } catch (\Throwable $e) {
                Log::warning('10DLC brand status check failed', ['error' => $e->getMessage()]);
            }
        }

        if ($campaign && $campaign->status === 'pending' && $campaign->telnyx_campaign_id) {
            try {
                $response = Http::withToken(config('telnyx.api_key'))
                    ->get(config('telnyx.api_base') . "/10dlc/campaign/{$campaign->telnyx_campaign_id}");

                if ($response->successful()) {
                    $status = strtolower($response->json('data.status', 'pending'));
                    $campaign->update(['status' => $status === 'active' ? 'active' : ($status === 'failed' ? 'failed' : 'pending')]);
                }
            } catch (\Throwable $e) {
                Log::warning('10DLC campaign status check failed', ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'brand' => $brand?->fresh(),
            'campaign' => $campaign?->fresh(),
        ]);
    }
}
