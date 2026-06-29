<?php

declare(strict_types=1);

namespace App\Services\Telnyx;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelnyxService
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        // Coalesce null → '' so an unset TELNYX_API_KEY (config value present but
        // null) doesn't fatal the typed string property.
        $this->apiKey = (string) (config('telnyx.api_key') ?? '');
        $this->baseUrl = (string) (config('telnyx.api_base') ?? 'https://api.telnyx.com/v2');
    }

    /**
     * Search for available phone numbers by area code.
     */
    public function searchAvailableNumbers(string $areaCode, int $limit = 10): array
    {
        $response = $this->request()->get("{$this->baseUrl}/available_phone_numbers", [
            'filter[national_destination_code]' => $areaCode,
            'filter[country_code]' => 'US',
            'filter[features][]' => ['sms', 'voice'],
            'filter[limit]' => $limit,
        ]);

        if ($response->failed()) {
            Log::error('Telnyx: Failed to search numbers', ['response' => $response->body()]);
            return [];
        }

        return $response->json('data', []);
    }

    /**
     * Purchase a phone number.
     */
    public function purchaseNumber(string $phoneNumber): ?array
    {
        $response = $this->request()->post("{$this->baseUrl}/number_orders", [
            'phone_numbers' => [
                ['phone_number' => $phoneNumber],
            ],
            'messaging_profile_id' => config('telnyx.messaging_profile_id'),
        ]);

        if ($response->failed()) {
            Log::error('Telnyx: Failed to purchase number', [
                'number' => $phoneNumber,
                'response' => $response->body(),
            ]);
            return null;
        }

        return $response->json('data');
    }

    /**
     * Release a phone number back to Telnyx.
     */
    public function releaseNumber(string $telnyxPhoneNumberId): bool
    {
        $response = $this->request()->delete("{$this->baseUrl}/phone_numbers/{$telnyxPhoneNumberId}");

        if ($response->failed()) {
            Log::error('Telnyx: Failed to release number', [
                'telnyx_id' => $telnyxPhoneNumberId,
                'response' => $response->body(),
            ]);
            return false;
        }

        return true;
    }

    /**
     * Update the messaging profile on a phone number.
     */
    public function updateNumberMessagingProfile(string $telnyxPhoneNumberId, string $profileId): bool
    {
        $response = $this->request()->patch("{$this->baseUrl}/phone_numbers/{$telnyxPhoneNumberId}", [
            'messaging_profile_id' => $profileId,
        ]);

        return $response->successful();
    }

    /**
     * Send an SMS message.
     */
    public function sendSms(string $from, string $to, string $body): ?array
    {
        $response = $this->request()->post("{$this->baseUrl}/messages", [
            'from' => $from,
            'to' => $to,
            'text' => $body,
            'messaging_profile_id' => config('telnyx.messaging_profile_id'),
        ]);

        if ($response->failed()) {
            Log::error('Telnyx: Failed to send SMS', [
                'from' => $from,
                'to' => $to,
                'response' => $response->body(),
            ]);
            return null;
        }

        return $response->json('data');
    }

    /**
     * Create a SIP connection for WebRTC.
     */
    public function createSipConnection(string $name): ?array
    {
        $response = $this->request()->post("{$this->baseUrl}/credential_connections", [
            'connection_name' => $name,
            'active' => true,
        ]);

        if ($response->failed()) {
            Log::error('Telnyx: Failed to create SIP connection', ['response' => $response->body()]);
            return null;
        }

        return $response->json('data');
    }

    /**
     * Create a WebRTC credential (SIP user).
     */
    public function createWebRtcCredential(string $connectionId, string $username, string $password): ?array
    {
        $response = $this->request()->post("{$this->baseUrl}/telephony_credentials", [
            'connection_id' => $connectionId,
            'name' => $username,
            'sip_username' => $username,
            'sip_password' => $password,
        ]);

        if ($response->failed()) {
            Log::error('Telnyx: Failed to create WebRTC credential', ['response' => $response->body()]);
            return null;
        }

        return $response->json('data');
    }

    /**
     * Generate a short-lived client token for WebRTC.
     */
    public function generateClientToken(string $credentialId): ?string
    {
        $response = $this->request()->post("{$this->baseUrl}/telephony_credentials/{$credentialId}/token");

        if ($response->failed()) {
            Log::error('Telnyx: Failed to generate client token', ['response' => $response->body()]);
            return null;
        }

        return $response->body();
    }

    /**
     * Answer an incoming call.
     */
    public function answerCall(string $callControlId): bool
    {
        return $this->callCommand($callControlId, 'answer');
    }

    /**
     * Hang up a call.
     */
    public function hangupCall(string $callControlId): bool
    {
        return $this->callCommand($callControlId, 'hangup');
    }

    /**
     * Mute/unmute a call.
     */
    public function muteCall(string $callControlId, bool $mute = true): bool
    {
        return $this->callCommand($callControlId, $mute ? 'mute' : 'unmute');
    }

    /**
     * Hold/unhold a call.
     */
    public function holdCall(string $callControlId, bool $hold = true): bool
    {
        return $this->callCommand($callControlId, $hold ? 'hold' : 'unhold');
    }

    /**
     * Transfer a call to another number.
     */
    public function transferCall(string $callControlId, string $toNumber): bool
    {
        $response = $this->request()->post("{$this->baseUrl}/calls/{$callControlId}/actions/transfer", [
            'to' => $toNumber,
        ]);

        return $response->successful();
    }

    /**
     * Start recording a call.
     */
    public function startRecording(string $callControlId): bool
    {
        $response = $this->request()->post("{$this->baseUrl}/calls/{$callControlId}/actions/record_start", [
            'format' => 'mp3',
            'channels' => 'dual',
        ]);

        return $response->successful();
    }

    /**
     * Stop recording a call.
     */
    public function stopRecording(string $callControlId): bool
    {
        return $this->callCommand($callControlId, 'record_stop');
    }

    /**
     * Initiate an outbound call via Call Control. Returns the call_control_id (or null on failure).
     * Use this to dial a number programmatically (voicedrops, click-to-call, IVR, etc.).
     *
     * @param string $from         The agent's Telnyx number (E.164).
     * @param string $to           The recipient's number (E.164).
     * @param string $connectionId The Call Control App / Connection ID (config('telnyx.call_control_app_id')).
     * @param array  $extras       Optional Telnyx params (e.g. answering_machine_detection, custom_headers, client_state).
     */
    public function initiateCall(string $from, string $to, string $connectionId, array $extras = []): ?string
    {
        $response = $this->request()->post("{$this->baseUrl}/calls", array_merge([
            'connection_id' => $connectionId,
            'to' => $to,
            'from' => $from,
        ], $extras));

        if ($response->failed()) {
            Log::error('Telnyx: Failed to initiate call', [
                'from' => $from,
                'to' => $to,
                'error' => $response->json(),
            ]);
            return null;
        }

        return $response->json('data.call_control_id');
    }

    /**
     * Initiate a voicedrop / ringless voicemail.
     *
     * Strategy: dial the recipient with answering-machine detection. When the AMD/answer event
     * fires, the webhook handler plays the audio URL and hangs up. The `client_state` carries
     * the audio URL through to the webhook so the orchestration is self-contained.
     */
    public function dropVoicemail(string $from, string $to, string $connectionId, string $audioUrl): ?string
    {
        $clientState = base64_encode(json_encode([
            'kind' => 'voicedrop',
            'audio_url' => $audioUrl,
        ]));

        return $this->initiateCall($from, $to, $connectionId, [
            'answering_machine_detection' => 'premium',
            'client_state' => $clientState,
        ]);
    }

    /**
     * Play an audio file on an active call.
     */
    public function playAudio(string $callControlId, string $audioUrl, array $extras = []): bool
    {
        $response = $this->request()->post("{$this->baseUrl}/calls/{$callControlId}/actions/playback_start", array_merge([
            'audio_url' => $audioUrl,
        ], $extras));

        if ($response->failed()) {
            Log::error('Telnyx: Failed to start playback', [
                'call_control_id' => $callControlId,
                'audio_url' => $audioUrl,
                'error' => $response->json(),
            ]);
            return false;
        }

        return true;
    }

    /**
     * Verify a Telnyx webhook signature.
     *
     * Telnyx signs every webhook with Ed25519 (NOT HMAC): the `telnyx-signature-ed25519`
     * header is a base64 signature over the literal string "{timestamp}|{raw_body}", verified
     * against the account's base64 Ed25519 public key (config('telnyx.public_key'), from
     * Mission Control → Account → Keys & Credentials). PHP 8.3 ships libsodium for this.
     *
     * When no public key is configured we only no-op in local/testing so unsigned traffic
     * can never reach prod controllers.
     */
    public function verifyWebhookSignature(string $payload, string $signature, string $timestamp): bool
    {
        $publicKey = (string) (config('telnyx.public_key') ?? '');

        if ($publicKey === '') {
            // Only allow unsigned webhooks during local development / tests.
            return app()->environment('local', 'testing');
        }

        if ($signature === '' || $timestamp === '') {
            return false;
        }

        $decodedSignature = base64_decode($signature, true);
        $decodedPublicKey = base64_decode($publicKey, true);

        if ($decodedSignature === false
            || $decodedPublicKey === false
            || strlen($decodedPublicKey) !== SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES
            || strlen($decodedSignature) !== SODIUM_CRYPTO_SIGN_BYTES) {
            return false;
        }

        $signedPayload = $timestamp . '|' . $payload;

        try {
            return sodium_crypto_sign_verify_detached($decodedSignature, $signedPayload, $decodedPublicKey);
        } catch (\SodiumException $e) {
            Log::error('Telnyx: webhook signature verification failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    private function callCommand(string $callControlId, string $action): bool
    {
        $response = $this->request()->post("{$this->baseUrl}/calls/{$callControlId}/actions/{$action}");

        if ($response->failed()) {
            Log::error("Telnyx: Failed to {$action} call", [
                'call_control_id' => $callControlId,
                'response' => $response->body(),
            ]);
            return false;
        }

        return true;
    }

    private function request(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withToken($this->apiKey)
            ->acceptJson()
            ->timeout(15);
    }
}
