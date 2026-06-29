<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Services\Ai\AiClient;
use App\Services\Ai\ContactInsightsService;
use App\Services\Ai\LeadScoringService;
use App\Services\Idx\IdxSearchService;
use App\Services\TimelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;

class AiContactController extends Controller implements HasMiddleware
{
    /** AI assists are a paid feature (per-user override / trial honoured). */
    public static function middleware(): array
    {
        return [new Middleware('feature:ai')];
    }

    public function score(Request $request, Contact $contact, LeadScoringService $scoring): JsonResponse
    {
        $this->authorize($request, $contact);

        $score = $scoring->calculateAndSave($contact);

        return response()->json(['lead_score' => $score]);
    }

    public function summary(Request $request, Contact $contact, ContactInsightsService $insights): JsonResponse
    {
        $this->authorize($request, $contact);

        $result = $insights->generateSummary($contact);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function suggestions(Request $request, Contact $contact, ContactInsightsService $insights): JsonResponse
    {
        $this->authorize($request, $contact);

        $suggestions = $insights->getFollowUpSuggestions($contact);

        return response()->json(['suggestions' => $suggestions]);
    }

    public function followUp(Request $request, Contact $contact, ContactInsightsService $insights): JsonResponse
    {
        $this->authorize($request, $contact);

        $result = $insights->generateAiFollowUp($contact);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function generateTasks(Request $request, Contact $contact, ContactInsightsService $insights): JsonResponse
    {
        $this->authorize($request, $contact);

        $result = $insights->generateTasks($contact);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function createTasks(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize($request, $contact);

        $validated = $request->validate([
            'tasks' => 'required|array|min:1',
            'tasks.*.title' => 'required|string|max:255',
            'tasks.*.description' => 'nullable|string',
            'tasks.*.priority' => 'required|in:low,normal,high,urgent',
            'tasks.*.due_date' => 'nullable|date',
        ]);

        $created = DB::transaction(function () use ($request, $contact, $validated) {
            $tasks = [];
            foreach ($validated['tasks'] as $taskData) {
                $task = $request->user()->tasks()->create([
                    'title' => $taskData['title'],
                    'description' => $taskData['description'] ?? null,
                    'priority' => $taskData['priority'],
                    'due_date' => $taskData['due_date'] ?? null,
                    'taskable_type' => \App\Models\Contact::class,
                    'taskable_id' => $contact->id,
                ]);

                TimelineService::log(
                    user: $request->user(),
                    eventType: 'task_created',
                    subject: "AI task created: {$task->title}",
                    contact: $contact,
                    loggable: $task,
                );

                $tasks[] = $task;
            }
            return $tasks;
        });

        return response()->json(['created' => count($created)]);
    }

    public function draftEmail(Request $request, Contact $contact, ContactInsightsService $insights): JsonResponse
    {
        $this->authorize($request, $contact);

        $purpose = $request->input('purpose', '');
        $result = $insights->draftEmail($contact, $purpose);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function draftSms(Request $request, Contact $contact, ContactInsightsService $insights): JsonResponse
    {
        $this->authorize($request, $contact);

        $purpose = $request->input('purpose', '');
        $result = $insights->draftSms($contact, $purpose);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function draftNote(Request $request, Contact $contact, ContactInsightsService $insights): JsonResponse
    {
        $this->authorize($request, $contact);

        $purpose = $request->input('purpose', '');
        $result = $insights->draftNote($contact, $purpose);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function draftCallNotes(Request $request, Contact $contact, ContactInsightsService $insights): JsonResponse
    {
        $this->authorize($request, $contact);

        $result = $insights->draftCallNotes($contact);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function createMeeting(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize($request, $contact);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'meeting_type' => 'required|in:showing,in_person,video,phone',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date|after:starts_at',
        ]);

        $user = $request->user();

        $meeting = $user->meetings()->create([
            'contact_id' => $contact->id,
            'title' => $validated['title'],
            'meeting_type' => $validated['meeting_type'],
            'description' => $validated['description'] ?? null,
            'location' => $validated['location'] ?? null,
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'] ?? now()->parse($validated['starts_at'])->addHour(),
        ]);

        TimelineService::log(
            user: $user,
            eventType: 'meeting_created',
            subject: "AI meeting scheduled: {$meeting->title}",
            contact: $contact,
            loggable: $meeting,
        );

        return response()->json(['created' => true, 'meeting_id' => $meeting->id]);
    }

    public function suggestedListings(Request $request, Contact $contact, AiClient $ai, IdxSearchService $searchService): JsonResponse
    {
        $this->authorize($request, $contact);

        if (!$ai->isConfigured()) {
            return response()->json(['error' => 'AI is not configured.'], 422);
        }

        $user = $request->user();
        $contact->loadMissing(['tags', 'deals', 'notes']);

        $connection = $searchService->getConnectionForUser($user);

        if (!$connection) {
            return response()->json(['error' => 'No MLS connection configured.'], 422);
        }

        // Ask AI to generate search criteria based on contact's history
        $context = $this->buildContactContext($contact);
        $system = <<<PROMPT
You are a real estate CRM assistant. Based on this buyer contact's profile, notes, deals, and preferences, generate MLS search criteria to find properties they might like.

CONTACT INFO:
{$context}

Respond ONLY with a JSON object containing search filters:
- "city" (string, optional) — City to search, based on contact's location or notes
- "min_price" (number, optional) — Minimum price based on budget hints
- "max_price" (number, optional) — Maximum price based on budget hints
- "min_beds" (number, optional) — Minimum bedrooms
- "min_baths" (number, optional) — Minimum bathrooms
- "property_type" (string, optional) — e.g. "Residential"
- "reasoning" (string, required) — 1 sentence explaining why you chose these criteria

If you cannot determine any criteria, use reasonable defaults for the contact's area. No markdown, no code blocks.
PROMPT;

        $result = $ai->sendMessage($system, 'Generate listing search criteria for this buyer.');

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        $text = trim($result['text']);
        $text = preg_replace('/^```(?:json)?\s*/s', '', $text);
        $text = preg_replace('/\s*```$/s', '', $text);
        $criteria = json_decode($text, true);

        if (!is_array($criteria)) {
            return response()->json(['error' => 'Failed to parse AI search criteria.'], 422);
        }

        $reasoning = $criteria['reasoning'] ?? '';
        unset($criteria['reasoning']);

        try {
            $filters = array_filter([
                'city' => $criteria['city'] ?? $contact->city ?? null,
                'min_price' => $criteria['min_price'] ?? null,
                'max_price' => $criteria['max_price'] ?? null,
                'min_beds' => $criteria['min_beds'] ?? null,
                'min_baths' => $criteria['min_baths'] ?? null,
                'property_type' => $criteria['property_type'] ?? null,
                'per_page' => 8,
            ], fn ($v) => $v !== null && $v !== '');

            $results = $searchService->search($connection, $filters);

            return response()->json([
                'listings' => array_slice($results['listings'] ?? [], 0, 8),
                'total' => $results['total'] ?? 0,
                'criteria' => $criteria,
                'reasoning' => $reasoning,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'MLS search failed: ' . $e->getMessage()], 422);
        }
    }

    public function chat(Request $request, Contact $contact, AiClient $ai, ContactInsightsService $insights, IdxSearchService $searchService): JsonResponse
    {
        $this->authorize($request, $contact);

        $request->validate(['query' => 'required|string|max:500']);

        if (!$ai->isConfigured()) {
            return response()->json(['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'], 422);
        }

        $query = $request->input('query');
        $user = $request->user();
        $contact->loadMissing(['tags', 'deals', 'notes', 'tasks', 'callLogs', 'emailLogs', 'smsLogs', 'meetings']);

        $today = now()->format('Y-m-d');
        $contactInfo = $this->buildContactContext($contact);

        $system = <<<PROMPT
You are an intelligent CRM AI assistant for a real estate professional named {$user->name}. You are helping them manage a specific contact. Be conversational, helpful, and proactive.

Today's date: {$today}

CONTACT INFORMATION:
{$contactInfo}

Respond with a JSON object containing these keys (include only what's needed):

1. "interpretation" (string, REQUIRED) — Short, friendly description of what you understood. 1 sentence.

2. "answer" (string, optional) — Direct answer, insight, or advice. Be specific and actionable. 2-5 sentences.

3. "action" (string, optional) — One of:
   - "draft_email" — Draft an email for this contact
   - "draft_sms" — Draft a text message for this contact
   - "draft_note" — Draft a CRM note for this contact
   - "draft_call_notes" — Draft call talking points for this contact
   - "generate_tasks" — Generate suggested tasks for this contact
   - "change_status" — Change the contact's status
   - "summarize" — Generate a comprehensive AI summary
   - "schedule_meeting" — Schedule a meeting/appointment with this contact
   - "search_listings" — Search MLS listings for this contact

4. "draft_purpose" (string, optional) — For draft actions, brief description of what the content should be about.

5. "new_status" (string, optional) — For change_status action. One of: new_lead, active, client, past_client, inactive.

6. "suggestions" (array of strings, optional) — 2-3 follow-up actions. Short and actionable.

7. "meeting" (object, optional) — For schedule_meeting action:
   - "title" (string, REQUIRED) — Meeting title
   - "meeting_type" (string) — One of: showing, in_person, video, phone. Default: in_person.
   - "description" (string, optional) — Meeting notes
   - "location" (string, optional) — Meeting location
   - "starts_at" (string) — ISO datetime for meeting start, e.g. "2026-04-25T10:00:00"
   - "ends_at" (string, optional) — ISO datetime for meeting end (defaults to 1 hour after start)

8. "listing_search" (object, optional) — For search_listings action:
   - "city" (string, optional) — City to search in
   - "min_price" (number, optional) — Minimum price
   - "max_price" (number, optional) — Maximum price
   - "min_beds" (number, optional) — Minimum bedrooms
   - "min_baths" (number, optional) — Minimum bathrooms
   - "property_type" (string, optional) — e.g. "Residential", "Commercial"

RULES:
- Always include "interpretation"
- For "write/draft email about X" → action: "draft_email", draft_purpose: "X"
- For "text/sms about X" → action: "draft_sms", draft_purpose: "X"
- For "write a note" / "add note" → action: "draft_note"
- For "call talking points" / "what to say on call" → action: "draft_call_notes"
- For "generate tasks" / "what should I do" → action: "generate_tasks"
- For "change status to X" / "mark as X" → action: "change_status", new_status: matching value
- For "summarize" / "give me a summary" → action: "summarize"
- For "schedule a meeting/showing/call" → action: "schedule_meeting", meeting: {...}
- For "find/search listings" / "show homes" / "search MLS" → action: "search_listings", listing_search: {...}
- Infer search criteria from contact's notes, deals, location, type, and conversation context
- For questions about the contact → provide answer based on available data
- For advice questions → provide strategic real estate advice
- Respond ONLY with valid JSON. No markdown, no code blocks, no explanation outside JSON.
PROMPT;

        $result = $ai->sendMessage($system, $query, 1500);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        $text = trim($result['text']);
        $text = preg_replace('/^```(?:json)?\s*/s', '', $text);
        $text = preg_replace('/\s*```$/s', '', $text);

        $parsed = json_decode($text, true);
        if (!is_array($parsed)) {
            return response()->json([
                'interpretation' => 'Processing your request...',
                'answer' => $text,
            ]);
        }

        $response = [
            'interpretation' => $parsed['interpretation'] ?? 'Processing your request',
        ];

        if (!empty($parsed['answer'])) {
            $response['answer'] = $parsed['answer'];
        }

        if (!empty($parsed['suggestions'])) {
            $response['suggestions'] = array_slice($parsed['suggestions'], 0, 3);
        }

        $action = $parsed['action'] ?? null;

        if ($action === 'draft_email') {
            $purpose = $parsed['draft_purpose'] ?? '';
            $draft = $insights->draftEmail($contact, $purpose);
            if (!isset($draft['error'])) {
                $response['draft'] = ['type' => 'email', 'subject' => $draft['subject'], 'body' => $draft['body']];
                $response['action'] = 'draft_email';
            } else {
                $response['answer'] = ($response['answer'] ?? '') . "\n\nCouldn't generate email draft: {$draft['error']}";
            }
        } elseif ($action === 'draft_sms') {
            $purpose = $parsed['draft_purpose'] ?? '';
            $draft = $insights->draftSms($contact, $purpose);
            if (!isset($draft['error'])) {
                $response['draft'] = ['type' => 'sms', 'body' => $draft['body']];
                $response['action'] = 'draft_sms';
            } else {
                $response['answer'] = ($response['answer'] ?? '') . "\n\nCouldn't generate SMS draft: {$draft['error']}";
            }
        } elseif ($action === 'draft_note') {
            $purpose = $parsed['draft_purpose'] ?? '';
            $draft = $insights->draftNote($contact, $purpose);
            if (!isset($draft['error'])) {
                $response['draft'] = ['type' => 'note', 'body' => $draft['body']];
                $response['action'] = 'draft_note';
            } else {
                $response['answer'] = ($response['answer'] ?? '') . "\n\nCouldn't generate note draft: {$draft['error']}";
            }
        } elseif ($action === 'draft_call_notes') {
            $draft = $insights->draftCallNotes($contact);
            if (!isset($draft['error'])) {
                $response['draft'] = ['type' => 'call_notes', 'body' => $draft['notes']];
                $response['action'] = 'draft_call_notes';
            } else {
                $response['answer'] = ($response['answer'] ?? '') . "\n\nCouldn't generate call notes: {$draft['error']}";
            }
        } elseif ($action === 'generate_tasks') {
            $tasks = $insights->generateTasks($contact);
            if (!isset($tasks['error'])) {
                $response['tasks'] = $tasks['tasks'];
                $response['action'] = 'generate_tasks';
            } else {
                $response['answer'] = ($response['answer'] ?? '') . "\n\nCouldn't generate tasks: {$tasks['error']}";
            }
        } elseif ($action === 'change_status' && !empty($parsed['new_status'])) {
            $validStatuses = ['new_lead', 'active', 'client', 'past_client', 'inactive'];
            $newStatus = $parsed['new_status'];
            if (in_array($newStatus, $validStatuses)) {
                $response['action'] = 'change_status';
                $response['new_status'] = $newStatus;
                $response['answer'] = ($response['answer'] ?? '') ?: "Ready to change status to " . str_replace('_', ' ', $newStatus) . ".";
            }
        } elseif ($action === 'summarize') {
            $summary = $insights->generateSummary($contact);
            if (!isset($summary['error'])) {
                $response['action'] = 'summarize';
                $response['answer'] = $summary['summary'];
            } else {
                $response['answer'] = ($response['answer'] ?? '') . "\n\nCouldn't generate summary: {$summary['error']}";
            }
        } elseif ($action === 'schedule_meeting' && !empty($parsed['meeting'])) {
            $meetingData = $parsed['meeting'];
            $meetingTitle = $meetingData['title'] ?? "Meeting with {$contact->first_name}";
            $meetingType = in_array($meetingData['meeting_type'] ?? '', ['showing', 'in_person', 'video', 'phone'])
                ? $meetingData['meeting_type']
                : 'in_person';
            $startsAt = !empty($meetingData['starts_at']) ? $meetingData['starts_at'] : now()->addDay()->setHour(10)->setMinute(0)->toIso8601String();
            $endsAt = !empty($meetingData['ends_at']) ? $meetingData['ends_at'] : null;

            $response['action'] = 'schedule_meeting';
            $response['meeting'] = [
                'title' => $meetingTitle,
                'meeting_type' => $meetingType,
                'description' => $meetingData['description'] ?? '',
                'location' => $meetingData['location'] ?? '',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
            ];
        } elseif ($action === 'search_listings') {
            $searchParams = $parsed['listing_search'] ?? [];
            $response['action'] = 'search_listings';

            $connection = $searchService->getConnectionForUser($user);

            if ($connection) {
                try {
                    $filters = array_filter([
                        'city' => $searchParams['city'] ?? $contact->city ?? null,
                        'min_price' => $searchParams['min_price'] ?? null,
                        'max_price' => $searchParams['max_price'] ?? null,
                        'min_beds' => $searchParams['min_beds'] ?? null,
                        'min_baths' => $searchParams['min_baths'] ?? null,
                        'property_type' => $searchParams['property_type'] ?? null,
                        'per_page' => 6,
                    ], fn ($v) => $v !== null && $v !== '');

                    $results = $searchService->search($connection, $filters);
                    $response['listings'] = array_slice($results['listings'] ?? [], 0, 6);
                    $response['listing_search'] = $searchParams;
                    $response['listings_total'] = $results['total'] ?? 0;
                } catch (\Throwable $e) {
                    $response['answer'] = ($response['answer'] ?? '') . "\n\nCouldn't search MLS: " . $e->getMessage();
                    unset($response['action']);
                }
            } else {
                $response['answer'] = ($response['answer'] ?? '') . "\n\nNo MLS connection configured. Set up an IDX connection first to search listings.";
                unset($response['action']);
            }
        }

        return response()->json($response);
    }

    private function buildContactContext(Contact $contact): string
    {
        $lines = [];
        $lines[] = "Name: {$contact->first_name} {$contact->last_name}";
        $lines[] = "Type: {$contact->type} | Status: {$contact->status} | Source: {$contact->source}";
        if ($contact->email) $lines[] = "Email: {$contact->email}";
        if ($contact->phone) $lines[] = "Phone: {$contact->phone}";
        if ($contact->mobile) $lines[] = "Mobile: {$contact->mobile}";
        if ($contact->city) $lines[] = "Location: " . implode(', ', array_filter([$contact->address, $contact->city, $contact->state_province, $contact->postal_code]));
        if ($contact->date_of_birth) $lines[] = "Birthday: {$contact->date_of_birth->format('M j, Y')}";
        if ($contact->lead_score !== null) $lines[] = "Lead Score: {$contact->lead_score}/100";
        if ($contact->last_contacted_at) $lines[] = "Last Contacted: {$contact->last_contacted_at->diffForHumans()}";
        $lines[] = "Created: {$contact->created_at->diffForHumans()}";
        if ($contact->description) $lines[] = "Description: {$contact->description}";

        if ($contact->relationLoaded('tags') && $contact->tags->isNotEmpty()) {
            $lines[] = "Tags: " . $contact->tags->pluck('name')->implode(', ');
        }

        if ($contact->relationLoaded('deals') && $contact->deals->isNotEmpty()) {
            $dealLines = $contact->deals->map(fn ($d) => "  - {$d->title} (\${$d->value})" . ($d->closed_at ? ' [CLOSED]' : ' [OPEN]'))->implode("\n");
            $lines[] = "Deals:\n{$dealLines}";
        }

        if ($contact->relationLoaded('notes') && $contact->notes->isNotEmpty()) {
            $noteLines = $contact->notes->take(5)->map(fn ($n) => "  - " . mb_substr((string) $n->body, 0, 150))->implode("\n");
            $lines[] = "Recent Notes:\n{$noteLines}";
        }

        $comms = [];
        if ($contact->relationLoaded('callLogs') && $contact->callLogs->count() > 0) $comms[] = "{$contact->callLogs->count()} calls";
        if ($contact->relationLoaded('emailLogs') && $contact->emailLogs->count() > 0) $comms[] = "{$contact->emailLogs->count()} emails";
        if ($contact->relationLoaded('smsLogs') && $contact->smsLogs->count() > 0) $comms[] = "{$contact->smsLogs->count()} SMS";
        if (!empty($comms)) $lines[] = "Communication: " . implode(', ', $comms);

        if ($contact->relationLoaded('tasks')) {
            $pending = $contact->tasks->where('is_completed', false);
            if ($pending->isNotEmpty()) {
                $taskLines = $pending->take(5)->map(fn ($t) => "  - {$t->title}" . ($t->due_date ? " (due {$t->due_date})" : ''))->implode("\n");
                $lines[] = "Pending Tasks:\n{$taskLines}";
            }
        }

        if ($contact->relationLoaded('meetings') && $contact->meetings->isNotEmpty()) {
            $meetingLines = $contact->meetings->take(3)->map(fn ($m) => "  - {$m->title} ({$m->starts_at})")->implode("\n");
            $lines[] = "Recent Meetings:\n{$meetingLines}";
        }

        return implode("\n", $lines);
    }

    private function authorize(Request $request, Contact $contact): void
    {
        $user = $request->user();
        abort_unless($contact->user_id === $user->id || ($user->team_id && $contact->team_id === $user->team_id), 403);
    }
}
