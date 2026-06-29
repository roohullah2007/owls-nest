<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor\Concerns;

use App\Models\AgentWebsite;
use App\Models\Developer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Shared behavior for the directory managers (New Developments + Condo
 * Directory editor APIs — deliberate duplicates): developer-taxonomy
 * resolution, the media upload endpoint, local-file cleanup and the common
 * validation rules.
 */
trait ManagesDirectoryListings
{
    private function publicUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return Str::startsWith($path, ['http://', 'https://']) ? $path : Storage::disk('public')->url($path);
    }

    /**
     * Developer taxonomy resolution: an existing developer_id (must be
     * platform or this site's own) wins and syncs the display name/info;
     * otherwise a typed developer name creates-or-updates a site-owned
     * Developer carrying the submitted logo/about.
     */
    private function resolveDeveloper(AgentWebsite $site, array $validated): array
    {
        $logo = $validated['developer_logo'] ?? null;
        unset($validated['developer_logo']);

        if (! empty($validated['developer_id'])) {
            $developer = Developer::query()->visibleToSite($site)->find($validated['developer_id']);
            abort_unless($developer !== null, 422, 'Unknown developer.');

            $validated['developer_id'] = $developer->id;
            $validated['developer'] = $developer->name;
            $validated['developer_info'] = $validated['developer_info'] ?? $developer->info;

            return $validated;
        }

        $name = trim((string) ($validated['developer'] ?? ''));
        if ($name === '') {
            $validated['developer_id'] = null;

            return $validated;
        }

        // Reuse a visible developer with the same name before creating one.
        $developer = Developer::query()->visibleToSite($site)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();

        if (! $developer) {
            $developer = Developer::create([
                'agent_website_id' => $site->id,
                'name' => $name,
                'slug' => Developer::generateSlug($name),
                'logo' => $logo,
                'info' => $validated['developer_info'] ?? null,
            ]);
        } elseif ($developer->agent_website_id === $site->id) {
            // Owner edits to their own developer's logo/about flow through.
            $developer->update(array_filter([
                'logo' => $logo,
                'info' => $validated['developer_info'] ?? null,
            ], fn ($v) => $v !== null));
        }

        $validated['developer_id'] = $developer->id;
        $validated['developer'] = $developer->name;

        return $validated;
    }

    /** Delete an item's locally stored files (hot-linked URLs stay). */
    private function deleteListingMedia(Model $item): void
    {
        $paths = array_merge(
            [$item->image, $item->logo, $item->brochure],
            (array) $item->gallery,
            array_column((array) $item->floor_plans, 'image'),
        );
        foreach (array_filter($paths) as $path) {
            if (is_string($path) && ! Str::startsWith($path, ['http://', 'https://'])) {
                Storage::disk('public')->delete($path);
            }
        }
    }

    /**
     * Shared upload for all item media. `kind` picks the rules: image | logo
     * | gallery | floor_plan (images) or brochure (PDF). Returns the storage
     * path (save it on the item) plus a preview URL.
     */
    private function handleDirectoryUpload(Request $request, AgentWebsite $agentWebsite, string $dir): JsonResponse
    {
        $validated = $request->validate([
            'kind' => 'required|string|in:image,logo,gallery,floor_plan,brochure',
            'file' => $request->input('kind') === 'brochure'
                ? 'required|file|mimes:pdf|max:20480'
                : 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240',
        ]);

        $path = $request->file('file')->store($dir, 'public');
        $this->recordMedia($agentWebsite, $path, $request->file('file'));

        return response()->json([
            'success' => true,
            'kind' => $validated['kind'],
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /**
     * The common validation rules. $table scopes the per-site unique-name
     * rule; $statuses is the model's STATUSES list.
     *
     * @param  string[]  $statuses
     */
    private function directoryRules(Request $request, string $table, array $statuses, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                // Unique within this site's own items (the platform catalog may share names).
                Rule::unique($table, 'name')
                    ->where('agent_website_id', $request->route('agentWebsite')->id)
                    ->ignore($ignoreId),
            ],
            'area' => 'required|string|max:120',
            'city' => 'nullable|string|max:120',
            'zip' => 'nullable|string|max:12',
            'address' => 'nullable|string|max:255',
            'image' => 'nullable|string|max:500',
            'logo' => 'nullable|string|max:500',
            'description' => 'nullable|string|max:20000',
            'developer_id' => 'nullable|integer',
            'developer' => 'nullable|string|max:160',
            'developer_logo' => 'nullable|string|max:500',
            'developer_info' => 'nullable|string|max:10000',
            'architect' => 'nullable|string|max:160',
            'interior_design' => 'nullable|string|max:160',
            'status' => ['required', Rule::in($statuses)],
            'completion_year' => 'nullable|string|max:12',
            'price_label' => 'nullable|string|max:64',
            'highlights' => 'nullable|array|max:30',
            'highlights.*' => 'string|max:300',
            'key_details' => 'nullable|array|max:20',
            'key_details.*.label' => 'required|string|max:80',
            'key_details.*.value' => 'required|string|max:300',
            // Ordered steps, e.g. "20% at Contract".
            'deposit_schedule' => 'nullable|array|max:12',
            'deposit_schedule.*' => 'string|max:160',
            'gallery' => 'nullable|array|max:30',
            'gallery.*' => 'string|max:500',
            'floor_plans' => 'nullable|array|max:20',
            'floor_plans.*.label' => 'nullable|string|max:120',
            'floor_plans.*.image' => 'required|string|max:500',
            'brochure' => 'nullable|string|max:500',
            'video_url' => 'nullable|url|max:500',
            'mls_keyword' => 'nullable|string|max:160',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);
    }
}
