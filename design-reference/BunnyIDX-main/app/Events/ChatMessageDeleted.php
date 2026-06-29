<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $messageId,
        public int $teamId,
    ) {}

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('team.' . $this->teamId)];
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['message_id' => $this->messageId];
    }
}
