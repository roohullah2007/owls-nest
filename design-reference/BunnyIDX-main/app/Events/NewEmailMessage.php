<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\EmailMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewEmailMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public EmailMessage $emailMessage,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('user.'.$this->emailMessage->user_id),
        ];

        if ($this->emailMessage->team_id) {
            $channels[] = new PrivateChannel('team.'.$this->emailMessage->team_id);
        }

        return $channels;
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'email_message' => $this->emailMessage->toArray(),
        ];
    }
}
