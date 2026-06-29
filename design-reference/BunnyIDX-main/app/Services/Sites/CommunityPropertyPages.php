<?php

declare(strict_types=1);

namespace App\Services\Sites;

use App\Models\AgentWebsite;
use App\Models\WebsiteArea;
use App\Services\Mls\MlsGateway;
use Illuminate\Support\Str;

/**
 * Property Type / Sub-Type SEO pages for communities — the taxonomy-driven
 * sibling of CommunityLifestyles. Each enabled entry renders its own listing
 * page at /neighborhoods/{area}/{key} with the community's filters narrowed
 * to one MLS PropertyType or PropertySubType.
 *
 * The catalog is NOT hardcoded: it comes from the site owner's connected-MLS
 * taxonomy (MlsGateway::taxonomy, merged across datasets), so each site only
 * offers values its feeds can actually filter on, in the feed's exact enum
 * spelling (rule: never collapse provider enums).
 *
 * Stored rows on `website_areas.property_pages`: {kind, value, copy?} where
 * kind is 'property_type' | 'property_subtype' and value is the MLS enum
 * value verbatim. URL keys derive from the value (Str::slug).
 */
final class CommunityPropertyPages
{
    /** Per-request memo: catalog per site id. */
    private static array $catalogs = [];

    /**
     * Every property type + subtype page the site's connected MLSes support.
     *
     * @return array<int, array{key: string, kind: string, value: string, label: string}>
     */
    public static function catalogFor(AgentWebsite $site): array
    {
        if (isset(self::$catalogs[$site->id])) {
            return self::$catalogs[$site->id];
        }

        $owner = CommunityLifestyles::ownerUser($site);
        if (! $owner) {
            return self::$catalogs[$site->id] = [];
        }

        try {
            $taxonomy = app(MlsGateway::class)->taxonomy($owner, []);
        } catch (\Throwable) {
            return self::$catalogs[$site->id] = [];
        }

        $out = [];
        $seenKeys = [];
        foreach (['property_type' => $taxonomy->propertyTypes, 'property_subtype' => $taxonomy->propertySubtypes] as $kind => $terms) {
            foreach ($terms as $term) {
                $key = Str::slug($term->value);
                if ($key === '' || isset($seenKeys[$key])) {
                    continue; // type slugs win; duplicate subtype slugs are skipped
                }
                $seenKeys[$key] = true;
                $out[] = [
                    'key' => $key,
                    'kind' => $kind,
                    'value' => $term->value,
                    'label' => $term->label,
                    'seo_label' => self::seoPhrase($term->label, $term->value),
                    'nav_label' => self::navLabel($term->label, $term->value),
                ];
            }
        }

        return self::$catalogs[$site->id] = $out;
    }

    /**
     * Search-intent display phrase for a taxonomy term — "Condominium" →
     * "Condos for Sale", "Residential Lease" → "Homes for Rent". The
     * transaction type comes from the term's canonical VALUE (same
     * lease|rent derivation PublicPropertySearch uses — no hardcoded class
     * names). Display-only: matching/filtering always uses the raw value;
     * unknown labels get a generic plural so no feed term is ever blocked.
     */
    public static function seoPhrase(string $label, ?string $value = null): string
    {
        [$noun, $isLease] = self::phraseParts($label, $value);

        return $noun.($isLease ? ' for Rent' : ' for Sale');
    }

    /**
     * Sidebar/nav label — the plain noun ("Condos", "Townhomes") since the
     * surrounding "Property Types" context implies sale; lease terms keep
     * their "for Rent" qualifier.
     */
    public static function navLabel(string $label, ?string $value = null): string
    {
        [$noun, $isLease] = self::phraseParts($label, $value);

        return $isLease ? $noun.' for Rent' : $noun;
    }

