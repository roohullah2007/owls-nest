<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class AgentWebsite extends Model
{
    use BelongsToTeamOrUser;

    /** Custom-domain lifecycle states stored in `domain_status`. */
    public const DOMAIN_PENDING = 'pending';

    public const DOMAIN_CONNECTED = 'connected';

    protected $fillable = [
        'user_id',
        'team_id',
        'slug',
        'custom_domain',
        'domain_status',
        'domain_verification_token',
        'domain_verified_at',
        'domain_last_checked_at',
        'template',
        'accent_color',
        'custom_colors',
        'header_style',
        'header_sticky',
        'agent_name',
        'agent_title',
        'agent_tagline',
        'agent_bio',
        'agent_photo',
        'agent_email',
        'agent_phone',
        'agent_whatsapp',
        'office_address',
        'contact_display',
        'agent_city',
        'agent_state',
        'agent_license_number',
        'brokerage_name',
        'brokerage_logo_light',
        'brokerage_logo_dark',
        'site_logo_light',
        'site_logo_dark',
        'hero_image',
        'hero_headline',
        'hero_subtitle',
        'hero_style',
        'buy_headline',
        'buy_description',
        'sell_headline',
        'sell_description',
        'about_extended',
        'page_data',
        'areas_label',
        'testimonials',
        'social_facebook',
        'social_instagram',
        'social_linkedin',
        'social_youtube',
        'social_tiktok',
        'meta_title',
        'meta_description',
        'favicon',
        'og_image',
        'og_title',
        'og_description',
        'robots_txt',
        'llms_txt',
        'tracking_head',
        'tracking_body',
        'thank_you_headline',
        'thank_you_message',
        'is_published',
    ];

    protected $casts = [
        'page_data' => 'array',
        'testimonials' => 'array',
        'contact_display' => 'array',
        'custom_colors' => 'array',
        'header_sticky' => 'boolean',
        'is_published' => 'boolean',
        'domain_verified_at' => 'datetime',
        'domain_last_checked_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (AgentWebsite $site) {
            if (empty($site->uuid)) {
                $site->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Overlay page_data JSON values onto flat column attributes.
     * This allows blade templates to use $site->hero_headline unchanged.
     */
    /**
     * No-op — page_data is now the single source of truth.
     * Blade templates read directly from $site->page_data with column fallback.
     * Kept for backward compatibility with callers.
     */
    public function resolvePageData(): void
    {
        //
    }

    /** Owning user (personal sites). Team-owned sites use {@see team()}. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function blogPosts(): HasMany
    {
        return $this->hasMany(BlogPost::class);
    }

    public function areas(): HasMany
    {
        return $this->hasMany(WebsiteArea::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(AgentWebsiteMedia::class);
    }

    public function teamMembers(): HasMany
    {
        return $this->hasMany(AgentWebsiteTeamMember::class);
    }

    /** Owner-created New Developments (the platform catalog rows have no site). */
    public function newDevelopments(): HasMany
    {
        return $this->hasMany(NewDevelopment::class);
    }

    /** Owner-created Condo Directory buildings (the platform catalog rows have no site). */
    public function condoBuildings(): HasMany
    {
        return $this->hasMany(CondoBuilding::class);
    }

    /**
     * Whether a curated listings section (featured|sold) has any content —
     * drives the Properties nav dropdown and the sitemap.
     */
    /** Whether the owner switched on the platform-curated Condo Directory (/condos). */
    public function condoDirectoryEnabled(): bool
    {
        return (bool) data_get($this->page_data, '_config.condo_directory.enabled', false);
    }

    /** Whether the owner switched on the platform-curated New Developments catalog (/new-developments). */
    public function newDevelopmentsEnabled(): bool
    {
        return (bool) data_get($this->page_data, '_config.new_developments.enabled', false);
    }

    public function hasListingsSection(string $section): bool
    {
        $cfg = (array) data_get($this->page_data, "_config.listings.{$section}", []);
        if (! empty($cfg['agent_ids']) || ! empty($cfg['office_ids']) || ! empty($cfg['mls_numbers'])) {
            return true;
        }

        return Listing::query()
            ->where('website_section', $section)
            ->where('is_private', false)
            ->where(fn ($q) => $this->team_id
                ? $q->where('team_id', $this->team_id)
                : $q->where('user_id', $this->user_id))
            ->exists();
    }

    /** Memoized result of {@see navTree()} — built once, read by every header surface. */
    private ?array $navTreeCache = null;

    /**
     * The site's navigation as a single ordered tree — the one source of truth
     * shared by the desktop nav, the "More" mega menu, the mobile menu and the
     * footer. Building it here (instead of repeating the slug→href/label loop in
     * four Blade files) keeps those surfaces in lock-step.
     *
     * Each item: [
     *   'key'         => string,   // 'home', a custom-page slug, …
     *   'label'       => string,
     *   'href'        => string,
     *   'show_in_nav' => bool,     // false = footer-only (a hidden custom page)
     *   'children'    => array{label:string, href:string}[],
     *   'view_all'    => ?string,  // "View All →" href when children are truncated
     * ]
     *
     * Children merge three sources: manually-configured dropdown links
     * (_config.header.nav_dropdowns[$key]), the auto-listed areas, and custom
     * pages whose `parent` points at this item.
     */
    public function navTree(): array
    {
        if ($this->navTreeCache !== null) {
            return $this->navTreeCache;
        }

        $config = $this->page_data['_config'] ?? [];
        $disabled = $config['disabled_pages'] ?? [];
        $order = $config['nav_order'] ?? ['home', 'properties', 'about', 'buy', 'sell', 'areas', 'blog', 'contact'];
        $customPages = collect($config['custom_pages'] ?? []);
        $dropdowns = $config['header']['nav_dropdowns'] ?? [];

        // Nav nesting (Menus editor): child key => parent key, one level deep.
        // Custom pages with a `parent` field participate in the same map — that
        // field nested them under an item since before nav_parents existed.
        $navParents = $config['header']['nav_parents'] ?? [];
        foreach ($customPages as $cp) {
            if (! empty($cp['parent']) && ! empty($cp['slug'])) {
                $navParents[$cp['slug']] ??= $cp['parent'];
            }
        }

        // Property Search is a system-level page shared by every theme. Inject it
        // (right after Home) for sites whose saved nav_order predates it, unless
        // it's been explicitly disabled.
        if (! in_array('properties', $order, true) && ! in_array('properties', $disabled, true)) {
            $homeIdx = array_search('home', $order, true);
            $homeIdx === false ? array_unshift($order, 'properties') : array_splice($order, $homeIdx + 1, 0, 'properties');
        }

        $slug = $this->slug;
        $areas = $this->areas()->active()->orderBy('sort_order')->orderBy('name')->get();
        $areaCount = $areas->count();
        $hasBlog = $this->blogPosts()->published()->exists();
        $hasTeam = $this->teamMembers()->active()->exists();
        $hasFeatured = $this->hasListingsSection('featured');
        $hasSold = $this->hasListingsSection('sold');
        $hasCondos = $this->condoDirectoryEnabled() && CondoBuilding::query()->active()->visibleToSite($this)->exists();
        $hasNewDevs = $this->newDevelopmentsEnabled() && NewDevelopment::query()->active()->visibleToSite($this)->exists();

        // Team is auto-available once members exist (like blog/areas). Inject for
        // saved nav orders that predate it.
        if ($hasTeam && ! in_array('team', $order, true) && ! in_array('team', $disabled, true)) {
            $aboutIdx = array_search('about', $order, true);
            $aboutIdx === false ? $order[] = 'team' : array_splice($order, $aboutIdx + 1, 0, 'team');
        }

        // Condo Directory injects once the owner enables it (catalog is
        // platform-curated, so saved nav orders never know about it).
        if ($hasCondos && ! in_array('condos', $order, true) && ! in_array('condos', $disabled, true)) {
            $areasIdx = array_search('areas', $order, true);
            $areasIdx === false ? $order[] = 'condos' : array_splice($order, $areasIdx + 1, 0, 'condos');
        }

        // New Developments injects the same way, right after Condos (or Areas).
        if ($hasNewDevs && ! in_array('new-developments', $order, true) && ! in_array('new-developments', $disabled, true)) {
            $anchorIdx = array_search('condos', $order, true);
            if ($anchorIdx === false) {
                $anchorIdx = array_search('areas', $order, true);
            }
            $anchorIdx === false ? $order[] = 'new-developments' : array_splice($order, $anchorIdx + 1, 0, 'new-developments');
        }

        $builtIn = [
            'home' => ['label' => 'Home', 'route' => 'agent-site.home'],
            'properties' => ['label' => 'Property Search', 'route' => 'agent-site.properties'],
            'about' => ['label' => 'About', 'route' => 'agent-site.about'],
            'buy' => ['label' => 'Buy', 'route' => 'agent-site.buy'],
            'sell' => ['label' => 'Sell', 'route' => 'agent-site.sell'],
            'contact' => ['label' => 'Contact', 'route' => 'agent-site.contact'],
        ];

        $entries = [];
        foreach ($order as $key) {
            if (in_array($key, $disabled, true)) {
                continue;
            }

            $showInNav = true;
            if (isset($builtIn[$key])) {
                $label = $builtIn[$key]['label'];
                $href = route($builtIn[$key]['route'], $slug);
            } elseif ($key === 'blog') {
                if (! $hasBlog) {
                    continue;
                }
                $label = 'Blog';
                $href = route('agent-site.blog', $slug);
            } elseif ($key === 'areas') {
                if ($areaCount === 0) {
                    continue;
                }
                $label = $this->areas_label ?: 'Areas';
                $href = route('agent-site.areas', $slug);
            } elseif ($key === 'team') {
                if (! $hasTeam) {
                    continue;
                }
                $label = 'Meet the Team';
                $href = route('agent-site.team', $slug);
            } elseif ($key === 'condos') {
                if (! $hasCondos) {
                    continue;
                }
                $label = 'Condos';
                $href = route('agent-site.condos', $slug);
            } elseif ($key === 'new-developments') {
                if (! $hasNewDevs) {
                    continue;
                }
                $label = 'New Developments';
                $href = route('agent-site.new-developments', $slug);
            } else {
                $cp = $customPages->firstWhere('slug', $key);
                if (! $cp) {
                    continue;
                }
                // Custom pages with a parent resolve here too — the nesting pass
                // below attaches them as that parent's child instead of top-level.
                $label = $cp['title'];
                $href = route('agent-site.custom-page', [$slug, $key]);
                $showInNav = (bool) ($cp['show_in_nav'] ?? false);
            }

            $children = [];
            $viewAll = null;

            // 1. Manually-configured dropdown links (Header Settings → Dropdown Menus).
            foreach (($dropdowns[$key] ?? []) as $link) {
                $linkLabel = trim((string) ($link['label'] ?? ''));
                $linkUrl = trim((string) ($link['url'] ?? ''));
                if ($linkLabel === '' || $linkUrl === '') {
                    continue;
                }
                $children[] = ['label' => $linkLabel, 'href' => $linkUrl];
            }

            // 1b. Curated listings pages nest under Buy (the BUY ▾
            //     Featured Properties / Past Transactions dropdown).
            if ($key === 'buy') {
                if ($hasFeatured && ! in_array('featured', $disabled, true)) {
                    $children[] = ['label' => 'Featured Properties', 'href' => route('agent-site.featured', $slug)];
                }
                if ($hasSold && ! in_array('sold', $disabled, true)) {
                    $children[] = ['label' => 'Past Transactions', 'href' => route('agent-site.sold', $slug)];
                }
                if (! in_array('mortgage-calculator', $disabled, true)) {
                    $children[] = ['label' => 'Mortgage Calculator', 'href' => route('agent-site.mortgage-calculator', $slug)];
                }
                if (! in_array('market-trends', $disabled, true)) {
                    $children[] = ['label' => 'Market Trends', 'href' => route('agent-site.market-trends', $slug)];
                }
            }

            // 2. Auto-listed areas (capped; "View All" links out when truncated).
            if ($key === 'areas') {
                foreach ($areas->take(10) as $area) {
                    $children[] = ['label' => $area->name, 'href' => route('agent-site.areas.show', [$slug, $area->slug])];
                }
                if ($areaCount > 10) {
                    $viewAll = route('agent-site.areas', $slug);
                }
            }

            // 3. Custom pages nested under this item that the saved nav_order
            //    doesn't know about (legacy sites) — ordered nesting for
            //    everything in nav_order happens in the pass below.
            foreach ($customPages->where('parent', $key) as $cp) {
                if (in_array($cp['slug'], $order, true)) {
                    continue;
                }
                $children[] = ['label' => $cp['title'], 'href' => route('agent-site.custom-page', [$slug, $cp['slug']])];
            }

            $entries[$key] = [
                'key' => $key,
                'label' => $label,
                'href' => $href,
                'show_in_nav' => $showInNav,
                'children' => $children,
                'view_all' => $viewAll,
            ];
        }

        // 4. Nesting pass — attach items whose nav_parents entry points at a
        //    real top-level item, in nav_order sequence. One level deep only:
        //    home always stays top-level, a parent can't itself be nested, and
        //    an item that already carries children (Properties, Areas, dropdown
        //    links) can't be nested away — that would orphan its own dropdown.
        $nestedKeys = [];
        foreach ($entries as $key => $entry) {
            $parent = $navParents[$key] ?? null;
            if (! $parent || $parent === $key || $key === 'home' || ! isset($entries[$parent])) {
                continue;
            }
            if (! empty($navParents[$parent]) || ! empty($entry['children'])) {
                continue;
            }
            $entries[$parent]['children'][] = ['label' => $entry['label'], 'href' => $entry['href']];
            $nestedKeys[$key] = true;
        }

        $items = [];
        foreach ($entries as $key => $entry) {
            if (! isset($nestedKeys[$key])) {
                $items[] = $entry;
            }
        }

        return $this->navTreeCache = $items;
    }

    /**
     * SEO <title> for a page: the page's own meta_title override, then the
     * site-wide meta_title, then a smart per-page default so every page has a
     * distinct, descriptive title (never just the site name).
     */
    public function seoTitle(?string $page = null): string
    {
        $override = trim((string) data_get($this->page_data, ($page ?? '').'.meta_title'));
        if ($override !== '') {
            return $override;
        }
        if (trim((string) $this->meta_title) !== '') {
            return $this->meta_title;
        }

        $name = $this->agent_name ?: ($this->brokerage_name ?: 'Real Estate');
        $loc = trim(implode(', ', array_filter([$this->agent_city, $this->agent_state]))) ?: null;
        $where = $loc ? " in {$loc}" : '';
        $locName = $loc ? "{$loc} " : '';

        return match ($page) {
            'home', null => $name.($loc ? " | {$loc} Real Estate" : ' | Real Estate'),
            'about' => "About {$name}".($loc ? " | {$loc} Realtor" : ''),
            'buy' => "Buy a Home{$where} | {$name}",
            'sell' => "Sell Your Home{$where} | {$name}",
            'contact' => "Contact {$name}".($loc ? " | {$loc} Real Estate" : ''),
            'areas' => "Communities We Serve | {$name}",
            'blog' => "Real Estate Blog & Market News | {$name}",
            'home-valuation' => "What's My Home Worth? | {$locName}Home Valuation",
            'properties' => "{$locName}Homes for Sale | Property Search | {$name}",
            default => ucwords(str_replace('-', ' ', (string) $page))." | {$name}",
        };
    }

    /**
     * SEO meta description for a page: page override → site meta → per-page default.
     */
    public function seoDescription(?string $page = null): string
    {
        $override = trim((string) data_get($this->page_data, ($page ?? '').'.meta_description'));
        if ($override !== '') {
            return $override;
        }
        if (trim((string) $this->meta_description) !== '') {
            return $this->meta_description;
        }

        $name = $this->agent_name ?: ($this->brokerage_name ?: 'our team');
        $loc = trim(implode(', ', array_filter([$this->agent_city, $this->agent_state]))) ?: 'your area';

        return match ($page) {
            'buy' => "Find your next home in {$loc} with {$name}. Browse listings and get expert guidance through every step of buying.",
            'sell' => "Thinking of selling in {$loc}? {$name} delivers a proven marketing strategy to sell your home for top dollar.",
            'contact' => "Get in touch with {$name} for expert real estate help in {$loc}.",
            'home-valuation' => "Find out what your {$loc} home is worth today with a free, no-obligation valuation from {$name}.",
            'properties' => "Search homes for sale in {$loc}. Browse current listings with photos, maps and full details.",
            'blog' => "Real estate tips, market updates and neighborhood guides for {$loc} from {$name}.",
            default => "{$name} — trusted real estate expertise in {$loc}. Buy, sell, and explore homes with confidence.",
        };
    }

    /**
     * The marketing-consent disclosure shown beside the consent checkbox on
     * every lead form (signup modal, contact forms, save-search, showing
     * requests). Site owners can override it in the website editor
     * (page_data._config.forms.consent_text); the default is a TCPA-style
     * text personalised with the agent's name.
     */
    public function consentText(): string
    {
        $custom = trim((string) data_get($this->page_data, '_config.forms.consent_text', ''));
        if ($custom !== '') {
            return $custom;
        }

        $who = $this->agent_name ?: 'us';

        return "By providing {$who} your contact information, you acknowledge and agree to our Privacy Policy"
            .' and consent to receiving marketing communications, including through automated calls, texts, and'
            .' emails, some of which may use artificial or prerecorded voices. This consent isn\'t necessary for'
            .' purchasing any products or services and you may opt out at any time. To opt out from texts, you'
            ." can reply, 'stop' at any time. To opt out from emails, you can click on the unsubscribe link in"
            .' the emails. Message and data rates may apply.';
    }

    /**
     * Social accounts that have a URL set, in canonical order. Footer and mega
     * menu render exactly these; the header top bar layers its own show/hide
     * config on top (see the topbar partial).
     *
     * @return array<int, array{key:string, url:string}>
     */
    public function socialAccounts(): array
    {
        $accounts = [];
        foreach (['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'] as $key) {
            $url = $this->{"social_{$key}"} ?? null;
            if (! empty($url)) {
                $accounts[] = ['key' => $key, 'url' => $url];
            }
        }

        return $accounts;
    }

    public static function generateSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;
        while (static::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
