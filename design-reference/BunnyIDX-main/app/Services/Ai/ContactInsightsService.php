<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Models\Contact;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ContactInsightsService
{
    public function __construct(
        private AiClient $ai,
    ) {}

    /**
     * Record a significant activity on a contact and auto-regenerate summary if warranted.
     *
     * Call this from controllers after logging calls, emails, deals, etc.
     * It increments the activity counter and only calls the AI when the
     * threshold is crossed AND enough time has passed since the last summary.
     */
    public function recordActivity(Contact $contact, string $eventType): void
    {
        $config = config('ai.summary');
        $significantEvents = $config['significant_events'] ?? [];

        if (! in_array($eventType, $significantEvents, true)) {
            return;
        }

        $contact->increment('ai_activity_count');

        if ($this->shouldRegenerateSummary($contact)) {
            try {
                $this->generateSummary($contact);
                $contact->update(['ai_activity_count' => 0]);
            } catch (\Throwable $e) {
                Log::warning('Auto-summary generation failed', [
                    'contact_id' => $contact->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Determine if the summary should be auto-regenerated.
     *
     * Rules:
     * 1. AI must be configured
     * 2. Activity count must be >= threshold (don't burn tokens on every minor event)
     * 3. Enough time must have passed since last generation (cooldown)
     * 4. If no summary exists yet, skip auto-gen (let user trigger first one manually)
     */
    public function shouldRegenerateSummary(Contact $contact): bool
    {
        if (! $this->ai->isConfigured()) {
            return false;
        }

        // Don't auto-generate if no summary exists yet — user should trigger first one
        if (! $contact->ai_summary) {
            return false;
        }

        $config = config('ai.summary');
        $threshold = $config['activity_threshold'] ?? 3;
        $cooldownHours = $config['cooldown_hours'] ?? 24;

        // Not enough activity to justify a regeneration
        if ($contact->ai_activity_count < $threshold) {
            return false;
        }

        // Cooldown: don't regenerate if last summary was too recent
        if ($contact->ai_summary_at && $contact->ai_summary_at->diffInHours(now()) < $cooldownHours) {
            return false;
        }

        return true;
    }

    /**
     * Generate an AI summary for a contact.
     *
     * @return array{summary: string, generated_at: string}|array{error: string}
     */
    public function generateSummary(Contact $contact): array
    {
        $contact->loadMissing(['tags', 'deals', 'notes', 'tasks', 'callLogs', 'emailLogs', 'smsLogs', 'meetings']);

        $system = 'You are a CRM assistant for a real estate professional. Generate a brief 2-3 sentence summary of this contact. Focus on: who they are, current status, and one key action item. Be direct, no fluff.';

        $prompt = $this->buildContactPrompt($contact);

        $result = $this->ai->sendMessage($system, $prompt);

        if (isset($result['error'])) {
            return $result;
        }

        $now = now();
        $contact->update([
            'ai_summary' => $result['text'],
            'ai_summary_at' => $now,
            'ai_activity_count' => 0,
        ]);

        return [
            'summary' => $result['text'],
            'generated_at' => $now->toIso8601String(),
        ];
    }

    /**
     * Get rule-based follow-up suggestions for a contact.
     * Pure computation — no AI calls, no extra queries if relations are loaded.
     *
     * @return array<int, array{type: string, priority: string, message: string, icon: string}>
     */
    public function getFollowUpSuggestions(Contact $contact): array
    {
        $suggestions = [];
        $config = config('ai.follow_up');

        // Stale contact
        if ($contact->last_contacted_at) {
            $daysSince = (int) $contact->last_contacted_at->diffInDays(now());
            if ($daysSince >= $config['stale_days']) {
                $suggestions[] = [
                    'type' => 'stale',
                    'priority' => $daysSince >= $config['stale_days'] * 2 ? 'high' : 'medium',
                    'message' => "No contact in {$daysSince} days. Consider reaching out.",
                    'icon' => 'clock',
                ];
            }
        }

        // New lead not contacted
        if (! $contact->last_contacted_at) {
            $daysSinceCreated = (int) $contact->created_at->diffInDays(now());
            if ($daysSinceCreated >= $config['new_lead_grace_days']) {
                $suggestions[] = [
                    'type' => 'new_lead',
                    'priority' => 'urgent',
                    'message' => "New lead added {$daysSinceCreated} days ago but never contacted.",
                    'icon' => 'exclamation',
                ];
            }
        }

        // Overdue tasks — use loaded relation if available, else query
        if ($contact->relationLoaded('tasks')) {
            $overdueTasks = $contact->tasks
                ->where('is_completed', false)
                ->filter(fn ($t) => $t->due_date && Carbon::parse($t->due_date)->lt(now()->startOfDay()))
                ->count();
        } else {
            $overdueTasks = $contact->tasks()
                ->where('is_completed', false)
                ->where('due_date', '<', now()->startOfDay())
                ->count();
        }

        if ($overdueTasks > 0) {
            $suggestions[] = [
                'type' => 'overdue_task',
                'priority' => 'urgent',
                'message' => "{$overdueTasks} overdue task(s) for this contact.",
                'icon' => 'exclamation',
            ];
        }

        // Stagnant deals — use loaded relation if available
        if ($contact->relationLoaded('deals')) {
            $stagnantDeals = $contact->deals
                ->filter(fn ($d) => ! $d->closed_at && $d->updated_at->lt(now()->subDays($config['deal_stagnant_days'])))
                ->count();
        } else {
            $stagnantDeals = $contact->deals()
                ->where('updated_at', '<', now()->subDays($config['deal_stagnant_days']))
                ->whereNull('won_at')
                ->whereNull('lost_at')
                ->count();
        }

        if ($stagnantDeals > 0) {
            $suggestions[] = [
                'type' => 'stagnant_deal',
                'priority' => 'high',
                'message' => "{$stagnantDeals} deal(s) with no activity in {$config['deal_stagnant_days']}+ days.",
                'icon' => 'trending-down',
            ];
        }

        // Upcoming birthday
        if ($contact->date_of_birth) {
            $nextBirthday = Carbon::parse($contact->date_of_birth)->setYear(now()->year);
            if ($nextBirthday->isPast()) {
                $nextBirthday->addYear();
            }
            $daysUntil = (int) now()->diffInDays($nextBirthday, false);
            if ($daysUntil >= 0 && $daysUntil <= $config['birthday_lookahead_days']) {
                $suggestions[] = [
                    'type' => 'birthday',
                    'priority' => 'low',
                    'message' => $daysUntil === 0
                        ? "It's {$contact->first_name}'s birthday today!"
                        : "Birthday coming up in {$daysUntil} day(s).",
                    'icon' => 'cake',
                ];
            }
        }

        return $suggestions;
    }

    /**
     * Compute a lightweight follow-up hint for index page display.
     * Uses only data already on the contact model — NO extra queries.
     */
    public function getFollowUpHint(Contact $contact): ?array
    {
        $config = config('ai.follow_up');

        // Stale contact
        if ($contact->last_contacted_at) {
            $daysSince = (int) $contact->last_contacted_at->diffInDays(now());
            if ($daysSince >= $config['stale_days']) {
                return [
                    'type' => 'stale',
                    'priority' => $daysSince >= $config['stale_days'] * 2 ? 'high' : 'medium',
                    'message' => "No contact in {$daysSince} days.",
                ];
            }
        }

        // New lead not contacted
        if (! $contact->last_contacted_at) {
            $daysSinceCreated = (int) $contact->created_at->diffInDays(now());
            if ($daysSinceCreated >= $config['new_lead_grace_days']) {
                return [
                    'type' => 'new_lead',
                    'priority' => 'urgent',
                    'message' => "Never contacted ({$daysSinceCreated}d ago).",
                ];
            }
        }

        return null;
    }

    /**
     * Generate an AI-powered personalized follow-up suggestion.
     *
     * @return array{suggestion: string}|array{error: string}
     */
    public function generateAiFollowUp(Contact $contact): array
    {
        $contact->loadMissing(['tags', 'deals', 'notes', 'tasks', 'callLogs', 'emailLogs', 'smsLogs', 'meetings']);

        $system = 'You are a CRM assistant for a real estate professional. Suggest the single best next action for this contact. Reply in 1-2 sentences. Be specific and actionable.';

        $prompt = $this->buildContactPrompt($contact);

        $result = $this->ai->sendMessage($system, $prompt);

        if (isset($result['error'])) {
            return $result;
        }

        $contact->update([
            'ai_next_action' => $result['text'],
            'ai_next_action_at' => now(),
        ]);

        return ['suggestion' => $result['text']];
    }

    /**
     * Generate AI-suggested tasks for a contact.
     *
     * @return array{tasks: array<int, array{title: string, description: string, priority: string, due_date: string}>}|array{error: string}
     */
    public function generateTasks(Contact $contact): array
    {
        $contact->loadMissing(['tags', 'deals', 'notes', 'tasks', 'callLogs', 'emailLogs', 'smsLogs', 'meetings']);

        $system = 'You are a CRM assistant for a real estate professional. Based on the contact information, suggest 2-4 actionable follow-up tasks. For each task provide a JSON object with: title (short action phrase), description (1 sentence context), priority (one of: low, normal, high, urgent), due_date (YYYY-MM-DD within the next 14 days). Respond ONLY with a JSON array of task objects, no extra text.';

        $prompt = $this->buildContactPrompt($contact)."\n\nToday's date: ".now()->format('Y-m-d');

        $result = $this->ai->sendMessage($system, $prompt);

        if (isset($result['error'])) {
            return $result;
        }

        $tasks = $this->parseJson($result['text']);
        if ($tasks === null || ! is_array($tasks)) {
            return ['error' => 'Failed to parse AI response.'];
        }

        return ['tasks' => $tasks];
    }

    /**
     * Draft a personalized email for a contact.
     *
     * @return array{subject: string, body: string}|array{error: string}
     */
    public function draftEmail(Contact $contact, string $purpose = ''): array
    {
        $contact->loadMissing(['tags', 'deals', 'notes', 'callLogs', 'emailLogs', 'meetings']);

        $purposeHint = $purpose ? "\n\nPurpose of email: {$purpose}" : '';

        $system = 'You are a CRM assistant for a real estate professional. Draft a professional, personalized email for this contact. Respond ONLY with a JSON object with two keys: "subject" (email subject line) and "body" (email body text, use \n for line breaks). No markdown, no code blocks, no extra text.';

        $prompt = $this->buildContactPrompt($contact).$purposeHint;

        $result = $this->ai->sendMessage($system, $prompt);

        if (isset($result['error'])) {
            return $result;
        }

        $email = $this->parseJson($result['text']);
        if (! is_array($email) || ! isset($email['subject'], $email['body'])) {
            return ['error' => 'Failed to parse AI response.'];
        }

        return $email;
    }

    /**
     * Draft a personalized SMS/text message for a contact.
     *
     * @return array{body: string}|array{error: string}
     */
    public function draftSms(Contact $contact, string $purpose = ''): array
    {
        $contact->loadMissing(['tags', 'deals', 'notes', 'callLogs', 'smsLogs']);

        $purposeHint = $purpose ? "\n\nPurpose of text: {$purpose}" : '';

        $system = 'You are a CRM assistant for a real estate professional. Draft a short, friendly text message (SMS) for this contact. Keep it under 160 characters if possible. Respond ONLY with a JSON object with one key: "body" (the text message). No markdown, no code blocks.';

        $prompt = $this->buildContactPrompt($contact).$purposeHint;

        $result = $this->ai->sendMessage($system, $prompt);

        if (isset($result['error'])) {
            return $result;
        }

        $sms = $this->parseJson($result['text']);
        if (! is_array($sms) || ! isset($sms['body'])) {
            return ['error' => 'Failed to parse AI response.'];
        }

        return $sms;
    }

    /**
     * Draft a personalized CRM note for a contact.
     *
     * @return array{body: string}|array{error: string}
     */
    public function draftNote(Contact $contact, string $purpose = ''): array
    {
        $contact->loadMissing(['tags', 'deals', 'notes', 'callLogs', 'emailLogs', 'meetings']);

        $purposeHint = $purpose ? "\n\nContext/purpose: {$purpose}" : '';

        $system = 'You are a CRM assistant for a real estate professional. Draft a useful internal CRM note for this contact. Include relevant observations about their status, recent activity, and any action items. Keep it concise (2-4 sentences). Respond ONLY with a JSON object with one key: "body" (the note text). No markdown, no code blocks.';

        $prompt = $this->buildContactPrompt($contact).$purposeHint;

        $result = $this->ai->sendMessage($system, $prompt);

        if (isset($result['error'])) {
            return $result;
        }

        $note = $this->parseJson($result['text']);
        if (! is_array($note) || ! isset($note['body'])) {
            return ['error' => 'Failed to parse AI response.'];
        }

        return $note;
    }

    /**
     * Draft suggested call notes / talking points for a contact.
     *
     * @return array{notes: string}|array{error: string}
     */
    public function draftCallNotes(Contact $contact): array
    {
        $contact->loadMissing(['tags', 'deals', 'notes', 'callLogs', 'emailLogs', 'meetings']);

        $system = 'You are a CRM assistant for a real estate professional. Generate brief call talking points / notes for an upcoming call with this contact. Include: greeting, key topics to discuss, and any follow-up items. Keep it concise (3-5 bullet points). Respond ONLY with a JSON object with one key: "notes" (the talking points as plain text with line breaks). No markdown, no code blocks.';

        $prompt = $this->buildContactPrompt($contact);

        $result = $this->ai->sendMessage($system, $prompt);

        if (isset($result['error'])) {
            return $result;
        }

        $callNotes = $this->parseJson($result['text']);
        if (! is_array($callNotes) || ! isset($callNotes['notes'])) {
            return ['error' => 'Failed to parse AI response.'];
        }

        return $callNotes;
    }

    /**
     * Parse JSON from AI response, handling various formats the AI might return.
     */
    private function parseJson(string $text): mixed
    {
        $text = trim($text);

        // Try direct parse first
        $result = json_decode($text, true);
        if ($result !== null) {
            return $result;
        }

        // Strip markdown code blocks (```json ... ``` or ``` ... ```)
        if (preg_match('/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/', $text, $m)) {
            $result = json_decode(trim($m[1]), true);
            if ($result !== null) {
                return $result;
            }
        }

        // Try to extract JSON object or array from surrounding text
        // Find first { or [ and last matching } or ]
        $firstBrace = strpos($text, '{');
        $firstBracket = strpos($text, '[');
        if ($firstBrace !== false || $firstBracket !== false) {
            if ($firstBrace !== false && ($firstBracket === false || $firstBrace < $firstBracket)) {
                $lastBrace = strrpos($text, '}');
                if ($lastBrace !== false) {
                    $json = substr($text, $firstBrace, $lastBrace - $firstBrace + 1);
                    $result = json_decode($json, true);
                    if ($result !== null) {
                        return $result;
                    }
                }
            } elseif ($firstBracket !== false) {
                $lastBracket = strrpos($text, ']');
                if ($lastBracket !== false) {
                    $json = substr($text, $firstBracket, $lastBracket - $firstBracket + 1);
                    $result = json_decode($json, true);
                    if ($result !== null) {
                        return $result;
                    }
                }
            }
        }

        Log::warning('AI response JSON parse failed', ['raw' => mb_substr($text, 0, 500)]);

        return null;
    }

    private function buildContactPrompt(Contact $contact): string
    {
        $parts = [];

        $parts[] = "Contact: {$contact->first_name} {$contact->last_name}";
        $parts[] = "Type: {$contact->type} | Status: {$contact->status} | Source: {$contact->source}";

        if ($contact->email) {
            $parts[] = "Email: {$contact->email}";
        }
        if ($contact->phone) {
            $parts[] = "Phone: {$contact->phone}";
        }
        if ($contact->city) {
            $parts[] = 'Location: '.implode(', ', array_filter([$contact->city, $contact->state_province]));
        }
        if ($contact->date_of_birth) {
            $parts[] = "Birthday: {$contact->date_of_birth->format('M j')}";
        }
        if ($contact->last_contacted_at) {
            $parts[] = "Last contacted: {$contact->last_contacted_at->diffForHumans()}";
        }
        $parts[] = "Created: {$contact->created_at->diffForHumans()}";

        if ($contact->relationLoaded('tags') && $contact->tags->isNotEmpty()) {
            $parts[] = 'Tags: '.$contact->tags->pluck('name')->implode(', ');
        }

        if ($contact->description) {
            $parts[] = "Description: {$contact->description}";
        }

        // Deals
        if ($contact->relationLoaded('deals') && $contact->deals->isNotEmpty()) {
            $dealLines = $contact->deals->map(fn ($d) => "- {$d->title} (\${$d->value})")->implode("\n");
            $parts[] = "Deals:\n{$dealLines}";
        }

        // Notes (latest 5)
        if ($contact->relationLoaded('notes') && $contact->notes->isNotEmpty()) {
            $noteLines = $contact->notes->take(5)->map(fn ($n) => '- '.mb_substr((string) $n->body, 0, 200))->implode("\n");
            $parts[] = "Recent Notes:\n{$noteLines}";
        }

        // Communication counts
        $comms = [];
        if ($contact->relationLoaded('callLogs') && $contact->callLogs->count() > 0) {
            $comms[] = "{$contact->callLogs->count()} calls";
        }
        if ($contact->relationLoaded('emailLogs') && $contact->emailLogs->count() > 0) {
            $comms[] = "{$contact->emailLogs->count()} emails";
        }
        if ($contact->relationLoaded('smsLogs') && $contact->smsLogs->count() > 0) {
            $comms[] = "{$contact->smsLogs->count()} SMS";
        }
        if (! empty($comms)) {
            $parts[] = 'Communication history: '.implode(', ', $comms);
        }

        // Tasks
        if ($contact->relationLoaded('tasks')) {
            $pendingTasks = $contact->tasks->where('is_completed', false);
            if ($pendingTasks->isNotEmpty()) {
                $taskLines = $pendingTasks->take(5)->map(fn ($t) => "- {$t->title}".($t->due_date ? " (due {$t->due_date})" : ''))->implode("\n");
                $parts[] = "Pending Tasks:\n{$taskLines}";
            }
        }

        // Meetings
        if ($contact->relationLoaded('meetings') && $contact->meetings->isNotEmpty()) {
            $meetingLines = $contact->meetings->take(5)->map(function ($m) {
                $date = $m->starts_at ? Carbon::parse($m->starts_at)->format('M j, g:ia') : '';

                return "- {$m->title} ({$date})";
            })->implode("\n");
            $parts[] = "Recent Meetings:\n{$meetingLines}";
        }

        return implode("\n", $parts);
    }
}
