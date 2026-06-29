<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessResendWebhookEvent;
use App\Models\EmailSendEvent;
use App\Services\Email\ResendWebhookVerifier;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Receives Resend (Svix) email-tracking webhooks. Verifies the signature over
 * the raw body, dedups retries by svix-id, stores a sanitised event row, and
 * hands processing to a queued job so it can return 200 quickly.
 *
 * Never logs the webhook secret, signatures, or full payloads.
 */
class ResendWebhookController extends Controller
{
    public function __construct(private ResendWebhookVerifier $verifier) {}

    public function handle(Request $request): JsonResponse
    {
        $payload = $request->getContent();

        $svixId = $request->header('svix-id');
        $svixTimestamp = $request->header('svix-timestamp');
        $svixSignature = $request->header('svix-signature');

        $verified = $this->verifier->verify(
            $payload,
            $svixId,
            $svixTimestamp,
            $svixSignature,
            config('services.resend.webhook_secret'),
        );

        if (! $verified) {
            // No payload/headers in the log line — only that verification failed.
            Log::warning('Resend webhook signature verification failed');

            return response()->json(['error' => 'Invalid signature'], 401);
        }

        // Dedup: svix retries the same event with the same svix-id.
        if (EmailSendEvent::where('event_id', $svixId)->exists()) {
            return response()->json(['status' => 'duplicate_ignored'], 200);
        }

        $data = json_decode($payload, true);
        if (! is_array($data)) {
            // Signature was valid but body isn't JSON — accept so Resend stops
            // retrying, but don't process.
            return response()->json(['status' => 'ignored'], 200);
        }

        $eventType = (string) ($data['type'] ?? 'unknown');
        $eventData = is_array($data['data'] ?? null) ? $data['data'] : [];

        $to = $eventData['to'] ?? null;

        try {
            $event = EmailSendEvent::create([
                'provider' => 'resend',
                'event_id' => $svixId,
                'event_type' => $eventType,
                'provider_message_id' => $eventData['email_id'] ?? null,
                'recipient' => is_array($to) ? ($to[0] ?? null) : $to,
                'clicked_url' => $eventData['click']['link'] ?? null,
                'payload' => $this->sanitize($data),
                'occurred_at' => $this->occurredAt($data),
            ]);
        } catch (QueryException $e) {
            // Unique violation on event_id → a concurrent retry already stored it.
            return response()->json(['status' => 'duplicate_ignored'], 200);
        }

        ProcessResendWebhookEvent::dispatch($event->id);

        return response()->json(['status' => 'ok'], 200);
    }

    private function occurredAt(array $data): ?Carbon
    {
        $raw = $data['created_at'] ?? ($data['data']['created_at'] ?? null);

        if (! $raw) {
            return null;
        }

        try {
            return Carbon::parse($raw);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Keep only the fields we need for auditing/debugging — never store full
     * headers or any body content that may be present.
     *
     * @return array<string, mixed>
     */
    private function sanitize(array $data): array
    {
        $d = is_array($data['data'] ?? null) ? $data['data'] : [];

        $clean = [
            'type' => $data['type'] ?? null,
            'created_at' => $data['created_at'] ?? ($d['created_at'] ?? null),
            'email_id' => $d['email_id'] ?? null,
            'to' => $d['to'] ?? null,
            'from' => $d['from'] ?? null,
            'subject' => $d['subject'] ?? null,
        ];

        if (isset($d['click']['link'])) {
            $clean['click_link'] = $d['click']['link'];
        }
        if (isset($d['bounce'])) {
            $clean['bounce'] = array_intersect_key(
                (array) $d['bounce'],
                array_flip(['type', 'subType', 'message']),
            );
        }
        if (isset($d['reason'])) {
            $clean['reason'] = $d['reason'];
        }

        return array_filter($clean, fn ($v) => $v !== null);
    }
}
