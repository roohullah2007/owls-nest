<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Deal;
use App\Models\Pipeline;
use App\Models\Tag;
use App\Services\Ai\AiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AiDealQueryController extends Controller implements HasMiddleware
{
    /** AI assists are a paid feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:ai')];
    }

    public function query(Request $request, AiClient $ai): JsonResponse
    {
        $request->validate([
            'query' => 'required|string|max:500',
        ]);

        if (!$ai->isConfigured()) {
            return response()->json(['error' => 'AI is not configured. Add GEMINI_API_KEY to your .env file.'], 422);
        }

        $user = $request->user();
        $query = $request->input('query');
        $today = now()->format('Y-m-d');

        // Gather context
        $tags = Tag::forUser($user)->pluck('name')->toArray();
        $tagList = !empty($tags) ? implode(', ', $tags) : 'none';

        $teamContext = '';
        if ($user->team_id) {
            $teamMembers = \App\Models\User::where('team_id', $user->team_id)
                ->select('id', 'name')
                ->get()
                ->toArray();
            $memberNames = array_map(fn ($m) => "{$m['name']} (ID:{$m['id']})", $teamMembers);
            $teamContext = "\n\nTeam members (can assign deals to): " . implode(', ', $memberNames);
        }

        // Deal stats
        $stats = Deal::forUser($user)->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN won_at IS NULL AND lost_at IS NULL THEN 1 ELSE 0 END) as open_deals,
            SUM(CASE WHEN won_at IS NOT NULL THEN 1 ELSE 0 END) as won_deals,
            SUM(CASE WHEN lost_at IS NOT NULL THEN 1 ELSE 0 END) as lost_deals,
            SUM(CASE WHEN won_at IS NULL AND lost_at IS NULL THEN value ELSE 0 END) as open_value,
            SUM(CASE WHEN won_at IS NOT NULL THEN value ELSE 0 END) as won_value,
            AVG(CASE WHEN won_at IS NULL AND lost_at IS NULL THEN value END) as avg_deal_value,
            SUM(CASE WHEN won_at IS NULL AND lost_at IS NULL AND expected_close_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as closing_this_week,
            SUM(CASE WHEN won_at IS NULL AND lost_at IS NULL AND expected_close_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as closing_this_month,
            SUM(CASE WHEN won_at IS NOT NULL AND won_at >= ? THEN 1 ELSE 0 END) as won_this_month
        ", [
            now()->startOfWeek()->format('Y-m-d'),
            now()->endOfWeek()->format('Y-m-d'),
            now()->startOfMonth()->format('Y-m-d'),
            now()->endOfMonth()->format('Y-m-d'),
            now()->startOfMonth()->format('Y-m-d H:i:s'),
        ])->first();

        // Pipeline stages context
        $pipelines = Pipeline::forUser($user)->with('stages')->get();
        $pipelineContext = $pipelines->map(function ($p) {
            $stages = $p->stages->sortBy('position')->pluck('name')->implode(', ');
            return "{$p->name} (lead_type: {$p->lead_type}): {$stages}";
        })->implode("\n");

        // Deal titles for name matching
        $dealTitles = Deal::forUser($user)
            ->select('title')
            ->limit(200)
            ->pluck('title')
            ->toArray();
        $titleList = implode(', ', array_slice($dealTitles, 0, 50));

        $avgValue = $stats->avg_deal_value ? number_format((float) $stats->avg_deal_value, 0) : '0';

        $system = <<<PROMPT
You are an intelligent CRM AI assistant for a real estate professional named {$user->name}. You help them manage deals/transactions, analyze their pipeline, and take actions.

Today's date: {$today}
Total deals: {$stats->total} | Open: {$stats->open_deals} (value: \${$stats->open_value}) | Won: {$stats->won_deals} (value: \${$stats->won_value}) | Lost: {$stats->lost_deals} | Avg deal value: \${$avgValue} | Closing this week: {$stats->closing_this_week} | Closing this month: {$stats->closing_this_month} | Won this month: {$stats->won_this_month}
Available tags: {$tagList}{$teamContext}
Pipelines & stages:
{$pipelineContext}
Known deal titles (partial list): {$titleList}

Respond with a JSON object containing these keys (include only what's needed):

1. "interpretation" (string, REQUIRED) — Short, friendly description of what you understood and are doing. 1 sentence.

2. "answer" (string, optional) — Direct answer to a question. Be helpful and specific. Include numbers, actionable advice, and real estate context. 2-5 sentences. Use this for:
   - Data questions ("how many open deals?", "what's my pipeline worth?")
   - Strategy advice ("what should I focus on?", "which deals need attention?")
   - Deal analysis ("tell me about the Smith deal", "what's closing soon?")
   - Pipeline health ("how's my pipeline?", "win rate?")

3. "filters" (object, optional) — URL query params to filter the deals list:
   - "search": string (search by deal title)
   - "status": string (open, won, lost)
   - "lead_type": string (buyer, seller, etc. — matches pipeline lead_type)
   - "type": string (buy, sell, lease, referral, other)
   - "sort": string (title, value, expected_close_date, created_at, won_at, lost_at)
   - "direction": "asc" or "desc"
   - "value_min": number (minimum deal value)
   - "value_max": number (maximum deal value)
   - "closing_before": date (YYYY-MM-DD, expected_close_date before)
   - "closing_after": date (YYYY-MM-DD, expected_close_date after)
   - "pipeline_stage": string (stage name to filter by)

4. "action" (string, optional) — One of:
   - "lookup_deal" — Look up a specific deal by title to show details
   - "filter" — Apply filters to the deals list
   - "view_deal" — Navigate to a specific deal's page
   - "move_stage" — Suggest moving a deal to a new stage (return deal_id + stage_name)
   - "create_deal" — Create a new deal with parsed details from the user's description

5. "deal_title" (string, optional) — For deal-specific actions (lookup_deal, view_deal, move_stage). The title to search for. Use the closest match from known deals.

6. "move_to_stage" (string, optional) — For move_stage action. The target stage name.

7. "deal_data" (object, optional) — For create_deal action. Pre-filled deal fields parsed from the user's description:
   - "title": string (deal title — generate a sensible one like "Smith - 123 Oak St" or "Johnson Buyer Deal")
   - "value": number (deal value/price, 0 if not mentioned)
   - "type": string (buy, sell, lease, referral, other — infer from context, default "buy")
   - "property_address": string (if mentioned)
   - "expected_close_date": string (YYYY-MM-DD, if mentioned or inferable)
   - "commission_rate": number (if mentioned)
   - "notes": string (any extra details the user mentioned)
   - "contact_names": array of strings (names of contacts mentioned, for matching)

8. "suggestions" (array of strings, optional) — 2-3 follow-up actions the user might want to take. Keep them short and actionable.

RULES:
- Always include "interpretation"
- When user mentions a specific deal by title, use deal_title with the matching title
- For "tell me about [deal]" → action: "lookup_deal"
- For "show me [deal]", "open [deal]" → action: "view_deal"
- For "move [deal] to [stage]" → action: "move_stage"
- For "add a deal", "create a deal", "new deal for [name]", "[name] wants to buy/sell" → action: "create_deal" with deal_data
- When creating a deal, extract as much info as possible: contact names, price/value, type (buy/sell/lease), address, close date, commission
- Generate a sensible title like "[Contact Name] - [Address]" or "[Contact Name] Buyer Deal" if no address given
- For questions about data/counts, use "answer" and optionally "filters"
- For "deals closing this month" → filter closing_after to first of month, closing_before to end of month
- For "high-value deals" → sort by value desc, optionally set value_min
- For "stale deals" / "deals with no activity" → answer about deals needing attention
- For "won deals" / "lost deals" → filter status=won or status=lost
- For "buyer deals" → filter type=buy or lead_type=buyer
- For "show all deals" → use status=all
- Be smart about dates: "this month" = current month range, "this week" = current week range
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
                'filters' => ['search' => $query],
                'interpretation' => "Searching for \"{$query}\"",
            ]);
        }

        $response = [
            'interpretation' => $parsed['interpretation'] ?? 'Processing your request',
        ];

        if (!empty($parsed['filters'])) {
            $response['filters'] = $parsed['filters'];
        }

        if (!empty($parsed['answer'])) {
            $response['answer'] = $parsed['answer'];
        }

        // Handle deal-specific actions
        $action = $parsed['action'] ?? null;
        $dealTitle = $parsed['deal_title'] ?? null;

        if ($action && $dealTitle && in_array($action, ['lookup_deal', 'view_deal', 'move_stage'])) {
            $matchedDeals = $this->findDealsByTitle($user, $dealTitle);

            if (count($matchedDeals) === 0) {
                $response['answer'] = ($response['answer'] ?? '') . "\n\nI couldn't find a deal matching \"{$dealTitle}\". Try a different name or check the deals list.";
                $response['filters'] = ['search' => $dealTitle];
            } elseif (count($matchedDeals) === 1) {
                $deal = $matchedDeals[0];
                $response['deals'] = [$this->formatDealForResponse($deal)];
                $response['action'] = $action;

                if ($action === 'lookup_deal') {
                    $response['answer'] = $this->buildDealSummary($deal);
                }

                if ($action === 'move_stage' && !empty($parsed['move_to_stage'])) {
                    $response['move_to_stage'] = $parsed['move_to_stage'];
                }
            } else {
                $response['deals'] = array_map(fn ($d) => $this->formatDealForResponse($d), $matchedDeals);
                $response['action'] = 'disambiguate';
                $response['answer'] = "I found " . count($matchedDeals) . " deals matching \"{$dealTitle}\". Which one did you mean?";
            }
        }

        // Handle create_deal action
        if ($action === 'create_deal' && !empty($parsed['deal_data'])) {
            $response['action'] = 'create_deal';
            $dealData = $parsed['deal_data'];

            // Try to match contact names to actual contact IDs
            $matchedContactIds = [];
            if (!empty($dealData['contact_names'])) {
                foreach ($dealData['contact_names'] as $name) {
                    $parts = preg_split('/\s+/', trim($name));
                    $contactQuery = \App\Models\Contact::forUser($user)->select('id');
                    if (count($parts) >= 2) {
                        $contactQuery->where(function ($q) use ($parts) {
                            $q->where('first_name', 'like', "%{$parts[0]}%")
                              ->where('last_name', 'like', "%{$parts[count($parts) - 1]}%");
                        });
                    } else {
                        $contactQuery->where(function ($q) use ($name) {
                            $q->where('first_name', 'like', "%{$name}%")
                              ->orWhere('last_name', 'like', "%{$name}%");
                        });
                    }
                    $found = $contactQuery->first();
                    if ($found) {
                        $matchedContactIds[] = $found->id;
                    }
                }
            }

            $response['deal_data'] = [
                'title' => $dealData['title'] ?? '',
                'value' => $dealData['value'] ?? '',
                'type' => $dealData['type'] ?? 'buy',
                'property_address' => $dealData['property_address'] ?? '',
                'expected_close_date' => $dealData['expected_close_date'] ?? '',
                'commission_rate' => $dealData['commission_rate'] ?? '',
                'notes' => $dealData['notes'] ?? '',
                'contact_ids' => $matchedContactIds,
                'contact_names' => $dealData['contact_names'] ?? [],
            ];
        }

        if (!empty($parsed['suggestions'])) {
            $response['suggestions'] = array_slice($parsed['suggestions'], 0, 3);
        }

        return response()->json($response);
    }

    private function findDealsByTitle($user, string $title): array
    {
        return Deal::forUser($user)
            ->select(['id', 'title', 'value', 'type', 'expected_close_date', 'actual_close_date', 'won_at', 'lost_at', 'pipeline_stage_id', 'property_address', 'commission_rate', 'commission_amount'])
            ->with(['contacts:id,uuid,first_name,last_name', 'pipelineStage:id,name,type,color', 'tags:id,name,color'])
            ->where('title', 'like', "%{$title}%")
            ->limit(5)
            ->get()
            ->all();
    }

    private function formatDealForResponse(Deal $deal): array
    {
        return [
            'id' => $deal->id,
            'title' => $deal->title,
            'value' => $deal->value,
            'type' => $deal->type,
            'stage' => $deal->pipelineStage?->name,
            'stage_type' => $deal->pipelineStage?->type,
            'stage_color' => $deal->pipelineStage?->color,
            'expected_close_date' => $deal->expected_close_date?->format('Y-m-d'),
            'won_at' => $deal->won_at?->toIso8601String(),
            'lost_at' => $deal->lost_at?->toIso8601String(),
            'property_address' => $deal->property_address,
            'contacts' => $deal->relationLoaded('contacts') ? $deal->contacts->map(fn ($c) => [
                'id' => $c->id,
                'uuid' => $c->uuid,
                'name' => $c->first_name . ' ' . $c->last_name,
            ])->toArray() : [],
            'tags' => $deal->relationLoaded('tags') ? $deal->tags->map(fn ($t) => ['name' => $t->name, 'color' => $t->color])->toArray() : [],
        ];
    }

    private function buildDealSummary(Deal $deal): string
    {
        $parts = [];
        $parts[] = "\"{$deal->title}\" is a {$deal->type} deal worth \$" . number_format((float) $deal->value, 0) . ".";

        if ($deal->pipelineStage) {
            $stageType = $deal->pipelineStage->type;
            if ($stageType === 'won') {
                $parts[] = "Status: Won" . ($deal->won_at ? ' on ' . $deal->won_at->format('M j, Y') : '') . ".";
            } elseif ($stageType === 'lost') {
                $parts[] = "Status: Lost" . ($deal->lost_at ? ' on ' . $deal->lost_at->format('M j, Y') : '') . ".";
            } else {
                $parts[] = "Currently in the \"{$deal->pipelineStage->name}\" stage.";
            }
        }

        if ($deal->property_address) {
            $parts[] = "Property: {$deal->property_address}.";
        }

        if ($deal->expected_close_date) {
            $daysUntil = (int) now()->diffInDays($deal->expected_close_date, false);
            if ($daysUntil > 0) {
                $parts[] = "Expected to close on " . $deal->expected_close_date->format('M j, Y') . " ({$daysUntil} days from now).";
            } elseif ($daysUntil === 0) {
                $parts[] = "Expected to close today!";
            } else {
                $parts[] = "Was expected to close on " . $deal->expected_close_date->format('M j, Y') . " (" . abs($daysUntil) . " days overdue).";
            }
        }

        if ($deal->commission_rate || $deal->commission_amount) {
            $commission = [];
            if ($deal->commission_rate) $commission[] = "{$deal->commission_rate}%";
            if ($deal->commission_amount) $commission[] = '$' . number_format((float) $deal->commission_amount, 0);
            $parts[] = "Commission: " . implode(' / ', $commission) . ".";
        }

        if ($deal->relationLoaded('contacts') && $deal->contacts->count() > 0) {
            $names = $deal->contacts->map(fn ($c) => $c->first_name . ' ' . $c->last_name)->implode(', ');
            $parts[] = "Contacts: {$names}.";
        }

        if ($deal->relationLoaded('tags') && $deal->tags->isNotEmpty()) {
            $parts[] = "Tags: " . $deal->tags->pluck('name')->implode(', ') . '.';
        }

        return implode(' ', $parts);
    }
}
