<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Jobs\SendBulkEmailJob;
use App\Models\Contact;
use App\Models\EmailAccount;
use App\Models\EmailCampaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class BulkEmailController extends Controller implements HasMiddleware
{
    /** Bulk email is part of the paid Email feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:email')];
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_account_id' => 'required|exists:email_accounts,id',
            'contact_ids' => 'required|array|min:1',
            'contact_ids.*' => 'integer|exists:contacts,id',
            'subject' => 'required|string|max:500',
            'body_html' => 'required|string',
        ]);

        $user = $request->user();

        // Verify the email account belongs to the user
        $account = EmailAccount::where('id', $validated['email_account_id'])
            ->where('user_id', $user->id)
            ->active()
            ->firstOrFail();

        // Filter contacts to those with email addresses
        $contactIds = Contact::whereIn('id', $validated['contact_ids'])
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->forUser($user)
            ->pluck('id')
            ->toArray();

        if (empty($contactIds)) {
            return response()->json(['message' => 'None of the selected contacts have email addresses.'], 422);
        }

        // Check daily send limit (100 personal, 500 workspace)
        $dailyLimit = $user->isInTeamContext() ? 500 : 100;
        $sentToday = EmailCampaign::where('user_id', $user->id)
            ->whereDate('created_at', today())
            ->sum('sent_count');

        if ($sentToday + count($contactIds) > $dailyLimit) {
            $remaining = max(0, $dailyLimit - $sentToday);

            return response()->json([
                'message' => "Daily email limit reached. You can send {$remaining} more emails today (limit: {$dailyLimit}/day).",
            ], 422);
        }

        $campaign = EmailCampaign::create([
            'user_id' => $user->id,
            'team_id' => $user->team_id,
            'email_account_id' => $account->id,
            'subject' => $validated['subject'],
            'body_html' => $validated['body_html'],
            'status' => 'pending',
            'total_recipients' => count($contactIds),
            'contact_ids' => $contactIds,
            'sent_contact_ids' => [],
            'failed_contact_ids' => [],
            'errors' => [],
        ]);

        SendBulkEmailJob::dispatch($campaign->id);

        return response()->json([
            'message' => 'Bulk email campaign started.',
            'campaign' => $campaign,
        ]);
    }

    public function status(EmailCampaign $campaign): JsonResponse
    {
        return response()->json([
            'campaign' => [
                'id' => $campaign->id,
                'status' => $campaign->status,
                'total_recipients' => $campaign->total_recipients,
                'sent_count' => $campaign->sent_count,
                'failed_count' => $campaign->failed_count,
                'skipped_count' => $campaign->skipped_count,
                'started_at' => $campaign->started_at,
                'completed_at' => $campaign->completed_at,
            ],
        ]);
    }

    public function pause(EmailCampaign $campaign): JsonResponse
    {
        if (! $campaign->isSending()) {
            return response()->json(['message' => 'Campaign is not currently sending.'], 422);
        }

        $campaign->update(['status' => 'paused']);

        return response()->json(['message' => 'Campaign paused.']);
    }

    public function resume(Request $request, EmailCampaign $campaign): JsonResponse
    {
        if (! $campaign->isPaused()) {
            return response()->json(['message' => 'Campaign is not paused.'], 422);
        }

        $campaign->update(['status' => 'pending']);
        SendBulkEmailJob::dispatch($campaign->id);

        return response()->json(['message' => 'Campaign resumed.']);
    }

    public function cancel(EmailCampaign $campaign): JsonResponse
    {
        if ($campaign->isCompleted() || $campaign->isCancelled()) {
            return response()->json(['message' => 'Campaign is already finished.'], 422);
        }

        $campaign->update([
            'status' => 'cancelled',
            'completed_at' => now(),
        ]);

        return response()->json(['message' => 'Campaign cancelled.']);
    }
}
