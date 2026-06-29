<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Events\MlsRequestStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\IdxConnection;
use App\Models\MlsConnectionRequest;
use App\Models\MlsProvider;
use App\Services\Idx\BridgeApiClient;
use App\Services\Idx\ParagonApiClient;
use App\Services\Idx\ParagonCredentials;
use App\Services\Idx\RealtynaApiClient;
use App\Services\Idx\RealtynaCredentials;
use App\Services\Idx\RepliersApiClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MlsRequestController extends Controller
{
    public function __construct(
        private readonly BridgeApiClient $bridgeClient,
        private readonly RepliersApiClient $repliersClient,
        private readonly RealtynaApiClient $realtynaClient,
        private readonly ParagonApiClient $paragonClient,
    ) {}

    public function index(Request $request): Response
    {
        $requests = MlsConnectionRequest::query()
            ->with(['user:id,name,email,team_id', 'mlsProvider:id,slug,display_name,logo_url,data_source,monthly_fee_cents'])
            ->orderByRaw("CASE status
                WHEN 'pending' THEN 1
                WHEN 'in_process' THEN 2
                WHEN 'completed' THEN 3
                WHEN 'integrated' THEN 4
                WHEN 'denied' THEN 5
                ELSE 6 END")
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Admin/MlsRequests/Index', [
            'requests' => $requests,
            'statuses' => MlsConnectionRequest::STATUSES,
        ]);
    }

    /**
     * Move a request along its lifecycle. The "integrate" transition is special —
     * it requires an API key and creates a real IdxConnection row.
     */
    public function updateStatus(Request $request, MlsConnectionRequest $mlsConnectionRequest): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(MlsConnectionRequest::STATUSES)],
            'admin_notes' => 'nullable|string|max:2000',
            'denied_reason' => 'nullable|string|max:500',
            'api_key' => 'nullable|string|max:500',
            'client_id' => 'nullable|string|max:255',
            'client_secret' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $newStatus = $validated['status'];

        // Special transitions:
        if ($newStatus === MlsConnectionRequest::STATUS_INTEGRATED) {
            // Bridge uses system-wide credentials from .env — no per-connection key.
            // Repliers is BYOK (api_key). Realtyna accounts are provisioned per
            // customer: api_key + OAuth client_id/client_secret, stored encrypted
            // on the connection.
            $provider = $mlsConnectionRequest->mlsProvider;
            $source = $provider?->data_source;
            if ($source === MlsProvider::SOURCE_REPLIERS && empty($validated['api_key'])) {
                return back()->with('error', 'API key is required for this data source.');
            }
            if ($source === MlsProvider::SOURCE_REALTYNA
                && (empty($validated['api_key']) || empty($validated['client_id']) || empty($validated['client_secret']))) {
                return back()->with('error', 'Realtyna integrations require an API key, Client ID and Client Secret.');
            }
            // Paragon is OAuth client_credentials: the customer's login/password
            // are the Client ID / Client Secret. No separate API key.
            if ($source === MlsProvider::SOURCE_PARAGON
                && (empty($validated['client_id']) || empty($validated['client_secret']))) {
                return back()->with('error', 'Paragon integrations require a Client ID (login) and Client Secret (password).');
            }

            return $this->integrate(
                $mlsConnectionRequest,
                $validated,
                $user->id,
            );
        }

        if ($newStatus === MlsConnectionRequest::STATUS_DENIED && empty($validated['denied_reason'])) {
            return back()->with('error', 'Provide a reason when denying a request.');
        }

        $previousStatus = $mlsConnectionRequest->status;
        $mlsConnectionRequest->update([
            'status' => $newStatus,
            'admin_notes' => $validated['admin_notes'] ?? $mlsConnectionRequest->admin_notes,
            'denied_reason' => $newStatus === MlsConnectionRequest::STATUS_DENIED ? $validated['denied_reason'] : null,
            'processed_by_user_id' => $user->id,
            'processed_at' => now(),
        ]);

        broadcast(new MlsRequestStatusChanged($mlsConnectionRequest->fresh(), $previousStatus))->toOthers();

        return back()->with('success', "Request marked as {$newStatus}.");
    }

    /** @param array{api_key?: ?string, client_id?: ?string, client_secret?: ?string, admin_notes?: ?string} $credentials */
    private function integrate(MlsConnectionRequest $request, array $credentials, int $adminUserId): RedirectResponse
    {
        $provider = $request->mlsProvider;
        if (! $provider) {
            return back()->with('error', 'MLS provider missing.');
        }

        // Verify the credentials work before flipping the request to integrated.
        // Failing here keeps the request in its current state so admin can correct + retry.
        [$ok, $err] = $this->testKey($provider, $credentials);
        if (! $ok) {
            return back()->with('error', "Connection test failed: {$err}. Request was NOT integrated.");
        }

        // Realtyna and Paragon both store an OAuth client_id/client_secret pair
        // on the connection (Paragon's is the customer's login/password).
        $storesClientPair = in_array(
            $provider->data_source,
            [MlsProvider::SOURCE_REALTYNA, MlsProvider::SOURCE_PARAGON],
            true,
        );

        $connection = IdxConnection::create([
            'user_id' => $request->user_id,
            'team_id' => $request->team_id,
            'mls_provider_id' => $provider->id,
            'connection_request_id' => $request->id,
            'feed_types' => $request->feed_types_requested,
            'provider' => $provider->data_source,
            'mls_slug' => $provider->slug,
            'display_name' => $provider->display_name,
            'api_key' => $credentials['api_key'] ?? '',
            'client_id' => $storesClientPair ? ($credentials['client_id'] ?? null) : null,
            'client_secret' => $storesClientPair ? ($credentials['client_secret'] ?? null) : null,
            'agent_id' => $request->agent_mls_id,
            'office_id' => $request->office_mls_id,
            'is_active' => true,
            'test_status' => IdxConnection::STATUS_PASSED,
            'last_tested_at' => now(),
        ]);

        $previousStatus = $request->status;
        $request->update([
            'status' => MlsConnectionRequest::STATUS_INTEGRATED,
            'admin_notes' => $credentials['admin_notes'] ?? $request->admin_notes,
            'idx_connection_id' => $connection->id,
            'processed_by_user_id' => $adminUserId,
            'processed_at' => $request->processed_at ?? now(),
            'integrated_at' => now(),
        ]);

        broadcast(new MlsRequestStatusChanged($request->fresh(), $previousStatus))->toOthers();

        return back()->with('success', "Integrated. {$request->user->name} now has an active connection to {$provider->display_name}.");
    }

    /**
     * Test the provided credentials against the right backend.
     * Returns [success, errorMessage|null].
     *
     * @param  array{api_key?: ?string, client_id?: ?string, client_secret?: ?string}  $credentials
     */
    private function testKey(MlsProvider $provider, array $credentials): array
    {
        try {
            $ok = match ($provider->data_source) {
                MlsProvider::SOURCE_BRIDGE => $this->bridgeClient->testConnection($provider->slug),
                MlsProvider::SOURCE_REPLIERS => $this->repliersClient->testConnection($credentials['api_key'] ?? ''),
                MlsProvider::SOURCE_REALTYNA => $this->testRealtyna($provider, $credentials),
                MlsProvider::SOURCE_PARAGON => $this->testParagon($provider, $credentials),
                default => false,
            };

            return [$ok, $ok ? null : 'API returned an error'];
        } catch (\Throwable $e) {
            return [false, $e->getMessage()];
        }
    }

    /**
     * For Realtyna we test the ADMIN-SUPPLIED account credentials by querying
     * the configured OriginatingSystemName. If the admin didn't set one on the
     * MlsProvider, the test fails with a clear error so they fix the config
     * before integrating.
     *
     * @param  array{api_key?: ?string, client_id?: ?string, client_secret?: ?string}  $credentials
     */
    private function testRealtyna(MlsProvider $provider, array $credentials): bool
    {
        $osName = $provider->data_source_config['originating_system_name'] ?? null;
        if (! $osName) {
            throw new \RuntimeException("MlsProvider '{$provider->slug}' is missing data_source_config.originating_system_name — set it in admin first.");
        }

        return $this->realtynaClient->testConnection($osName, new RealtynaCredentials(
            clientId: $credentials['client_id'] ?? null,
            clientSecret: $credentials['client_secret'] ?? null,
            apiKey: $credentials['api_key'] ?? null,
        ));
    }

    /**
     * Test the admin-supplied Paragon login/password against the MLS's OData
     * service root. The base URL must be set on the MlsProvider's
     * data_source_config.base_url (seeded from config/idx.php) before integrating.
     *
     * @param  array{client_id?: ?string, client_secret?: ?string}  $credentials
     */
    private function testParagon(MlsProvider $provider, array $credentials): bool
    {
        $baseUrl = $provider->data_source_config['base_url'] ?? null;
        if (! $baseUrl) {
            throw new \RuntimeException("MlsProvider '{$provider->slug}' is missing data_source_config.base_url — set it in admin first.");
        }

        return $this->paragonClient->testConnection(new ParagonCredentials(
            clientId: $credentials['client_id'] ?? null,
            clientSecret: $credentials['client_secret'] ?? null,
            baseUrl: $baseUrl,
        ));
    }
}
