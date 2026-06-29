<?php

return [
    'api_key' => env('TELNYX_API_KEY'),
    'public_key' => env('TELNYX_PUBLIC_KEY'),
    'messaging_profile_id' => env('TELNYX_MESSAGING_PROFILE_ID'),
    // Telnyx Call Control App ID — required for programmatic outbound calls (voicedrop, click-to-call orchestration).
    // Get from Mission Control Portal → Voice → Call Control Apps.
    'call_control_app_id' => env('TELNYX_CALL_CONTROL_APP_ID'),
    // SIP/Credential Connection ID used to mint WebRTC credentials for the in-browser dialer.
    // VoiceController::getToken will auto-create one and persist it back to .env on first request
    // if this is empty, but pinning a stable ID here avoids creating duplicate connections.
    'sip_connection_id' => env('TELNYX_SIP_CONNECTION_ID'),
    'webhook_secret' => env('TELNYX_WEBHOOK_SECRET'),
    'api_base' => 'https://api.telnyx.com/v2',
];
