<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\MlsConnectionRequest;
use App\Models\MlsProvider;
use App\Notifications\MlsConnectionRequestReceived;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class MlsConnectionRequestController extends Controller implements HasMiddleware
{
    /** IDX / MLS is a paid feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:idx')];
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'mls_provider_id' => 'required|exists:mls_providers,id',
            'feed_types' => 'required|array|min:1',
            'feed_types.*' => 'in:idx,vow',
            // Broker authorization — collected upfront because most MLSes require
            // the principal broker to sign off on the IDX agreement first. The
            // rest of the agent's identifiers (license #, agent MLS ID, etc.) are
            // gathered later once the broker has authorized.
            'is_principal_broker' => 'sometimes|boolean',
            'brokerage_name' => 'required|string|max:200',
            'principal_broker_name' => 'required|string|max:200',
            'principal_broker_email' => 'required|email|max:200',
            'idx_domain' => 'nullable|string|max:255',
            'user_notes' => 'nullable|string|max:2000',
        ]);

        $provider = MlsProvider::findOrFail($validated['mls_provider_id']);

        if ($provider->visibility !== MlsProvider::VISIBILITY_VISIBLE) {
            return back()->with('error', 'This MLS is not currently available for requests.');
        }

        // Validate requested feeds match what the provider actually offers.
        $allowed = array_filter([
            $provider->has_idx_feed ? 'idx' : null,
            $provider->has_vow_feed ? 'vow' : null,
        ]);
        $invalid = array_diff($validated['feed_types'], $allowed);
        if (! empty($invalid)) {
            return back()->with('error', 'Requested feeds ('.implode(', ', $invalid).') are not available for this MLS.');
        }

        // Prevent duplicate active request for the same MLS.
        $existing = MlsConnectionRequest::where('user_id', $user->id)
            ->where('mls_provider_id', $provider->id)
            ->whereIn('status', [
                MlsConnectionRequest::STATUS_PENDING,
                MlsConnectionRequest::STATUS_IN_PROCESS,
                MlsConnectionRequest::STATUS_COMPLETED,
                MlsConnectionRequest::STATUS_INTEGRATED,
            ])
            ->first();
        if ($existing) {
            return back()->with('error', 'You already have an active request or integrated connection for this MLS.');
        }

        $mlsRequest = MlsConnectionRequest::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'mls_provider_id' => $provider->id,
            'status' => MlsConnectionRequest::STATUS_PENDING,
            'feed_types_requested' => array_values($validated['feed_types']),
            'brokerage_name' => $validated['brokerage_name'],
            'principal_broker_name' => $validated['principal_broker_name'],
            'principal_broker_email' => $validated['principal_broker_email'],
            'is_principal_broker' => (bool) ($validated['is_principal_broker'] ?? false),
            'idx_domain' => $validated['idx_domain'] ?? null,
            'user_notes' => $validated['user_notes'] ?? null,
        ]);

        // Confirm receipt and lay out next steps (instructions + scheduling a meeting
        // with our team). The admin provisions the credentials from the request queue.
        $mlsRequest->loadMissing('mlsProvider');
        $user->notify(new MlsConnectionRequestReceived($mlsRequest));

        return back()->with('success', "Request submitted for {$provider->display_name}. Check your email for next steps — we'll provision your connection.");
    }

    public function destroy(Request $request, MlsConnectionRequest $mlsConnectionRequest): RedirectResponse
    {
        abort_unless($mlsConnectionRequest->user_id === $request->user()->id, 403);

        if (! in_array($mlsConnectionRequest->status, [MlsConnectionRequest::STATUS_PENDING], true)) {
            return back()->with('error', 'Only pending requests can be cancelled.');
        }

        $mlsConnectionRequest->delete();

        return back()->with('success', 'Request cancelled.');
    }
}
