<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\SiteVisitor;
use Illuminate\Http\Response;

/**
 * Public, token-based unsubscribe for property-alert emails. Linked from every
 * alert ({{ unsubscribe_url }}). Idempotent: a second click is a no-op.
 */
class PropertyAlertUnsubscribeController extends Controller
{
    public function __invoke(string $token): Response
    {
        $visitor = SiteVisitor::where('alerts_unsubscribe_token', $token)->first();

        if ($visitor && ! $visitor->alertsUnsubscribed()) {
            $visitor->update(['alerts_unsubscribed_at' => now()]);
        }

        $heading = $visitor ? 'You have been unsubscribed' : 'Link expired';
        $body = $visitor
            ? 'You will no longer receive property-alert emails. You can re-enable alerts anytime from your saved searches and favorites.'
            : 'This unsubscribe link is no longer valid.';

        return response()->view('emails.unsubscribed', [
            'heading' => $heading,
            'body' => $body,
        ]);
    }
}
