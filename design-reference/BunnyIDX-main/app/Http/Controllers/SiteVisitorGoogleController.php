<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AgentWebsite;
use App\Models\SiteVisitor;
use App\Services\Sites\VisitorAuth;
use App\Services\Sites\VisitorCrm;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

/**
 * Google sign-in for agent-website visitors using ONE platform-owned OAuth
 * client — no per-site Google credentials. Because Google only redirects to
 * registered URIs, the flow is brokered through the app domain:
 *
 *   site (any domain) → /visitor-auth/google/redirect?site={slug}&return={url}
 *     → Google consent (platform client, callback on the APP domain)
 *     → /visitor-auth/google/callback  (find/create the SiteVisitor + CRM lead)
 *     → {site origin}/auth/google/complete?t={one-time encrypted token, 60s}
 *         (works on custom domains via ResolveCustomDomain) → per-site session.
 *
 * The final session is only established by the short-lived completion token,
 * so the cross-domain hop never exposes credentials. Google supplies no phone
 * number — the account panel collects it (required) after the first sign-in.
 */
class SiteVisitorGoogleController extends Controller
{
    private const STATE_TTL_MINUTES = 10;

    private const TOKEN_TTL_SECONDS = 60;

    public function __construct(
        private readonly VisitorAuth $auth,
        private readonly VisitorCrm $crm,
    ) {}

    /** Step 1 — site button lands here; bounce to Google with an encrypted state. */
    public function redirect(Request $request)
    {
        abort_unless(config('services.google.client_id'), 404);

        $site = $this->site((string) $request->query('site'));

        $state = Crypt::encrypt([
            'site_id' => $site->id,
            'return' => (string) $request->query('return', ''),
            'exp' => now()->addMinutes(self::STATE_TTL_MINUTES)->timestamp,
        ]);

        return Socialite::driver('google')
            ->stateless()
            ->redirectUrl(route('visitor-auth.google.callback'))
            ->with(['state' => $state])
            ->redirect();
    }

    /** Step 2 — Google's callback (app domain): resolve the visitor, hand off to the site. */
    public function callback(Request $request)
    {
        abort_unless(config('services.google.client_id'), 404);

        try {
            $state = Crypt::decrypt((string) $request->query('state'));
        } catch (\Throwable) {
            abort(403, 'Invalid sign-in state.');
        }
        abort_if(($state['exp'] ?? 0) < now()->timestamp, 403, 'Sign-in expired — please try again.');

        $site = AgentWebsite::findOrFail($state['site_id']);

        $google = Socialite::driver('google')
            ->stateless()
            ->redirectUrl(route('visitor-auth.google.callback'))
            ->user();

        $email = strtolower((string) $google->getEmail());
        abort_unless($email !== '', 422, 'Google did not provide an email address.');

        $visitor = SiteVisitor::where('agent_website_id', $site->id)
            ->where(fn ($q) => $q->where('google_id', $google->getId())->orWhere('email', $email))
            ->first();

        if ($visitor) {
            $visitor->update(['google_id' => $google->getId(), 'last_login_at' => now()]);
            $this->crm->logActivity($site, $visitor, 'website_login', 'Logged in on the website (Google)', [], 60);
        } else {
            $visitor = SiteVisitor::create([
                'agent_website_id' => $site->id,
                'google_id' => $google->getId(),
                'name' => $google->getName() ?: ($google->getNickname() ?: $email),
                'email' => $email,
                'phone' => null, // collected on the account panel (required)
                'password' => Str::random(40), // hashed by the cast; Google users log in via Google
                'last_login_at' => now(),
            ]);
            $this->crm->syncLead($site, $visitor);
            $this->crm->logActivity($site, $visitor, 'website_signup', 'Signed up on the website (Google)', ['email' => $email]);
        }

        $token = Crypt::encrypt([
            'visitor_id' => $visitor->id,
            'site_id' => $site->id,
            'exp' => now()->addSeconds(self::TOKEN_TTL_SECONDS)->timestamp,
        ]);

        return redirect()->away($this->completionUrl($site, (string) ($state['return'] ?? '')).'?'.http_build_query([
            't' => $token,
            'return' => $this->safeReturnPath((string) ($state['return'] ?? '')),
        ]));
    }

    /** Step 3 — on the SITE's own origin: token → per-site session cookie. */
    public function complete(Request $request, string $slug)
    {
        $site = $this->site($slug);

        try {
            $payload = Crypt::decrypt((string) $request->query('t'));
        } catch (\Throwable) {
            abort(403, 'Invalid sign-in token.');
        }
        abort_if(($payload['exp'] ?? 0) < now()->timestamp, 403, 'Sign-in expired — please try again.');
        abort_unless(($payload['site_id'] ?? null) === $site->id, 403);

        $visitor = SiteVisitor::where('agent_website_id', $site->id)->findOrFail($payload['visitor_id']);
        $this->auth->login($site, $visitor);

        // Phone is required — Google doesn't provide one, so first-timers land
        // on the account panel's "add your phone" prompt.
        if (! $visitor->phone) {
            return redirect()->route('agent-site.visitor.account', $site->slug);
        }

        $return = $this->safeReturnPath((string) $request->query('return', ''));

        return redirect($return !== '' ? $return : route('agent-site.properties', $site->slug));
    }

    /**
     * Where to finish the flow: the site's connected custom domain when the
     * visitor started there, otherwise the platform /site/{slug} URL. Only the
     * site's own verified domain is ever used — never an arbitrary return host.
     */
    private function completionUrl(AgentWebsite $site, string $startedAt): string
    {
        $host = parse_url($startedAt, PHP_URL_HOST);
        $onCustomDomain = $site->custom_domain
            && $site->domain_status === AgentWebsite::DOMAIN_CONNECTED
            && $host !== null
            && strtolower($host) === strtolower($site->custom_domain);

        if ($onCustomDomain) {
            $scheme = parse_url($startedAt, PHP_URL_SCHEME) ?: 'https';

            // ResolveCustomDomain maps the bare path to /site/{slug}/… internally.
            return "{$scheme}://{$site->custom_domain}/auth/google/complete";
        }

        return url("/site/{$site->slug}/auth/google/complete");
    }

    /** Returns a same-origin PATH (never a full URL) to bounce back to, or ''. */
    private function safeReturnPath(string $url): string
    {
        if ($url === '') {
            return '';
        }
        $path = parse_url($url, PHP_URL_PATH) ?: '';
        $query = parse_url($url, PHP_URL_QUERY);

        return Str::startsWith($path, '/') ? $path.($query ? "?{$query}" : '') : '';
    }

    private function site(string $slug): AgentWebsite
    {
        $site = AgentWebsite::where('slug', $slug)->firstOrFail();

        $user = auth()->user();
        $isOwner = $user && ($site->user_id === $user->id || ($user->team_id && $site->team_id === $user->team_id));
        abort_unless($site->is_published || $isOwner, 404);

        return $site;
    }
}
