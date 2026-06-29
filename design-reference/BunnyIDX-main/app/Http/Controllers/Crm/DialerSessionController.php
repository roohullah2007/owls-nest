<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\CallingScript;
use App\Models\CallRecord;
use App\Models\Contact;
use App\Models\DialerSession;
use App\Models\DialerSessionCall;
use App\Models\Task;
use App\Services\TimelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Power Dialer session orchestration.
 *
 * A session is created from a list of contact IDs (or task IDs). The controller maintains
 * the queue's cursor (current_position), records outcomes (dispositions), and updates
 * denormalized stat counters in the same transaction so the page can render real-time
 * progress without aggregate queries.
 *
 * Auth model: a session is owned by the creating user. Same-team users (when team_id is
 * set on both sides) may view/control — useful for supervisor barge in the future.
 */
class DialerSessionController extends Controller implements HasMiddleware
{
    /** The Power Dialer is part of the paid Phone feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:phone')];
    }

    /**
     * Delete a session and its queue rows. DialerSessionCall has a cascade
     * onDelete in the migration so the children get cleaned up automatically.
     */
    public function destroy(Request $request, DialerSession $dialerSession): JsonResponse
    {
        $this->authorize($request, $dialerSession);
        $dialerSession->delete();
        return response()->json(['ok' => true]);
    }

