<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
        'from_email' => env('RESEND_FROM_EMAIL'),
        'from_name' => env('RESEND_FROM_NAME'),
        // Svix signing secret for the email-tracking webhook (Resend → Webhooks).
        'webhook_secret' => env('RESEND_WEBHOOK_SECRET'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', '/auth/google/callback'),
        // Browser key for the public property-search map (restrict by HTTP referrer in Google Cloud).
        'maps_key' => env('GOOGLE_MAPS_API_KEY'),
        // Server-side key for Places API calls (Google-reviews import). Falls back to the
        // maps key, but browser keys are often referrer-restricted — set a dedicated
        // GOOGLE_PLACES_API_KEY without referrer restrictions for server use.
        'places_key' => env('GOOGLE_PLACES_API_KEY', env('GOOGLE_MAPS_API_KEY')),
        // Full resource name of the browser Maps key, e.g.
        // projects/123456/locations/global/keys/abc-def-… (Cloud Console → APIs & Services →
        // Credentials → the key → "Key ID"). When set (with a service-account credential),
        // the app auto-syncs every connected custom domain into the key's allowed HTTP
        // referrers, so the map works on customer domains without removing the restriction.
        'maps_key_resource' => env('GOOGLE_MAPS_KEY_RESOURCE'),
        // Path to a service-account JSON granted the apikeys.keys.get/update permissions
        // (role "API Keys Admin"). Falls back to Application Default Credentials.
        'maps_key_credentials' => env('GOOGLE_MAPS_KEY_CREDENTIALS', env('GOOGLE_APPLICATION_CREDENTIALS')),
    ],

    'microsoft' => [
        'client_id' => env('MICROSOFT_CLIENT_ID'),
        'client_secret' => env('MICROSOFT_CLIENT_SECRET'),
        'redirect' => env('MICROSOFT_REDIRECT_URI', '/auth/microsoft/callback'),
    ],

    // Set PROPERTY_SEARCH_MOCK=true (local only) to render sample listings on the
    // public property-search page when no MLS feed is connected — for UI preview.
    'property_search' => [
        'mock' => env('PROPERTY_SEARCH_MOCK', false),
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'idx_license_price_id' => env('STRIPE_IDX_LICENSE_PRICE_ID'),
        'pro_price_id' => env('STRIPE_PRO_PRICE_ID'),
        'enterprise_price_id' => env('STRIPE_ENTERPRISE_PRICE_ID'),
    ],

];
