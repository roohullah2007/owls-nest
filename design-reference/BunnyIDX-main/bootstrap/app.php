<?php

use App\Http\Controllers\Api\CustomDomainController;
use App\Http\Controllers\Api\LandingPageDomainController;
use App\Http\Controllers\Api\MlsDataController;
use App\Http\Controllers\Api\MlsRelayController;
use App\Http\Controllers\Api\PluginController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\WebsiteEditor\AiController as WebsiteEditorAiController;
use App\Http\Controllers\Api\WebsiteEditor\AreaController as WebsiteEditorAreaController;
use App\Http\Controllers\Api\WebsiteEditor\BlogController as WebsiteEditorBlogController;
use App\Http\Controllers\Api\WebsiteEditor\CondoBuildingController as WebsiteEditorCondoBuildingController;
use App\Http\Controllers\Api\WebsiteEditor\ConfigController as WebsiteEditorConfigController;
use App\Http\Controllers\Api\WebsiteEditor\GoogleReviewsController as WebsiteEditorGoogleReviewsController;
use App\Http\Controllers\Api\WebsiteEditor\MediaController as WebsiteEditorMediaController;
use App\Http\Controllers\Api\WebsiteEditor\NewDevelopmentController as WebsiteEditorNewDevelopmentController;
use App\Http\Controllers\Api\WebsiteEditor\PageContentController as WebsiteEditorPageContentController;
use App\Http\Controllers\Api\WebsiteEditor\SiteController as WebsiteEditorSiteController;
use App\Http\Controllers\Api\WebsiteEditor\TeamController as WebsiteEditorTeamController;
use App\Http\Controllers\Api\WebsiteEditor\WebsiteListingsController as WebsiteEditorListingsController;
use App\Http\Controllers\Webhooks\ResendWebhookController;
use App\Http\Controllers\Webhooks\TelnyxWebhookController;
use App\Http\Middleware\ApiCors;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureFeature;
use App\Http\Middleware\EnsureTeamPlan;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RelayLogger;
use App\Http\Middleware\ResolveCustomDomain;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\WebsiteOwnerMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function () {
            // Stripe webhook (no CSRF)
            Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handle'])
                ->withoutMiddleware(VerifyCsrfToken::class)
                ->name('webhooks.stripe');

            // Telnyx webhooks (no CSRF)
            Route::post('/webhooks/telnyx/sms', [TelnyxWebhookController::class, 'handleSms'])
                ->withoutMiddleware(VerifyCsrfToken::class)
                ->name('webhooks.telnyx.sms');
            Route::post('/webhooks/telnyx/voice', [TelnyxWebhookController::class, 'handleVoice'])
                ->withoutMiddleware(VerifyCsrfToken::class)
                ->name('webhooks.telnyx.voice');

            // Resend email-tracking webhook (Svix-signed, no CSRF)
            Route::post('/api/webhooks/resend', [ResendWebhookController::class, 'handle'])
                ->withoutMiddleware(VerifyCsrfToken::class)
                ->name('webhooks.resend');

            // Custom-domain TLS "ask" endpoint (Caddy on-demand TLS / edge).
            // Public, server-to-server: returns 200 only for connected domains.
            Route::get('/api/internal/domain-allowed', [CustomDomainController::class, 'allowed'])
                ->name('api.internal.domain-allowed');

            // Shared API middleware config (stateless, CORS, logging)
            $apiMiddleware = [
                ApiCors::class,
            ];
            $apiWithoutMiddleware = [
                VerifyCsrfToken::class,
                HandleInertiaRequests::class,
                StartSession::class,
            ];

            // MLS Relay API (no CSRF, no session — stateless, license-key auth)
            Route::prefix('api/v1/mls')
                ->middleware(array_merge($apiMiddleware, [RelayLogger::class]))
                ->withoutMiddleware($apiWithoutMiddleware)
                ->group(function () {
                    $relay = MlsRelayController::class;
                    Route::options('{any}', fn () => response('', 204))->where('any', '.*');
                    Route::get('datasets', [$relay, 'datasets'])->name('api.mls.datasets');
                    Route::get('search', [$relay, 'search'])->name('api.mls.search');
                    Route::get('listing', [$relay, 'listing'])->name('api.mls.listing');
                });

            // Unified MLS Data API — canonical endpoints for CRM (session-auth),
            // widgets, and websites. Every response includes a compliance block.
            // Public compliance fetch needs no auth.
            Route::prefix('api/mls')
                ->middleware(['web', 'auth'])
                ->withoutMiddleware([HandleInertiaRequests::class])
                ->group(function () {
                    $unified = MlsDataController::class;
                    // Legacy: single-connection scoped. Prefer the /api/v1/mls/* gateway routes below.
                    Route::post('{connection}/search', [$unified, 'search'])->name('api.mls.unified.search');
                    Route::get('{connection}/listing/{listingId}', [$unified, 'listing'])->name('api.mls.unified.listing');
                });

            // Canonical unified MLS gateway — fan-out search across every connected
            // dataset, taxonomy union for filter UIs, registry list for pickers.
            // All new MLS-touching code must hit these routes; see memory:
            // mls-architecture.md + feedback_mls_taxonomy.md.
            Route::prefix('api/v1/mls')
                ->middleware(['web', 'auth'])
                ->withoutMiddleware([HandleInertiaRequests::class])
                ->group(function () {
                    $gw = MlsDataController::class;
                    Route::post('search', [$gw, 'aggregatedSearch'])->name('api.v1.mls.search');
                    // Renamed from `datasets` to `connections` — the relay route
                    // owns /api/v1/mls/datasets as the public admin catalog.
                    Route::get('connections', [$gw, 'listDatasets'])->name('api.v1.mls.connections');
                    Route::get('taxonomy', [$gw, 'mergedTaxonomy'])->name('api.v1.mls.taxonomy.merged');
                    Route::get('{slug}/taxonomy', [$gw, 'taxonomy'])->name('api.v1.mls.taxonomy');
                    Route::get('{slug}/lifestyles', [$gw, 'lifestyles'])->name('api.v1.mls.lifestyles');
                    Route::get('{slug}/listings/{listingId}', [$gw, 'aggregatedListing'])->name('api.v1.mls.listing');
                });

            Route::prefix('api/mls')
                ->middleware($apiMiddleware)
                ->withoutMiddleware($apiWithoutMiddleware)
                ->group(function () {
                    $unified = MlsDataController::class;
                    // Public — embedded widgets and public website footers need compliance metadata.
                    Route::get('compliance/{mlsProvider}', [$unified, 'compliance'])->name('api.mls.unified.compliance');
                });

            // Website Editor API (auth + owner check, JSON responses)
            Route::prefix('api/website-editor')
                ->middleware(['web', 'auth', 'website.owner'])
                ->withoutMiddleware([HandleInertiaRequests::class])
                ->group(function () {
                    $site = WebsiteEditorSiteController::class;
                    $media = WebsiteEditorMediaController::class;
                    $content = WebsiteEditorPageContentController::class;
                    $config = WebsiteEditorConfigController::class;
                    $ai = WebsiteEditorAiController::class;
                    $blog = WebsiteEditorBlogController::class;
                    $area = WebsiteEditorAreaController::class;
                    Route::get('{agentWebsite}', [$site, 'show'])->name('api.website-editor.show');
                    Route::patch('{agentWebsite}', [$site, 'update'])->name('api.website-editor.update');
                    Route::post('{agentWebsite}/photo', [$media, 'uploadPhoto'])->name('api.website-editor.upload-photo');
                    Route::post('{agentWebsite}/hero', [$media, 'uploadHero'])->name('api.website-editor.upload-hero');
                    Route::post('{agentWebsite}/logo', [$media, 'uploadLogo'])->name('api.website-editor.upload-logo');
                    Route::post('{agentWebsite}/site-logo', [$media, 'uploadSiteLogo'])->name('api.website-editor.upload-site-logo');
                    Route::post('{agentWebsite}/favicon', [$media, 'uploadFavicon'])->name('api.website-editor.upload-favicon');
                    Route::post('{agentWebsite}/og-image', [$media, 'uploadOgImage'])->name('api.website-editor.upload-og-image');
                    Route::patch('{agentWebsite}/page-data/{page}', [$content, 'updatePageData'])->name('api.website-editor.update-page-data');
                    Route::post('{agentWebsite}/page-data/{page}/blocks', [$content, 'addBlock'])->name('api.website-editor.add-block');
                    Route::patch('{agentWebsite}/page-data/{page}/blocks/{blockId}', [$content, 'updateBlock'])->name('api.website-editor.update-block');
                    Route::delete('{agentWebsite}/page-data/{page}/blocks/{blockId}', [$content, 'deleteBlock'])->name('api.website-editor.delete-block');
                    Route::patch('{agentWebsite}/page-data/{page}/blocks-order', [$content, 'reorderBlocks'])->name('api.website-editor.reorder-blocks');
                    Route::post('{agentWebsite}/block-image', [$media, 'uploadBlockImage'])->name('api.website-editor.upload-block-image');
                    Route::patch('{agentWebsite}/testimonials', [$content, 'updateTestimonials'])->name('api.website-editor.update-testimonials');
                    // Google Business Profile reviews → testimonials
                    $googleReviews = WebsiteEditorGoogleReviewsController::class;
                    Route::post('{agentWebsite}/google-reviews/search', [$googleReviews, 'search'])->name('api.website-editor.google-reviews.search');
                    Route::post('{agentWebsite}/google-reviews/connect', [$googleReviews, 'connect'])->name('api.website-editor.google-reviews.connect');
                    Route::post('{agentWebsite}/google-reviews/sync', [$googleReviews, 'sync'])->name('api.website-editor.google-reviews.sync');
                    Route::delete('{agentWebsite}/google-reviews', [$googleReviews, 'disconnect'])->name('api.website-editor.google-reviews.disconnect');
                    Route::post('{agentWebsite}/ai/generate-field', [$ai, 'aiGenerateField'])->name('api.website-editor.ai-generate-field');
                    // Blog CRUD
                    Route::get('{agentWebsite}/blog-posts', [$blog, 'listBlogPosts'])->name('api.website-editor.blog-posts.index');
                    Route::post('{agentWebsite}/blog-posts', [$blog, 'storeBlogPost'])->name('api.website-editor.blog-posts.store');
                    Route::patch('{agentWebsite}/blog-posts/{blogPost}', [$blog, 'updateBlogPost'])->name('api.website-editor.blog-posts.update');
                    Route::delete('{agentWebsite}/blog-posts/{blogPost}', [$blog, 'deleteBlogPost'])->name('api.website-editor.blog-posts.destroy');
                    Route::post('{agentWebsite}/blog-image', [$media, 'uploadBlogImage'])->name('api.website-editor.upload-blog-image');
                    // Areas CRUD
                    Route::get('{agentWebsite}/areas', [$area, 'listAreas'])->name('api.website-editor.areas.index');
                    Route::post('{agentWebsite}/areas/ai-description', [$ai, 'generateAreaDescription'])->name('api.website-editor.areas.ai-description');
                    Route::post('{agentWebsite}/areas/ai-lifestyle-copy', [$ai, 'generateLifestyleCopy'])->name('api.website-editor.areas.ai-lifestyle-copy');
                    Route::post('{agentWebsite}/areas', [$area, 'storeArea'])->name('api.website-editor.areas.store');
                    Route::patch('{agentWebsite}/areas/{area}', [$area, 'updateArea'])->name('api.website-editor.areas.update');
                    Route::delete('{agentWebsite}/areas/{area}', [$area, 'deleteArea'])->name('api.website-editor.areas.destroy');
                    Route::post('{agentWebsite}/areas/{area}/image', [$area, 'uploadAreaImage'])->name('api.website-editor.areas.upload-image');
                    Route::patch('{agentWebsite}/areas-label', [$area, 'updateAreasLabel'])->name('api.website-editor.areas-label');
                    Route::patch('{agentWebsite}/areas-order', [$area, 'reorderAreas'])->name('api.website-editor.areas-order');
                    // Media library
                    Route::get('{agentWebsite}/media', [$media, 'listMedia'])->name('api.website-editor.media');
                    Route::post('{agentWebsite}/media', [$media, 'uploadMedia'])->name('api.website-editor.media.upload');
                    Route::delete('{agentWebsite}/media', [$media, 'deleteMedia'])->name('api.website-editor.media.delete');
                    Route::get('{agentWebsite}/hotsheets', [$site, 'listHotsheets'])->name('api.website-editor.hotsheets');
                    // Pages config
                    Route::get('{agentWebsite}/pages-config', [$site, 'getPagesConfig'])->name('api.website-editor.pages-config');
                    Route::patch('{agentWebsite}/pages-config', [$site, 'updatePagesConfig'])->name('api.website-editor.pages-config.update');
                    Route::patch('{agentWebsite}/section-visibility/{page}', [$content, 'updateSectionVisibility'])->name('api.website-editor.section-visibility');
                    Route::patch('{agentWebsite}/section-order/{page}', [$content, 'updateSectionOrder'])->name('api.website-editor.section-order');
                    Route::patch('{agentWebsite}/header-config', [$config, 'updateHeaderConfig'])->name('api.website-editor.header-config');
                    Route::patch('{agentWebsite}/footer-config', [$config, 'updateFooterConfig'])->name('api.website-editor.footer-config');
                    Route::patch('{agentWebsite}/tracking-config', [$config, 'updateTrackingConfig'])->name('api.website-editor.tracking-config');
                    // Property-search design settings (fonts, card styles, logo size, custom CSS)
                    Route::patch('{agentWebsite}/search-config', [$config, 'updateSearchConfig'])->name('api.website-editor.search-config');
                    // Condo Directory (admin-curated catalog) — per-site enable toggle + catalog stats
                    Route::get('{agentWebsite}/condo-directory', [$config, 'condoDirectory'])->name('api.website-editor.condo-directory');
                    Route::patch('{agentWebsite}/condo-directory-config', [$config, 'updateCondoDirectoryConfig'])->name('api.website-editor.condo-directory-config');
                    // Condo Directory management — the owner's own buildings (CRUD +
                    // media uploads) and per-site curation of the platform catalog.
                    $condoBuilding = WebsiteEditorCondoBuildingController::class;
                    Route::get('{agentWebsite}/condo-buildings/manage', [$condoBuilding, 'index'])->name('api.website-editor.condo-buildings.manage');
                    Route::post('{agentWebsite}/condo-buildings', [$condoBuilding, 'store'])->name('api.website-editor.condo-buildings.store');
                    Route::patch('{agentWebsite}/condo-buildings/{condoBuilding}', [$condoBuilding, 'update'])->name('api.website-editor.condo-buildings.update');
                    Route::delete('{agentWebsite}/condo-buildings/{condoBuilding}', [$condoBuilding, 'destroy'])->name('api.website-editor.condo-buildings.destroy');
                    Route::post('{agentWebsite}/condo-buildings-upload', [$condoBuilding, 'upload'])->name('api.website-editor.condo-buildings.upload');
                    Route::post('{agentWebsite}/condo-buildings/ai-description', [$ai, 'generateDevelopmentDescription'])->name('api.website-editor.condo-buildings.ai-description');
                    Route::get('{agentWebsite}/new-developments', [$config, 'newDevelopments'])->name('api.website-editor.new-developments');
                    Route::patch('{agentWebsite}/new-developments-config', [$config, 'updateNewDevelopmentsConfig'])->name('api.website-editor.new-developments-config');
                    // New Developments management — the owner's own projects (CRUD +
                    // media uploads) and per-site curation of the platform catalog.
                    $newDev = WebsiteEditorNewDevelopmentController::class;
                    Route::get('{agentWebsite}/new-developments/manage', [$newDev, 'index'])->name('api.website-editor.new-developments.manage');
                    Route::post('{agentWebsite}/new-developments', [$newDev, 'store'])->name('api.website-editor.new-developments.store');
                    Route::patch('{agentWebsite}/new-developments/{newDevelopment}', [$newDev, 'update'])->name('api.website-editor.new-developments.update');
                    Route::delete('{agentWebsite}/new-developments/{newDevelopment}', [$newDev, 'destroy'])->name('api.website-editor.new-developments.destroy');
                    Route::post('{agentWebsite}/new-developments-upload', [$newDev, 'upload'])->name('api.website-editor.new-developments.upload');
                    Route::post('{agentWebsite}/new-developments/ai-description', [$ai, 'generateDevelopmentDescription'])->name('api.website-editor.new-developments.ai-description');
                    // Website translations (Google Translate widget + themed language modal)
                    Route::get('{agentWebsite}/translations', [$config, 'translations'])->name('api.website-editor.translations');
                    Route::patch('{agentWebsite}/translations-config', [$config, 'updateTranslationsConfig'])->name('api.website-editor.translations-config');
                    Route::post('{agentWebsite}/ai/generate-search-css', [$ai, 'aiGenerateSearchCss'])->name('api.website-editor.ai-generate-search-css');
                    Route::post('{agentWebsite}/ai/generate-blog-post', [$ai, 'aiGenerateBlogPost'])->name('api.website-editor.ai-generate-blog-post');
                    Route::post('{agentWebsite}/ai/generate-team-bio', [$ai, 'generateTeamBio'])->name('api.website-editor.ai-generate-team-bio');
                    // Custom domain — connect / verify / disconnect
                    $domain = CustomDomainController::class;
                    Route::get('{agentWebsite}/domain', [$domain, 'show'])->name('api.website-editor.domain.show');
                    Route::post('{agentWebsite}/domain', [$domain, 'connect'])->name('api.website-editor.domain.connect');
                    Route::post('{agentWebsite}/domain/verify', [$domain, 'verify'])->name('api.website-editor.domain.verify');
                    Route::delete('{agentWebsite}/domain', [$domain, 'disconnect'])->name('api.website-editor.domain.disconnect');
                    // Website listings manager (Featured / Sold sections)
                    $wl = WebsiteEditorListingsController::class;
                    Route::get('{agentWebsite}/website-listings', [$wl, 'index'])->name('api.website-editor.website-listings');
                    Route::patch('{agentWebsite}/website-listings/config', [$wl, 'updateConfig'])->name('api.website-editor.website-listings.config');
                    Route::patch('{agentWebsite}/website-listings/{listing}', [$wl, 'setSection'])->name('api.website-editor.website-listings.section');
                    // Team members CRUD (store/update are POST — photo uploads are multipart)
                    $team = WebsiteEditorTeamController::class;
                    Route::get('{agentWebsite}/team', [$team, 'index'])->name('api.website-editor.team.index');
                    Route::post('{agentWebsite}/team', [$team, 'store'])->name('api.website-editor.team.store');
                    Route::patch('{agentWebsite}/team-order', [$team, 'reorder'])->name('api.website-editor.team.reorder');
                    Route::post('{agentWebsite}/team/{member}', [$team, 'update'])->name('api.website-editor.team.update');
                    Route::delete('{agentWebsite}/team/{member}', [$team, 'destroy'])->name('api.website-editor.team.destroy');
                });

            // Landing-page editor — custom domain connect / verify / disconnect.
            // Resolves the page by uuid; ownership is enforced inside the controller.
            Route::prefix('api/landing-page-editor')
                ->middleware(['web', 'auth'])
                ->scopeBindings()
                ->group(function () {
                    $lpDomain = LandingPageDomainController::class;
                    Route::get('{landingPage:uuid}/domain', [$lpDomain, 'show'])->name('api.landing-page-editor.domain.show');
                    Route::post('{landingPage:uuid}/domain', [$lpDomain, 'connect'])->name('api.landing-page-editor.domain.connect');
                    Route::post('{landingPage:uuid}/domain/verify', [$lpDomain, 'verify'])->name('api.landing-page-editor.domain.verify');
                    Route::delete('{landingPage:uuid}/domain', [$lpDomain, 'disconnect'])->name('api.landing-page-editor.domain.disconnect');
                });

            // WordPress Plugin API (license management, activation, settings)
            Route::prefix('api/v1/plugin')
                ->middleware($apiMiddleware)
                ->withoutMiddleware($apiWithoutMiddleware)
                ->group(function () {
                    $plugin = PluginController::class;
                    Route::options('{any}', fn () => response('', 204))->where('any', '.*');
                    Route::get('health', [$plugin, 'health'])->name('api.plugin.health');
                    Route::post('verify-license', [$plugin, 'verifyLicense'])->name('api.plugin.verify-license');
                    Route::post('activate', [$plugin, 'activate'])->name('api.plugin.activate');
                    Route::post('deactivate', [$plugin, 'deactivate'])->name('api.plugin.deactivate');
                    Route::get('settings', [$plugin, 'settings'])->name('api.plugin.settings');
                });
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Global: map connected custom domains to their /site/{slug} routes
        // before routing. No-ops for platform hosts.
        $middleware->prepend(ResolveCustomDomain::class);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            SecurityHeaders::class,
        ]);

        // A user who passed credentials but hasn't entered their 2FA code yet is
        // still a "guest" with a pending login stashed in the session. If they
        // hit a protected route mid-challenge, send them back to the 2FA screen
        // instead of the password login form — otherwise OAuth (Google) users,
        // who have no password, get dumped on a form they can't use.
        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->session()->has('login.id')) {
                return route('two-factor.challenge');
            }

            return route('login');
        });

        $middleware->alias([
            'website.owner' => WebsiteOwnerMiddleware::class,
            'admin' => EnsureAdmin::class,
            'feature' => EnsureFeature::class,
            'team.plan' => EnsureTeamPlan::class,
        ]);

        // googtrans is set in plain JS by the public-site language picker —
        // exempt it from cookie encryption so the server can read the active
        // language (EncryptCookies nulls cookies it cannot decrypt).
        $middleware->encryptCookies(except: ['googtrans']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Render a branded, CRM-styled Inertia error page for common HTTP errors
        // in production instead of Laravel's bare "404 | Not Found" view. In local
        // and testing we keep the detailed error output for debugging.
        $exceptions->respond(function (Response $response, \Throwable $e, Request $request) {
            if (app()->environment(['local', 'testing'])) {
                return $response;
            }

            if (in_array($response->getStatusCode(), [403, 404, 500, 503], true)) {
                return Inertia::render('Error', ['status' => $response->getStatusCode()])
                    ->toResponse($request)
                    ->setStatusCode($response->getStatusCode());
            }

            return $response;
        });
    })->create();
