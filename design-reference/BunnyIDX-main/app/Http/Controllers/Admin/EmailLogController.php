<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailSendEvent;
use App\Models\EmailSendLog;
use App\Models\EmailSuppression;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only admin view of Resend email delivery tracking. Admin-gated, so it is
 * not tenant-scoped. Only safe columns are ever exposed — never API keys, the
 * webhook secret, raw webhook payloads, email bodies, or headers (none of which
 * live in these tables anyway).
 */
class EmailLogController extends Controller
{
    /** Columns safe to surface to the admin UI (no meta/idempotency_key). */
    private const LOG_COLUMNS = [
        'id', 'recipient', 'sender', 'subject', 'status', 'provider', 'branded',
        'template_type', 'quota_category', 'provider_message_id',
        'sent_at', 'delivered_at', 'opened_at', 'last_opened_at',
        'clicked_at', 'last_clicked_at', 'bounce_reason', 'complaint_at',
        'failed_reason', 'error_message', 'created_at',
    ];

    public function index(Request $request): Response
    {
        $status = $request->input('status');
        $template = $request->input('template');
        $q = $request->input('q');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $logs = EmailSendLog::query()
            ->when($status, fn ($query) => $query->where('status', $status))
            ->when($template, fn ($query) => $query->where('template_type', $template))
            ->when($q, function ($query) use ($q) {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $q);
                $query->where('recipient', 'like', "%{$escaped}%");
            })
            ->when($dateFrom, fn ($query) => $query->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo, fn ($query) => $query->whereDate('created_at', '<=', $dateTo))
            ->orderByRaw('COALESCE(sent_at, created_at) DESC')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (EmailSendLog $log) => $log->only(self::LOG_COLUMNS));

        return Inertia::render('Admin/EmailLogs/Index', [
            'logs' => $logs,
            'filters' => [
                'status' => $status,
                'template' => $template,
                'q' => $q,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'statusOptions' => [
                ['value' => '', 'label' => 'All statuses'],
                ['value' => EmailSendLog::STATUS_QUEUED, 'label' => 'Queued'],
                ['value' => EmailSendLog::STATUS_SENT, 'label' => 'Sent'],
                ['value' => EmailSendLog::STATUS_DELIVERED, 'label' => 'Delivered'],
                ['value' => EmailSendLog::STATUS_BOUNCED, 'label' => 'Bounced'],
                ['value' => EmailSendLog::STATUS_COMPLAINED, 'label' => 'Complained'],
                ['value' => EmailSendLog::STATUS_FAILED, 'label' => 'Failed'],
            ],
            // Distinct template types actually present, for the filter dropdown.
            'templateOptions' => EmailSendLog::query()
                ->whereNotNull('template_type')
                ->distinct()
                ->orderBy('template_type')
                ->pluck('template_type'),
            'suppressions' => EmailSuppression::query()
                ->orderByDesc('suppressed_at')
                ->limit(200)
                ->get(['id', 'email', 'reason', 'source', 'suppressed_at', 'created_at']),
        ]);
    }

    /**
     * Detail for one log: safe fields + its tracking-event timeline. The event
     * `payload` column is deliberately never returned.
     */
    public function show(EmailSendLog $emailSendLog): JsonResponse
    {
        $events = EmailSendEvent::query()
            ->where('email_send_log_id', $emailSendLog->id)
            ->orderByRaw('COALESCE(occurred_at, created_at) ASC')
            ->get(['id', 'event_type', 'recipient', 'clicked_url', 'occurred_at', 'created_at'])
            ->map(fn (EmailSendEvent $event) => [
                'id' => $event->id,
                'event_type' => $event->event_type,
                'recipient' => $event->recipient,
                // Only surface a click target if it's a real http(s) URL.
                'clicked_url' => $this->safeUrl($event->clicked_url),
                'occurred_at' => optional($event->occurred_at)->toISOString(),
                'created_at' => optional($event->created_at)->toISOString(),
            ]);

        return response()->json([
            'log' => $emailSendLog->only(self::LOG_COLUMNS),
            'events' => $events,
        ]);
    }

    private function safeUrl(?string $url): ?string
    {
        if (! $url || ! filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        return preg_match('#^https?://#i', $url) === 1 ? $url : null;
    }
}
