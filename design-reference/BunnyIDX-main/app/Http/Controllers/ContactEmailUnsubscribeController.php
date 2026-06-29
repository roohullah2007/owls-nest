<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\Response;

/**
 * Public, token-based unsubscribe for automated (Action Plan) emails. Linked
 * from every action-plan email via {{ unsubscribe_url }}. Idempotent: a second
 * click is a no-op. Only gates automated/marketing email — one-to-one inbox
 * email is never affected.
 */
class ContactEmailUnsubscribeController extends Controller
{
    public function __invoke(string $token): Response
    {
        $contact = Contact::where('email_unsubscribe_token', $token)->first();

        if ($contact && ! $contact->emailUnsubscribed()) {
            $contact->forceFill([
                'email_opted_out' => true,
                'email_opted_out_at' => now(),
            ])->save();
        }

        $heading = $contact ? 'You have been unsubscribed' : 'Link expired';
        $body = $contact
            ? 'You will no longer receive automated emails from us. You can contact your agent directly anytime.'
            : 'This unsubscribe link is no longer valid.';

        return response()->view('emails.unsubscribed', [
            'heading' => $heading,
            'body' => $body,
        ]);
    }
}
