<?php

return [
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
        'max_tokens' => 2000,
        'timeout' => 30,
    ],

    'lead_scoring' => [
        'weights' => [
            'profile_completeness' => 20,
            'engagement' => 25,
            'communication_recency' => 20,
            'deal_involvement' => 15,
            'tags_notes' => 10,
            'meetings_tasks' => 10,
        ],
    ],

    'follow_up' => [
        'stale_days' => 14,
        'new_lead_grace_days' => 3,
        'deal_stagnant_days' => 21,
        'birthday_lookahead_days' => 14,
    ],

    'summary' => [
        // Minimum hours between auto-regenerations (prevents token waste)
        'cooldown_hours' => 24,
        // Number of significant events needed to trigger auto-regeneration
        'activity_threshold' => 3,
        // Event types that count as "significant" for summary regeneration
        'significant_events' => [
            'deal_created',
            'deal_closed',
            'deal_stage_changed',
            'meeting_created',
            'meeting_scheduled',
            'contact_type_changed',
            'email_logged',
            'call_logged',
            'sms_logged',
            'note_created',
        ],
    ],
];
