<?php

declare(strict_types=1);

namespace App\Services\Mls\Datasets;

use App\Services\Mls\Dto\MlsFeed;
use App\Services\Mls\Dto\MlsListing;
use App\Services\Mls\Dto\MlsTaxonomyTerm;

/**
 * One MlsDataset subclass per MLS feed. Inherits from a provider-specific
 * base (BridgeDataset / RealtynaDataset / RepliersDataset) which supplies
 * sensible defaults for that provider's RESO vocabulary.
 *
 * STRICT GUIDELINES (see feedback_mls_taxonomy):
 *  - Adding a new MLS = one new class extending the right provider base.
 *  - Per-MLS subtypes / custom fields / value translations live HERE.
 *  - Drivers must never carry per-MLS logic.
 */
abstract class MlsDataset
{
    /** Internal slug — matches IdxConnection.mls_slug. Stable, unique. */
    abstract public function getSlug(): string;

    abstract public function getDisplayName(): string;

    /** Which MlsDriver handles this dataset — 'bridge' | 'realtyna' | 'repliers'. */
    abstract public function getDriver(): string;

    /**
     * The MLS's brand/compliance logo, defined in CODE on each dataset class
     * (no DB upload needed). An admin-set MlsProvider logo still wins when
     * present — this is the fallback every site gets out of the box.
     */
    public function getBrandingLogoUrl(): ?string
    {
        return null;
    }

    /**
     * Provider-specific dataset identifier (OData dataset, OriginatingSystemName, etc.)
     * for the given feed. Most MLSes serve IDX and VOW from different paths or tokens
     * — override per-MLS when they differ. Default: same path for both feeds.
     */
    abstract public function getDatasetPath(MlsFeed $feed = MlsFeed::IDX): string;

    /**
     * Which feeds this dataset can answer. Default IDX-only — explicitly opt in to VOW
     * per-MLS once the upstream credentials/dataset are confirmed.
     *
     * @return MlsFeed[]
     */
    public function supportedFeeds(): array
    {
        return [MlsFeed::IDX];
    }

    public function supportsFeed(MlsFeed $feed): bool
    {
        return in_array($feed, $this->supportedFeeds(), true);
    }

    /** @return MlsTaxonomyTerm[] */
    public function getPropertyTypes(): array
    {
        return [];
    }

    /**
     * Subtypes for the given parent type. Pass null to get every subtype the
     * dataset knows about (flat list, each carrying its parent_value).
     *
     * @return MlsTaxonomyTerm[]
     */
    public function getPropertySubtypes(?string $propertyType = null): array
    {
        return [];
    }

    /** @return MlsTaxonomyTerm[] */
    public function getStatuses(): array
    {
        return [];
    }

    /**
     * Per-MLS custom fields beyond RESO. Frontend renders extra inputs based on these.
     *
     * @return array<int,array{key:string,label:string,type:string}>
     */
    public function getCustomFields(): array
    {
        return [];
    }

    /**
     * Canonical list of cities this MLS covers. Lets the frontend pre-fill
     * city autocompletes / dropdowns without round-tripping the MLS for every
     * page load. Format: ['Miami, FL', 'Coral Gables, FL', ...] — include
     * the state suffix so values are unambiguous across multi-state MLSes.
     *
     * @return string[]
     */
    public function getCities(): array
    {
        return [];
    }

    /**
     * Counties this MLS serves. Powers the County filter pill list and lets
     * us short-circuit common "all Miami-Dade" / "all Broward" searches into
     * `geo.intersects()` queries without users typing city by city.
     *
     * @return string[]
     */
    public function getCounties(): array
    {
        return [];
    }

    /**
     * Sub-city neighborhoods this MLS indexes (and that users actually search
     * by). Keyed by area heading so the frontend can group them in a
     * neighborhood picker / build per-neighborhood landing pages. Also covers
     * unincorporated CDPs that aren't cities but are how local agents talk
     * about location (Kendall, The Hammocks, etc.).
     *
     * @return array<string, string[]>
     */
    public function getNeighborhoods(): array
    {
        return [];
    }

    /**
     * Subdivisions / developments this MLS indexes. A flat list (subdivisions
     * are not area-keyed like neighborhoods). Powers the Subdivision
     * autocomplete. Values must match the MLS's stored `SubdivisionName` so the
     * subdivision filter resolves — keep the feed's exact spelling/casing.
     *
     * @return string[]
     */
    public function getSubdivisions(): array
    {
        return [];
    }

