<?php

declare(strict_types=1);

namespace App\Services\Email;

/**
 * Verifies Resend webhook signatures. Resend signs webhooks with Svix, so the
 * scheme is the standard Svix HMAC-SHA256 over `{svix-id}.{svix-timestamp}.{raw
 * body}`, keyed by the (base64) signing secret. The signing secret and the
 * computed signatures are never logged.
 */
class ResendWebhookVerifier
{
    /** Reject timestamps older/newer than this (seconds) to blunt replay. */
    private const TOLERANCE_SECONDS = 300;

    /**
     * @param  string  $payload  the raw request body (must be the exact bytes received)
     */
    public function verify(string $payload, ?string $id, ?string $timestamp, ?string $signatureHeader, ?string $secret): bool
    {
        if (empty($id) || empty($timestamp) || empty($signatureHeader) || empty($secret)) {
            return false;
        }

        if (! $this->timestampWithinTolerance($timestamp)) {
            return false;
        }

        $secretBytes = $this->secretBytes($secret);
        if ($secretBytes === '') {
            return false;
        }

        $signedContent = $id.'.'.$timestamp.'.'.$payload;
        $expected = base64_encode(hash_hmac('sha256', $signedContent, $secretBytes, true));

        // The header is a space-separated list of "{version},{signature}" pairs.
        foreach (explode(' ', $signatureHeader) as $part) {
            $segments = explode(',', $part, 2);
            if (count($segments) !== 2) {
                continue;
            }

            if (hash_equals($expected, $segments[1])) {
                return true;
            }
        }

        return false;
    }

    /** Svix secrets are "whsec_" + base64; decode to the raw HMAC key bytes. */
    private function secretBytes(string $secret): string
    {
        $key = str_starts_with($secret, 'whsec_') ? substr($secret, 6) : $secret;

        $decoded = base64_decode($key, true);

        // Fall back to the literal string if it isn't valid base64.
        return $decoded === false ? $key : $decoded;
    }

    private function timestampWithinTolerance(string $timestamp): bool
    {
        if (! ctype_digit($timestamp)) {
            return false;
        }

        return abs(now()->getTimestamp() - (int) $timestamp) <= self::TOLERANCE_SECONDS;
    }
}
