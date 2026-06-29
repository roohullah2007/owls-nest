<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Custom domain targets
    |--------------------------------------------------------------------------
    | DNS targets shown to agents when connecting their own domain, and used to
    | verify the domain points at the platform. Keep these in env so the same
    | code works across local / staging / production without edits.
    |
    | SSL for arbitrary customer domains is provisioned at the edge (Caddy
    | on-demand TLS, or Cloudflare "SSL for SaaS"), NOT in the application.
    */
    'custom_domain' => [
        // CNAME target for www / sub-domains.
        'cname_target' => env('SITE_CNAME_TARGET', 'connect.bunnyidx.test'),
        // A record IP for apex / root domains.
        'a_record_ip' => env('SITE_A_RECORD_IP', '203.0.113.10'),
        // TXT record host prefix used for ownership verification.
        'txt_prefix' => env('SITE_TXT_PREFIX', '_bunnyidx-verify'),
    ],

    /*
    | Hosts served by the platform itself (CRM, marketing, default URLs). The
    | custom-domain resolver skips these so the app keeps working normally; any
    | other host is treated as a possible connected customer domain.
    */
    'platform_hosts' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('SITE_PLATFORM_HOSTS', 'bunnyidx.test,localhost,127.0.0.1'))
    ))),

    /*
    | Cloudflare for SaaS (Custom Hostnames). When a token + zone are set, the
    | app auto-registers each connected custom domain as a Cloudflare custom
    | hostname so SSL is issued automatically. Leave blank to fall back to the
    | manual (DNS-only) flow.
    */
    'cloudflare' => [
        'api_token' => env('CLOUDFLARE_API_TOKEN'),
        'zone_id' => env('CLOUDFLARE_ZONE_ID'),
    ],
];

