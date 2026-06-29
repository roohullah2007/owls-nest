<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\MlsConnectionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the requesting user as soon as they submit an MLS connection request.
 * Confirms receipt and lays out next steps — our team follows up with setup
 * instructions and an option to schedule a meeting. Users never enter MLS API
 * keys themselves; an admin provisions the connection on their behalf.
 */
class MlsConnectionRequestReceived extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private MlsConnectionRequest $mlsRequest,
    ) {}

    public function via(object $notifiable): array
    {
        // Transactional confirmation — always email, plus the in-app bell.
        return ['mail', 'database', 'broadcast'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'BunnyIDX');
        $provider = $this->mlsRequest->mlsProvider;
        $mlsName = $provider?->display_name ?? 'your MLS';

        $mail = (new MailMessage)
            ->subject("We received your {$mlsName} connection request — {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("Thanks for requesting an IDX connection for **{$mlsName}**. Our team has received your request and will start the setup on your behalf.")
            ->line('**What happens next**')
            ->line('1. We review your request and your brokerage details.')
            ->line('2. We email you the specific instructions and paperwork your MLS requires (this varies by MLS).')
            ->line('3. You can schedule a meeting with our team to walk through the setup — we will include details on how to book that time in our follow-up.')
            ->line('4. Once everything is approved, our team activates the connection for you — you never need to enter any API keys yourself.');

        // Provider-specific setup notes, if the admin configured them.
        if (! empty($provider?->setup_notes_user)) {
            $mail->line('**Notes for ' . $mlsName . '**')
                ->line($provider->setup_notes_user);
        }

        return $mail
            ->action('View request status', url('/crm/idx'))
            ->line('We will keep you posted at each step. Reply to this email if you have any questions.')
            ->salutation("— The {$appName} Team");
    }

    public function toArray(object $notifiable): array
    {
        $mlsName = $this->mlsRequest->mlsProvider?->display_name ?? 'your MLS';

        return [
            'type' => 'mls_request_received',
            'mls_request_id' => $this->mlsRequest->id,
            'mls_provider_id' => $this->mlsRequest->mls_provider_id,
            'mls_name' => $mlsName,
            'message' => "We received your {$mlsName} connection request.",
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
