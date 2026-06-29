<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\AgentWebsite;
use App\Models\Developer;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Shared behavior for the two directory catalogs (NewDevelopment +
 * CondoBuilding — deliberate duplicates). The model defines:
 *  - CONFIG_KEY: its page_data._config key ("new_developments" | "condo_directory")
 *  - SLUG_FALLBACK: the slug base when a name slugs to nothing
 */
trait IsDirectoryListing
{
    /** The linked taxonomy developer ("developer" stays the denormalized display name). */
    public function developerProfile(): BelongsTo
    {
        return $this->belongsTo(Developer::class, 'developer_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** The admin-curated platform catalog (not owned by any site). */
    public function scopePlatform($query)
    {
        return $query->whereNull('agent_website_id');
    }

    /**
     * What a given site shows on its directory page: the platform catalog
     * (minus items the owner hid) and/or the site's own items, per the
     * owner's source setting in page_data._config.{CONFIG_KEY}.
     */
    public function scopeVisibleToSite($query, AgentWebsite $site)
    {
        $source = (string) data_get($site->page_data, '_config.'.static::CONFIG_KEY.'.source', 'both');
        $hidden = array_values(array_filter(array_map('intval', (array) data_get($site->page_data, '_config.'.static::CONFIG_KEY.'.hidden', []))));

        return $query->where(function ($q) use ($source, $hidden, $site) {
            if (in_array($source, ['platform', 'both'], true)) {
                $q->orWhere(function ($w) use ($hidden) {
                    $w->whereNull('agent_website_id');
                    if ($hidden !== []) {
                        $w->whereNotIn('id', $hidden);
                    }
                });
            }
            if (in_array($source, ['own', 'both'], true)) {
                $q->orWhere('agent_website_id', $site->id);
            }
        });
    }

    /** The term the MLS search matches for this item's live listings. */
    public function listingKeyword(): string
    {
        return trim((string) $this->mls_keyword) ?: $this->name;
    }

    /** "Pre-Construction" from "pre-construction". */
    public function statusLabel(): string
    {
        return Str::of((string) $this->status)->replace('-', ' ')->title()->toString();
    }

    /**
     * Numeric starting price parsed from the display price_label
     * ("From $1.7M" → 1700000, "From $850K" → 850000) — used by the
     * directory's client-side price filter. Null when unparseable.
     */
    public function priceFromValue(): ?int
    {
        if (! preg_match('/\$\s*([\d.,]+)\s*(M|K)?/i', (string) $this->price_label, $m)) {
            return null;
        }

        $n = (float) str_replace(',', '', $m[1]);
        $unit = strtoupper($m[2] ?? '');

        return (int) round($n * match ($unit) {
            'M' => 1_000_000,
            'K' => 1_000,
            default => 1,
        });
    }

    /**
     * Street + city + zip for display. Older/platform rows often store the
     * whole thing in `address` already — those pass through untouched.
     */
    public function fullAddress(): ?string
    {
        $address = trim((string) $this->address);
        if ($address === '' || str_contains($address, ',')) {
            return $address ?: null;
        }

        return implode(', ', array_filter([$address, trim((string) $this->city), trim((string) $this->zip)])) ?: null;
    }

    /**
     * The street part of the address ("444 Brickell Avenue" from
     * "444 Brickell Avenue, Miami, FL") — matched against the MLS
     * UnparsedAddress so the building's own listings surface.
     */
    public function streetAddress(): ?string
    {
        $street = trim((string) Str::of((string) $this->address)->before(','));

        // Only useful when it looks like "<number> <street>" — a bare city or
        // project name would match far too much.
        return preg_match('/^\d+\s+\S+/', $street) ? $street : null;
    }

    public static function generateSlug(string $name): string
    {
        $base = Str::slug($name) ?: static::SLUG_FALLBACK;
        $slug = $base;
        $i = 1;
        while (static::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