    /**
     * Index page — list past + active sessions for the current user.
     * Used by /crm/dialer/sessions to resume / review history.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $sessions = DialerSession::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'name', 'status', 'total_contacts', 'calls_attempted', 'calls_connected', 'calls_voicemail', 'calls_no_answer', 'calls_dnc', 'callbacks_scheduled', 'calls_skipped', 'started_at', 'ended_at', 'created_at']);

        return Inertia::render('Crm/Dialer/Index', [
            'sessions' => $sessions->map(fn (DialerSession $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'status' => $s->status,
                'total_contacts' => $s->total_contacts,
                'stats' => [
                    'attempted' => $s->calls_attempted,
                    'connected' => $s->calls_connected,
                    'voicemail' => $s->calls_voicemail,
                    'no_answer' => $s->calls_no_answer,
                    'dnc' => $s->calls_dnc,
                    'callbacks' => $s->callbacks_scheduled,
                    'skipped' => $s->calls_skipped,
                ],
                'started_at' => $s->started_at,
                'ended_at' => $s->ended_at,
                'created_at' => $s->created_at,
            ])->values(),
        ]);
    }

    /**
     * Start a new session. Accepts an ordered list of contact_ids (the queue), an optional
     * name, and source metadata for analytics.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact_ids' => 'required|array|min:1|max:500',
            'contact_ids.*' => 'integer',
            'task_ids' => 'nullable|array',
            'task_ids.*' => 'integer',
            'name' => 'nullable|string|max:120',
            'source_type' => ['nullable', 'in:' . implode(',', [
                DialerSession::SOURCE_CONTACTS,
                DialerSession::SOURCE_SMART_LIST,
                DialerSession::SOURCE_TASKS,
                DialerSession::SOURCE_MANUAL,
            ])],
            'source_id' => 'nullable|integer',
            'calling_script_id' => 'nullable|integer|exists:calling_scripts,id',
        ]);

        $user = $request->user();

        // Filter to contacts the user is actually allowed to see. Anything they sneak in
        // gets dropped silently — we don't 403 the whole request over a stray ID.
        $contacts = Contact::withPermissions($user, 'contacts')
            ->whereIn('id', $validated['contact_ids'])
            ->where(function ($q) {
                // Skip contacts with no callable number — calling them would just create an
                // immediate "no phone" error per row.
                $q->whereNotNull('phone')->orWhereNotNull('mobile');
            })
            ->where(function ($q) {
                // Also skip contacts who've explicitly opted out of all communication.
                $q->whereNull('dnd_mode')
                    ->orWhereNotIn('dnd_mode', ['all', 'calls']);
            })
            ->get(['id', 'phone', 'mobile']);

        if ($contacts->isEmpty()) {
            return response()->json([
                'error' => 'None of the selected contacts can be dialed (no phone number, or do-not-disturb is on).',
            ], 422);
        }

        // Preserve the caller's intended order. Eloquent->whereIn doesn't respect input order.
        $orderById = array_flip($validated['contact_ids']);
        $ordered = $contacts->sortBy(fn ($c) => $orderById[$c->id] ?? PHP_INT_MAX)->values();

        $taskMap = [];
        if (!empty($validated['task_ids'])) {
            $taskMap = Task::query()
                ->whereIn('id', $validated['task_ids'])
                ->where('user_id', $user->id)
                ->pluck('id', 'taskable_id')
                ->all();
        }

        // Verify the script is one the user can actually see before we attach it.
        $scriptId = null;
        if (!empty($validated['calling_script_id'])) {
            $script = CallingScript::visibleTo($user)->find($validated['calling_script_id']);
            $scriptId = $script?->id;
        }

        $session = DB::transaction(function () use ($user, $validated, $ordered, $taskMap, $scriptId) {
            $session = DialerSession::create([
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'name' => $validated['name'] ?? null,
                'status' => DialerSession::STATUS_ACTIVE,
                'source_type' => $validated['source_type'] ?? DialerSession::SOURCE_MANUAL,
                'source_id' => $validated['source_id'] ?? null,
                'calling_script_id' => $scriptId,
                'total_contacts' => $ordered->count(),
                'current_position' => 0,
                'started_at' => now(),
            ]);

            if ($scriptId) {
                CallingScript::whereKey($scriptId)->update([
                    'usage_count' => DB::raw('usage_count + 1'),
                    'last_used_at' => now(),
                ]);
            }

            $rows = [];
            foreach ($ordered as $position => $contact) {
                $rows[] = [
                    'dialer_session_id' => $session->id,
                    'contact_id' => $contact->id,
                    'task_id' => $taskMap[$contact->id] ?? null,
                    'position' => $position,
                    'status' => DialerSessionCall::STATUS_PENDING,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            DialerSessionCall::insert($rows);

            // Mark the first row as in_progress so the dialer page renders the right contact.
            DialerSessionCall::where('dialer_session_id', $session->id)
                ->where('position', 0)
                ->update(['status' => DialerSessionCall::STATUS_IN_PROGRESS, 'updated_at' => now()]);

            return $session;
        });

        return response()->json($this->sessionPayload($session->fresh()), 201);
    }

    /**
     * Convenience: launch a 1-contact session straight from a contact's show page.
     * Returns the session id so the caller can redirect to the campaign page.
     */
    public function dialContact(Request $request, Contact $contact): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $contact->user_id === $user->id || ($contact->team_id && $contact->team_id === $user->team_id),
            403,
            'Unauthorized contact.'
        );

        // Reuse the regular store flow with a single contact id.
        $request->merge([
            'contact_ids' => [$contact->id],
            'source_type' => DialerSession::SOURCE_MANUAL,
            'name' => "Call: {$contact->first_name} {$contact->last_name}",
        ]);

        return $this->store($request);
    }

    /**
     * Return the user's currently-active (or paused) session, if any. Used for "resume" UX
     * — the dialer page checks this on mount and redirects to the active session.
     */
    public function active(Request $request): JsonResponse
    {
        $user = $request->user();
        $session = DialerSession::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [DialerSession::STATUS_ACTIVE, DialerSession::STATUS_PAUSED])
            ->latest()
            ->first();

        return response()->json([
            'session' => $session ? $this->sessionPayload($session) : null,
        ]);
    }

    /**
     * Full session state for the dialer page. Renders the Inertia page on HTML requests,
     * returns JSON on AJAX/JSON requests (useful for client-side refresh).
     */
    public function show(Request $request, DialerSession $dialerSession): JsonResponse|Response
    {
        $this->authorize($request, $dialerSession);
        $payload = $this->sessionPayload($dialerSession);

        if ($request->wantsJson()) {
            return response()->json($payload);
        }

        return Inertia::render('Crm/Dialer/Session', $payload);
    }

    /**
     * Record the outcome of the current call and advance to the next contact.
     *
     * Body:
     *   disposition: one of DialerSessionCall::ALL_DISPOSITIONS
     *   notes: optional free text
     *   call_record_id: optional — the CallRecord the dialer just placed
     *   callback_at: required when disposition=callback_scheduled (ISO datetime)
     *   answers: optional questionnaire answers { questionId: value }
     */
    public function disposition(Request $request, DialerSession $dialerSession): JsonResponse
    {
        $this->authorize($request, $dialerSession);

        if ($dialerSession->isFinished()) {
            return response()->json(['error' => 'Session is already ' . $dialerSession->status . '.'], 422);
        }

        $validated = $request->validate([
            'disposition' => 'required|in:' . implode(',', DialerSessionCall::ALL_DISPOSITIONS),
            'notes' => 'nullable|string|max:2000',
            'call_record_id' => 'nullable|integer|exists:call_records,id',
            'callback_at' => 'required_if:disposition,callback_scheduled|nullable|date|after:now',
            'answers' => 'nullable|array',
        ]);

        $user = $request->user();
        $finished = DB::transaction(function () use ($dialerSession, $validated, $user) {
            $current = $dialerSession->calls()
                ->where('status', DialerSessionCall::STATUS_IN_PROGRESS)
                ->orderBy('position')
                ->lockForUpdate()
                ->first();

            // No current row (e.g. user dispositioned twice in race) — try to grab the cursor pos.
            if (!$current) {
                $current = $dialerSession->calls()
                    ->where('position', $dialerSession->current_position)
                    ->lockForUpdate()
                    ->first();
            }

            if (!$current) {
                return true; // nothing to disposition, treat as finished
            }

            // Pull duration from the linked CallRecord so the row stays self-contained for reporting.
            $duration = null;
            if (!empty($validated['call_record_id'])) {
                $duration = CallRecord::whereKey($validated['call_record_id'])->value('duration_seconds');
            }

            $current->update([
                'status' => DialerSessionCall::STATUS_COMPLETED,
                'disposition' => $validated['disposition'],
                'disposition_notes' => $validated['notes'] ?? null,
                'answers' => $validated['answers'] ?? $current->answers,
                'call_record_id' => $validated['call_record_id'] ?? null,
                'duration_seconds' => $duration,
                'callback_at' => $validated['disposition'] === DialerSessionCall::DISPOSITION_CALLBACK
                    ? $validated['callback_at']
                    : null,
                'attempted_at' => now(),
            ]);

            // ── Outcome side-effects ───────────────────────────────────────────────
            // Anything that has to happen as a consequence of the disposition runs here:
            //   - timeline entry on the contact
            //   - mark the linked task complete (if session was sourced from tasks)
            //   - apply DNC on "Do Not Call" disposition
            //   - create a callback Task on "Schedule Callback" disposition
            $this->applyDispositionSideEffects($user, $current, $validated);

            // Bump the matching counter (e.g. calls_voicemail += 1) plus calls_attempted.
            $counterField = DialerSession::DISPOSITION_TO_COUNTER[$validated['disposition']] ?? null;
            $updates = ['calls_attempted' => $dialerSession->calls_attempted + 1];
            if ($counterField) {
                $updates[$counterField] = ($dialerSession->{$counterField} ?? 0) + 1;
            }

            // Advance the cursor and mark the next row as in_progress.
            $next = $dialerSession->calls()
                ->where('status', DialerSessionCall::STATUS_PENDING)
                ->orderBy('position')
                ->first();

            if ($next) {
                $next->update(['status' => DialerSessionCall::STATUS_IN_PROGRESS]);
                $updates['current_position'] = $next->position;
            } else {
                // Queue exhausted — auto-finish the session.
                $updates['status'] = DialerSession::STATUS_COMPLETED;
                $updates['ended_at'] = now();
            }

            $dialerSession->update($updates);
            return !$next;
        });

        return response()->json([
            ...$this->sessionPayload($dialerSession->fresh()),
            'finished' => $finished,
        ]);
    }

    /**
     * Swap (or clear) the calling script on an in-progress session.
     */
    public function updateScript(Request $request, DialerSession $dialerSession): JsonResponse
    {
        $this->authorize($request, $dialerSession);
        $validated = $request->validate([
            'calling_script_id' => 'nullable|integer|exists:calling_scripts,id',
        ]);

        $scriptId = null;
        if (!empty($validated['calling_script_id'])) {
            $script = CallingScript::visibleTo($request->user())->find($validated['calling_script_id']);
            $scriptId = $script?->id;
        }
        $dialerSession->update(['calling_script_id' => $scriptId]);

        if ($scriptId) {
            CallingScript::whereKey($scriptId)->update([
                'usage_count' => DB::raw('usage_count + 1'),
                'last_used_at' => now(),
            ]);
        }

        return response()->json($this->sessionPayload($dialerSession->fresh()));
    }

    /**
     * Checkpoint questionnaire answers mid-call so they survive a refresh.
     * Body: { call_id, answers }
     */
    public function saveAnswers(Request $request, DialerSession $dialerSession): JsonResponse
    {
        $this->authorize($request, $dialerSession);

        $validated = $request->validate([
            'call_id' => 'required|integer|exists:dialer_session_calls,id',
            'answers' => 'required|array',
        ]);

        $call = DialerSessionCall::where('dialer_session_id', $dialerSession->id)
            ->whereKey($validated['call_id'])
            ->firstOrFail();
        $call->update(['answers' => $validated['answers']]);

        return response()->json(['ok' => true]);
    }

    /**
     * Skip the current contact without recording a disposition. Used by Phase 4
     * keyboard shortcut (Space) or the "Skip" button.
     */
    public function skip(Request $request, DialerSession $dialerSession): JsonResponse
    {
        $this->authorize($request, $dialerSession);

        if ($dialerSession->isFinished()) {
            return response()->json(['error' => 'Session is already finished.'], 422);
        }

        DB::transaction(function () use ($dialerSession) {
            $current = $dialerSession->calls()
                ->where('status', DialerSessionCall::STATUS_IN_PROGRESS)
                ->lockForUpdate()
                ->first();

            if ($current) {
                $current->update(['status' => DialerSessionCall::STATUS_SKIPPED]);
            }

            $next = $dialerSession->calls()
                ->where('status', DialerSessionCall::STATUS_PENDING)
                ->orderBy('position')
                ->first();

            $updates = ['calls_skipped' => $dialerSession->calls_skipped + 1];
            if ($next) {
                $next->update(['status' => DialerSessionCall::STATUS_IN_PROGRESS]);
                $updates['current_position'] = $next->position;
            } else {
                $updates['status'] = DialerSession::STATUS_COMPLETED;
                $updates['ended_at'] = now();
            }
            $dialerSession->update($updates);
        });

        return response()->json($this->sessionPayload($dialerSession->fresh()));
    }

    public function pause(Request $request, DialerSession $dialerSession): JsonResponse
    {
        $this->authorize($request, $dialerSession);
        if (!$dialerSession->isActive()) {
            return response()->json(['error' => 'Session is not active.'], 422);
        }
        $dialerSession->update([
            'status' => DialerSession::STATUS_PAUSED,
            'paused_at' => now(),
        ]);
        return response()->json($this->sessionPayload($dialerSession->fresh()));
    }

    public function resume(Request $request, DialerSession $dialerSession): JsonResponse
    {
        $this->authorize($request, $dialerSession);
        if (!$dialerSession->isPaused()) {
            return response()->json(['error' => 'Session is not paused.'], 422);
        }
        $dialerSession->update([
            'status' => DialerSession::STATUS_ACTIVE,
            'last_resumed_at' => now(),
            'paused_at' => null,
        ]);
        return response()->json($this->sessionPayload($dialerSession->fresh()));
    }

    /**
     * End the session early. All remaining pending rows get marked as skipped
     * so the queue is in a terminal state.
     */
    public function end(Request $request, DialerSession $dialerSession): JsonResponse
    {
        $this->authorize($request, $dialerSession);
        if ($dialerSession->isFinished()) {
            return response()->json($this->sessionPayload($dialerSession));
        }

        DB::transaction(function () use ($dialerSession) {
            $remaining = $dialerSession->calls()
                ->whereIn('status', [DialerSessionCall::STATUS_PENDING, DialerSessionCall::STATUS_IN_PROGRESS])
                ->count();

            $dialerSession->calls()
                ->whereIn('status', [DialerSessionCall::STATUS_PENDING, DialerSessionCall::STATUS_IN_PROGRESS])
                ->update(['status' => DialerSessionCall::STATUS_SKIPPED]);

            $dialerSession->update([
                'status' => DialerSession::STATUS_COMPLETED,
                'ended_at' => now(),
                'calls_skipped' => $dialerSession->calls_skipped + $remaining,
            ]);
        });

        return response()->json($this->sessionPayload($dialerSession->fresh()));
    }

    /**
     * Wire up the secondary effects of a disposition. Runs inside the disposition transaction
     * so the audit trail is consistent with the queue advance.
     *
     *   connected           → timeline + last_contacted_at
     *   voicemail           → timeline
     *   no_answer           → timeline
     *   wrong_number        → timeline (no auto-clear of the phone field — agent does that manually)
     *   do_not_call         → timeline + sms_opted_out + dnd_mode='all'
     *   callback_scheduled  → timeline + new Task at the chosen time
     *
     * If the session was sourced from Tasks, the originating Task is marked complete
     * regardless of disposition (the call happened, the to-do is done).
     */
    private function applyDispositionSideEffects(\App\Models\User $user, DialerSessionCall $row, array $validated): void
    {
        $contact = $row->contact_id ? Contact::find($row->contact_id) : null;
        $disposition = $validated['disposition'];
        $notes = $validated['notes'] ?? null;

        // Always log to the timeline if we have a contact.
        if ($contact) {
            $labels = [
                DialerSessionCall::DISPOSITION_CONNECTED => 'Connected',
                DialerSessionCall::DISPOSITION_VOICEMAIL => 'Left voicemail',
                DialerSessionCall::DISPOSITION_NO_ANSWER => 'No answer',
                DialerSessionCall::DISPOSITION_WRONG_NUMBER => 'Wrong number',
                DialerSessionCall::DISPOSITION_DO_NOT_CALL => 'Marked Do Not Call',
                DialerSessionCall::DISPOSITION_CALLBACK => 'Callback scheduled',
            ];
            $eventType = $disposition === DialerSessionCall::DISPOSITION_CONNECTED
                ? 'call_completed'
                : 'call_logged';

            TimelineService::log(
                $user,
                $eventType,
                "Power Dial: {$labels[$disposition]} — {$contact->full_name}",
                $notes,
                $contact,
                loggable: $row->call_record_id ? CallRecord::find($row->call_record_id) : $row,
                metadata: [
                    'source' => 'power_dialer',
                    'session_id' => $row->dialer_session_id,
                    'disposition' => $disposition,
                ],
            );

            if ($disposition === DialerSessionCall::DISPOSITION_CONNECTED) {
                $contact->update(['last_contacted_at' => now()]);
            }
        }

        // Do Not Call: opt the contact out of all comms.
        if ($disposition === DialerSessionCall::DISPOSITION_DO_NOT_CALL && $contact) {
            $contact->update([
                'sms_opted_out' => true,
                'sms_opted_out_at' => now(),
                'dnd_mode' => 'all',
            ]);
        }

        // Callback: schedule a Task on the chosen datetime.
        if ($disposition === DialerSessionCall::DISPOSITION_CALLBACK && $contact && !empty($validated['callback_at'])) {
            $callbackAt = \Carbon\Carbon::parse($validated['callback_at']);
            Task::create([
                'user_id' => $user->id,
                'team_id' => $user->team_id,
                'taskable_type' => Contact::class,
                'taskable_id' => $contact->id,
                'title' => "Callback: {$contact->full_name}",
                'description' => $notes ? "From power dialer session: {$notes}" : null,
                'priority' => 'high',
                'due_at' => $callbackAt,
                'due_date' => $callbackAt->toDateString(),
            ]);
        }

        // If this row was sourced from a Task, mark that Task complete.
        if ($row->task_id) {
            Task::whereKey($row->task_id)
                ->whereNull('completed_at')
                ->update([
                    'is_completed' => true,
                    'completed_at' => now(),
                ]);
        }
    }

    /**
     * Authorize the current user against a session — owner or same-team member.
     */
    private function authorize(Request $request, DialerSession $session): void
    {
        $user = $request->user();
        $sameUser = $session->user_id === $user->id;
        $sameTeam = $session->team_id && $user->team_id && $session->team_id === $user->team_id;
        if (!$sameUser && !$sameTeam) {
            abort(403, 'Unauthorized.');
        }
    }

    /**
     * Build the JSON payload the dialer page needs: session metadata + current contact details +
     * the calling script (with questions) + lead tasks for the current contact + upcoming/completed
     * queue rows. Mirrors the Zoho-style campaign page layout.
     */
    private function sessionPayload(DialerSession $session): array
    {
        $current = $session->calls()
            ->where('status', DialerSessionCall::STATUS_IN_PROGRESS)
            ->with(['contact:id,uuid,first_name,last_name,email,phone,mobile,type,status,lead_score,last_contacted_at,dnd_mode'])
            ->first();

        // Upcoming queue — show more rows than before (Zoho-style table).
        $upcoming = $session->calls()
            ->where('status', DialerSessionCall::STATUS_PENDING)
            ->orderBy('position')
            ->limit(50)
            ->with(['contact:id,uuid,first_name,last_name,phone,mobile,email'])
            ->get(['id', 'position', 'contact_id', 'status']);

        // Completed/skipped calls — for the "Completed Calls" panel.
        // Eager-load the linked CallRecord so we can surface its recording_url
        // on rows where Telnyx finished writing the file.
        $completed = $session->calls()
            ->whereIn('status', [DialerSessionCall::STATUS_COMPLETED, DialerSessionCall::STATUS_SKIPPED])
            ->orderByDesc('attempted_at')
            ->orderByDesc('updated_at')
            ->limit(50)
            ->with([
                'contact:id,uuid,first_name,last_name,phone,mobile',
                'callRecord:id,recording_url,is_recorded',
            ])
            ->get(['id', 'position', 'contact_id', 'call_record_id', 'status', 'disposition', 'disposition_notes', 'duration_seconds', 'attempted_at', 'callback_at']);

        // Open tasks for the current contact — surfaced in the lead-context panel so the agent
        // can talk to known follow-ups during the call.
        $leadTasks = [];
        $leadDeals = [];
        $leadSearches = [];
        $leadListings = [];
        if ($current?->contact_id) {
            $leadTasks = Task::query()
                ->where('taskable_type', Contact::class)
                ->where('taskable_id', $current->contact_id)
                ->whereNull('completed_at')
                ->orderBy('due_at')
                ->limit(10)
                ->get(['id', 'title', 'description', 'priority', 'due_at', 'due_date'])
                ->all();

            // Quick-view collections for the lead card (saved searches, properties they own, deals they're in).
            $leadDeals = \App\Models\Deal::query()
                ->whereHas('contacts', fn ($q) => $q->where('contacts.id', $current->contact_id))
                ->with('pipelineStage:id,name,color')
                ->orderByDesc('updated_at')
                ->limit(5)
                ->get(['id', 'title', 'value', 'pipeline_stage_id'])
                ->all();

            $leadSearches = \App\Models\ContactSearch::query()
                ->where('contact_id', $current->contact_id)
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['id', 'contact_id', 'name', 'filters'])
                ->all();

            $leadListings = \App\Models\Listing::query()
                ->where('contact_id', $current->contact_id)
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['id', 'contact_id', 'title', 'address', 'city', 'state_province', 'price', 'status', 'bedrooms', 'bathrooms', 'sqft'])
                ->all();
        }

        $script = null;
        if ($session->calling_script_id) {
            $session->loadMissing('callingScript');
            if ($session->callingScript) {
                $s = $session->callingScript;
                $script = [
                    'id' => $s->id,
                    'name' => $s->name,
                    'intro' => $s->intro,
                    'body' => $s->body,
                    'questions' => $s->questions ?? [],
                ];
            }
        }

        return [
            'session' => [
                'id' => $session->id,
                'name' => $session->name,
                'status' => $session->status,
                'source_type' => $session->source_type,
                'source_id' => $session->source_id,
                'calling_script_id' => $session->calling_script_id,
                'total_contacts' => $session->total_contacts,
                'current_position' => $session->current_position,
                'stats' => [
                    'attempted' => $session->calls_attempted,
                    'connected' => $session->calls_connected,
                    'voicemail' => $session->calls_voicemail,
                    'no_answer' => $session->calls_no_answer,
                    'wrong_number' => $session->calls_wrong_number,
                    'dnc' => $session->calls_dnc,
                    'callbacks' => $session->callbacks_scheduled,
                    'skipped' => $session->calls_skipped,
                ],
                'started_at' => $session->started_at,
                'paused_at' => $session->paused_at,
                'ended_at' => $session->ended_at,
            ],
            'script' => $script,
            'current' => $current ? [
                'id' => $current->id,
                'position' => $current->position,
                'contact' => $current->contact,
                'answers' => $current->answers ?? new \stdClass(),
                'lead_tasks' => $leadTasks,
                'lead_deals' => $leadDeals,
                'lead_searches' => $leadSearches,
                'lead_listings' => $leadListings,
            ] : null,
            'upcoming' => $upcoming->map(fn ($c) => [
                'id' => $c->id,
                'position' => $c->position,
                'contact' => $c->contact,
            ])->values(),
            'completed' => $completed->map(fn ($c) => [
                'id' => $c->id,
                'position' => $c->position,
                'contact' => $c->contact,
                'disposition' => $c->disposition,
                'status' => $c->status,
                'duration_seconds' => $c->duration_seconds,
                'attempted_at' => $c->attempted_at,
                'callback_at' => $c->callback_at,
                'recording_url' => $c->callRecord?->recording_url,
            ])->values(),
        ];
    }
}
