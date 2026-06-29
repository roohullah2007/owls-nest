<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Tag;
use App\Models\User;
use App\Services\Ai\AiClient;
use App\Services\Ai\ContactInsightsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AiQueryController extends Controller implements HasMiddleware
{
    /** AI assists are a paid feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:ai')];
    }

    public function query(Request $request, AiClient $ai, ContactInsightsService $insights): JsonResponse
    {
        $request->validate([
            'query' => 'required|string|max:500',
        ]);

        if (! $ai->isConfigured()) {
            return response()->json(['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'], 422);
        }

        $user = $request->user();
        $query = $request->input('query');
        $today = now()->format('Y-m-d');

        // Gather context for the AI
        $tags = Tag::forUser($user)->pluck('name')->toArray();
        $tagList = ! empty($tags) ? implode(', ', $tags) : 'none';

        $teamContext = '';
        $teamMembers = [];
        if ($user->team_id) {
            $teamMembers = User::where('team_id', $user->team_id)
                ->select('id', 'name')
                ->get()
                ->toArray();
            $memberNames = array_map(fn ($m) => "{$m['name']} (ID:{$m['id']})", $teamMembers);
            $teamContext = "\n\nTeam members (can assign contacts to): ".implode(', ', $memberNames);
        }

        // Quick stats for context
        $stats = Contact::forUser($user)->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'new_lead' THEN 1 ELSE 0 END) as new_leads,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'client' THEN 1 ELSE 0 END) as clients,
            SUM(CASE WHEN last_contacted_at IS NULL OR last_contacted_at < ? THEN 1 ELSE 0 END) as stale,
            SUM(CASE WHEN lead_score >= 60 THEN 1 ELSE 0 END) as high_score,
            SUM(CASE WHEN source = 'idx' THEN 1 ELSE 0 END) as from_idx,
            SUM(CASE WHEN source = 'website' THEN 1 ELSE 0 END) as from_website,
            SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as added_today,
            SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as added_this_week
        ", [
            now()->subDays(14)->format('Y-m-d'),
            now()->startOfDay()->format('Y-m-d H:i:s'),
            now()->subDays(7)->format('Y-m-d H:i:s'),
        ])->first();

        // Get a sample of contact names for better name matching
        $contactNames = Contact::forUser($user)
            ->selectRaw("CONCAT(first_name, ' ', last_name) as full_name")
            ->limit(200)
            ->pluck('full_name')
            ->toArray();
        $nameList = implode(', ', array_slice($contactNames, 0, 50));

        $system = <<<PROMPT
You are an intelligent CRM AI assistant for a real estate professional named {$user->name}. You are their personal assistant who helps them manage contacts, write communications, analyze their pipeline, and take actions on leads.

Today's date: {$today}
Total contacts: {$stats->total} | New leads: {$stats->new_leads} | Active: {$stats->active} | Clients: {$stats->clients} | Stale (14+ days no contact): {$stats->stale} | High score (60+): {$stats->high_score} | From IDX: {$stats->from_idx} | From Website: {$stats->from_website} | Added today: {$stats->added_today} | This week: {$stats->added_this_week}
Available tags: {$tagList}{$teamContext}
Known contact names (partial list): {$nameList}

Respond with a JSON object containing these keys (include only what's needed):

1. "interpretation" (string, REQUIRED) — Short, friendly description of what you understood and are doing. 1 sentence.

2. "answer" (string, optional) — Direct answer to a question. Be helpful and specific. Include numbers, actionable advice, and real estate context. 2-5 sentences. Use this for:
   - Data questions ("how many leads?", "what's my pipeline?")
   - Strategy advice ("what should I focus on?", "who should I call first?")
   - Contact analysis ("tell me about Lisa", "what do you know about this lead?")
   - Daily briefings ("give me a morning update")

3. "filters" (object, optional) — URL query params to filter the contacts list:
   - "search": string (search by name/email)
   - "type": string (buyer, seller, prospect, past_client, referral)
   - "status": string (new_lead, active, client, past_client, inactive)
   - "source": string (manual, website, referral, open_house, social_media, cold_call, idx, other)
   - "sort": string (first_name, email, phone, type, status, source, city, created_at, last_contacted_at, lead_score)
   - "direction": "asc" or "desc"
   - "lead_score_min": number (0-100)
   - "lead_score_max": number (0-100)
   - "last_contacted_before": date (YYYY-MM-DD)
   - "last_contacted_after": date (YYYY-MM-DD)
   - "has_email": boolean
   - "has_phone": boolean
   - "city": string
   - "tag": string (exact tag name)

4. "action" (string, optional) — One of:
   - "select_all" — Select all contacts matching filters for bulk actions
   - "assign" — Assign matching contacts to a team member
   - "lookup_contact" — Look up a specific contact by name to show their details
   - "draft_email" — Draft an email for a specific contact
   - "draft_sms" — Draft an SMS for a specific contact
   - "view_contact" — Navigate to a specific contact's profile

5. "contact_name" (string, optional) — For contact-specific actions (lookup_contact, draft_email, draft_sms, view_contact). The name to search for. Use the closest match from known contacts.

6. "draft_purpose" (string, optional) — For draft_email/draft_sms. Brief description of what the message should be about (e.g., "follow up on property viewing", "check in after closing").

7. "assign_to_id" (number, optional) — Team member ID for assign action.

8. "suggestions" (array of strings, optional) — 2-3 follow-up actions the user might want to take. Keep them short and actionable. These should be natural next steps, like "Draft a follow-up email to them", "Show me similar leads", "Score all new leads".

RULES:
- Always include "interpretation"
- When user mentions a specific person by name (e.g., "tell me about Sarah", "email Lisa", "what about John"), use contact_name with the matching name, and use the appropriate action
- For "tell me about [name]" or "what about [name]" → action: "lookup_contact"
- For "email [name]", "send email to [name]", "write to [name]" → action: "draft_email"
- For "text [name]", "SMS [name]", "message [name]" → action: "draft_sms"
- For "show me [name]", "open [name]", "go to [name]" → action: "view_contact"
- For questions about data/counts, use "answer" and optionally "filters"
- For "who should I contact?" → sort by last_contacted_at asc, filter stale contacts
- For "best leads" / "top leads" → sort by lead_score desc
- For "new leads" → filter status=new_lead
- For IDX/website leads → filter by source
- For "select"/"pick" contacts → action: "select_all"
- For "assign to [name]" → action: "assign", match team member name
- For "what should I focus on today?" / "morning briefing" → provide a strategic answer with priorities
- For "how's my pipeline?" → summarize deal/lead status with recommendations
- Be smart about dates: "last month" = before first of current month, "past 2 weeks" = after today-14
- When you draft content, include draft_purpose with context about what the message should cover
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
        if (! is_array($parsed)) {
            return response()->json([
                'filters' => ['search' => $query],
                'interpretation' => "Searching for \"{$query}\"",
            ]);
        }

        $response = [
            'interpretation' => $parsed['interpretation'] ?? 'Processing your request',
        ];

        if (! empty($parsed['filters'])) {
            $response['filters'] = $parsed['filters'];
        }

        if (! empty($parsed['answer'])) {
            $response['answer'] = $parsed['answer'];
        }

        // Handle contact-specific actions
        $action = $parsed['action'] ?? null;
        $contactName = $parsed['contact_name'] ?? null;

        if ($action && $contactName && in_array($action, ['lookup_contact', 'draft_email', 'draft_sms', 'view_contact'])) {
            $matchedContacts = $this->findContactsByName($user, $contactName);

            if (count($matchedContacts) === 0) {
                $response['answer'] = ($response['answer'] ?? '')."\n\nI couldn't find a contact named \"{$contactName}\". Try a different name or check the contacts list.";
                $response['filters'] = ['search' => $contactName];
            } elseif (count($matchedContacts) === 1) {
                $contact = $matchedContacts[0];
                $response['contacts'] = [$this->formatContactForResponse($contact)];
                $response['action'] = $action;

                if ($action === 'lookup_contact') {
                    $response['answer'] = $this->buildContactSummary($contact);
                }

                if ($action === 'draft_email' && $contact->email) {
                    $purpose = $parsed['draft_purpose'] ?? '';
                    $draft = $insights->draftEmail($contact, $purpose);
                    if (! isset($draft['error'])) {
                        $response['draft'] = [
                            'type' => 'email',
                            'subject' => $draft['subject'],
                            'body' => $draft['body'],
                            'contact_id' => $contact->id,
                            'contact_uuid' => $contact->uuid,
                        ];
                    }
                } elseif ($action === 'draft_email' && ! $contact->email) {
                    $response['answer'] = ($response['answer'] ?? '')."\n\n{$contact->first_name} doesn't have an email address on file.";
                }

                if ($action === 'draft_sms' && ($contact->phone || $contact->mobile)) {
                    $purpose = $parsed['draft_purpose'] ?? '';
                    $draft = $insights->draftSms($contact, $purpose);
                    if (! isset($draft['error'])) {
                        $response['draft'] = [
                            'type' => 'sms',
                            'body' => $draft['body'],
                            'contact_id' => $contact->id,
                            'contact_uuid' => $contact->uuid,
                        ];
                    }
                } elseif ($action === 'draft_sms' && ! $contact->phone && ! $contact->mobile) {
                    $response['answer'] = ($response['answer'] ?? '')."\n\n{$contact->first_name} doesn't have a phone number on file.";
                }
            } else {
                // Multiple matches — return all for disambiguation
                $response['contacts'] = array_map(fn ($c) => $this->formatContactForResponse($c), $matchedContacts);
                $response['action'] = 'disambiguate';
                $response['answer'] = 'I found '.count($matchedContacts)." contacts matching \"{$contactName}\". Which one did you mean?";
            }
        }

        // Handle filter-based actions
        if ($action === 'select_all' && ! empty($parsed['filters'])) {
            $response['action'] = 'select_all';
            $matchedIds = $this->runFilterQuery($user, $parsed['filters']);
            $response['matchedIds'] = $matchedIds;
            $response['matchedCount'] = count($matchedIds);
        }

        if ($action === 'assign' && ! empty($parsed['assign_to_id'])) {
            $response['action'] = 'assign';
            $response['assign_to_id'] = (int) $parsed['assign_to_id'];
        }

        if (! empty($parsed['suggestions'])) {
            $response['suggestions'] = array_slice($parsed['suggestions'], 0, 3);
        }

        return response()->json($response);
    }

    private function findContactsByName($user, string $name): array
    {
        $parts = preg_split('/\s+/', trim($name));

        $query = Contact::forUser($user)
            ->select(['id', 'uuid', 'first_name', 'last_name', 'email', 'phone', 'mobile', 'type', 'status', 'source', 'city', 'state_province', 'lead_score', 'last_contacted_at', 'created_at', 'description', 'date_of_birth'])
            ->with(['tags:id,name,color', 'deals:id,title,value,won_at,lost_at']);

        if (count($parts) >= 2) {
            $query->where(function ($q) use ($parts, $name) {
                // Try first + last name match
                $q->where(function ($inner) use ($parts) {
                    $inner->where('first_name', 'like', "%{$parts[0]}%")
                        ->where('last_name', 'like', "%{$parts[count($parts) - 1]}%");
                })
                // Or full name search
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$name}%"]);
            });
        } else {
            $query->where(function ($q) use ($name) {
                $q->where('first_name', 'like', "%{$name}%")
                    ->orWhere('last_name', 'like', "%{$name}%");
            });
        }

        return $query->limit(5)->get()->all();
    }

    private function formatContactForResponse(Contact $contact): array
    {
        return [
            'id' => $contact->id,
            'uuid' => $contact->uuid,
            'name' => $contact->first_name.' '.$contact->last_name,
            'first_name' => $contact->first_name,
            'last_name' => $contact->last_name,
            'email' => $contact->email,
            'phone' => $contact->phone ?: $contact->mobile,
            'type' => $contact->type,
            'status' => $contact->status,
            'source' => $contact->source,
            'city' => $contact->city,
            'lead_score' => $contact->lead_score,
            'last_contacted_at' => $contact->last_contacted_at?->toIso8601String(),
            'tags' => $contact->relationLoaded('tags') ? $contact->tags->map(fn ($t) => ['name' => $t->name, 'color' => $t->color])->toArray() : [],
            'deals_count' => $contact->relationLoaded('deals') ? $contact->deals->count() : 0,
            'open_deals_value' => $contact->relationLoaded('deals') ? $contact->deals->whereNull('closed_at')->sum('value') : 0,
        ];
    }

    private function buildContactSummary(Contact $contact): string
    {
        $parts = [];
        $name = $contact->first_name.' '.$contact->last_name;
        $parts[] = "{$name} is a {$contact->type} ({$contact->status}).";

        $details = [];
        if ($contact->email) {
            $details[] = $contact->email;
        }
        if ($contact->phone) {
            $details[] = $contact->phone;
        }
        if ($contact->city) {
            $details[] = $contact->city.($contact->state_province ? ", {$contact->state_province}" : '');
        }
        if (! empty($details)) {
            $parts[] = implode(' | ', $details);
        }

        if ($contact->lead_score !== null) {
            $label = $contact->lead_score >= 60 ? 'high' : ($contact->lead_score >= 30 ? 'medium' : 'low');
            $parts[] = "Lead score: {$contact->lead_score}/100 ({$label}).";
        }

        if ($contact->last_contacted_at) {
            $days = (int) $contact->last_contacted_at->diffInDays(now());
            $parts[] = $days === 0 ? 'Last contacted today.' : "Last contacted {$days} day(s) ago.";
        } else {
            $parts[] = 'Never contacted yet.';
        }

        if ($contact->relationLoaded('deals') && $contact->deals->count() > 0) {
            $openDeals = $contact->deals->whereNull('closed_at');
            if ($openDeals->count() > 0) {
                $totalValue = $openDeals->sum('value');
                $parts[] = "{$openDeals->count()} open deal(s) worth \${$totalValue}.";
            }
        }

        if ($contact->relationLoaded('tags') && $contact->tags->isNotEmpty()) {
            $parts[] = 'Tags: '.$contact->tags->pluck('name')->implode(', ').'.';
        }

        return implode(' ', $parts);
    }

    private function runFilterQuery($user, array $filters): array
    {
        $query = Contact::forUser($user)->select('id');

        if (! empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%{$s}%")
                    ->orWhere('last_name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%");
            });
        }

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }
        if (! empty($filters['city'])) {
            $query->where('city', 'like', '%'.$filters['city'].'%');
        }
        if (isset($filters['lead_score_min'])) {
            $query->where('lead_score', '>=', (int) $filters['lead_score_min']);
        }
        if (isset($filters['lead_score_max'])) {
            $query->where('lead_score', '<=', (int) $filters['lead_score_max']);
        }
        if (! empty($filters['last_contacted_before'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('last_contacted_at', '<', $filters['last_contacted_before'])
                    ->orWhereNull('last_contacted_at');
            });
        }
        if (! empty($filters['last_contacted_after'])) {
            $query->where('last_contacted_at', '>=', $filters['last_contacted_after']);
        }
        if (isset($filters['has_email'])) {
            $filters['has_email'] ? $query->whereNotNull('email')->where('email', '!=', '') : $query->where(fn ($q) => $q->whereNull('email')->orWhere('email', ''));
        }
        if (isset($filters['has_phone'])) {
            $filters['has_phone'] ? $query->whereNotNull('phone')->where('phone', '!=', '') : $query->where(fn ($q) => $q->whereNull('phone')->orWhere('phone', ''));
        }
        if (! empty($filters['tag'])) {
            $query->whereHas('tags', fn ($tq) => $tq->where('name', 'like', $filters['tag']));
        }

        if (! empty($filters['sort'])) {
            $query->orderBy($filters['sort'], $filters['direction'] ?? 'desc');
        }

        return $query->limit(100)->pluck('id')->toArray();
    }
}
