<?php

namespace Database\Seeders;

use App\Models\CallRecord;
use App\Models\Contact;
use App\Models\EmailAccount;
use App\Models\EmailMessage;
use App\Models\EmailThread;
use App\Models\PhoneNumber;
use App\Models\SmsMessage;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Seeds realistic SMS, email, and call data so the Inbox page has
 * something to render. Idempotent — re-running adds more messages
 * for the same contacts but doesn't duplicate the phone/email account.
 *
 * Run with: php artisan db:seed --class=ConversationSeeder
 */
class ConversationSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) {
            $this->command->warn('No user found. Run the main DatabaseSeeder first.');
            return;
        }

        // 1. Ensure the user has a phone number (needed for SMS + calls)
        $phone = PhoneNumber::firstOrCreate(
            ['user_id' => $user->id, 'phone_number' => '+13055550100'],
            [
                'team_id' => $user->team_id,
                'friendly_name' => 'Main Line',
                'capabilities' => ['sms', 'voice'],
                'status' => 'active',
                'number_type' => $user->team_id ? 'team' : 'personal',
                'is_default' => true,
                'provisioned_at' => now()->subMonths(2),
            ]
        );

        // 2. Ensure the user has an email account (needed for email threads)
        $emailAccount = EmailAccount::firstOrCreate(
            ['user_id' => $user->id, 'email_address' => $user->email],
            [
                'team_id' => $user->team_id,
                'provider' => 'google',
                'access_token' => 'seed-token',
                'sync_state' => 'active',
                'is_default' => true,
                'is_active' => true,
                'last_synced_at' => now(),
            ]
        );

        // 3. Pick contacts that have at least a phone or email
        $contacts = Contact::query()
            ->where('user_id', $user->id)
            ->where(function ($q) {
                $q->whereNotNull('phone')->orWhereNotNull('email');
            })
            ->take(8)
            ->get();

        if ($contacts->isEmpty()) {
            $this->command->warn('No contacts found for user. Seed contacts first.');
            return;
        }

        $smsCount = 0;
        $emailCount = 0;
        $callCount = 0;

        foreach ($contacts as $i => $contact) {
            // Vary which channels each contact has
            $hasSms = $contact->phone && $i % 2 === 0;
            $hasEmail = $contact->email && $i % 3 !== 2;
            $hasCalls = $contact->phone && $i % 2 === 1;

            if ($hasSms) {
                $smsCount += $this->seedSmsThread($user, $phone, $contact, $i);
            }
            if ($hasEmail) {
                $emailCount += $this->seedEmailThread($user, $emailAccount, $contact, $i);
            }
            if ($hasCalls) {
                $callCount += $this->seedCalls($user, $phone, $contact, $i);
            }
        }

        $this->command->info("Seeded {$smsCount} SMS, {$emailCount} emails, {$callCount} calls across {$contacts->count()} contacts.");
    }

    private function seedSmsThread(User $user, PhoneNumber $phone, Contact $contact, int $i): int
    {
        $messages = [
            ['out', "Hi {$contact->first_name}, this is {$user->name} following up on your inquiry. When works for a quick call?", 5],
            ['in', "Tomorrow afternoon works! Around 2pm?", 4],
            ['out', "Perfect — I'll call you at 2pm. Talk soon!", 4],
            ['in', "Sounds good 👍", 3],
            ['in', "Quick question — is the property on Brickell still available?", 1],
        ];

        // Make the most recent inbound message unread for some contacts (test unread badge)
        $leaveLastUnread = $i % 3 === 0;

        foreach ($messages as $idx => [$dir, $body, $daysAgo]) {
            $isInbound = $dir === 'in';
            $isLast = $idx === count($messages) - 1;
            $readAt = ($isInbound && $isLast && $leaveLastUnread) ? null : now()->subDays($daysAgo)->addHours(1);

            SmsMessage::create([
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'contact_id' => $contact->id,
                'phone_number_id' => $phone->id,
                'direction' => $isInbound ? 'inbound' : 'outbound',
                'from_number' => $isInbound ? $contact->phone : $phone->phone_number,
                'to_number' => $isInbound ? $phone->phone_number : $contact->phone,
                'body' => $body,
                'status' => $isInbound ? 'received' : 'delivered',
                'segment_count' => 1,
                'read_at' => $readAt,
                'created_at' => now()->subDays($daysAgo),
                'updated_at' => now()->subDays($daysAgo),
            ]);
        }

        return count($messages);
    }

    private function seedEmailThread(User $user, EmailAccount $account, Contact $contact, int $i): int
    {
        $subjects = [
            'Following up on your home search',
            'New listings matching your criteria',
            'Closing timeline + next steps',
            'Question about the property tour',
        ];
        $subject = $subjects[$i % count($subjects)];
        $threadId = 'seed-thread-' . $contact->id . '-' . time();

        $exchanges = [
            ['out', $user->name, $user->email, $contact->email,
             "Hi {$contact->first_name},\n\n{$subject}. Let me know what works for you.\n\nBest,\n{$user->name}",
             6],
            ['in', $contact->full_name, $contact->email, $user->email,
             "Thanks for reaching out — let me check my calendar and circle back this week.",
             4],
            ['out', $user->name, $user->email, $contact->email,
             "Sounds good! I'll have a few options ready when you're ready to chat.",
             3],
        ];

        $leaveUnread = $i % 4 === 1;

        $thread = EmailThread::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'email_account_id' => $account->id,
            'contact_id' => $contact->id,
            'gmail_thread_id' => $threadId,
            'subject' => $subject,
            'snippet' => mb_substr($exchanges[count($exchanges) - 1][4], 0, 100),
            'message_count' => count($exchanges),
            'is_read' => ! $leaveUnread,
            'is_archived' => false,
            'last_message_at' => now()->subDays($exchanges[count($exchanges) - 1][5]),
        ]);

        foreach ($exchanges as $idx => [$dir, $fromName, $fromAddr, $toAddr, $body, $daysAgo]) {
            EmailMessage::create([
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'email_account_id' => $account->id,
                'email_thread_id' => $thread->id,
                'contact_id' => $contact->id,
                'gmail_message_id' => $threadId . '-' . $idx,
                'direction' => $dir === 'in' ? 'inbound' : 'outbound',
                'from_address' => $fromAddr,
                'from_name' => $fromName,
                'to_addresses' => [$toAddr],
                'subject' => $idx === 0 ? $subject : 'Re: ' . $subject,
                'body_text' => $body,
                'body_html' => '<p>' . nl2br(e($body)) . '</p>',
                'snippet' => mb_substr($body, 0, 100),
                'is_read' => true,
                'sent_at' => now()->subDays($daysAgo),
                'created_at' => now()->subDays($daysAgo),
                'updated_at' => now()->subDays($daysAgo),
            ]);
        }

        return count($exchanges);
    }

    private function seedCalls(User $user, PhoneNumber $phone, Contact $contact, int $i): int
    {
        $calls = [
            // [direction, status, duration_seconds, notes, days_ago]
            ['outbound', 'completed', 245, 'Discussed budget and timeline. Pre-approved for $550K with Wells Fargo.', 7],
            ['inbound',  'completed', 162, "Called to ask about the Brickell listing. Wants a tour this weekend.", 4],
            ['outbound', 'missed',    null, null, 2],
            ['inbound',  'completed', 88,  'Confirmed showing for Saturday at 11am.', 1],
        ];

        foreach ($calls as [$dir, $status, $duration, $notes, $daysAgo]) {
            $startedAt = $status === 'completed' ? now()->subDays($daysAgo) : null;
            $endedAt = $startedAt && $duration ? Carbon::parse($startedAt)->copy()->addSeconds($duration) : null;

            CallRecord::create([
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'contact_id' => $contact->id,
                'phone_number_id' => $phone->id,
                'direction' => $dir,
                'from_number' => $dir === 'inbound' ? $contact->phone : $phone->phone_number,
                'to_number' => $dir === 'inbound' ? $phone->phone_number : $contact->phone,
                'status' => $status,
                'duration_seconds' => $duration,
                'notes' => $notes,
                'started_at' => $startedAt,
                'ended_at' => $endedAt,
                'created_at' => now()->subDays($daysAgo),
                'updated_at' => now()->subDays($daysAgo),
            ]);
        }

        return count($calls);
    }
}
