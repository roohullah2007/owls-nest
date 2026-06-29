<?php

declare(strict_types=1);

namespace App\Services\Email;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Thin wrapper over the Resend REST API (https://resend.com/docs/api-reference).
 * Used for branded/lead emails where the API key is resolved per-user at send
 * time — going through the HTTP API (rather than a cached Laravel mail
 * transport) lets us swap keys per call and keeps the path fully fakeable in
 * tests via Http::fake(). Platform auth emails (verify/reset) go through the
 * Laravel `resend` mailer instead.
 *
 * The real API key is passed in per call and never logged.
 */
class ResendClient
{
    private const ENDPOINT = 'https://api.resend.com/emails';

    /**
     * @return string the provider message id
     *
     * @throws RuntimeException on a missing key or a failed send
     */
    public function send(?string $apiKey, string $fromEmail, ?string $fromName, string $to, string $subject, string $html): string
    {
        if (empty($apiKey)) {
            Log::error('Resend send aborted: no API key configured (set RESEND_API_KEY or a per-user branded key).');
            throw new RuntimeException('No Resend API key configured.');
        }

        $this->assertSendingDomainVerified($fromEmail);

        $from = $fromName ? sprintf('%s <%s>', $fromName, $fromEmail) : $fromEmail;

        $response = Http::withToken($apiKey)
            ->asJson()
            ->timeout(15)
            ->post(self::ENDPOINT, [
                'from' => $from,
                'to' => [$to],
                'subject' => $subject,
                'html' => $html,
            ]);

        if ($response->failed()) {
            // Surface the provider error text but never the key.
            $message = $response->json('message') ?? $response->json('error.message') ?? 'Resend send failed';
            throw new RuntimeException('Resend: '.$message.' (HTTP '.$response->status().')');
        }

        return (string) ($response->json('id') ?? '');
    }

    /**
     * Deliverability guard: refuse to send from the platform domain while it is
     * unverified in Resend (RESEND_DOMAIN_VERIFIED=false). Branded sends from a
     * user's own domain are NOT gated here — that domain is the user's own Resend
     * responsibility. The platform alias path only ever emits addresses on the
     * configured domain, so this is its kill-switch during domain setup.
     */
    private function assertSendingDomainVerified(string $fromEmail): void
    {
        $platformDomain = strtolower(trim((string) config('mail.sender_alias.domain', '')));
        if ($platformDomain === '') {
            return;
        }

        $fromDomain = strtolower(Str::after($fromEmail, '@'));
        if ($fromDomain === $platformDomain && ! config('mail.sender_alias.domain_verified', true)) {
            Log::warning('Resend send aborted: platform sending domain not verified.', ['domain' => $platformDomain]);
            throw new RuntimeException('Resend platform sending domain is not verified.');
        }
    }
}
