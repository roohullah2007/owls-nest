<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\WebsiteEditor;

use App\Http\Controllers\Api\WebsiteEditor\Concerns\RecordsMedia;
use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Services\Sites\ImageOptimizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    use RecordsMedia;

    /**
     * Upload an image into the site's Media Library. The single upload path used
     * by the media picker across every image field. Images are optimized on the
     * way in (EXIF rotation, ≤2560px, re-encoded) via ImageOptimizer.
     */
    public function uploadMedia(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240']);

        $file = $request->file('file');
        $path = ImageOptimizer::storeOptimized($file, 'agent-websites/library/'.$agentWebsite->id);
        $media = $this->recordMedia($agentWebsite, $path, $file);

        return response()->json([
            'success' => true,
            'media' => $media,
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** Upload the agent photo and set it on the site. */
    public function uploadPhoto(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $request->validate(['photo' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240']);

        $path = $request->file('photo')->store('agent-websites/photos', 'public');
        $agentWebsite->update(['agent_photo' => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('photo'));

        return response()->json([
            'success' => true,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** Upload the hero image and set it on the site. */
    public function uploadHero(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $request->validate(['hero' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240']);

        $path = $request->file('hero')->store('agent-websites/heroes', 'public');
        $agentWebsite->update(['hero_image' => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('hero'));

        return response()->json([
            'success' => true,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** Upload the brokerage logo and set it on the site. */
    public function uploadLogo(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $request->validate(['logo' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:2048']);

        $path = $request->file('logo')->store('agent-websites/logos', 'public');
        $agentWebsite->update(['brokerage_logo' => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('logo'));

        return response()->json([
            'success' => true,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** Upload a site logo (light or dark variant) and set it on the site. */
    public function uploadSiteLogo(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $request->validate([
            'site_logo' => 'required|mimes:jpg,jpeg,png,gif,svg,webp,avif|max:2048',
            'variant' => 'nullable|string|in:light,dark',
        ]);

        $field = $request->input('variant') === 'dark' ? 'site_logo_dark' : 'site_logo_light';

        $path = $request->file('site_logo')->store('agent-websites/logos', 'public');
        $agentWebsite->update([$field => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('site_logo'));

        return response()->json([
            'success' => true,
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** Upload the favicon and set it on the site. */
    public function uploadFavicon(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $request->validate(['favicon' => 'required|file|mimes:ico,png,svg,jpg,jpeg,gif,webp,avif|max:1024']);

        $path = $request->file('favicon')->store('agent-websites/favicons', 'public');
        $agentWebsite->update(['favicon' => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('favicon'));

        return response()->json([
            'success' => true,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** Upload the social-share (Open Graph) image and set it on the site. */
    public function uploadOgImage(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $request->validate(['og_image' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:5120']);

        $path = $request->file('og_image')->store('agent-websites/og-images', 'public');
        $agentWebsite->update(['og_image' => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('og_image'));

        return response()->json([
            'success' => true,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** Upload an image for use inside a content block. */
    public function uploadBlockImage(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $request->validate(['image' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240']);

        $path = $request->file('image')->store('agent-websites/blocks', 'public');
        $this->recordMedia($agentWebsite, $path, $request->file('image'));

        return response()->json([
            'success' => true,
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** Upload an image for use in a blog post. */
    public function uploadBlogImage(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $request->validate(['image' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240']);

        $path = $request->file('image')->store('agent-websites/blog', 'public');
        $this->recordMedia($agentWebsite, $path, $request->file('image'));

        return response()->json([
            'success' => true,
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** List every image attached to the site (library, columns, page data, blocks, blog, areas). */
    /**
     * Displayable URL for a stored reference. Some references (seeded blog/area
     * images, externally-hosted block images) are already absolute URLs — pass
     * those through untouched instead of wrapping them in Storage::url(), which
     * would yield a broken "/storage/https://…" path and the image fails to load.
     */
    private function mediaUrl(string $value): string
    {
        return Str::startsWith($value, ['http://', 'https://'])
            ? $value
            : Storage::disk('public')->url($value);
    }

    public function listMedia(AgentWebsite $agentWebsite): JsonResponse
    {
        $images = [];

        // Library items first (newest uploads on top), then images already in use
        // that predate the library — deduped by path below.
        foreach ($agentWebsite->media()->latest()->get() as $m) {
            $images[] = [
                'id' => $m->id,
                'path' => $m->path,
                'url' => $m->url,
                'label' => $m->filename ?: basename($m->path),
                'source' => 'library',
            ];
        }

        // Column-stored images
        $columnImages = [
            'agent_photo' => 'Agent Photo',
            'hero_image' => 'Hero Image',
            'site_logo_light' => 'Site Logo (Light)',
            'site_logo_dark' => 'Site Logo (Dark)',
            'brokerage_logo_light' => 'Brokerage Logo (Light)',
            'brokerage_logo_dark' => 'Brokerage Logo (Dark)',
            'favicon' => 'Favicon',
            'og_image' => 'Social Share Image',
        ];

        foreach ($columnImages as $field => $label) {
            if ($agentWebsite->$field) {
                $images[] = [
                    'path' => $agentWebsite->$field,
                    'url' => $this->mediaUrl($agentWebsite->$field),
                    'label' => $label,
                    'source' => $field,
                ];
            }
        }

        // Page-data images (section-specific uploads)
        $pageImageKeys = [
            'home' => [
                'about_image' => 'Home — About Image',
                'buy_card_image' => 'Home — Buy Card',
                'sell_card_image' => 'Home — Sell Card',
                'hero_video_url' => null, // skip videos
            ],
            'about' => ['about_image' => 'About — Photo', 'header_image' => 'About — Header'],
            'buy' => ['why_image' => 'Buy — Why Work Image', 'header_image' => 'Buy — Header'],
            'sell' => ['why_image' => 'Sell — Why List Image', 'header_image' => 'Sell — Header'],
            'contact' => ['header_image' => 'Contact — Header'],
            'areas' => ['header_image' => 'Areas — Header'],
        ];

        $pageData = $agentWebsite->page_data ?? [];
        foreach ($pageImageKeys as $page => $keys) {
            foreach ($keys as $key => $label) {
                if ($label === null) {
                    continue;
                }
                $val = $pageData[$page][$key] ?? null;
                if ($val && is_string($val)) {
                    $images[] = [
                        'path' => $val,
                        'url' => $this->mediaUrl($val),
                        'label' => $label,
                        'source' => "page_data.{$page}.{$key}",
                    ];
                }
            }
        }

        // Block images
        foreach ($pageData as $page => $data) {
            if ($page === '_config' || ! is_array($data)) {
                continue;
            }
            foreach ($data['blocks'] ?? [] as $block) {
                foreach ($block['data'] ?? [] as $bKey => $bVal) {
                    if ($bVal && is_string($bVal) && str_starts_with($bVal, 'agent-websites/')) {
                        $images[] = [
                            'path' => $bVal,
                            'url' => Storage::disk('public')->url($bVal),
                            'label' => ucfirst($page).' — Block: '.($block['type'] ?? 'unknown'),
                            'source' => "block:{$block['id']}",
                        ];
                    }
                }
            }
        }

        // Blog featured images
        foreach ($agentWebsite->blogPosts as $post) {
            if ($post->featured_image) {
                $images[] = [
                    'path' => $post->featured_image,
                    'url' => $this->mediaUrl($post->featured_image),
                    'label' => 'Blog — '.$post->title,
                    'source' => "blog:{$post->id}",
                ];
            }
        }

        // Area images
        foreach ($agentWebsite->areas as $area) {
            if ($area->image) {
                $images[] = [
                    'path' => $area->image,
                    'url' => $this->mediaUrl($area->image),
                    'label' => 'Area — '.$area->name,
                    'source' => "area:{$area->id}",
                ];
            }
        }

        // Dedupe by path — the first occurrence (a library row) wins.
        $seen = [];
        $images = array_values(array_filter($images, function ($img) use (&$seen) {
            if (isset($seen[$img['path']])) {
                return false;
            }
            $seen[$img['path']] = true;

            return true;
        }));

        return response()->json(['images' => $images]);
    }

    /** Delete an image from the library, the disk and every reference on the site. */
    public function deleteMedia(Request $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $path = $request->input('path');
        // Accept either a managed disk path (agent-websites/…) or an absolute URL
        // (seeded blog/area images, externally-hosted block images). For the URL
        // case there's no file to unlink — we only clear the references below.
        $isLocal = is_string($path) && str_starts_with($path, 'agent-websites/');
        $isRemote = is_string($path) && Str::startsWith($path, ['http://', 'https://']);
        if (! $path || (! $isLocal && ! $isRemote)) {
            return response()->json(['error' => 'Invalid path'], 422);
        }

        // Check if it's a column-stored image and clear the column
        $columnFields = ['agent_photo', 'hero_image', 'site_logo_light', 'site_logo_dark', 'brokerage_logo_light', 'brokerage_logo_dark', 'favicon', 'og_image'];
        foreach ($columnFields as $field) {
            if ($path === $agentWebsite->$field) {
                $agentWebsite->update([$field => null]);
                break;
            }
        }

        // Check page_data for the image and clear it
        $pageData = $agentWebsite->page_data ?? [];
        $changed = false;
        foreach ($pageData as $page => &$data) {
            if (! is_array($data)) {
                continue;
            }
            foreach ($data as $key => &$val) {
                if ($val === $path) {
                    $val = null;
                    $changed = true;
                }
            }
            // Check blocks
            foreach ($data['blocks'] ?? [] as &$block) {
                foreach ($block['data'] ?? [] as $bKey => &$bVal) {
                    if ($bVal === $path) {
                        $bVal = null;
                        $changed = true;
                    }
                }
            }
        }
        unset($data, $val, $block, $bVal);
        if ($changed) {
            $agentWebsite->update(['page_data' => $pageData]);
        }

        // Clear references on related records (areas, blog featured images).
        $agentWebsite->areas()->where('image', $path)->update(['image' => null]);
        $agentWebsite->blogPosts()->where('featured_image', $path)->update(['featured_image' => null]);

        // Remove the library row and the underlying file (local paths only —
        // remote URLs have no managed file to unlink).
        $agentWebsite->media()->where('path', $path)->delete();
        if ($isLocal) {
            Storage::disk('public')->delete($path);
        }

        return response()->json(['success' => true]);
    }
}
