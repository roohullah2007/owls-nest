<?php

declare(strict_types=1);

namespace App\Services\Sites;

use App\Models\AgentWebsite;
use App\Models\WebsiteArea;
use App\Services\Mls\FeaturedListingsResolver;

/**
 * Renders community / sub-page descriptions for the public site.
 *
 * Owner-written or AI-generated descriptions may contain merge variables —
 * {community}, {location}, {listings_count}, {price_range}, {property_links},
 * {sub_area_links}, {search_link} — which this service resolves to live MLS
 * data and internal links at render time, so the copy never goes stale and
 * every community page cross-links its property-type and sub-area pages.
 *
 * When a community (or sub-page) has no description at all, a fully written
 * SEO template built from the same variables is rendered instead, so no page
 * ships without copy.
 */
final class AreaDescription
{
    /** Per-lifestyle counts are one MLS search each (8h-cached) — bound the fan-out. */
    private const MAX_COUNTED_LIFESTYLES = 8;

    /**
     * Concept sub-pages slice the community by an idea (lifestyle, property
     * type/subtype); everything else (city / zip / neighborhood) is a place.
     */
    private const CONCEPT_KINDS = ['lifestyle', 'property_type', 'property_subtype'];

    /**
     * Rendered description HTML for the community page itself.
     *
     * @param  array<int, array{key: string, label: string, copy: ?string}>  $lifestylePages
     * @param  array<int, array{key: string, kind: string, value: string, label: string, copy: ?string}>  $propertyPages
     */
    public static function communityHtml(AgentWebsite $site, WebsiteArea $area, array $lifestylePages, array $propertyPages, int $listingsTotal, bool $mlsIntegrated): ?string
    {
        $html = trim((string) $area->description);
        if ($html === '') {
            $html = self::defaultCommunityTemplate($area, $lifestylePages, $propertyPages, $listingsTotal, $mlsIntegrated);
        }

        return $html === '' ? null : self::substitute($html, $site, $area, $lifestylePages, $propertyPages, $listingsTotal, $mlsIntegrated, null);
    }

    /**
     * Rendered description HTML for a sub-page (city / zip / neighborhood /
     * lifestyle / property-type slice) — the page's own copy when set, else a
     * short default.
     *
     * @param  array{kind: string, key: string, label: string, copy: ?string}  $sub
     * @param  array<int, array{key: string, label: string, copy: ?string}>  $lifestylePages
     * @param  array<int, array{key: string, kind: string, value: string, label: string, copy: ?string}>  $propertyPages
     */
    public static function subPageHtml(AgentWebsite $site, WebsiteArea $area, array $sub, array $lifestylePages, array $propertyPages, int $listingsTotal, bool $mlsIntegrated): ?string
    {
        $html = trim((string) ($sub['copy'] ?? ''));
        if ($html === '') {
            $html = self::defaultSubTemplate($site, $area, $sub, $listingsTotal, $mlsIntegrated);
        }

        return $html === '' ? null : self::substitute($html, $site, $area, $lifestylePages, $propertyPages, $listingsTotal, $mlsIntegrated, $sub);
    }

    /** Replace every merge variable in $html with its live value / link list. */
    private static function substitute(string $html, AgentWebsite $site, WebsiteArea $area, array $lifestylePages, array $propertyPages, int $listingsTotal, bool $mlsIntegrated, ?array $sub): string
    {
        $criteria = (array) ($area->search_criteria ?? []);

        $map = [
            '{community}' => e($area->name),
            '{location}' => e(self::location($criteria) ?: $area->name),
            '{listings_count}' => number_format(max(0, $listingsTotal)),
            '{price_range}' => e(self::priceRange($criteria)),
            '{sub_area_links}' => self::subAreaLinks($site, $area),
            '{search_link}' => self::searchLink($site, $area, $sub),
        ];

        // Counted property-type links cost one (cached) MLS search per type —
        // only resolve them when the copy actually uses the variable.
        if (stripos($html, '{property_links}') !== false) {
            $map['{property_links}'] = self::propertyLinks($site, $area, $lifestylePages, $propertyPages, $mlsIntegrated);
        }

        $html = str_ireplace(array_keys($map), array_values($map), $html);

        return self::resolvePlaceholderLinks($html, $site, $area, $sub);
    }

