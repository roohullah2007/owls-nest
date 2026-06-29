<?php

declare(strict_types=1);

namespace App\Services\PropertyAlerts;

use App\Models\AgentWebsite;
use App\Models\PropertyAlertLog;
use App\Models\SiteVisitor;
use App\Models\SiteVisitorFavorite;
use App\Models\SiteVisitorSavedSearch;
use App\Models\User;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsQuery;
use Illuminate\Support\Facades\Route;

/**
 * Orchestrates property alerts for a single site visitor: re-runs their saved
 * searches and re-checks their favorited listings via MlsGateway, detects new
 * matches / price drops / status changes against stored baselines, and hands
 * each event to PropertyAlertSender (which owns the paid/opt-out/quota gates).
 *
 * Change-detection baselines:
 *  - saved search → seen_listing_ids (keys already alerted on).
 *  - favorite     → snapshot.alert_price / snapshot.alert_status.
 * The first evaluation only seeds the baseline (no email), so we never blast a
 * visitor with everything that already matched when alerts are first enabled.
 */
class PropertyAlertService
{
    public function __construct(
        private readonly MlsListingProbe $probe,
        private readonly PropertyAlertSender $sender,
    ) {}

    /** @return int number of alert emails actually sent */
    public function runForVisitor(SiteVisitor $visitor): int
    {
        if (! config('property_alerts.enabled', true)) {
            return 0;
        }

        $site = $visitor->website;
        $account = $site?->user;
        if (! $site || ! $account) {
            return 0;
        }

        // Paid-plan restriction + opt-out short-circuit before any MLS calls.
        if (! $account->isPro() || $visitor->alertsUnsubscribed()) {
            return 0;
        }

        $frequency = PropertyAlertFrequency::forUser($account);
        if (PropertyAlertFrequency::isOff($frequency)) {
            return 0;
        }

        $sent = 0;
        $sent += $this->processSavedSearches($visitor, $site, $account, $frequency);
        $sent += $this->processFavorites($visitor, $site, $account, $frequency);

        return $sent;
    }

    private function processSavedSearches(SiteVisitor $visitor, AgentWebsite $site, User $account, string $frequency): int
    {
        $sent = 0;

        $searches = $visitor->savedSearches()->where('alerts_enabled', true)->get();

        foreach ($searches as $search) {
            $keys = $this->searchKeys($account, $search);
            if ($keys === null) {
                continue; // search errored — leave baseline untouched, retry later
            }

            // First evaluation: seed baseline only, never email existing matches.
            if ($search->seen_listing_ids === null) {
                $search->seen_listing_ids = $keys;
                $search->save();

                continue;
            }

            $newKeys = array_values(array_diff($keys, $search->seen_listing_ids));
            if ($newKeys === []) {
                continue;
            }

            // Respect cadence: keep new matches pending until the window opens.
            if (! PropertyAlertFrequency::isDue($frequency, $search->last_alerted_at)) {
                continue;
            }

            $idempotencyKey = 'pa_ss_'.sha1($visitor->id.'|'.$search->id.'|'.implode(',', $newKeys));

            $didSend = $this->sender->send(
                $visitor,
                $account,
                $site,
                PropertyAlertLog::TYPE_SAVED_SEARCH,
                'saved_search_alert',
                [
                    'search_name' => $search->name ?: 'your search',
                    'match_count' => (string) count($newKeys),
                    'action_url' => $this->propertiesUrl($site),
                ],
                mlsSlug: null,
                listingId: null,
                savedSearchId: $search->id,
                idempotencyKey: $idempotencyKey,
            );

            if ($didSend) {
                $search->seen_listing_ids = array_values(array_unique(array_merge($search->seen_listing_ids, $keys)));
                $search->last_alerted_at = now();
                $search->save();
                $sent++;
            }
        }

        return $sent;
    }

