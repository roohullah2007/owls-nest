<?php

declare(strict_types=1);

namespace App\Services\Sites;

use App\Models\AgentWebsite;
use App\Models\IdxConnection;
use App\Models\User;
use App\Models\WebsiteArea;
use App\Services\Mls\MlsDatasetRegistry;

/**
 * The lifestyle-page catalog for community SEO pages (Sierra-style):
 * each entry is a toggleable button on a community page that renders its own
 * listing page at /neighborhoods/{area}/{key} — the community's filters plus
 * the entry's MLS lifestyle keyword (translated per-dataset by the gateway,
 * see MlsDataset::translateLifestyle()).
 *
 * Adding an entry = one line here + (if it's a new keyword) a translation on
 * each dataset that supports it. Entries whose keyword no connected MLS can
 * answer are hidden from the public page automatically.
 */
final class CommunityLifestyles
{
    /**
     * key (URL slug) => [label, MLS lifestyle keyword]
     *
     * Genuine lifestyles ONLY — property types/subtypes (Condos, Single
     * Family, Vacant Land, Rentals, Multi-Family, Townhomes) moved to the
     * taxonomy-driven Property Type / Sub-Type pages (CommunityPropertyPages).
     * The 2026-06 migration converted existing communities' rows.
     */
    public const CATALOG = [
        'luxury-homes' => ['label' => 'Luxury Homes', 'lifestyle' => 'luxury'],
        'new-construction' => ['label' => 'New Construction', 'lifestyle' => 'new-construction'],
        'waterfront' => ['label' => 'Waterfront Homes', 'lifestyle' => 'waterfront'],
        'ocean-front' => ['label' => 'Ocean Front', 'lifestyle' => 'beachfront'],
        'bay-front' => ['label' => 'Bay Front', 'lifestyle' => 'bay-front'],
        'boating' => ['label' => 'Boating', 'lifestyle' => 'boating'],
        'golf' => ['label' => 'Golf Homes', 'lifestyle' => 'golf'],
        'pool-homes' => ['label' => 'Pool Homes', 'lifestyle' => 'pool'],
        'adult-55' => ['label' => '55+ Communities', 'lifestyle' => '55-plus'],
        'gated' => ['label' => 'Gated Communities', 'lifestyle' => 'gated'],
        'pet-friendly' => ['label' => 'Pet Friendly', 'lifestyle' => 'pet-friendly'],
        'furnished' => ['label' => 'Furnished', 'lifestyle' => 'furnished'],
    ];

    /** @return array<int, array{key: string, label: string, lifestyle: string}> */
    public static function all(): array
    {
        $out = [];
        foreach (self::CATALOG as $key => $entry) {
            $out[] = ['key' => $key, 'label' => $entry['label'], 'lifestyle' => $entry['lifestyle']];
        }

        return $out;
    }

    public static function find(string $key): ?array
    {
        $entry = self::CATALOG[$key] ?? null;

        return $entry ? ['key' => $key, 'label' => $entry['label'], 'lifestyle' => $entry['lifestyle']] : null;
    }

    /**
     * Lifestyle keywords AT LEAST ONE of the site owner's connected MLS
     * datasets can translate — entries outside this union would render
     * all-error pages, so they're hidden.
     *
     * @return string[]
     */
    public static function supportedKeywordsFor(AgentWebsite $site): array
    {
        $owner = self::ownerUser($site);
        if (! $owner) {
            return [];
        }

        $registry = app(MlsDatasetRegistry::class);
        $slugs = IdxConnection::where('is_active', true)
            ->where(function ($w) use ($owner) {
                $w->where('user_id', $owner->id);
                if ($owner->team_id) {
                    $w->orWhere('team_id', $owner->team_id);
                }
            })
            ->pluck('mls_slug')->filter()->unique();

        $keywords = [];
        foreach ($slugs as $slug) {
            $dataset = $registry->find($slug);
            if ($dataset) {
                $keywords = array_merge($keywords, $dataset->getSupportedLifestyles());
            }
        }

        return array_values(array_unique($keywords));
    }

    /**
     * The enabled + MLS-supported lifestyle pages for a community, each with
     * its optional owner-edited copy. `lifestyle_pages` rows: {key, copy?}.
     *
     * @return array<int, array{key: string, label: string, copy: ?string}>
     */
    public static function pagesFor(WebsiteArea $area, array $supportedKeywords): array
    {
        $out = [];
        foreach ((array) ($area->lifestyle_pages ?? []) as $row) {
            $key = (string) ($row['key'] ?? '');
            $entry = self::CATALOG[$key] ?? null;
            if (! $entry || ! in_array($entry['lifestyle'], $supportedKeywords, true)) {
                continue;
            }
            $out[] = [
                'key' => $key,
                'label' => $entry['label'],
                'copy' => trim((string) ($row['copy'] ?? '')) ?: null,
            ];
        }

        return $out;
    }

    /** Site owner — same resolution as FeaturedListingsResolver (user, else team member with a feed). */
    public static function ownerUser(AgentWebsite $site): ?User
    {
        if ($site->user_id) {
            return User::find($site->user_id);
        }
        if ($site->team_id) {
            return User::where('team_id', $site->team_id)
                ->whereHas('idxConnections', fn ($q) => $q->where('is_active', true))
                ->first()
                ?? User::where('team_id', $site->team_id)->first();
        }

        return null;
    }

    /** The community's filters narrowed to a lifestyle (gateway translates per-MLS). */
    public static function criteriaFor(WebsiteArea $area, string $key): array
    {
        $entry = self::CATALOG[$key] ?? null;
        $criteria = (array) ($area->search_criteria ?? []);
        if ($entry) {
            $criteria['lifestyles'] = [$entry['lifestyle']];
        }
        // Lifestyle pages always narrow the manual filters, never a saved search.
        unset($criteria['hotsheet_id']);

        return $criteria;
    }
}
