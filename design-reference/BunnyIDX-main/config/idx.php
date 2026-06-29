<?php

return [

    'license' => [
        'key_prefix' => 'IDX',
        'segment_length' => 4,
        'segments' => 3,
        'charset' => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', // no 0,O,I,1,L
        'cache_ttl' => 86400, // 24 hours
        'grace_period' => 604800, // 7 days if backend unreachable
    ],

    'relay' => [
        'rate_limit' => 100, // requests per minute per license
        'cache_ttl' => 900, // 15 minutes default
        'log_retention' => 30, // days
        'token_refresh_buffer' => 3600, // refresh token 60 min before expiry
    ],

    /*
    |--------------------------------------------------------------------------
    | Bridge Data Output
    |--------------------------------------------------------------------------
    |
    | System-level credentials for Bridge Data Output API. These are used for
    | ALL Bridge MLS connections. Users do NOT need their own Bridge API keys.
    |
    | Server Token: full access for backend API calls
    | Browser Token: limited read-only for client-side (WP plugin relay)
    |
    */

    'bridge' => [
        'base_url' => env('BRIDGE_API_BASE_URL', 'https://api.bridgedataoutput.com/api/v2/'),
        'odata_url' => env('BRIDGE_ODATA_URL', 'https://api.bridgedataoutput.com/api/v2/OData/'),
        'server_token' => env('BRIDGE_SERVER_TOKEN'),
        'browser_token' => env('BRIDGE_BROWSER_TOKEN'),
        'client_id' => env('BRIDGE_CLIENT_ID'),
        'client_secret' => env('BRIDGE_CLIENT_SECRET'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Realtyna / RealtyFeed
    |--------------------------------------------------------------------------
    | OAuth2 client_credentials → 24-hour Bearer token. One account proxies
    | access to many MLSes. Each MLS in our catalog stores its
    | OriginatingSystemName in `mls_providers.data_source_config` so the
    | service can filter results per request.
    */
    'realtyna' => [
        'base_url' => env('REALTYNA_API_BASE', 'https://api.realtyfeed.com'),
        'client_id' => env('REALTYNA_CLIENT_ID'),
        'client_secret' => env('REALTYNA_CLIENT_SECRET'),
        'api_key' => env('REALTYNA_API_KEY'),
        'token_cache_ttl' => env('REALTYNA_TOKEN_CACHE_TTL', 82800),  // 23h — refresh before 24h expiry
    ],

    /*
    |--------------------------------------------------------------------------
    | Paragon (paragonrels.com)
    |--------------------------------------------------------------------------
    |
    | Paragon is provisioned PER customer AND per MLS: each MLS has its own
    | service-root subdomain (the dataset class supplies it) and the customer's
    | login/password are the OAuth client_id/client_secret stored on the
    | IdxConnection. There is no platform-wide account — only request tuning here.
    |
    */

    'paragon' => [
        'timeout' => env('PARAGON_TIMEOUT', 20),
        'token_cache_ttl' => env('PARAGON_TOKEN_CACHE_TTL', 7140),  // ~2h, refresh before expiry
    ],

    /*
    |--------------------------------------------------------------------------
    | Available MLS Datasets
    |--------------------------------------------------------------------------
    |
    | Registry of all MLS datasets. Bridge datasets use our system token.
    | Repliers datasets require user's own API key (BYOK).
    |
    | tier: 'free' = included at no cost, 'byok' = user provides their own key
    |
    */

    'datasets' => [
        // ── Primary Florida MLSes ────────────────────────────────────
        'miamire'    => [
            'name' => 'Miami Association of REALTORS',
            'region' => 'FL', 'tier' => 'free', 'provider' => 'bridge',
            'logo' => 'https://mlsimport.com/wp-content/uploads/2022/01/MAR_2019_Color.png',
            'property_types' => ['Residential', 'Condominium', 'Commercial Sale', 'Residential Income', 'Business Opportunity', 'Land'],
            'statuses' => ['Active', 'Pending', 'Active Under Contract', 'Closed', 'Expired', 'Withdrawn', 'Canceled'],
        ],
        'stellar'    => [
            'name' => 'Stellar MLS',
            'region' => 'FL', 'tier' => 'free', 'provider' => 'bridge',
            'logo' => 'https://irp.cdn-website.com/3d0f9886/dms3rep/multi/StellarMLS_horizontal_RGB-a4a24b6d.png',
            'property_types' => ['Residential', 'Condominium', 'Commercial Sale', 'Residential Income', 'Land', 'Farm', 'Mobile Home'],
            'statuses' => ['Active', 'Pending', 'Active Under Contract', 'Closed', 'Expired', 'Withdrawn', 'Canceled', 'Coming Soon'],
        ],
        'beachesmls' => [
            'name' => 'BeachesMLS (Broward, Palm Beaches & St. Lucie)',
            'region' => 'FL', 'tier' => 'byok', 'provider' => 'realtyna',
            // Official full-color mark from the BeachesMLS branding kit (rworld.com/external-beaches).
            'logo' => 'https://static1.squarespace.com/static/5dd6e5c4baf69652ee450b55/t/5f8750280ec883699d38fc4f/1602703401141/BeachesMLS+Logo.png',
            // Realtyna/RealtyFeed partitions MLSes by OriginatingSystemName —
            // this value is what every OData $filter scopes to. Verified live.
            'originating_system_name' => 'Beaches',
            'property_types' => ['Residential', 'Residential Lease', 'Residential Income', 'Commercial Sale', 'Land'],
            'statuses' => ['Active', 'Active Under Contract', 'Pending', 'Closed', 'Coming Soon', 'Withdrawn', 'Expired'],
        ],
        'primemls'   => [
            'name' => 'PrimeMLS (New Hampshire & Vermont)',
            'region' => 'NH/VT', 'tier' => 'byok', 'provider' => 'paragon',
            'logo' => null,
            // Paragon OData service root — the dataset class (Paragon\PrimeMls)
            // is the canonical source; this mirrors it for the admin connection
            // test, which reads data_source_config.base_url before a key is set.
            'base_url' => 'https://PrimeMLS.paragonrels.com/OData/PrimeMLS',
            'property_types' => ['Residential', 'Residential Lease', 'Residential Income', 'Commercial Sale', 'Land'],
            'statuses' => ['Active', 'Active Under Contract', 'Pending', 'Closed', 'Coming Soon', 'Withdrawn', 'Expired'],
        ],
        'nabor'      => ['name' => 'Naples Area Board of REALTORS',              'region' => 'FL', 'tier' => 'free', 'provider' => 'bridge', 'logo' => 'https://mlsimport.com/wp-content/uploads/2022/01/nabor.png'],
        'bsaor'      => ['name' => 'Bonita Springs-Estero REALTORS',             'region' => 'FL', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'pensacola'  => ['name' => 'Pensacola Association of REALTORS',          'region' => 'FL', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],

        // ── Texas ────────────────────────────────────────────────────
        'actris'     => ['name' => 'Unlock MLS (Austin)',                        'region' => 'TX', 'tier' => 'free', 'provider' => 'bridge', 'logo' => 'https://mlsimport.com/wp-content/uploads/2022/01/actris.png'],
        'har'        => ['name' => 'Houston Association of REALTORS',            'region' => 'TX', 'tier' => 'free', 'provider' => 'bridge', 'logo' => 'https://mlsimport.com/wp-content/uploads/2022/01/har.png'],
        'gmar'       => ['name' => 'Greater McAllen Association of REALTORS',    'region' => 'TX', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'gepar'      => ['name' => 'Greater El Paso Association of REALTORS',    'region' => 'TX', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],

        // ── Georgia ──────────────────────────────────────────────────
        'fmls'       => ['name' => 'First Multiple Listing Service (Atlanta)',   'region' => 'GA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => 'https://mlsimport.com/wp-content/uploads/2022/01/fmls.png'],
        'gamls2'     => ['name' => 'Georgia MLS',                                'region' => 'GA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => 'https://mlsimport.com/wp-content/uploads/2022/01/gamls.png'],

        // ── California ───────────────────────────────────────────────
        'sfar'       => ['name' => 'San Francisco Association of REALTORS',      'region' => 'CA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => 'https://mlsimport.com/wp-content/uploads/2022/01/sfar.png'],
        'beccar'     => ['name' => 'Bay East & Contra Costa AOR',                'region' => 'CA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'bridgemls'  => ['name' => 'bridgeMLS (East Bay)',                       'region' => 'CA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],

        // ── Northeast ────────────────────────────────────────────────
        'nystatemls' => ['name' => 'NY State MLS',                               'region' => 'NY', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'mlspin'     => ['name' => 'MLS Property Information Network',           'region' => 'MA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => 'https://mlsimport.com/wp-content/uploads/2022/01/mlspin.png'],
        'jerseymls'  => ['name' => 'All Jersey MLS',                             'region' => 'NJ', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'riar'       => ['name' => 'Rhode Island Association of REALTORS',       'region' => 'RI', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'ccimls'     => ['name' => 'Cape Cod & Islands MLS',                     'region' => 'MA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],

        // ── Carolinas ────────────────────────────────────────────────
        'triangle'   => ['name' => 'Doorify MLS (Raleigh-Durham)',               'region' => 'NC', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'triadmls'   => ['name' => 'Triad MLS',                                  'region' => 'NC', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],

        // ── Southeast / Gulf ─────────────────────────────────────────
        'valleymls'  => ['name' => 'Valley MLS',                                 'region' => 'AL', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'gcmls2'     => ['name' => 'Gulf Coast MLS (Mobile)',                    'region' => 'AL', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'united'     => ['name' => 'MLS United',                                  'region' => 'MS', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],

        // ── Louisiana ────────────────────────────────────────────────
        'gbrmls'     => ['name' => 'Greater Baton Rouge Association of REALTORS','region' => 'LA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'raa'        => ['name' => 'REALTOR Association of Acadiana',            'region' => 'LA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'nelar'      => ['name' => 'Northeast Louisiana Association of REALTORS','region' => 'LA', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],

        // ── Other US ─────────────────────────────────────────────────
        'imls2'      => ['name' => 'Intermountain MLS',                           'region' => 'ID', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'akmls2'     => ['name' => 'Alaska Multiple Listing Service',             'region' => 'AK', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],

        // ── Canadian (Bridge) ────────────────────────────────────────
        'bcres'      => ['name' => 'Greater Vancouver & Fraser Valley (Res.)',   'region' => 'BC', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'bccls'      => ['name' => 'Greater Vancouver & Fraser Valley (Com.)',   'region' => 'BC', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'nsar'       => ['name' => 'Nova Scotia Association of REALTORS',        'region' => 'NS', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'rae'        => ['name' => 'REALTORS Association of Edmonton',           'region' => 'AB', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'viva'       => ['name' => 'Victoria and Vancouver Island',              'region' => 'BC', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],
        'itso'       => ['name' => 'Information Technology Systems Ontario',     'region' => 'ON', 'tier' => 'free', 'provider' => 'bridge', 'logo' => null],

        // ── Repliers (BYOK — user provides their own API key) ────────
        'repliers'   => ['name' => 'Repliers (Canadian MLS — BYOK)',             'region' => 'CA', 'tier' => 'byok', 'provider' => 'repliers', 'logo' => null],
    ],

    /*
    |--------------------------------------------------------------------------
    | Repliers API
    |--------------------------------------------------------------------------
    */

    'repliers' => [
        'base_url' => env('REPLIERS_API_URL', 'https://api.repliers.io'),
    ],

];
