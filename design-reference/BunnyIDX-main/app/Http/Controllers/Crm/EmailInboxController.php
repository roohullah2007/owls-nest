<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\EmailAccount;
use App\Models\EmailMessage;
use App\Models\EmailThread;
use App\Services\Email\EmailBodyFormatter;
use App\Services\Gmail\GmailService;
use App\Services\Gmail\GmailSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailInboxController extends Controller
{
    public function inbox(Request $request): Response
    {
        $user = $request->user();
        $accounts = EmailAccount::where('user_id', $user->id)->active()->get();
        $activeAccountId = $request->get('account_id', $accounts->firstWhere('is_default', true)?->id ?? $accounts->first()?->id);

        $threads = [];
        if ($activeAccountId) {
            $threads = EmailThread::where('email_account_id', $activeAccountId)
                ->where('user_id', $user->id)
                ->inbox()
                ->with('contact:id,first_name,last_name,uuid,email')
                ->orderByDesc('last_message_at')
                ->paginate(50);
        }

        return Inertia::render('Crm/Email/Index', [
            'threads' => $threads,
            'accounts' => $accounts,
            'activeAccountId' => (int) $activeAccountId,
        ]);
    }

    public function thread(Request $request, EmailThread $emailThread, EmailBodyFormatter $formatter): JsonResponse
    {
        if ($emailThread->user_id !== $request->user()->id) {
            abort(403);
        }

        $messages = $emailThread->messages()
            ->with('contact:id,first_name,last_name,uuid')
            ->orderBy('sent_at')
            ->get();

        // Attach display-ready (latest reply vs. quoted) + sanitized bodies.
        // The raw body_html/body_text columns are left untouched for audit.
        $messages->each(function (EmailMessage $message) use ($formatter) {
            $formatted = $formatter->format($message->body_html, $message->body_text);
            $message->setAttribute('display_html', $formatted['html']);
            $message->setAttribute('display_quoted_html', $formatted['quoted_html']);
            $message->setAttribute('display_text', $formatted['text']);
            $message->setAttribute('display_quoted_text', $formatted['quoted_text']);
            $message->setAttribute('has_quoted', $formatted['has_quoted']);
        });

        // Mark thread as read locally
        $emailThread->update(['is_read' => true]);
        $emailThread->messages()->where('is_read', false)->update(['is_read' => true]);

        // Mark as read in Gmail (async, don't block the response)
        try {
            $account = $emailThread->emailAccount;
            $gmail = new GmailService($account);
            foreach ($messages as $message) {
                if (! $message->is_read) {
                    $gmail->markAsRead($message->gmail_message_id);
                }
            }
        } catch (\Exception) {
            // Non-critical, silently fail
        }

        return response()->json([
            'thread' => $emailThread->load('contact:id,first_name,last_name,uuid'),
            'messages' => $messages,
        ]);
    }

    public function send(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'email_account_id' => 'required|exists:email_accounts,id',
            'to' => 'required|email',
            'subject' => 'required|string|max:500',
            'body_html' => 'required|string',
            'cc' => 'nullable|string',
            'bcc' => 'nullable|string',
            'in_reply_to' => 'nullable|string',
            'thread_id' => 'nullable|string',
            'contact_id' => 'nullable|exists:contacts,id',
            'deal_id' => 'nullable|exists:deals,id',
        ]);

        $user = $request->user();
        $account = EmailAccount::where('id', $validated['email_account_id'])
            ->where('user_id', $user->id)
            ->active()
            ->firstOrFail();

        // Apply the user's saved sending preferences (settings.email).
        $emailPrefs = $user->settings['email'] ?? [];
        $fromName = $emailPrefs['default_from_name'] ?? null;

        $bcc = $validated['bcc'] ?? null;
        if (! empty($emailPrefs['bcc_self'])) {
            // BCC the connected mailbox so a copy lands back in the user's Gmail.
            $bcc = $bcc ? $bcc.', '.$account->email_address : $account->email_address;
        }

        try {
            $gmail = new GmailService($account);
            $sentMessage = $gmail->sendEmail(
                to: $validated['to'],
                subject: $validated['subject'],
                bodyHtml: $validated['body_html'],
                cc: $validated['cc'] ?? null,
                bcc: $bcc,
                inReplyTo: $validated['in_reply_to'] ?? null,
                threadId: $validated['thread_id'] ?? null,
                fromName: $fromName,
            );

            // Fetch the full sent message and process it
            $fullMessage = $gmail->getMessage($sentMessage->getId());
            $syncService = new GmailSyncService;
            $emailMessage = $syncService->processMessage($account, $fullMessage);

            // Link to contact/deal if provided.
            if ($emailMessage && ($validated['contact_id'] ?? null)) {
                // GmailSyncService::processMessage() already logs an `email_sent`
                // timeline Activity whenever it matches the recipient address to a CRM
                // contact (the normal case for a contact-page send — it sets contact_id
                // on the message). Only log one here as a fallback when it didn't match,
                // otherwise the same email shows up twice in the contact's History.
                $alreadyLogged = $emailMessage->contact_id !== null;

                $emailMessage->update(['contact_id' => $validated['contact_id']]);
                $emailMessage->thread->update([
                    'contact_id' => $validated['contact_id'],
                    'deal_id' => $validated['deal_id'] ?? null,
                ]);

                if (! $alreadyLogged) {
                    Activity::create([
                        'user_id' => $user->id,
                        'team_id' => $user->team_id,
                        'contact_id' => $validated['contact_id'],
                        'deal_id' => $validated['deal_id'] ?? null,
                        'event_type' => 'email_sent',
                        'subject' => 'Email sent: '.$validated['subject'],
                        'description' => substr(strip_tags($validated['body_html']), 0, 200),
                        'metadata' => [
                            'email_message_id' => $emailMessage->id,
                            'email_thread_id' => $emailMessage->email_thread_id,
                        ],
                    ]);
                }
            }

            return response()->json([
                'message' => 'Email sent successfully.',
                'email_message' => $emailMessage,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send email: '.$e->getMessage(),
            ], 500);
        }
    }

    public function linkToContact(Request $request, EmailThread $emailThread): RedirectResponse
    {
        if ($emailThread->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'contact_id' => 'nullable|exists:contacts,id',
            'deal_id' => 'nullable|exists:deals,id',
        ]);

        $emailThread->update([
            'contact_id' => $validated['contact_id'],
            'deal_id' => $validated['deal_id'] ?? null,
        ]);

        $emailThread->messages()->update([
            'contact_id' => $validated['contact_id'],
            'deal_id' => $validated['deal_id'] ?? null,
        ]);

        return back()->with('success', 'Thread linked to contact.');
    }

    public function archive(Request $request, EmailThread $emailThread): RedirectResponse
    {
        if ($emailThread->user_id !== $request->user()->id) {
            abort(403);
        }

        $emailThread->update(['is_archived' => ! $emailThread->is_archived]);

        return back()->with('success', $emailThread->is_archived ? 'Thread archived.' : 'Thread unarchived.');
    }
}
