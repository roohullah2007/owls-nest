<?php

declare(strict_types=1);

namespace App\Services\Sites;

use App\Jobs\AddDomainToMapsKey;
use App\Jobs\RegisterCustomDomainCloudflare;
use App\Jobs\RemoveCustomDomainCloudflare;
use App\Jobs\RemoveDomainFromMapsKey;
use App\Models\AgentWebsite;
use App\Models\LandingPage;
use Illuminate\Support\Str;

/**
 * Owns the custom-domain lifecycle for agent websites AND landing pages:
 * normalising the entered host, issuing an ownership token, verifying DNS, and
 * producing the records the agent must add at their registrar. Theme-agnostic
 * and infra-agnostic — the actual TLS/edge routing is provisioned separately
 * (see config/sites.php). Both models expose identical domain columns +
 * DOMAIN_PENDING/DOMAIN_CONNECTED constants, so the logic is shared.
 */
class CustomDomainService
{
    public function __construct(
        private readonly CloudflareSaaSClient $cloudflare,
        private readonly GoogleMapsKeyManager $mapsKey,
    ) {}

    /** Strip scheme/path/whitespace so we store a bare lowercase host. */
    public function normalize(string $domain): string
    {
        $domain = strtolower(trim($domain));
        $domain = preg_replace('#^https?://#', '', $domain);

        return trim(explode('/', $domain)[0]);
    }

    /** Attach a domain and (re)issue an ownership token; resets verification. */
    public function connect(AgentWebsite|LandingPage $site, string $domain): void
    {
        $site->forceFill([
            'custom_domain' => $domain,
            'domain_status' => $site::DOMAIN_PENDING,
            'domain_verification_token' => $site->domain_verification_token ?: Str::random(32),
            'domain_verified_at' => null,
            'domain_last_checked_at' => null,
        ])->save();

        // When Cloudflare for SaaS is configured, register the hostname on a queue
        // so the request returns instantly and the (possibly slow) API call runs
        // in the background. The job is idempotent and self-heals on verify().
        if ($this->cloudflare->configured()) {
            RegisterCustomDomainCloudflare::dispatch($site, $domain);
        }

        // Whitelist the domain on the public Maps key so the property-search map
        // (and Places JS) load on the customer's own domain — the key stays
        // referrer-restricted, the system just manages which domains are allowed.
        if ($this->mapsKey->configured()) {
            AddDomainToMapsKey::dispatch($site, $domain);
        }
    }

    /** Remove the domain, clear all state, and queue Cloudflare cleanup. */
    public function disconnect(AgentWebsite|LandingPage $site): void
    {
        $domain = $site->custom_domain;

        $site->forceFill([
            'custom_domain' => null,
            'domain_status' => null,
            'domain_verification_token' => null,
            'domain_verified_at' => null,
            'domain_last_checked_at' => null,
        ])->save();

        if ($domain && $this->cloudflare->configured()) {
            RemoveCustomDomainCloudflare::dispatch($domain);
        }

        if ($domain && $this->mapsKey->configured()) {
            RemoveDomainFromMapsKey::dispatch($domain);
        }
    }

    /**
     * Verify the domain. With Cloudflare for SaaS configured, the live source of
     * truth is the custom hostname's status + SSL status; otherwise we fall back
     * to a plain DNS pointing check. The agent only ever adds ONE DNS record.
     *
     * @return array{verified: bool, pointing?: bool, hostname_status?: ?string, ssl_status?: ?string}
     */
    public function verify(AgentWebsite|LandingPage $site): array
    {
        return $this->cloudflare->configured()
            ? $this->verifyViaCloudflare($site)
            : $this->verifyViaDns($site);
    }

    /** @return array{verified: bool, hostname_status: ?string, ssl_status: ?string} */
    private function verifyViaCloudflare(AgentWebsite|LandingPage $site): array
    {
        // Fast status read ONLY. Registration happens once at connect() (queued,
        // with retries) — we never re-queue here, so polling can't flood the queue.
        $cf = $this->cloudflare->findByHostname((string) $site->custom_domain);
        $active = $cf && $cf['status'] === 'active' && $cf['ssl_status'] === 'active';

        $this->markStatus($site, $active);

        return [
            'verified' => $active,
            'hostname_status' => $cf['status'] ?? null,
            'ssl_status' => $cf['ssl_status'] ?? null,
        ];
    }

    /** @return array{verified: bool, pointing: bool} */
    private function verifyViaDns(AgentWebsite|LandingPage $site): array
    {
        $cfg = config('sites.custom_domain');
        $pointing = $this->pointsToPlatform($site->custom_domain, $cfg['cname_target'], $cfg['a_record_ip']);

        $this->markStatus($site, $pointing);

        return ['verified' => $pointing, 'pointing' => $pointing];
    }

    private function markStatus(AgentWebsite|LandingPage $site, bool $connected): void
    {
        $site->forceFill([
            'domain_status' => $connected ? $site::DOMAIN_CONNECTED : $site::DOMAIN_PENDING,
            'domain_verified_at' => $connected ? now() : null,
            'domain_last_checked_at' => now(),
        ])->save();
    }

    /**
     * The DNS records the agent must create at their registrar — tailored to the
     * domain they entered. A sub-domain (real-state.example.com, www.example.com)
     * only needs a single CNAME on its own host; an apex/root (example.com) can't
     * be CNAME'd, so it gets an A record plus a www CNAME.
     *
     * @return array<int, array{type: string, host: string, value: string, purpose: string}>
     */
    public function dnsInstructions(?string $domain = null): array
    {
        $cfg = config('sites.custom_domain');
        $host = $domain ? $this->subdomainLabel($this->normalize($domain)) : null;

        if ($host !== null) {
            return [
                ['type' => 'CNAME', 'host' => $host, 'value' => $cfg['cname_target'], 'purpose' => "Point {$domain} to your site"],
            ];
        }

        return [
            ['type' => 'A', 'host' => '@', 'value' => $cfg['a_record_ip'], 'purpose' => 'Point the root domain to your site'],
            ['type' => 'CNAME', 'host' => 'www', 'value' => $cfg['cname_target'], 'purpose' => 'Point the www variant to your site'],
        ];
    }

    /**
     * Host label(s) to use in a CNAME when $domain is a sub-domain ("real-state"
     * for real-state.example.com, "www" for www.example.com), or null when it is
     * an apex/root domain (example.com).
     *
     * Best-effort without the full Public Suffix List: the registrable domain is
     * the last two labels, unless those two form a known multi-part public suffix
     * (co.uk, com.au, …) in which case the last three.
     */
    private function subdomainLabel(string $domain): ?string
    {
        $labels = explode('.', $domain);

        $multiPart = ['co.uk', 'org.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.za', 'com.br', 'co.in', 'co.jp'];
        $suffixLabels = (count($labels) >= 3 && in_array(implode('.', array_slice($labels, -2)), $multiPart, true)) ? 2 : 1;
        $registrable = $suffixLabels + 1;

        if (count($labels) <= $registrable) {
            return null;
        }

        return implode('.', array_slice($labels, 0, count($labels) - $registrable));
    }

    private function pointsToPlatform(?string $domain, string $cname, string $ip): bool
    {
        if (! $domain) {
            return false;
        }

        foreach (@dns_get_record($domain, DNS_CNAME) ?: [] as $record) {
            if (rtrim($record['target'] ?? '', '.') === rtrim($cname, '.')) {
                return true;
            }
        }

        foreach (@dns_get_record($domain, DNS_A) ?: [] as $record) {
            if (($record['ip'] ?? '') === $ip) {
                return true;
            }
        }

        return false;
    }
}
