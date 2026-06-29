<?php

declare(strict_types=1);

namespace App\Services\Mls;

use App\Models\AgentWebsite;
use App\Models\AgentWebsiteListingSlug;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Str;

/**
 * Resolves the SEO slug a public listing-detail URL uses
 * (/site/{site}/property/{address-slug}) for one or many listings. Slugs are
 * derived from the listing address, unique per site, and persisted in
 * agent_website_listing_slugs so URLs stay stable across searches; the MLS
 * slug and raw listing key never appear in public URLs.
 */
class ListingSlugResolver
{
    private const MAX_SLUG_LENGTH = 96;

    /**
     * Batch-resolve slugs for a page of listings (one select + one insert).
     *
     * @param  array<int, array{mls_slug: string, listing_id: string, address: string}>  $items
     * @return array<string, string> "{mls_slug}:{listing_id}" => slug
     */
    public function slugsFor(AgentWebsite $site, array $items): array
    {
        $items = array_values(array_filter($items, fn ($i) => ($i['mls_slug'] ?? '') !== '' && ($i['listing_id'] ?? '') !== ''));
        if ($items === []) {
            return [];
        }

        $existing = AgentWebsiteListingSlug::where('agent_website_id', $site->id)
            ->where(function ($q) use ($items) {
                foreach ($items as $item) {
                    $q->orWhere(fn ($w) => $w->where('mls_slug', $item['mls_slug'])->where('listing_id', $item['listing_id']));
                }
            })
            ->get();

        $map = [];
        foreach ($existing as $row) {
            $map[$row->mls_slug.':'.$row->listing_id] = $row->slug;
        }

        $taken = null; // site slugs, loaded lazily only when something is missing
        foreach ($items as $item) {
            $key = $item['mls_slug'].':'.$item['listing_id'];
            if (isset($map[$key])) {
                continue;
            }

            $taken ??= AgentWebsiteListingSlug::where('agent_website_id', $site->id)->pluck('slug')->flip()->all();

            $slug = $this->uniqueSlug($item['address'] ?? '', $taken);
            $taken[$slug] = true;

            try {
                AgentWebsiteListingSlug::create([
                    'agent_website_id' => $site->id,
                    'slug' => $slug,
                    'mls_slug' => $item['mls_slug'],
                    'listing_id' => $item['listing_id'],
                ]);
            } catch (UniqueConstraintViolationException) {
                // Concurrent request created it first — reuse whatever won.
                $slug = AgentWebsiteListingSlug::where('agent_website_id', $site->id)
                    ->where('mls_slug', $item['mls_slug'])
                    ->where('listing_id', $item['listing_id'])
                    ->value('slug') ?? $slug;
            }

            $map[$key] = $slug;
        }

        return $map;
    }

    /** Single-listing convenience around slugsFor(). */
    public function slugFor(AgentWebsite $site, string $mlsSlug, string $listingId, string $address): string
    {
        return $this->slugsFor($site, [[
            'mls_slug' => $mlsSlug,
            'listing_id' => $listingId,
            'address' => $address,
        ]])[$mlsSlug.':'.$listingId];
    }

    /** Look a public slug back up to its (mls_slug, listing_id) row. */
    public function find(AgentWebsite $site, string $slug): ?AgentWebsiteListingSlug
    {
        return AgentWebsiteListingSlug::where('agent_website_id', $site->id)
            ->where('slug', $slug)
            ->first();
    }

    /**
     * Address → site-unique slug ("2200-brickell-ave-miami-fl"); numeric
     * suffix on collision (re-listed address, different listing).
     *
     * @param  array<string, true>  $taken
     */
    private function uniqueSlug(string $address, array $taken): string
    {
        $base = Str::limit(Str::slug($address), self::MAX_SLUG_LENGTH, '');
        $base = trim($base, '-') ?: 'listing';

        if (! isset($taken[$base])) {
            return $base;
        }

        for ($i = 2; ; $i++) {
            $candidate = $base.'-'.$i;
            if (! isset($taken[$candidate])) {
                return $candidate;
            }
        }
    }
}