    /** @return array{0: string, 1: bool} [plural noun, is lease/rental] */
    private static function phraseParts(string $label, ?string $value): array
    {
        // Transaction type from the canonical taxonomy value (label fallback).
        $isLease = (bool) preg_match('/lease|rent/i', (string) ($value !== null && $value !== '' ? $value : $label));

        $l = strtolower(trim($label));
        if ($isLease) {
            // The lease word drops out of the noun ("Residential Lease" → Homes).
            $l = trim((string) preg_replace('/\b(lease|leases|rental|rentals|rent)\b/i', '', $l));
            $label = trim((string) preg_replace('/\b(lease|leases|rental|rentals|rent)\b/i', '', $label));
        }

        $noun = match (true) {
            str_contains($l, 'condo') => 'Condos',
            str_contains($l, 'townhouse') || str_contains($l, 'townhome') => 'Townhomes',
            str_contains($l, 'single family') => 'Single Family Homes',
            str_contains($l, 'multi') && str_contains($l, 'family') => 'Multi-Family Homes',
            str_contains($l, 'mobile') || str_contains($l, 'manufactured') => 'Mobile & Manufactured Homes',
            str_contains($l, 'land') || str_contains($l, 'lot') || str_contains($l, 'acreage') => 'Land & Lots',
            str_contains($l, 'villa') => 'Villas',
            str_contains($l, 'duplex') => 'Duplexes',
            str_contains($l, 'apartment') => 'Apartments',
            str_contains($l, 'farm') || str_contains($l, 'ranch') => 'Farms & Ranches',
            str_contains($l, 'commercial') => 'Commercial Properties',
            str_contains($l, 'income') => 'Income Properties',
            str_contains($l, 'residential') => 'Homes',
            $l === '' => 'Homes',
            default => Str::plural(Str::title($label)),
        };

        return [$noun, $isLease];
    }

    /** Find one catalog entry by its URL key. */
    public static function find(AgentWebsite $site, string $key): ?array
    {
        foreach (self::catalogFor($site) as $entry) {
            if ($entry['key'] === $key) {
                return $entry;
            }
        }

        return null;
    }

    /**
     * The enabled + MLS-supported property pages for a community, each with
     * its optional owner-edited copy. `property_pages` rows: {kind, value, copy?}.
     *
     * @return array<int, array{key: string, kind: string, value: string, label: string, copy: ?string}>
     */
    public static function pagesFor(AgentWebsite $site, WebsiteArea $area): array
    {
        $rows = (array) ($area->property_pages ?? []);
        if ($rows === []) {
            return [];
        }

        $byKindValue = [];
        foreach (self::catalogFor($site) as $entry) {
            $byKindValue[$entry['kind'].'|'.$entry['value']] = $entry;
        }

        $out = [];
        foreach ($rows as $row) {
            $entry = $byKindValue[(string) ($row['kind'] ?? '').'|'.(string) ($row['value'] ?? '')] ?? null;
            if (! $entry) {
                continue; // value no connected MLS supports — hidden, not 404-bait
            }
            $out[] = $entry + ['copy' => trim((string) ($row['copy'] ?? '')) ?: null];
        }

        return $out;
    }

    /**
     * The community's filters narrowed to one property type / subtype page
     * (same overlay shape MlsQuery::fromArray accepts).
     *
     * @param  array{kind: string, value: string}  $pageDef
     */
    public static function criteriaFor(WebsiteArea $area, array $pageDef): array
    {
        $criteria = (array) ($area->search_criteria ?? []);
        if ($pageDef['kind'] === 'property_subtype') {
            $criteria['property_subtypes'] = [$pageDef['value']];
            // The page IS the subtype slice — a community-level type filter
            // that doesn't contain this subtype's parent would zero it out.
            unset($criteria['property_types']);
        } else {
            $criteria['property_types'] = [$pageDef['value']];
        }
        // Property pages always narrow the manual filters, never a saved search.
        unset($criteria['hotsheet_id']);

        return $criteria;
    }
}
