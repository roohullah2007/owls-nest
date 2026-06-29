<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\IdxConnection;
use App\Services\Idx\BridgeApiClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Http;

class IdxConnectionController extends Controller implements HasMiddleware
{
    /** IDX / MLS is a paid feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:idx')];
    }

    // Users never create connections or enter MLS API keys directly. They submit an
    // MlsConnectionRequest (see MlsConnectionRequestController) and an admin provisions
    // the credentials on their behalf during the integrate step. This controller only
    // manages connections that already exist — constraints, activation, and re-testing.

    public function update(Request $request, IdxConnection $idxConnection): RedirectResponse
    {
        $this->authorizeConnection($request, $idxConnection);

        $rules = [
            'display_name' => 'sometimes|required|string|max:255',
            'agent_id' => 'nullable|string|max:100',
            'office_id' => 'nullable|string|max:100',
            'constraints' => 'nullable|array',
            'constraints.property_types' => 'nullable|array',
            'constraints.property_types.*' => 'string|max:50',
            'constraints.statuses' => 'nullable|array',
            'constraints.statuses.*' => 'string|max:30',
            'constraints.agent_only' => 'nullable|boolean',
            'constraints.office_only' => 'nullable|boolean',
            'constraints.cities' => 'nullable|array',
            'constraints.cities.*' => 'string|max:100',
            'constraints.postal_codes' => 'nullable|array',
            'constraints.postal_codes.*' => 'string|max:20',
            'constraints.min_price' => 'nullable|integer|min:0',
            'constraints.max_price' => 'nullable|integer|min:0',
            'constraints.min_sqft' => 'nullable|integer|min:0',
            'constraints.max_sqft' => 'nullable|integer|min:0',
            'constraints.min_year_built' => 'nullable|integer|min:1800|max:2100',
            'constraints.max_year_built' => 'nullable|integer|min:1800|max:2100',
            'constraints.max_dom' => 'nullable|integer|min:1',
            'constraints.keywords' => 'nullable|array',
            'constraints.keywords.*' => 'string|max:100',
            'constraints.exclude_keywords' => 'nullable|array',
            'constraints.exclude_keywords.*' => 'string|max:100',
            'is_active' => 'sometimes|boolean',
        ];

        $validated = $request->validate($rules);

        $idxConnection->update($validated);

        return back()->with('success', 'Connection updated.');
    }

    public function destroy(Request $request, IdxConnection $idxConnection): RedirectResponse
    {
        $this->authorizeConnection($request, $idxConnection);

        $idxConnection->delete();

        return back()->with('success', 'Connection removed.');
    }

    public function test(Request $request, IdxConnection $idxConnection): RedirectResponse
    {
        $this->authorizeConnection($request, $idxConnection);

        $passed = false;

        try {
            $passed = match ($idxConnection->provider) {
                IdxConnection::PROVIDER_BRIDGE => $this->testBridge($idxConnection),
                IdxConnection::PROVIDER_REPLIERS => $this->testRepliers($idxConnection),
                default => false,
            };
        } catch (\Throwable) {
            $passed = false;
        }

        $idxConnection->update([
            'test_status' => $passed ? IdxConnection::STATUS_PASSED : IdxConnection::STATUS_FAILED,
            'last_tested_at' => now(),
        ]);

        $message = $passed
            ? 'Connection test passed.'
            : ($idxConnection->provider === IdxConnection::PROVIDER_BRIDGE
                ? 'Connection test failed. This MLS may be temporarily unavailable.'
                : 'Connection test failed. Please check your API key.');

        return back()->with($passed ? 'success' : 'error', $message);
    }

    private function authorizeConnection(Request $request, IdxConnection $connection): void
    {
        $user = $request->user();
        abort_unless(
            $connection->user_id === $user->id || ($user->team_id && $connection->team_id === $user->team_id),
            403
        );
    }

    private function testBridge(IdxConnection $connection): bool
    {
        $client = app(BridgeApiClient::class);

        return $client->testConnection($connection->mls_slug);
    }

    private function testRepliers(IdxConnection $connection): bool
    {
        $response = Http::timeout(15)
            ->withHeaders(['REPLIERS-API-KEY' => $connection->api_key])
            ->get(config('idx.repliers.base_url').'/listings', [
                'pageNum' => 1,
                'resultsPerPage' => 1,
            ]);

        return $response->successful();
    }
}
