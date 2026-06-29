<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\EmailSendLog;
use App\Models\User;
use App\Services\Email\BrandedEmailResolver;
use App\Services\Email\ResendClient;
use Illuminate\Console\Command;

/**
 * Verify Resend deliverability end-to-end: resolves the sender identity (default
 * platform alias, or a given user's branded key / alias), sends a real email,
 * and records it in email_send_logs. Gives a clear error when no key is set or
 * the platform domain isn't verified — never prints the API key.
 *
 *   php artisan resend:test --to=you@example.com
 *   php artisan resend:test --to=you@example.com --user=42
 */
class ResendTestEmail extends Command
{
    protected $signature = 'resend:test {--to= : Recipient email address} {--user= : Send using this user id\'s branded key / alias}';

    protected $description = 'Send a test email through Resend to verify the API key, sending domain, and sender identity.';

    public function handle(BrandedEmailResolver $resolver, ResendClient $client): int
    {
        $to = trim((string) $this->option('to'));

        if ($to === '' || ! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $this->error('Provide a valid recipient, e.g. php artisan resend:test --to=you@example.com');

            return self::INVALID;
        }

        $user = null;
        if ($this->option('user')) {
            $user = User::find((int) $this->option('user'));
            if (! $user) {
                $this->error('User '.$this->option('user').' not found.');

                return self::FAILURE;
            }
        }

        $resolved = $resolver->for($user);

        if (empty($resolved['key'])) {
            $this->error('No Resend API key available. Set RESEND_API_KEY in .env'
                .($user ? ' or add a branded key for this user.' : '.'));

            return self::FAILURE;
        }

        $appName = (string) config('app.name', 'BunnyIDX');
        $subject = "Test email from {$appName}";
        $html = '<p style="font-family:sans-serif">Test email from '.e($appName).' confirming Resend delivery. '
            .'Sender: <strong>'.e($resolved['from_email']).'</strong>.</p>';

        $this->line('Sending to '.$to.' from '.$resolved['from_email']
            .' ('.($resolved['branded'] ? 'branded key' : 'platform key').')…');

        try {
            $messageId = $client->send(
                $resolved['key'],
                $resolved['from_email'],
                $resolved['from_name'],
                $to,
                $subject,
                $html,
            );
        } catch (\Throwable $e) {
            $this->error('Send failed: '.$e->getMessage());

            return self::FAILURE;
        }

        EmailSendLog::create([
            'user_id' => $user?->id,
            'team_id' => $user?->team_id,
            'provider' => 'resend',
            'template_type' => 'test',
            'recipient' => $to,
            'sender' => $resolved['from_email'],
            'subject' => $subject,
            'status' => EmailSendLog::STATUS_SENT,
            'provider_message_id' => $messageId,
            'branded' => $resolved['branded'],
            'quota_category' => 'test',
            'counts_toward_quota' => false,
            'sent_at' => now(),
        ]);

        $this->info('Sent. Provider message id: '.$messageId);

        return self::SUCCESS;
    }
}
