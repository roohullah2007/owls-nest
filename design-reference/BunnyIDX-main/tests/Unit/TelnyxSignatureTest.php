<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Telnyx\TelnyxService;
use Tests\TestCase;

class TelnyxSignatureTest extends TestCase
{
    private function sign(string $payload, string $timestamp, string $secretKey): string
    {
        return base64_encode(sodium_crypto_sign_detached($timestamp.'|'.$payload, $secretKey));
    }

    public function test_valid_ed25519_signature_is_accepted(): void
    {
        $keypair = sodium_crypto_sign_keypair();
        config(['telnyx.public_key' => base64_encode(sodium_crypto_sign_publickey($keypair))]);

        $payload = json_encode(['data' => ['event_type' => 'message.received']]);
        $timestamp = '1700000000';
        $signature = $this->sign($payload, $timestamp, sodium_crypto_sign_secretkey($keypair));

        $this->assertTrue((new TelnyxService)->verifyWebhookSignature($payload, $signature, $timestamp));
    }

    public function test_tampered_payload_is_rejected(): void
    {
        $keypair = sodium_crypto_sign_keypair();
        config(['telnyx.public_key' => base64_encode(sodium_crypto_sign_publickey($keypair))]);

        $payload = json_encode(['data' => ['event_type' => 'message.received']]);
        $timestamp = '1700000000';
        $signature = $this->sign($payload, $timestamp, sodium_crypto_sign_secretkey($keypair));

        $service = new TelnyxService;
        $this->assertFalse($service->verifyWebhookSignature($payload.'tampered', $signature, $timestamp));
        $this->assertFalse($service->verifyWebhookSignature($payload, $signature, '1700000999'));
        $this->assertFalse($service->verifyWebhookSignature($payload, '', $timestamp));
    }

    public function test_wrong_key_is_rejected(): void
    {
        $signingPair = sodium_crypto_sign_keypair();
        $otherPair = sodium_crypto_sign_keypair();
        // Configure the verifier with a DIFFERENT account's public key.
        config(['telnyx.public_key' => base64_encode(sodium_crypto_sign_publickey($otherPair))]);

        $payload = json_encode(['ok' => true]);
        $timestamp = '1700000000';
        $signature = $this->sign($payload, $timestamp, sodium_crypto_sign_secretkey($signingPair));

        $this->assertFalse((new TelnyxService)->verifyWebhookSignature($payload, $signature, $timestamp));
    }

    public function test_missing_public_key_allows_only_local_or_testing(): void
    {
        config(['telnyx.public_key' => null]);

        // The test runner reports environment() === 'testing', so unsigned is allowed here.
        $this->assertTrue(
            (new TelnyxService)->verifyWebhookSignature('{}', '', '')
        );
    }
}