    /**
     * Rewrite the placeholder hrefs AI-generated copy uses for inline internal
     * links into real URLs:
     *   #search      → the Property Search page seeded with this place
     *   #page:<key>  → one of this community's lifestyle pages (Condos, …)
     *   #sub:<slug>  → one of its city / ZIP / neighborhood sub-pages
     * Unknown or disabled targets fall back to the community page itself, so
     * a hallucinated link never 404s.
     */
    private static function resolvePlaceholderLinks(string $html, AgentWebsite $site, WebsiteArea $area, ?array $sub): string
    {
        if (! str_contains($html, 'href="#')) {
            return $html;
        }

        return (string) preg_replace_callback(
            '/href="#(search|page:[a-z0-9\-]+|sub:[a-z0-9\-]+)"/i',
            function (array $m) use ($site, $area, $sub): string {
                $target = strtolower($m[1]);
                if ($target === 'search') {
                    $criteria = (array) ($area->search_criteria ?? []);
                    $isPlaceSub = $sub && ! in_array($sub['kind'] ?? '', self::CONCEPT_KINDS, true);
                    $seed = $isPlaceSub ? $sub['label'] : (((array) ($criteria['cities'] ?? []))[0] ?? $area->name);

                    return 'href="'.e(route('agent-site.properties', $site->slug).'?q='.urlencode((string) $seed)).'"';
                }

                [$kind, $key] = explode(':', $target, 2);
                $valid = $kind === 'page'
                    ? (collect((array) ($area->lifestyle_pages ?? []))->pluck('key')->contains($key)
                        || collect(CommunityPropertyPages::pagesFor($site, $area))->pluck('key')->contains($key))
                    : $area->findSubArea($key) !== null;
                $url = $valid
                    ? route('agent-site.areas.sub', [$site->slug, $area->slug, $key])
                    : route('agent-site.areas.show', [$site->slug, $area->slug]);

                return 'href="'.e($url).'"';
            },
            $html
        );
    }

    /**
     * Default SEO copy for a community with no owner description — written
     * with the same merge variables, so it carries live counts and internal
     * links. Paragraphs without data behind them are skipped.
     */
    private static function defaultCommunityTemplate(WebsiteArea $area, array $lifestylePages, array $propertyPages, int $listingsTotal, bool $mlsIntegrated): string
    {
        $criteria = (array) ($area->search_criteria ?? []);
        $location = self::location($criteria);

        $intro = 'Welcome to our {community} real estate guide';
        if ($location !== '' && strcasecmp($location, $area->name) !== 0) {
            $intro .= ', covering {location}';
        }
        $intro .= '. Every listing on this page comes straight from the MLS, so the homes you see here reflect the live market.';
        $paragraphs = ['<p>'.$intro.'</p>'];

        if ($mlsIntegrated && $listingsTotal > 0) {
            $market = 'There are currently <strong>{listings_count}</strong> homes for sale in {community}';
            if (self::priceRange($criteria) !== '') {
                $market .= ', priced {price_range}';
            }
            $market .= '. New listings hit the market all the time, so check back often.';
            $paragraphs[] = '<p>'.$market.'</p>';
        }

        if (! empty($propertyPages) || ! empty($lifestylePages)) {
            $paragraphs[] = '<p>Looking for something specific? Browse {community} real estate by property type: {property_links}.</p>';
        }

        if (! empty($area->subAreaEntries())) {
            $paragraphs[] = '<p>You can also explore the areas that make up {community}, including {sub_area_links}.</p>';
        }

        $paragraphs[] = '<p>Ready to take a closer look? You can {search_link} at any time, or reach out for neighborhood-level guidance and private tours.</p>';

        return implode('', $paragraphs);
    }

    /** Default copy for a sub-page (lifestyle / property type or city/zip/neighborhood slice). */
    private static function defaultSubTemplate(AgentWebsite $site, WebsiteArea $area, array $sub, int $listingsTotal, bool $mlsIntegrated): string
    {
        $guideUrl = e(route('agent-site.areas.show', [$site->slug, $area->slug]));
        $guideLink = '<a href="'.$guideUrl.'">{community} community guide</a>';
        $label = e($sub['label']);

        $isConcept = in_array($sub['kind'], self::CONCEPT_KINDS, true);
        // Concept pages carry a search-intent phrase ("Condos for Sale").
        $display = e($sub['seo_label'] ?? $sub['label']);
        $what = $isConcept ? strtolower($display) : 'homes for sale';
        $where = $isConcept ? '{community}' : $label;

        $market = $mlsIntegrated && $listingsTotal > 0
            ? "There are currently <strong>{listings_count}</strong> {$what} in {$where}, pulled directly from the MLS."
            : "Browse {$what} in {$where}, pulled directly from the MLS.";

        $paragraphs = [
            '<p>'.$market.' Every listing on this page comes straight from the live feed — photos, prices and details update as the market moves, so what you see here is what is actually available right now.</p>',
        ];

        if ($isConcept) {
            $paragraphs[] = "<p>{$where} attracts buyers looking for exactly this kind of property, and inventory shifts week to week — new listings arrive, prices adjust and the best-priced homes go under contract quickly. Browsing {$what} side by side makes it easy to compare layouts, finishes and price per square foot before shortlisting the ones worth a closer look.</p>";
        } else {
            $paragraphs[] = "<p>{$label} is one of the areas that make up {community}, with its own mix of streets, price points and property styles. Inventory here shifts week to week — new listings arrive, prices adjust and well-priced homes go under contract quickly — so it pays to check back often or set up alerts.</p>";
        }

        $paragraphs[] = "<p>For the full picture of the area — neighborhoods, lifestyle and market trends — head back to the {$guideLink}, or {search_link} to see everything on the market. Questions about a specific listing? Reach out any time for current pricing, private tours and honest neighborhood-level guidance.</p>";

        return implode('', $paragraphs);
    }