    /**
     * ZIP codes this MLS indexes (from the live feed's PostalCode facet).
     * Powers the Zip Code autocomplete so users can pick instead of type.
     * Values must match the feed's stored `PostalCode` exactly — the zip
     * filter resolves byte-for-byte.
     *
     * @return string[]
     */
    public function getZipCodes(): array
    {
        return [];
    }

    /**
     * Filter keys this MLS actually honours. Lets the gateway warn (rather
     * than silently no-op) when a query filter isn't supported by a dataset.
     *
     * @return string[]
     */
    public function getSupportedFilters(): array
    {
        return ['query', 'city', 'min_price', 'max_price', 'min_beds', 'min_baths', 'property_type', 'property_subtype', 'status'];
    }

    /**
     * Raw provider field → normalized MlsListing key. Overrides only — the
     * provider base class supplies the common defaults.
     *
     * @return array<string,string>
     */
    public function getFieldMap(): array
    {
        return [];
    }

    /**
     * Additional upstream fields to request beyond the driver's universal
     * SELECT default. Use this when an MLS exposes fields that are NOT
     * supported by every other MLS on the same provider — e.g. only some
     * Bridge MLSes have `SchoolDistrict`, only Miami has `MIAMIRE_*`.
     *
     * @return string[]
     */
    public function getExtraSelectFields(): array
    {
        return [];
    }

    /**
     * Lifestyle vocabulary this MLS can answer. The unified API exposes ONE
     * lifestyle keyword surface to callers (`beachfront`, `55-plus`, `gated`,
     * `luxury`, etc.); each dataset declares which it supports + how to
     * translate. Datasets that don't support a queried lifestyle return an
     * error for that MLS but other MLSes still answer.
     *
     * @return string[]
     */
    public function getSupportedLifestyles(): array
    {
        return [];
    }

    /**
     * Translate a lifestyle keyword into an overlay filter array (snake_case,
     * same shape as MlsQuery::toArray()). Returns null when this dataset
     * doesn't support the lifestyle — the gateway converts that into a
     * per-MLS error rather than silently returning everything.
     *
     * Examples:
     *   'beachfront'   => ['raw_filter' => "WaterfrontYN eq true", 'has_view' => true]
     *   'luxury'       => ['min_price' => 1500000]
     *   '55-plus'      => ['raw_filter' => "SeniorCommunityYN eq true"]
     *
     * @return array<string,mixed>|null
     */
    public function translateLifestyle(string $lifestyle): ?array
    {
        return null;
    }

    /**
     * Provider value → our value, by category. Example:
     *   ['status' => ['Closed' => 'Sold']]
     *
     * @return array<string,array<string,string>>
     */
    public function getValueMap(): array
    {
        return [];
    }

    /**
     * Normalize a raw upstream record into MlsListing. Default delegates to the
     * provider base (which knows the common RESO shape). Override only for
     * genuinely weird per-MLS payloads.
     *
     * The feed is stamped onto each listing so downstream code (caching,
     * compliance, display) can tell IDX-sourced records from VOW-sourced ones.
     */
    public function normalize(array $raw, MlsFeed $feed = MlsFeed::IDX): MlsListing
    {
        // Hook for per-MLS DOM computation — most datasets get this for free
        // because BridgeApiClient already reads DaysOnMarket / CumulativeDaysOnMarket
        // and derives from OnMarketDate as a final fallback.
        $dom = $this->computeDaysOnMarket($raw);
        if ($dom !== null) {
            $raw['days_on_market'] = $dom;
        }
        $raw['feed'] = $feed->value;
        // Always stamp the dataset slug — clients (Bridge OData path, MLSGrid
        // OriginatingSystemName) may emit different identifiers; the dataset's
        // canonical slug is what the gateway dedups and the frontend looks up.
        $raw['mls_slug'] = $this->getSlug();

        return MlsListing::fromNormalizedArray($raw);
    }

    /**
     * Unified "days on market" — datasets that use a non-standard field (some
     * Bridge MLSes have only CumulativeDaysOnMarket, some Realtyna feeds
     * supply DaysOnMarketTotal, etc.) override this to compute it consistently.
     *
     * Default: read whatever the normalizer produced, return null otherwise.
     */
    public function computeDaysOnMarket(array $normalized): ?int
    {
        return isset($normalized['days_on_market']) ? (int) $normalized['days_on_market'] : null;
    }
}
