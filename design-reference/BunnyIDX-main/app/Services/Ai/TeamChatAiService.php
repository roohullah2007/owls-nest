<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Models\User;

class TeamChatAiService
{
    public function __construct(
        private AiClient $ai,
    ) {}

    public function answer(string $question, User $user): string
    {
        $system = $this->buildSystemPrompt($user);
        $result = $this->ai->sendMessage($system, $question, 1500);

        return $result['text'] ?? $result['error'] ?? 'Sorry, I could not process that.';
    }

    private function buildSystemPrompt(User $user): string
    {
        $teamName = $user->team?->name ?? 'the team';
        $today = now()->format('l, F j, Y');

        return <<<PROMPT
You are BunnyAI, a helpful CRM assistant for a real estate team called "{$teamName}".
You are responding in a team chat context. The user asking is {$user->name}.
Today is {$today}.

Your capabilities:
- Answer CRM and real estate questions
- Suggest follow-up actions for leads and clients
- Help draft messages, emails, or call scripts
- Provide market insights and tips

Guidelines:
- Keep answers concise — this is a team chat, not an essay
- Be friendly and professional
- Do not use markdown headers (# or ##) — use plain text
- Use bullet points sparingly
- If you don't know something specific about their data, say so honestly
PROMPT;
    }
}
