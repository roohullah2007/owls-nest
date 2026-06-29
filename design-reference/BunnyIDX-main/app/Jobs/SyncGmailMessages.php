<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\EmailAccount;
use App\Services\Gmail\GmailSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SyncGmailMessages implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public int $userId,
        public string $emailAddress,
    ) {}

    public function handle(GmailSyncService $syncService): void
    {
        $account = EmailAccount::where('user_id', $this->userId)
            ->where('email_address', $this->emailAddress)
            ->active()
            ->first();

        if (!$account) {
            Log::info('SyncGmailMessages: account not found or inactive', [
                'user_id' => $this->userId,
                'email' => $this->emailAddress,
            ]);

            return;
        }

        if ($account->last_full_sync_at) {
            $syncService->performIncrementalSync($account);
        } else {
            $syncService->performInitialSync($account);
        }
    }
}
