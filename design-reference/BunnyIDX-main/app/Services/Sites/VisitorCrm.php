<?php

declare(strict_types=1);

namespace App\Services\Sites;

use App\Models\Activity;
use App\Models\AgentWebsite;
use App\Models\Contact;
use App\Models\SiteVisitor;
use Illuminate\Support\Facades\Log;

/**
 * Syncs agent-website visitor accounts into the CRM: signup creates (or links)
 * a Contact lead owned by the site owner, and visitor behaviour — listing
 * views, favorites, saved searches, logins — lands on that contact's timeline
 * as Activity rows, so the agent sees live buyer engagement.
 */
class VisitorCrm
{
    /**
     * Create (or reuse) the CRM lead for a visitor and link it. `$consented`
     * records the signup form's marketing-consent checkbox on the contact.
     */
    public function syncLead(AgentWebsite $site, SiteVisitor $visitor, bool $consented = false): ?Contact
    {
        try {
            $parts = explode(' ', trim($visitor->name), 2);

            // Reuse an existing contact with this email under the same owner so
            // a returning lead doesn't duplicate.
            $contact = Contact::query()
                ->where('email', $visitor->email)
                ->when($site->team_id, fn ($q) => $q->where('team_id', $site->team_id))
                ->when(! $site->team_id, fn ($q) => $q->where('user_id', $site->user_id))
                ->first();

            if ($contact) {
                if ($consented && ! $contact->sms_consent) {
                    $contact->update(['sms_consent' => true, 'sms_consent_at' => now()]);
                }
            } else {
                $contact = Contact::create([
                    'user_id' => $site->user_id,
                    'team_id' => $site->team_id,
                    'first_name' => $parts[0] ?: 'Unknown',
                    'last_name' => $parts[1] ?? '',
                    'email' => $visitor->email,
                    'phone' => $visitor->phone,
                    'type' => 'buyer',
                    'source' => 'Website Signup',
                    'description' => "Registered on the website ({$site->slug}).",
                    'sms_consent' => $consented,
                    'sms_consent_at' => $consented ? now() : null,
                ]);
            }

            $visitor->update(['contact_id' => $contact->id]);

            return $contact;
        } catch (\Throwable $e) {
            Log::warning('Visitor CRM lead sync failed: '.$e->getMessage(), ['site' => $site->id, 'visitor' => $visitor->id]);

            return null;
        }
    }

    /**
     * Timeline entry on the visitor's linked contact. `$dedupeMinutes` skips
     * the write when the same event+subject was logged recently (page refreshes
     * shouldn't spam the timeline).
     */
    public function logActivity(AgentWebsite $site, SiteVisitor $visitor, string $eventType, string $subject, array $metadata = [], int $dedupeMinutes = 0): void
    {
        if (! $visitor->contact_id) {
            return;
        }

        try {
            if ($dedupeMinutes > 0) {
                $recent = Activity::where('contact_id', $visitor->contact_id)
                    ->where('event_type', $eventType)
                    ->where('subject', $subject)
                    ->where('created_at', '>=', now()->subMinutes($dedupeMinutes))
                    ->exists();
                if ($recent) {
                    return;
                }
            }

            Activity::create([
                'user_id' => $site->user_id,
                'team_id' => $site->team_id,
                'contact_id' => $visitor->contact_id,
                'event_type' => $eventType,
                'subject' => $subject,
                'metadata' => $metadata + ['site_slug' => $site->slug, 'visitor_id' => $visitor->id],
            ]);
        } catch (\Throwable $e) {
            Log::warning('Visitor activity log failed: '.$e->getMessage(), ['site' => $site->id, 'visitor' => $visitor->id]);
        }
    }
}
