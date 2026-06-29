<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\SmsMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewSmsMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public SmsMessage $smsMessage,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('user.' . $this->smsMessage->user_id),
        ];

        if ($this->smsMessage->team_id) {
            $channels[] = new PrivateChannel('team.' . $this->smsMessage->team_id);
        }

        return $channels;
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'sms_message' => $this->smsMessage->toArray(),
        ];
    }
}
