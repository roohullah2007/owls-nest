<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\MlsConnectionRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MlsRequestStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public MlsConnectionRequest $request,
        public string $previousStatus,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('user.' . $this->request->user_id),
        ];

        if ($this->request->team_id) {
            $channels[] = new PrivateChannel('team.' . $this->request->team_id);
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'request_id' => $this->request->id,
            'mls_provider_id' => $this->request->mls_provider_id,
            'previous_status' => $this->previousStatus,
            'new_status' => $this->request->status,
            'integrated_at' => $this->request->integrated_at?->toISOString(),
        ];
    }
}
