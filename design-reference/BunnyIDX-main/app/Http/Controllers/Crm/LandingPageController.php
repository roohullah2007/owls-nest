<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\LandingPage;
use App\Models\LandingPageMedia;
use App\Services\Ai\AiClient;
use App\Services\Sites\ImageOptimizer;
use App\Support\LandingPageImages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class LandingPageController extends Controller implements HasMiddleware
{
    /**
     * Landing pages are part of the paid Websites feature. The index list stays
     * open so a downgraded user can still view (read-only) existing pages and
     * see the upgrade prompt; all create/edit/publish actions are gated.
     */
    public static function middleware(): array
    {
        return [new Middleware('feature:websites', except: ['index'])];
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $teamId = $user->active_context === 'team' ? $user->team_id : null;

        $pages = $this->scopedQuery($request)
            ->orderByDesc('created_at')
            ->get(['id', 'uuid', 'slug', 'name', 'type', 'template', 'accent_color', 'is_published', 'submissions_count', 'created_at']);

        return Inertia::render('Crm/LandingPages/Index', [
            'pages' => $pages,
            'isTeam' => (bool) $teamId,
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Crm/LandingPages/Create', [
            'designs' => $this->templateOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $templateKeys = array_keys(config('landing-page-templates'));

        $validated = $request->validate([
            'template' => ['nullable', 'string', 'in:'.implode(',', $templateKeys)],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        // Default to the first (and currently only) template so "New Landing
        // Page" can create in one click without a picker.
        $templateKey = $validated['template'] ?? ($templateKeys[0] ?? null);
        abort_if($templateKey === null, 422, 'No landing-page templates are configured.');

        $page = $this->createFromTemplate($request, $templateKey, $validated['name'] ?? null);

        return redirect()->route('crm.landing-pages.edit', $page->uuid);
    }

    /**
     * AI quick-create: generate a landing page's copy from a free-text prompt,
     * starting from a base template's structure.
     */
    public function generate(Request $request): RedirectResponse
    {
        $templateKeys = array_keys(config('landing-page-templates'));

        // A meaningful prompt is required so the AI has something to work with —
        // blocks empty/whitespace-only/single-character/too-short inputs. Trim
        // first so trailing spaces don't satisfy the length/word checks.
        $request->merge(['prompt' => trim((string) $request->input('prompt'))]);

        $promptMessage = 'Please describe your offer in at least 6 words so AI can create a useful landing page.';

        $validated = $request->validate([
            'prompt' => [
                'required', 'string', 'min:40', 'max:1500',
                function (string $attribute, mixed $value, \Closure $fail) use ($promptMessage): void {
                    $words = preg_split('/\s+/', trim((string) $value), -1, PREG_SPLIT_NO_EMPTY) ?: [];
                    if (count($words) < 6) {
                        $fail($promptMessage);
                    }
                },
            ],
            'template' => ['nullable', 'string', 'in:'.implode(',', $templateKeys)],
        ], [
            'prompt.required' => $promptMessage,
            'prompt.min' => $promptMessage,
        ]);

        $templateKey = $validated['template'] ?? ($templateKeys[0] ?? null);
        abort_if($templateKey === null, 422, 'No landing-page templates are configured.');

        $defaults = config("landing-page-templates.{$templateKey}.defaults", []);
        $blocks = $defaults['blocks'] ?? [];

        $ai = $this->aiCopy($validated['prompt'], $defaults);

        $overrides = [];
        if ($ai !== null) {
            $blocks = $this->applyAiCopy($blocks, $ai);
            $overrides = array_filter([
                'name' => $ai['name'] ?? null,
                'accent_color' => $this->validHex($ai['accent_color'] ?? null),
                'meta_title' => $ai['meta_title'] ?? null,
                'meta_description' => $ai['meta_description'] ?? null,
            ], fn ($v) => $v !== null && $v !== '');
            $overrides['blocks'] = $blocks;
        }

        $page = $this->createFromTemplate($request, $templateKey, $overrides['name'] ?? null, $overrides);

        return redirect()
            ->route('crm.landing-pages.edit', $page->uuid)
            ->with($ai === null ? 'warning' : 'success', $ai === null
                ? 'AI is unavailable right now — created from the template instead. You can edit everything.'
                : 'Landing page generated. Review and publish when ready.');
    }

    /** Create a page from a template, optionally overriding fields (used by AI create). */
    private function createFromTemplate(Request $request, string $templateKey, ?string $name, array $overrides = []): LandingPage
    {
        $user = $request->user();
        $template = config("landing-page-templates.{$templateKey}");
        $defaults = $template['defaults'] ?? [];

        $name = $name ?: $template['name'];
        $teamId = $user->active_context === 'team' ? $user->team_id : null;

        // Resolve the image category once and guarantee every image-based block
        // has a usable image (empty/broken template images → category fallback).
        $category = LandingPageImages::categoryForTemplate($templateKey);
        $blocks = LandingPageImages::applyFallbacks($overrides['blocks'] ?? ($defaults['blocks'] ?? []), $category);

        return LandingPage::create([
            'user_id' => $user->id,
            'team_id' => $teamId,
            'slug' => LandingPage::generateSlug($name),
            'name' => $name,
            'type' => $template['type'],
            'template' => $template['template'],
            'accent_color' => $overrides['accent_color'] ?? ($defaults['accent_color'] ?? '#1693C9'),
            'agent_name' => $user->name,
            'agent_email' => $user->email,
            'agent_phone' => $user->phone,
            'meta_title' => $overrides['meta_title'] ?? ($defaults['meta_title'] ?? $name),
            'meta_description' => $overrides['meta_description'] ?? ($defaults['meta_description'] ?? null),
            'page_data' => ['blocks' => $blocks, '_config' => ['image_category' => $category]],
            'is_published' => false,
        ]);
    }

    /**
     * Ask the AI for landing-page copy as a flat JSON object. Returns null if AI
     * is unavailable or the response can't be parsed (caller falls back to the
     * plain template).
     *
     * @return array<string, mixed>|null
     */
    private function aiCopy(string $prompt, array $defaults): ?array
    {
        $ai = app(AiClient::class);
        if (! $ai->isConfigured()) {
            return null;
        }

        $system = <<<'SYS'
You are a senior real-estate landing-page copywriter. Given a description of an agent's offer,
write concise, high-converting copy for a single lead-capture page.

Return ONLY a JSON object with EXACTLY these keys (no markdown, no commentary):
{
  "name": "short internal label (max 6 words)",
  "accent_color": "#RRGGBB hex that fits the brand/tone",
  "meta_title": "SEO title (max 60 chars)",
  "meta_description": "SEO description (max 155 chars)",
  "hero": { "eyebrow": "2-4 words", "headline": "max 7 words, punchy", "subheadline": "1 sentence" },
  "about": { "title": "max 6 words", "body": "2 short paragraphs separated by \\n\\n" },
  "steps": [ {"title":"3-5 words","text":"1 short sentence"} , ... exactly 3 ],
  "testimonials": [ {"quote":"1-2 sentences","author":"Full Name","location":"short result e.g. Sold in 11 days"} , ... exactly 3 ],
  "cta": { "headline":"max 7 words", "subtext":"1 sentence", "button_label":"2-4 words" }
}
Keep it specific to the offer. Do not invent fake statistics or guarantees.
SYS;

        $result = $ai->sendMessage($system, "Agent's offer / description:\n".$prompt, 1500, ['json' => true, 'thinking_budget' => 0]);

        if (isset($result['error']) || empty($result['text'])) {
            return null;
        }

        $decoded = json_decode($result['text'], true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Merge AI copy onto the base template's blocks. Only known text fields are
     * overwritten; structure, images, flow and lead type are preserved.
     *
     * @param  array<int, array<string, mixed>>  $blocks
     * @param  array<string, mixed>  $ai
     * @return array<int, array<string, mixed>>
     */
    private function applyAiCopy(array $blocks, array $ai): array
    {
        foreach ($blocks as &$block) {
            $type = $block['type'] ?? '';
            $data = $block['data'] ?? [];

            if ($type === 'hero' && is_array($ai['hero'] ?? null)) {
                foreach (['eyebrow', 'headline', 'subheadline'] as $k) {
                    if (! empty($ai['hero'][$k])) {
                        $data[$k] = (string) $ai['hero'][$k];
                    }
                }
            } elseif (($type === 'about' || $type === 'content') && is_array($ai['about'] ?? null)) {
                if (! empty($ai['about']['title'])) {
                    $data['title'] = (string) $ai['about']['title'];
                }
                if (! empty($ai['about']['body'])) {
                    $data['body'] = (string) $ai['about']['body'];
                }
            } elseif ($type === 'steps' && is_array($ai['steps'] ?? null)) {
                $items = $data['items'] ?? [];
                foreach (array_values($ai['steps']) as $i => $step) {
                    if (! isset($items[$i]) || ! is_array($step)) {
                        continue;
                    }
                    $items[$i]['title'] = (string) ($step['title'] ?? $items[$i]['title'] ?? '');
                    $items[$i]['text'] = (string) ($step['text'] ?? $items[$i]['text'] ?? '');
                }
                $data['items'] = $items;
            } elseif ($type === 'testimonials' && is_array($ai['testimonials'] ?? null)) {
                $items = $data['items'] ?? [];
                foreach (array_values($ai['testimonials']) as $i => $t) {
                    if (! isset($items[$i]) || ! is_array($t)) {
                        continue;
                    }
                    $items[$i]['quote'] = (string) ($t['quote'] ?? $items[$i]['quote'] ?? '');
                    $items[$i]['author'] = (string) ($t['author'] ?? $items[$i]['author'] ?? '');
                    $items[$i]['location'] = (string) ($t['location'] ?? $items[$i]['location'] ?? '');
                }
                $data['items'] = $items;
            } elseif ($type === 'cta' && is_array($ai['cta'] ?? null)) {
                foreach (['headline' => 'headline', 'subtext' => 'subtext', 'button_label' => 'button_label'] as $k => $dest) {
                    if (! empty($ai['cta'][$k])) {
                        $data[$dest] = (string) $ai['cta'][$k];
                    }
                }
            }

            $block['data'] = $data;
        }

        return $blocks;
    }

    private function validHex(?string $hex): ?string
    {
        return is_string($hex) && preg_match('/^#[0-9a-fA-F]{6}$/', $hex) ? $hex : null;
    }

    public function edit(Request $request, LandingPage $landingPage): Response
    {
        $this->authorizeAccess($request, $landingPage);

        return Inertia::render('Crm/LandingPages/Edit', [
            'page' => $landingPage,
            'publicUrl' => url("/l/{$landingPage->slug}"),
        ]);
    }

    public function update(Request $request, LandingPage $landingPage): RedirectResponse
    {
        $this->authorizeAccess($request, $landingPage);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'accent_color' => ['required', 'string', 'max:9'],
            'agent_name' => ['nullable', 'string', 'max:255'],
            'agent_email' => ['nullable', 'email', 'max:255'],
            'agent_phone' => ['nullable', 'string', 'max:50'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'is_published' => ['boolean'],
            'page_data' => ['required', 'array'],
            'page_data._config' => ['nullable', 'array'],
            'page_data.blocks' => ['present', 'array'],
            'page_data.blocks.*.id' => ['required', 'string', 'max:60'],
            'page_data.blocks.*.type' => ['required', 'string', 'max:40'],
            'page_data.blocks.*.hidden' => ['nullable', 'boolean'],
            'page_data.blocks.*.data' => ['nullable', 'array'],
        ]);

        // Keep images valid on edit too: reuse the page's stored category (or a
        // sensible default) and re-apply fallbacks so empty/broken images are fixed.
        $category = $validated['page_data']['_config']['image_category']
            ?? ($landingPage->page_data['_config']['image_category'] ?? null)
            ?? ($landingPage->type === 'buyer' ? 'buyer' : 'seller');

        $validated['page_data']['blocks'] = LandingPageImages::applyFallbacks($validated['page_data']['blocks'] ?? [], $category);
        $validated['page_data']['_config'] = array_merge(
            $validated['page_data']['_config'] ?? [],
            ['image_category' => $category],
        );

        $landingPage->update($validated);

        return back()->with('success', 'Landing page saved.');
    }

    public function publish(Request $request, LandingPage $landingPage): RedirectResponse
    {
        $this->authorizeAccess($request, $landingPage);

        $landingPage->update(['is_published' => ! $landingPage->is_published]);

        return back()->with('success', $landingPage->is_published ? 'Landing page published.' : 'Landing page unpublished.');
    }

    public function destroy(Request $request, LandingPage $landingPage): RedirectResponse
    {
        $this->authorizeAccess($request, $landingPage);

        if ($landingPage->agent_photo && ! str_starts_with($landingPage->agent_photo, 'http')) {
            Storage::disk('public')->delete($landingPage->agent_photo);
        }

        $landingPage->delete();

        return redirect()->route('crm.landing-pages.index')->with('success', 'Landing page deleted.');
    }

    /* ---------------------------------------------------------------------
     | Media Library — every image uploaded for a landing page is recorded
     | here so it can be re-inserted from the picker (mirrors agent websites).
     * --------------------------------------------------------------------- */

    private const IMAGE_MIMES = 'jpg,jpeg,png,gif,webp,avif,svg';

    /** Upload an image into the page's Media Library (the single upload path the picker uses). */
    public function uploadMedia(Request $request, LandingPage $landingPage): JsonResponse
    {
        $this->authorizeAccess($request, $landingPage);
        $request->validate(['file' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240']);

        $file = $request->file('file');
        $path = ImageOptimizer::storeOptimized($file, 'landing-pages/library/'.$landingPage->id);

        $media = LandingPageMedia::firstOrCreate(
            ['landing_page_id' => $landingPage->id, 'path' => $path],
            ['filename' => $file->getClientOriginalName(), 'mime' => $file->getClientMimeType(), 'size' => $file->getSize()],
        );

        return response()->json([
            'success' => true,
            'media' => $media,
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /** List every image attached to the page (library uploads + images in use). */
    public function listMedia(Request $request, LandingPage $landingPage): JsonResponse
    {
        $this->authorizeAccess($request, $landingPage);

        $images = [];

        foreach ($landingPage->media()->latest()->get() as $m) {
            $images[] = [
                'id' => $m->id,
                'path' => $m->path,
                'url' => $m->url,
                'label' => $m->filename ?: basename($m->path),
                'source' => 'library',
            ];
        }

        // Images already referenced anywhere in the page content (predate the library
        // or were seeded from a template) so the picker shows everything in use.
        foreach ($this->collectContentImages($landingPage) as $ref) {
            $images[] = [
                'path' => $ref,
                'url' => $this->mediaUrl($ref),
                'label' => basename(parse_url($ref, PHP_URL_PATH) ?: $ref),
                'source' => 'in-use',
            ];
        }

        // Dedupe by path — library rows win.
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

    /** Delete an image from the library, the disk and every reference in the page. */
    public function deleteMedia(Request $request, LandingPage $landingPage): JsonResponse
    {
        $this->authorizeAccess($request, $landingPage);

        $path = $request->input('path');
        $isLocal = is_string($path) && str_starts_with($path, 'landing-pages/');
        $isRemote = is_string($path) && Str::startsWith($path, ['http://', 'https://']);
        if (! $path || (! $isLocal && ! $isRemote)) {
            return response()->json(['error' => 'Invalid path'], 422);
        }

        // Clear any reference to this image in the page content.
        $pageData = $landingPage->page_data ?? [];
        $changed = false;
        $config = $pageData['_config'] ?? [];
        foreach ($config as $k => $v) {
            if ($v === $path) {
                $config[$k] = '';
                $changed = true;
            }
        }
        $pageData['_config'] = $config;
        foreach ($pageData['blocks'] ?? [] as &$block) {
            foreach ($block['data'] ?? [] as $bKey => &$bVal) {
                if ($bVal === $path) {
                    $bVal = '';
                    $changed = true;
                } elseif (is_array($bVal)) {
                    foreach ($bVal as &$item) {
                        if (is_array($item)) {
                            foreach ($item as $iKey => &$iVal) {
                                if ($iVal === $path) {
                                    $iVal = '';
                                    $changed = true;
                                }
                            }
                        }
                    }
                    unset($item, $iVal);
                }
            }
            unset($bVal);
        }
        unset($block);
        if ($changed) {
            $landingPage->update(['page_data' => $pageData]);
        }

        $landingPage->media()->where('path', $path)->delete();
        if ($isLocal) {
            Storage::disk('public')->delete($path);
        }

        return response()->json(['success' => true]);
    }

    /** Every image path/URL referenced in the page's blocks + header config. */
    private function collectContentImages(LandingPage $landingPage): array
    {
        $refs = [];
        $pageData = $landingPage->page_data ?? [];

        foreach (['logo'] as $k) {
            if (! empty($pageData['_config'][$k]) && is_string($pageData['_config'][$k])) {
                $refs[] = $pageData['_config'][$k];
            }
        }

        $looksImage = fn ($v) => is_string($v) && $v !== '' && (str_starts_with($v, 'landing-pages/') || Str::startsWith($v, ['http://', 'https://']));

        foreach ($pageData['blocks'] ?? [] as $block) {
            foreach ($block['data'] ?? [] as $bVal) {
                if ($looksImage($bVal)) {
                    $refs[] = $bVal;
                } elseif (is_array($bVal)) {
                    foreach ($bVal as $item) {
                        foreach ((array) $item as $iVal) {
                            if ($looksImage($iVal)) {
                                $refs[] = $iVal;
                            }
                        }
                    }
                }
            }
        }

        return array_values(array_unique($refs));
    }

    /** Absolute URLs pass through; managed disk paths get the public URL. */
    private function mediaUrl(string $value): string
    {
        return Str::startsWith($value, ['http://', 'https://']) ? $value : Storage::disk('public')->url($value);
    }

    /**
     * Landing pages belong to a user or a team. Scope the list the same way the
     * websites list does — team context sees team pages, personal sees own.
     */
    private function scopedQuery(Request $request)
    {
        $user = $request->user();
        $teamId = $user->active_context === 'team' ? $user->team_id : null;

        return LandingPage::query()
            ->where('kind', 'landing') // IDX Squeeze ('listing') pages have their own tab
            ->where(function ($q) use ($user, $teamId) {
                if ($teamId) {
                    $q->where('team_id', $teamId);
                } else {
                    $q->where('user_id', $user->id)->whereNull('team_id');
                }
            });
    }

    private function authorizeAccess(Request $request, LandingPage $page): void
    {
        $user = $request->user();
        $teamId = $user->active_context === 'team' ? $user->team_id : null;

        $owns = $teamId
            ? $page->team_id === $teamId
            : ($page->user_id === $user->id && $page->team_id === null);

        abort_unless($owns, 403);
    }

    /**
     * Designs (visual themes) each grouping their Presets (prebuilt funnels),
     * with a real screenshot per Preset for the create screen.
     *
     * @return array<int, array<string, mixed>>
     */
    private function templateOptions(): array
    {
        $presets = collect(config('landing-page-templates'))
            ->map(function ($tpl, $key) {
                $shot = "landing-pages/previews/{$key}.jpg";

                return [
                    'key' => $key,
                    'design' => $tpl['template'],
                    'type' => $tpl['type'],
                    'name' => $tpl['name'],
                    'description' => $tpl['description'],
                    'accent' => $tpl['preview']['accent'] ?? '#1693C9',
                    'screenshot' => Storage::disk('public')->exists($shot)
                        ? Storage::disk('public')->url($shot)
                        : null,
                ];
            })
            ->values();

        return collect(config('landing-page-designs'))
            ->map(fn ($design) => [
                'id' => $design['id'],
                'name' => $design['name'],
                'description' => $design['description'],
                'presets' => $presets->where('design', $design['id'])->values()->all(),
            ])
            ->values()
            ->all();
    }
}
