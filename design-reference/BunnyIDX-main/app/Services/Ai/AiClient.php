<?php

declare(strict_types=1);

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiClient
{
    private string $apiKey;

    private string $model;

    private int $maxTokens;

    private int $timeout;

    public function __construct()
    {
        $this->apiKey = (string) config('ai.gemini.api_key');
        $this->model = (string) config('ai.gemini.model');
        $this->maxTokens = (int) config('ai.gemini.max_tokens');
        $this->timeout = (int) config('ai.gemini.timeout');
    }

    public function isConfigured(): bool
    {
        return $this->apiKey !== '';
    }

    public function getProvider(): string
    {
        return 'gemini';
    }

    /**
     * Options:
     * - json (bool): force `responseMimeType: application/json` so the model
     *   MUST return parseable JSON (no markdown fences, no prose preamble).
     * - thinking_budget (int): thinking-token cap for 2.5 "thinking" models.
     *   IMPORTANT: maxOutputTokens INCLUDES thinking tokens on those models —
     *   without a budget, thinking can silently eat the cap and the visible
     *   answer comes back truncated mid-sentence. Pass 0 for plain copy tasks.
     *
     * @param  array{json?: bool, thinking_budget?: int}  $options
     * @return array{text: string, provider: string}|array{error: string}
     */
    public function sendMessage(string $system, string $user, ?int $maxTokens = null, array $options = []): array
    {
        if (! $this->isConfigured()) {
            return ['error' => 'Gemini API key is not configured. Add GEMINI_API_KEY to your .env file.'];
        }

        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent";

            $generationConfig = [
                'maxOutputTokens' => $maxTokens ?? $this->maxTokens,
            ];
            if (! empty($options['json'])) {
                $generationConfig['responseMimeType'] = 'application/json';
            }
            if (array_key_exists('thinking_budget', $options)) {
                $generationConfig['thinkingConfig'] = ['thinkingBudget' => (int) $options['thinking_budget']];
            }

            $response = Http::timeout($this->timeout)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url.'?key='.$this->apiKey, [
                    'system_instruction' => [
                        'parts' => [['text' => $system]],
                    ],
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [['text' => $user]],
                        ],
                    ],
                    'generationConfig' => $generationConfig,
                ]);

            if (! $response->successful()) {
                Log::warning('Gemini API failed', ['status' => $response->status(), 'body' => $response->body()]);

                return ['error' => 'AI service returned an error. Please try again later.'];
            }

            $data = $response->json();
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

            // A MAX_TOKENS finish means the answer was cut mid-sentence —
            // surface it as an error instead of letting callers save (or show)
            // a truncated fragment of broken JSON.
            $finishReason = (string) ($data['candidates'][0]['finishReason'] ?? '');
            if ($finishReason === 'MAX_TOKENS') {
                Log::warning('Gemini response truncated (MAX_TOKENS)', ['model' => $this->model, 'maxTokens' => $maxTokens ?? $this->maxTokens]);

                return ['error' => 'The AI response was cut off. Please try again.'];
            }

            return ['text' => $text, 'provider' => 'gemini'];
        } catch (\Exception $e) {
            Log::warning('Gemini API exception', ['message' => $e->getMessage()]);

            return ['error' => 'Unable to reach AI service. Please try again later.'];
        }
    }
}
