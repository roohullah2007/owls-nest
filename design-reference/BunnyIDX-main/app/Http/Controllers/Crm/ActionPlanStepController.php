<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\ActionPlan;
use App\Models\ActionPlanStep;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class ActionPlanStepController extends Controller implements HasMiddleware
{
    /** Action Plan steps belong to the paid Email feature (see ActionPlanController). */
    public static function middleware(): array
    {
        return [new Middleware('feature:email')];
    }

    public function store(Request $request, ActionPlan $actionPlan): RedirectResponse
    {
        $this->authorizePlan($request, $actionPlan);

        $data = $this->validateStep($request);

        $position = (int) ($actionPlan->steps()->max('position') ?? -1) + 1;

        $actionPlan->steps()->create([
            'user_id' => $actionPlan->user_id,
            'team_id' => $actionPlan->team_id,
            'position' => $position,
            'step_type' => $data['step_type'],
            'delay_amount' => $data['delay_amount'],
            'delay_unit' => $data['delay_unit'],
            'config' => $data['config'],
        ]);

        return back()->with('success', 'Step added.');
    }

    public function update(Request $request, ActionPlan $actionPlan, ActionPlanStep $step): RedirectResponse
    {
        $this->authorizePlan($request, $actionPlan);
        abort_unless($step->action_plan_id === $actionPlan->id, 404);

        $data = $this->validateStep($request);

        $step->update([
            'step_type' => $data['step_type'],
            'delay_amount' => $data['delay_amount'],
            'delay_unit' => $data['delay_unit'],
            'config' => $data['config'],
        ]);

        return back()->with('success', 'Step updated.');
    }

    public function destroy(Request $request, ActionPlan $actionPlan, ActionPlanStep $step): RedirectResponse
    {
        $this->authorizePlan($request, $actionPlan);
        abort_unless($step->action_plan_id === $actionPlan->id, 404);

        $step->delete();

        // Compact positions so ordering stays gapless.
        $actionPlan->steps()->orderBy('position')->get()->each(function ($s, $i) {
            if ($s->position !== $i) {
                $s->update(['position' => $i]);
            }
        });

        return back()->with('success', 'Step removed.');
    }

    /**
     * Persist a new step order from the drag-and-drop builder.
     */
    public function reorder(Request $request, ActionPlan $actionPlan): RedirectResponse
    {
        $this->authorizePlan($request, $actionPlan);

        $validated = $request->validate([
            'step_ids' => 'required|array',
            'step_ids.*' => 'integer',
        ]);

        $ownedIds = $actionPlan->steps()->pluck('id')->all();

        foreach ($validated['step_ids'] as $position => $stepId) {
            if (in_array($stepId, $ownedIds, true)) {
                ActionPlanStep::where('id', $stepId)->update(['position' => $position]);
            }
        }

        return back()->with('success', 'Steps reordered.');
    }

    /**
     * @return array{step_type:string, delay_amount:int, delay_unit:string, config:array}
     */
    private function validateStep(Request $request): array
    {
        $base = $request->validate([
            'step_type' => ['required', Rule::in(ActionPlanStep::STEP_TYPES)],
            'delay_amount' => 'required|integer|min:0|max:3650',
            'delay_unit' => ['required', Rule::in(ActionPlanStep::DELAY_UNITS)],
        ]);

        $config = match ($base['step_type']) {
            'email' => $request->validate([
                'config.subject' => 'required|string|max:255',
                'config.body_html' => 'required|string',
            ])['config'],
            'sms' => $request->validate([
                'config.body' => 'required|string|max:1600',
            ])['config'],
            'task' => $request->validate([
                'config.title' => 'required|string|max:255',
                'config.description' => 'nullable|string',
                'config.priority' => ['nullable', Rule::in(['low', 'normal', 'high', 'urgent'])],
                'config.due_offset_days' => 'nullable|integer|min:0|max:3650',
            ])['config'],
            default => [],
        };

        return [
            'step_type' => $base['step_type'],
            'delay_amount' => (int) $base['delay_amount'],
            'delay_unit' => $base['delay_unit'],
            'config' => $config,
        ];
    }

    private function authorizePlan(Request $request, ActionPlan $plan): void
    {
        $owned = ActionPlan::forUser($request->user())->whereKey($plan->id)->exists();

        abort_unless($owned, 404);
    }
}
