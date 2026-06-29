<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\AgentWebsite;
use App\Models\LandingPage;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * System-level (theme-agnostic) custom-domain router. When a request arrives on
 * a connected customer domain, it transparently maps the request to that site's
 * `/site/{slug}` routes (agent websites) or `/l/{slug}` routes (landing pages)
 * so the existing public controllers serve it unchanged. Platform hosts (CRM,
 * default URLs) pass straight through.
 *
 * Runs as global middleware so the rewrite happens before route matching.
 */
class ResolveCustomDomain
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = strtolower($request->getHost());

        $platformHosts = array_map('strtolower', config('sites.platform_hosts', []));
        if (in_array($host, $platformHosts, true)) {
            return $next($request);
        }

        // Any non-platform host is a custom domain. Resolve the site regardless
        // of state — a connected-but-unpublished (or still-pending) site must
        // NEVER fall through to the SaaS app/login on its own domain (brand leak
        // + SEO). Unknown hosts still pass through (could be an alt app host).
        // Agent websites are checked first, then landing pages (domains are
        // unique within each table; a host can only belong to one).
        $site = AgentWebsite::query()->where('custom_domain', $host)->first();

        if ($site) {
            return $this->serve($request, $next, $site, "/site/{$site->slug}", 'agent-website.not-live', 'site');
        }

        $landing = LandingPage::query()->where('custom_domain', $host)->first();

        if ($landing) {
            return $this->serve($request, $next, $landing, "/l/{$landing->slug}", 'landing-page.not-live', 'page');
        }

        return $next($request);
    }

    /**
     * Shared rewrite: guard not-live state, strip the canonical prefix for clean
     * GET URLs, and transparently re-route the request onto the internal prefix.
     */
    private function serve(Request $request, Closure $next, AgentWebsite|LandingPage $site, string $prefix, string $notLiveView, string $viewVar): Response
    {
        if (! $site->is_published || $site->domain_status !== $site::DOMAIN_CONNECTED) {
            // Connected/draft or still-pending DNS: serve the owner-branded
            // "coming soon" placeholder, 503 so search engines treat it as
            // temporary and index the real site once it goes live.
            return response()->view($notLiveView, [$viewVar => $site], 503);
        }

        $path = $request->getPathInfo();
        $query = $request->getQueryString();

        // Internal links are generated against the canonical /site/{slug} routes,
        // so on a custom domain they still carry that prefix. Without handling
        // this we'd re-prefix into /site/{slug}/site/{slug}/… and 404. For GET,
        // redirect to the clean path (custom domain shows /about, not
        // /site/{slug}/about); non-GET (form posts) match the prefixed route
        // directly, so pass them straight through.
        if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
            if ($request->isMethod('GET')) {
                $clean = substr($path, strlen($prefix)) ?: '/';

                return redirect($clean.($query ? "?{$query}" : ''));
            }

            return $next($request);
        }

        $masked = $prefix.($path === '/' ? '' : $path);

        $request->server->set('REQUEST_URI', $masked.($query ? "?{$query}" : ''));
        $rewritten = $request->duplicate(null, null, null, null, null, $request->server->all());
        app()->instance('request', $rewritten);

        return $next($rewritten);
    }
}
