<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\SyncGmailMessages;
use App\Models\EmailAccount;
use App\Services\Gmail\GmailSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncAllGmailAccounts extends Command
{
    protected $signature = 'gmail:sync-all {--user=} {--sync : Run the sync inline instead of dispatching queue jobs}';

    protected $description = 'Sync every active Gmail account so inbound replies land in the Inbox. Dispatches queued jobs by default; use --sync to run inline.';

    public function handle(GmailSyncService $syncService): int
    {
        $query = EmailAccount::active()->where('provider', 'google');
        if ($userId = $this->option('user')) {
            $query->where('user_id', $userId);
        }

        $accounts = $query->get();
        $inline = (bool) $this->option('sync');

        Log::info('gmail:sync-all started', [
            'accounts_found' => $accounts->count(),
            'mode' => $inline ? 'inline' : 'queued',
        ]);
        $this->info("Found {$accounts->count()} active Gmail account(s) [".($inline ? 'inline' : 'queued').'].');

        // Don't silently "succeed" when there was nothing to check.
        if ($accounts->isEmpty()) {
            Log::warning('gmail:sync-all: no active Gmail accounts to sync.');
            $this->warn('No active Gmail accounts found — nothing was synced.');

            return self::SUCCESS;
        }

        $totalSaved = 0;

        foreach ($accounts as $account) {
            if (! $inline) {
                SyncGmailMessages::dispatch($account->user_id, $account->email_address)
                    ->onQueue('gmail-sync');
                $this->line("  • Queued sync for {$account->email_address}");

                continue;
            }

            // Inline: perform the sync now so it doesn't depend on a separately
            // configured queue worker consuming the "gmail-sync" queue.
            try {
                $saved = $account->last_full_sync_at
                    ? $syncService->performIncrementalSync($account)
                    : $syncService->performInitialSync($account);
                $totalSaved += $saved;
                $this->line("  • Synced {$account->email_address}: {$saved} new message(s)");
            } catch (\Throwable $e) {
                Log::error('gmail:sync-all: account sync failed', [
                    'account_id' => $account->id,
                    'email' => $account->email_address,
                    'error' => $e->getMessage(),
                ]);
                $this->error("  • Failed {$account->email_address}: {$e->getMessage()}");
            }
        }

        if ($inline) {
            Log::info('gmail:sync-all finished', [
                'accounts' => $accounts->count(),
                'new_messages' => $totalSaved,
            ]);
            $this->info("Done. {$totalSaved} new message(s) across {$accounts->count()} account(s).");
        } else {
            $this->info("Dispatched {$accounts->count()} Gmail sync job(s) to the 'gmail-sync' queue.");
        }

        return self::SUCCESS;
    }
}
