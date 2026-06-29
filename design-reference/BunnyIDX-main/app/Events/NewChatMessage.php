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

class NewChatMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public TeamChatMessage $message,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('team.' . $this->message->team_id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message->load([
                'user:id,name',
                'contact:id,first_name,last_name,uuid',
                'attachments',
                'replyTo:id,user_id,body',
                'replyTo.user:id,name',
                'listing:id,title,address,city,state_province,price,bedrooms,bathrooms,photos,mls_number,status',
                'deal:id,title',
            ])->toArray(),
        ];
    }
}
