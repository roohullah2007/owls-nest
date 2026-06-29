<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WebsiteArea extends Model
{
    protected $fillable = [
        'agent_website_id',
        'name',
        'slug',
        'image',
        'description',
        'description_heading',
        'search_criteria',
        'sub_areas',
        'lifestyle_pages',
        'property_pages',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'search_criteria' => 'array',
        'sub_areas' => 'array',
        'lifestyle_pages' => 'array',
        'property_pages' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function website(): BelongsTo
    {
        return $this->belongsTo(AgentWebsite::class, 'agent_website_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Normalized sub-area entries (zip / neighborhood SEO sub-pages). Each:
     * { type: 'zip'|'neighborhood', label, value, slug }. Entries missing a
     * slug get one derived from the label so legacy rows keep resolving.
     *
     * @return array<int, array{type: string, label: string, value: string, slug: string}>
     */
    public function subAreaEntries(): array
    {
        $out = [];
        foreach ((array) ($this->sub_areas ?? []) as $sub) {
            $type = in_array($sub['type'] ?? '', ['zip', 'city', 'neighborhood'], true) ? $sub['type'] : 'neighborhood';
            $label = trim((string) ($sub['label'] ?? ''));
            $value = trim((string) ($sub['value'] ?? $label));
            if ($label === '' && $value === '') {
                continue;
            }
            $label = $label !== '' ? $label : $value;
            $out[] = [
                'type' => $type,
                'label' => $label,
                'value' => $value !== '' ? $value : $label,
                'slug' => trim((string) ($sub['slug'] ?? '')) ?: Str::slug($label),
            ];
        }

        return $out;
    }

    /** Find a sub-area entry by its URL slug. */
    public function findSubArea(string $subSlug): ?array
    {
        foreach ($this->subAreaEntries() as $sub) {
            if ($sub['slug'] === $subSlug) {
                return $sub;
            }
        }

        return null;
    }

    /**
     * The community's search_criteria narrowed to a sub-area — zips replace the
     * parent's zip list, a neighborhood narrows the neighborhood list, so the
     * sub-page only shows that slice of the community.
     *
     * @param  array{type: string, label: string, value: string, slug: string}  $sub
     */
    public function criteriaForSubArea(array $sub): array
    {
        $criteria = (array) ($this->search_criteria ?? []);
        if ($sub['type'] === 'zip') {
            $criteria['zips'] = [$sub['value']];
        } elseif ($sub['type'] === 'city') {
            $criteria['cities'] = [$sub['value']];
        } else {
            $criteria['neighborhoods'] = [$sub['value']];
        }
        // A hotsheet-driven community can't narrow a saved search — fall back
        // to the manual filters (which the zip/neighborhood now scopes).
        unset($criteria['hotsheet_id']);

        return $criteria;
    }

    public static function generateSlug(string $name, int $websiteId): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;
        while (static::where('agent_website_id', $websiteId)->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
