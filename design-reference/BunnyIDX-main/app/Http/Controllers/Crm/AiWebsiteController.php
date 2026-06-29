<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\AgentWebsite;
use App\Services\Ai\WebsiteCopyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AiWebsiteController extends Controller implements HasMiddleware
{
    /** AI copy generation is a paid feature. */
    public static function middleware(): array
    {
        return [new Middleware('feature:ai')];
    }

    /**
     * Generate all content copy for a new website from a freeform description.
     */
    public function generateAll(Request $request, WebsiteCopyService $service): JsonResponse
    {
        $validated = $request->validate([
            'agent_name' => 'required|string|max:255',
            'agent_city' => 'nullable|string|max:255',
            'agent_state' => 'nullable|string|max:255',
            'agent_title' => 'nullable|string|max:255',
            'brokerage_name' => 'nullable|string|max:255',
            'template' => 'required|string|max:50',
            'description' => 'required|string|max:2000',
        ]);

        $result = $service->generateAllCopy($validated);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * Generate or rewrite a single content field for an existing website.
     */
    public function generateField(Request $request, AgentWebsite $agentWebsite, WebsiteCopyService $service): JsonResponse
    {
        $this->authorize($request, $agentWebsite);

        $validated = $request->validate([
            'field' => 'required|string|max:50',
            'current_value' => 'nullable|string|max:5000',
        ]);

        $context = [
            'agent_name' => $agentWebsite->agent_name,
            'agent_city' => $agentWebsite->agent_city,
            'template' => $agentWebsite->template,
            'current_value' => $validated['current_value'] ?? '',
        ];

        $result = $service->generateField($validated['field'], $context);

        if (isset($result['error'])) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    private function authorize(Request $request, AgentWebsite $website): void
    {
        $user = $request->user();
        abort_unless(
            $website->user_id === $user->id || ($user->team_id && $website->team_id === $user->team_id),
            403
        );
    }
}
