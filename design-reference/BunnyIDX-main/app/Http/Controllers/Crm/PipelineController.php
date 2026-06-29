<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PipelineController extends Controller
{
    public function index(Request $request): Response
    {
        $pipelines = Pipeline::forUser($request->user())
            ->with('stages')
            ->orderBy('position')
            ->get();

        return Inertia::render('Crm/Pipelines/Index', [
            'pipelines' => $pipelines,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'lead_type' => 'nullable|string|max:50',
        ]);

        $user = $request->user();
        $leadType = $validated['lead_type'] ?? null;

        // One pipeline per lead type
        if ($leadType && Pipeline::forUser($user)->where('lead_type', $leadType)->exists()) {
            return back()->withErrors(['lead_type' => 'A pipeline already exists for this lead type.']);
        }

        $maxPosition = Pipeline::forUser($user)->max('position') ?? -1;

        $pipeline = $user->pipelines()->create([
            'name' => $validated['name'],
            'lead_type' => $leadType,
            'position' => $maxPosition + 1,
            'is_default' => !Pipeline::forUser($user)->exists(),
        ]);

        // Create default stages for the lead type (or fallback)
        $stages = \App\Services\PipelineService::getDefaultStagesForLeadType($leadType);
        $pipeline->stages()->createMany($stages);

        return back()->with('success', 'Pipeline created.');
    }

    public function update(Request $request, Pipeline $pipeline): RedirectResponse
    {
        $this->authorize($request, $pipeline);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'is_default' => 'sometimes|boolean',
        ]);

        if (!empty($validated['is_default'])) {
            Pipeline::forUser($request->user())->where('id', '!=', $pipeline->id)->update(['is_default' => false]);
        }

        $pipeline->update($validated);

        return back()->with('success', 'Pipeline updated.');
    }

    public function destroy(Request $request, Pipeline $pipeline): RedirectResponse
    {
        $this->authorize($request, $pipeline);

        if ($pipeline->deals()->exists()) {
            return back()->withErrors(['pipeline' => 'Cannot delete a pipeline with existing deals.']);
        }

        $pipeline->delete();

        return back()->with('success', 'Pipeline deleted.');
    }

    public function storeStage(Request $request, Pipeline $pipeline): RedirectResponse
    {
        $this->authorize($request, $pipeline);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:open,won,lost',
            'color' => 'nullable|string|max:7',
        ]);

        $maxPosition = $pipeline->stages()->max('position') ?? -1;
        $validated['position'] = $maxPosition + 1;

        $pipeline->stages()->create($validated);

        return back()->with('success', 'Stage added.');
    }

    public function updateStage(Request $request, Pipeline $pipeline, PipelineStage $stage): RedirectResponse
    {
        $this->authorize($request, $pipeline);
        abort_unless($stage->pipeline_id === $pipeline->id, 404);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:7',
        ]);

        $stage->update($validated);

        return back()->with('success', 'Stage updated.');
    }

    public function destroyStage(Request $request, Pipeline $pipeline, PipelineStage $stage): RedirectResponse
    {
        $this->authorize($request, $pipeline);
        abort_unless($stage->pipeline_id === $pipeline->id, 404);

        if ($stage->deals()->exists()) {
            return back()->withErrors(['stage' => 'Cannot delete a stage with existing deals.']);
        }

        $stage->delete();

        return back()->with('success', 'Stage deleted.');
    }

    public function reorderStages(Request $request, Pipeline $pipeline): RedirectResponse
    {
        $this->authorize($request, $pipeline);

        $validated = $request->validate([
            'stages' => 'required|array',
            'stages.*.id' => 'required|exists:pipeline_stages,id',
            'stages.*.position' => 'required|integer|min:0',
        ]);

        foreach ($validated['stages'] as $stageData) {
            PipelineStage::where('id', $stageData['id'])
                ->where('pipeline_id', $pipeline->id)
                ->update(['position' => $stageData['position']]);
        }

        return back()->with('success', 'Stages reordered.');
    }

    private function authorize(Request $request, Pipeline $pipeline): void
    {
        $user = $request->user();
        abort_unless($pipeline->user_id === $user->id || ($user->team_id && $pipeline->team_id === $user->team_id), 403);
    }
}
