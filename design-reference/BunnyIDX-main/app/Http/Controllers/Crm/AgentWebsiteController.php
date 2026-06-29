<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Models\AgentWebsiteMedia;
use App\Models\BlogPost;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AgentWebsiteController extends Controller implements HasMiddleware
{
    /**
     * Websites are a paid feature. The index list stays open so a downgraded
     * user can still view existing sites and see the in-page upgrade prompt
     * (canCreateWebsite flag); the editor and all mutations are gated.
     */
    public static function middleware(): array
    {
        return [new Middleware('feature:websites', except: ['index'])];
    }

    /** Accepted image types — keep in sync with the API editor controller. */
    private const IMAGE_MIMES = 'jpg,jpeg,png,gif,webp,avif,svg';

    /** Record an uploaded file in the site's Media Library (idempotent per path). */
    private function recordMedia(AgentWebsite $site, string $path, UploadedFile $file): void
    {
        AgentWebsiteMedia::firstOrCreate(
            ['agent_website_id' => $site->id, 'path' => $path],
            ['filename' => $file->getClientOriginalName(), 'mime' => $file->getClientMimeType(), 'size' => $file->getSize()],
        );
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $teamId = $user->active_context === 'team' ? $user->team_id : null;
        $isTeam = (bool) $teamId;

        $websites = AgentWebsite::where(function ($q) use ($user, $teamId) {
            if ($teamId) {
                $q->where('team_id', $teamId);
            } else {
                $q->where('user_id', $user->id)->whereNull('team_id');
            }
        })->orderBy('created_at', 'desc')->get();

        // Eligibility for "Create website" so the UI can explain (rather than
        // silently redirect / show a raw error) why creation is unavailable.
        // - Plan restriction: the user's plan must include the `websites` feature.
        // - Limit: the plan's website_limit (null = unlimited) on the billing owner.
        // Admins always pass (they create sites on behalf of users) — no limit.
        $canCreateWebsite = $user->isAdmin() || $user->hasFeature('websites');
        $websiteLimit = $user->isAdmin() ? null : ($user->billingOwner()->effectivePlan()->website_limit ?? null);
        // Only meaningful for entitled users — a non-entitled user is blocked by
        // the feature gate, not by the count cap.
        $atWebsiteLimit = $canCreateWebsite && $websiteLimit !== null && $websites->count() >= $websiteLimit;

        return Inertia::render('Crm/Websites/Index', [
            'websites' => $websites,
            'editing' => null,
            'initialSection' => 'general',
            'isTeam' => $isTeam,
            'templates' => config('templates'),
            'canCreateWebsite' => $canCreateWebsite,
            'atWebsiteLimit' => $atWebsiteLimit,
            'websiteLimit' => $websiteLimit,
        ]);
    }

    public function edit(Request $request, AgentWebsite $agentWebsite, string $section = 'general')
    {
        $user = $request->user();

        // Only the owner (personal) or a member of the owning team may edit —
        // plus admins, who manage sites they created for users from /admin.
        $owns = $agentWebsite->team_id
            ? ($user->team_id && $agentWebsite->team_id === $user->team_id)
            : ($agentWebsite->user_id === $user->id && $agentWebsite->team_id === null);
        abort_unless($owns || $user->isAdmin(), 403);

        return Inertia::render('Crm/Websites/Index', [
            'websites' => [],
            'editing' => $agentWebsite,
            'initialSection' => $section,
            'isTeam' => (bool) $agentWebsite->team_id,
            'templates' => config('templates'),
        ]);
    }

    /** Deep link straight into the block editor for a single page. */
    public function editPage(Request $request, AgentWebsite $agentWebsite, string $page)
    {
        $user = $request->user();
        $owns = $agentWebsite->team_id
            ? ($user->team_id && $agentWebsite->team_id === $user->team_id)
            : ($agentWebsite->user_id === $user->id && $agentWebsite->team_id === null);
        abort_unless($owns || $user->isAdmin(), 403);

        return Inertia::render('Crm/Websites/Index', [
            'websites' => [],
            'editing' => $agentWebsite,
            'initialSection' => 'pages',
            'initialEditingPage' => $page,
            'isTeam' => (bool) $agentWebsite->team_id,
            'templates' => config('templates'),
        ]);
    }

    /** Deep link straight into the blog post editor: /crm/websites/{uuid}/blog/{post}. */
    public function editBlogPost(Request $request, AgentWebsite $agentWebsite, BlogPost $blogPost)
    {
        $user = $request->user();
        $owns = $agentWebsite->team_id
            ? ($user->team_id && $agentWebsite->team_id === $user->team_id)
            : ($agentWebsite->user_id === $user->id && $agentWebsite->team_id === null);
        abort_unless($owns || $user->isAdmin(), 403);
        abort_unless($blogPost->agent_website_id === $agentWebsite->id, 404);

        return Inertia::render('Crm/Websites/Index', [
            'websites' => [],
            'editing' => $agentWebsite,
            'initialSection' => 'blog',
            'initialBlogPostId' => $blogPost->id,
            'isTeam' => (bool) $agentWebsite->team_id,
            'templates' => config('templates'),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $teamId = $user->active_context === 'team' ? $user->team_id : null;

        // Personal accounts can only have one website
        if (! $teamId) {
            $exists = AgentWebsite::where('user_id', $user->id)->whereNull('team_id')->exists();
            if ($exists) {
                return back()->withErrors(['agent_name' => 'You already have a website. Edit the existing one instead.']);
            }
        }

        $templateKeys = implode(',', array_keys(config('templates')));
        $validated = $request->validate([
            'agent_name' => 'required|string|max:255',
            'agent_title' => 'nullable|string|max:255',
            'agent_tagline' => 'nullable|string|max:500',
            'agent_bio' => 'nullable|string|max:5000',
            'agent_email' => 'nullable|email|max:255',
            'agent_phone' => 'nullable|string|max:50',
            'agent_whatsapp' => 'nullable|string|max:50',
            'office_address' => 'nullable|string|max:255',
            'contact_display' => 'nullable|array',
            'contact_display.*' => 'boolean',
            'agent_city' => 'nullable|string|max:100',
            'agent_state' => 'nullable|string|max:100',
            'agent_license_number' => 'nullable|string|max:100',
            'brokerage_name' => 'nullable|string|max:255',
            'template' => "required|in:{$templateKeys}",
            'accent_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'custom_colors' => 'nullable|array',
            'custom_colors.*' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'header_style' => 'nullable|in:transparent,solid',
            'header_sticky' => 'boolean',
            'hero_headline' => 'nullable|string|max:255',
            'hero_subtitle' => 'nullable|string|max:255',
            'hero_style' => 'nullable|in:default,with_form',
            'buy_headline' => 'nullable|string|max:255',
            'buy_description' => 'nullable|string|max:2000',
            'sell_headline' => 'nullable|string|max:255',
            'sell_description' => 'nullable|string|max:2000',
            'about_extended' => 'nullable|string|max:5000',
            'social_facebook' => 'nullable|url|max:255',
            'social_instagram' => 'nullable|url|max:255',
            'social_linkedin' => 'nullable|url|max:255',
            'social_youtube' => 'nullable|url|max:255',
            'social_tiktok' => 'nullable|url|max:255',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'is_published' => 'boolean',
        ]);

        $validated['user_id'] = $teamId ? null : $user->id;
        $validated['team_id'] = $teamId;
        $validated['slug'] = AgentWebsite::generateSlug($validated['agent_name']);

        // Seed page_data from template defaults + any user-provided content fields
        $pageData = config("template-defaults.{$validated['template']}", []);
        $contentFields = [
            'home' => ['hero_headline', 'hero_subtitle'],
            'about' => ['about_extended'],
            'buy' => ['headline' => 'buy_headline', 'description' => 'buy_description'],
            'sell' => ['headline' => 'sell_headline', 'description' => 'sell_description'],
        ];
        foreach ($contentFields as $page => $fields) {
            foreach ($fields as $jsonKey => $column) {
                if (is_int($jsonKey)) {
                    $jsonKey = $column;
                }
                if (! empty($validated[$column])) {
                    $pageData[$page][$jsonKey] = $validated[$column];
                }
            }
        }
        $validated['page_data'] = $pageData;

        $website = AgentWebsite::create($validated);

        return redirect()->route('crm.websites.index', ['edit' => $website->id])
            ->with('success', 'Website created successfully.');
    }

    public function update(Request $request, AgentWebsite $agentWebsite)
    {
        $validated = $request->validate([
            'agent_name' => 'required|string|max:255',
            'agent_title' => 'nullable|string|max:255',
            'agent_tagline' => 'nullable|string|max:500',
            'agent_bio' => 'nullable|string|max:5000',
            'agent_email' => 'nullable|email|max:255',
            'agent_phone' => 'nullable|string|max:50',
            'agent_whatsapp' => 'nullable|string|max:50',
            'office_address' => 'nullable|string|max:255',
            'contact_display' => 'nullable|array',
            'contact_display.*' => 'boolean',
            'agent_city' => 'nullable|string|max:100',
            'agent_state' => 'nullable|string|max:100',
            'agent_license_number' => 'nullable|string|max:100',
            'brokerage_name' => 'nullable|string|max:255',
            'accent_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'custom_colors' => 'nullable|array',
            'custom_colors.*' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'header_style' => 'nullable|in:transparent,solid',
            'header_sticky' => 'boolean',
            'hero_headline' => 'nullable|string|max:255',
            'hero_subtitle' => 'nullable|string|max:255',
            'hero_style' => 'nullable|in:default,with_form',
            'buy_headline' => 'nullable|string|max:255',
            'buy_description' => 'nullable|string|max:2000',
            'sell_headline' => 'nullable|string|max:255',
            'sell_description' => 'nullable|string|max:2000',
            'about_extended' => 'nullable|string|max:5000',
            'social_facebook' => 'nullable|url|max:255',
            'social_instagram' => 'nullable|url|max:255',
            'social_linkedin' => 'nullable|url|max:255',
            'social_youtube' => 'nullable|url|max:255',
            'social_tiktok' => 'nullable|url|max:255',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'is_published' => 'boolean',
        ]);

        $agentWebsite->update($validated);

        return back()->with('success', 'Website updated.');
    }

    public function destroy(Request $request, AgentWebsite $agentWebsite)
    {
        $user = $request->user();

        // Only the owner (personal site) or a member of the owning team may delete.
        $owns = $agentWebsite->team_id
            ? ($user->team_id && $agentWebsite->team_id === $user->team_id)
            : ($agentWebsite->user_id === $user->id && $agentWebsite->team_id === null);
        abort_unless($owns, 403);

        // Clean up uploaded assets.
        foreach (['agent_photo', 'hero_image', 'brokerage_logo_light', 'brokerage_logo_dark', 'site_logo_light', 'site_logo_dark', 'favicon', 'og_image'] as $field) {
            if ($agentWebsite->$field) {
                Storage::disk('public')->delete($agentWebsite->$field);
            }
        }

        // Remove related content so foreign keys don't block the delete.
        $agentWebsite->areas()->delete();
        $agentWebsite->blogPosts()->delete();
        $agentWebsite->delete();

        return redirect()->route('crm.websites.index')->with('success', 'Website deleted.');
    }

    public function uploadPhoto(Request $request, AgentWebsite $agentWebsite)
    {
        $request->validate(['photo' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240']);

        $path = $request->file('photo')->store('agent-websites/photos', 'public');
        $agentWebsite->update(['agent_photo' => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('photo'));

        return back()->with('success', 'Photo uploaded.');
    }

    public function uploadHero(Request $request, AgentWebsite $agentWebsite)
    {
        $request->validate(['hero' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:10240']);

        $path = $request->file('hero')->store('agent-websites/heroes', 'public');
        $agentWebsite->update(['hero_image' => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('hero'));

        return back()->with('success', 'Hero image uploaded.');
    }

    public function uploadBrokerageLogo(Request $request, AgentWebsite $agentWebsite)
    {
        $variant = $request->input('variant', 'light'); // 'light' or 'dark'
        $field = $variant === 'dark' ? 'brokerage_logo_dark' : 'brokerage_logo_light';

        $request->validate(['logo' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:2048']);

        $path = $request->file('logo')->store('agent-websites/logos', 'public');
        $agentWebsite->update([$field => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('logo'));

        return back()->with('success', 'Logo uploaded.');
    }

    public function uploadSiteLogo(Request $request, AgentWebsite $agentWebsite)
    {
        $variant = $request->input('variant', 'light'); // 'light' or 'dark'
        $field = $variant === 'dark' ? 'site_logo_dark' : 'site_logo_light';

        $request->validate(['site_logo' => 'required|file|mimes:'.self::IMAGE_MIMES.'|max:2048']);

        $path = $request->file('site_logo')->store('agent-websites/logos', 'public');
        $agentWebsite->update([$field => $path]);
        $this->recordMedia($agentWebsite, $path, $request->file('site_logo'));

        return back()->with('success', 'Site logo uploaded.');
    }
}