    private function processFavorites(SiteVisitor $visitor, AgentWebsite $site, User $account, string $frequency): int
    {
        $sent = 0;

        foreach ($visitor->favorites as $favorite) {
            $listing = $this->safeGet($account, $favorite->mls_slug, $favorite->listing_id);
            if (! $listing) {
                continue;
            }

            $currentPrice = $listing->price;
            $currentStatus = strtolower(trim($listing->status));

            $snapshot = $favorite->snapshot ?? [];
            $hasBaseline = array_key_exists('alert_price', $snapshot) || array_key_exists('alert_status', $snapshot);

            // First evaluation: seed baseline only.
            if (! $hasBaseline) {
                $snapshot['alert_price'] = $currentPrice;
                $snapshot['alert_status'] = $currentStatus;
                $favorite->snapshot = $snapshot;
                $favorite->save();

                continue;
            }

            $basePrice = $snapshot['alert_price'] ?? null;
            $baseStatus = $snapshot['alert_status'] ?? null;

            $priceDropped = $currentPrice !== null && $basePrice !== null && $currentPrice < (int) $basePrice;
            $statusChanged = $currentStatus !== '' && $baseStatus !== null && $currentStatus !== $baseStatus;

            $due = PropertyAlertFrequency::isDue($frequency, $favorite->last_alerted_at);
            $sentAny = false;

            if ($due && $priceDropped) {
                $sentAny = $this->sendFavoriteAlert(
                    $visitor, $account, $site, $favorite, $listing,
                    PropertyAlertLog::TYPE_PRICE_DROP, 'property_price_drop_alert',
                    extraVars: [
                        'old_price' => $this->money((int) $basePrice),
                        'new_price' => $this->money($currentPrice),
                    ],
                    signature: (string) $currentPrice,
                ) || $sentAny;
            }

            if ($due && $statusChanged) {
                $sentAny = $this->sendFavoriteAlert(
                    $visitor, $account, $site, $favorite, $listing,
                    PropertyAlertLog::TYPE_STATUS_CHANGE, 'property_status_change_alert',
                    extraVars: [
                        'old_status' => (string) $baseStatus,
                        'new_status' => $currentStatus,
                    ],
                    signature: $currentStatus,
                ) || $sentAny;
            }

            if ($sentAny) {
                $snapshot['alert_price'] = $currentPrice;
                $snapshot['alert_status'] = $currentStatus;
                $favorite->snapshot = $snapshot;
                $favorite->last_alerted_at = now();
                $favorite->save();
                $sent++;
            } elseif (! $priceDropped && $currentPrice !== null && $basePrice !== null && $currentPrice > (int) $basePrice) {
                // Price rose (not an alert) — track the new high so a later drop
                // is measured from the most recent level, not a stale baseline.
                $snapshot['alert_price'] = $currentPrice;
                $favorite->snapshot = $snapshot;
                $favorite->save();
            }
        }

        return $sent;
    }

    /**
     * @param  array<string,string|null>  $extraVars
     */
    private function sendFavoriteAlert(
        SiteVisitor $visitor,
        User $account,
        AgentWebsite $site,
        SiteVisitorFavorite $favorite,
        MlsListing $listing,
        string $alertType,
        string $templateType,
        array $extraVars,
        string $signature,
    ): bool {
        $address = $listing->address?->full
            ?: ($favorite->snapshot['address'] ?? $favorite->listing_id);

        $vars = array_merge([
            'property_address' => (string) $address,
            'city' => $listing->address?->city ?? '',
            'status' => $listing->status,
            'price' => $listing->price !== null ? $this->money($listing->price) : '',
            'action_url' => $this->listingUrl($site, $favorite->mls_slug, $favorite->listing_id),
        ], $extraVars);

        $idempotencyKey = 'pa_'.substr($alertType, 0, 2).'_'
            .sha1($visitor->id.'|'.$favorite->mls_slug.'|'.$favorite->listing_id.'|'.$alertType.'|'.$signature);

        return $this->sender->send(
            $visitor,
            $account,
            $site,
            $alertType,
            $templateType,
            $vars,
            mlsSlug: $favorite->mls_slug,
            listingId: $favorite->listing_id,
            savedSearchId: null,
            idempotencyKey: $idempotencyKey,
        );
    }

    /** @return string[]|null listing keys ("slug|id"), or null on search error */
    private function searchKeys(User $account, SiteVisitorSavedSearch $search): ?array
    {
        $filters = $search->filters ?? [];
        if (empty($filters['query']) && ! empty($search->search_text)) {
            $filters['query'] = $search->search_text;
        }
        $filters['projection'] = MlsQuery::PROJECTION_LITE;
        $filters['per_page'] = (int) config('property_alerts.max_matches_per_search', 50);
        $filters['sort'] = MlsQuery::SORT_NEWEST;

        $result = $this->probe->searchListings($account, MlsQuery::fromArray($filters));

        // Whole-MLS failure with no listings → treat as error (don't seed empty).
        if ($result['errored']) {
            return null;
        }

        return array_map(static fn (MlsListing $l) => $l->mlsSlug.'|'.$l->mlsId, $result['listings']);
    }

    private function safeGet(User $account, string $mlsSlug, string $listingId): ?MlsListing
    {
        return $this->probe->getListing($account, $mlsSlug, $listingId);
    }

    private function listingUrl(AgentWebsite $site, string $mlsSlug, string $listingId): string
    {
        // Legacy route 301s to the canonical address-slug URL — always resolvable
        // without pre-generating a slug.
        if (Route::has('agent-site.property.legacy')) {
            return route('agent-site.property.legacy', [$site->slug, $mlsSlug, $listingId], true);
        }

        return url("/site/{$site->slug}/property/{$mlsSlug}/{$listingId}");
    }

    private function propertiesUrl(AgentWebsite $site): string
    {
        if (Route::has('agent-site.properties')) {
            return route('agent-site.properties', $site->slug, true);
        }

        return url("/site/{$site->slug}/properties");
    }

    private function money(int $amount): string
    {
        return '$'.number_format($amount);
    }
}
