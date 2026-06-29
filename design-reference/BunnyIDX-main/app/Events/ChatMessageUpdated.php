<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\TeamChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public TeamChatMessage $message,
    ) {}

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('team.' . $this->message->team_id)];
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'body' => $this->message->body,
                'edited_at' => $this->message->edited_at?->toISOString(),
                'reactions' => $this->message->reactions,
            ],
        ];
    }
}
