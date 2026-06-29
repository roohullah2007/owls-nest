<?php

declare(strict_types=1);

/**
 * Plan feature catalog for subscription gating.
 *
 * `catalog` is the canonical list of gateable features (key => label). Core CRM
 * (contacts, deals, tasks, calendar) is never gated and intentionally absent.
 *
 * `defaults` seeds the editable `plans` table on first migrate. After that the
 * DB row is the source of truth — admins edit each plan's features in the panel.
 * Per product decision, every paid feature is paid-only by default (the free
 * plan starts with none).
 */
return [
    'catalog' => [
        'websites' => 'Websites & landing pages',
        'ai' => 'AI features',
        'email' => 'Email & bulk email',
        'phone' => 'Phone, SMS & power dialer',
        'idx' => 'IDX / MLS data',
        // Umbrella entitlement for the whole team workspace: members, roles &
        // permissions, shared inbox, shared deal board, team reports, lead
        // assignment, and team chat. Team plan only.
        'team' => 'Team collaboration',
    ],

    'defaults' => [
        'free' => [],
        'pro' => ['websites', 'ai', 'email', 'phone', 'idx'],
        'enterprise' => ['websites', 'ai', 'email', 'phone', 'idx', 'team'],
    ],
];