    /**
     * Linked property-type and lifestyle pages, with live listing counts when
     * available. Property type/subtype pages lead (they ARE the "browse by
     * property type" links); lifestyle pages follow.
     */
    private static function propertyLinks(AgentWebsite $site, WebsiteArea $area, array $lifestylePages, array $propertyPages, int|bool $mlsIntegrated): string
    {
        $defs = [];
        foreach ($propertyPages as $pp) {
            // Search-intent anchors ("Condos for Sale") when available.
            $defs[] = ['key' => $pp['key'], 'label' => $pp['seo_label'] ?? $pp['label'], 'criteria' => CommunityPropertyPages::criteriaFor($area, $pp)];
        }
        foreach ($lifestylePages as $lp) {
            $defs[] = ['key' => $lp['key'], 'label' => $lp['label'], 'criteria' => CommunityLifestyles::criteriaFor($area, $lp['key'])];
        }

        $parts = [];
        foreach (array_values($defs) as $i => $def) {
            $url = e(route('agent-site.areas.sub', [$site->slug, $area->slug, $def['key']]));
            $link = '<a href="'.$url.'">'.e($def['label']).'</a>';
            if ($mlsIntegrated && $i < self::MAX_COUNTED_LIFESTYLES) {
                $count = self::sliceCount($site, $def['criteria']);
                if ($count !== null && $count > 0) {
                    $link .= ' ('.number_format($count).')';
                }
            }
            $parts[] = $link;
        }

        return self::joinList($parts);
    }

    /** Linked sub-area (city / zip / neighborhood) pages. */
    private static function subAreaLinks(AgentWebsite $site, WebsiteArea $area): string
    {
        $parts = [];
        foreach ($area->subAreaEntries() as $entry) {
            $url = e(route('agent-site.areas.sub', [$site->slug, $area->slug, $entry['slug']]));
            $parts[] = '<a href="'.$url.'">'.e($entry['label']).'</a>';
        }

        return self::joinList($parts);
    }

    /**
     * Live active-listing count for one slice (lifestyle / property type) of
     * the community. Cache-only (8h public-page cache, limit=1 keeps the
     * payload to a count): a slice that isn't cached yet renders without its
     * count and is warmed after the response, so a cold community page never
     * blocks on one MLS search per linked page.
     */
    private static function sliceCount(AgentWebsite $site, array $criteria): ?int
    {
        try {
            $criteria['limit'] = 1;

            return FeaturedListingsResolver::cachedAreaTotal($site, $criteria, 1);
        } catch (\Throwable) {
            return null;
        }
    }

    /** A link into the site's Property Search page, seeded with this place. */
    private static function searchLink(AgentWebsite $site, WebsiteArea $area, ?array $sub): string
    {
        $criteria = (array) ($area->search_criteria ?? []);
        $isPlaceSub = $sub && ! in_array($sub['kind'] ?? '', self::CONCEPT_KINDS, true);
        $seed = $isPlaceSub ? $sub['label'] : (((array) ($criteria['cities'] ?? []))[0] ?? $area->name);
        $place = $isPlaceSub ? $sub['label'] : $area->name;
        $url = e(route('agent-site.properties', $site->slug).'?q='.urlencode((string) $seed));

        return '<a href="'.$url.'">search all homes for sale in '.e($place).'</a>';
    }

    /** "Coral Gables, Miami-Dade County" from the community's cities + counties. */
    private static function location(array $criteria): string
    {
        $parts = [];
        foreach ((array) ($criteria['cities'] ?? []) as $city) {
            $parts[] = preg_replace('/,\s*[A-Z]{2}$/', '', (string) $city);
        }
        foreach ((array) ($criteria['counties'] ?? []) as $county) {
            $parts[] = (string) $county;
        }

        return implode(', ', array_filter(array_unique($parts)));
    }

    /** "from $500,000 to $2,000,000" / "from $500,000" / "up to $2,000,000" / "". */
    private static function priceRange(array $criteria): string
    {
        $min = isset($criteria['min_price']) && is_numeric($criteria['min_price']) && (float) $criteria['min_price'] > 0
            ? '$'.number_format((float) $criteria['min_price']) : null;
        $max = isset($criteria['max_price']) && is_numeric($criteria['max_price']) && (float) $criteria['max_price'] > 0
            ? '$'.number_format((float) $criteria['max_price']) : null;

        return match (true) {
            $min && $max => "from {$min} to {$max}",
            (bool) $min => "from {$min}",
            (bool) $max => "up to {$max}",
            default => '',
        };
    }

    /** "a", "a and b", "a, b and c". */
    private static function joinList(array $parts): string
    {
        $parts = array_values(array_filter($parts));
        if (count($parts) <= 1) {
            return $parts[0] ?? '';
        }
        $last = array_pop($parts);

        return implode(', ', $parts).' and '.$last;
    }
}
