<?php

return [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'gmail_redirect' => env('GOOGLE_GMAIL_REDIRECT_URI', '/crm/email/oauth/google/callback'),
    'gmail_scopes' => [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
    ],
    'calendar_redirect' => env('GOOGLE_CALENDAR_REDIRECT_URI', '/crm/calendar/oauth/google/callback'),
    'calendar_scopes' => [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
    ],
];
