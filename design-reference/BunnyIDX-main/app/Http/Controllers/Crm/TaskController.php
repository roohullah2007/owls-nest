<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Task;
use App\Notifications\TaskAssignedNotification;
use App\Services\TimelineService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filter = $request->filter ?? 'upcoming';
        $scope = $request->scope ?? 'all';

        // Use permission-aware scoping
        $baseScope = fn () => Task::withPermissions($user, 'tasks');

        // If user explicitly wants own tasks only
        if ($scope === 'own' && $user->isInTeamContext()) {
            $baseScope = fn () => Task::where('team_id', $user->team_id)->where('user_id', $user->id);
        }

        $query = $baseScope()->with(['taskable']);

        $tasks = match ($filter) {
            'today' => $query->incomplete()
                ->where(fn ($q) => $q->whereDate('due_at', today())->orWhere('due_date', today()))
                ->orderBy('due_at')
                ->get(),
            'overdue' => $query->overdue()->orderBy('due_at')->get(),
            'completed' => $query->where('is_completed', true)->latest('completed_at')->paginate(25)->withQueryString(),
            default => $query->upcoming()->take(50)->get(),
        };

        $counts = [
            'today' => $baseScope()->incomplete()
                ->where(fn ($q) => $q->whereDate('due_at', today())->orWhere('due_date', today()))
                ->count(),
            'upcoming' => $baseScope()->upcoming()->count(),
            'overdue' => $baseScope()->overdue()->count(),
            'completed' => $baseScope()->where('is_completed', true)->count(),
        ];

        $contacts = Contact::forUser($user)->select('id', 'uuid', 'first_name', 'last_name')->get();
        $deals = Deal::forUser($user)->select('id', 'title')->get();

        // Determine if scope toggle should be shown
        $teamMember = $user->getTeamMember();
        $canSeeAllTasks = $user->isInTeamContext() && $teamMember && $teamMember->canSeeAll('tasks');

        return Inertia::render('Crm/Tasks/Index', [
            'tasks' => $tasks,
            'filter' => $filter,
            'counts' => $counts,
            'contacts' => $contacts,
            'deals' => $deals,
            'scope' => $scope,
            'canSeeAllTasks' => $canSeeAllTasks,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:low,normal,high,urgent',
            'due_at' => 'nullable|date',
            'due_date' => 'nullable|date',
            'reminder_at' => 'nullable|date',
            'taskable_type' => 'nullable|in:contact,deal,listing',
            'taskable_id' => 'nullable|integer',
        ]);

        $morphMap = [
            'contact' => \App\Models\Contact::class,
            'deal' => \App\Models\Deal::class,
            'listing' => \App\Models\Listing::class,
        ];

        if (!empty($validated['taskable_type']) && !empty($validated['taskable_id'])) {
            $taskableClass = $morphMap[$validated['taskable_type']];
            $taskableClass::where('user_id', $request->user()->id)->findOrFail($validated['taskable_id']);
            $validated['taskable_type'] = $taskableClass;
        } else {
            unset($validated['taskable_type'], $validated['taskable_id']);
        }

        $task = $request->user()->tasks()->create($validated);

        TimelineService::log(
            user: $request->user(),
            eventType: 'task_created',
            subject: "Task created: {$task->title}",
            loggable: $task,
        );

        // Notify team members
        $user = $request->user();
        if ($user->team_id) {
            $teamMembers = \App\Models\User::where('team_id', $user->team_id)
                ->where('id', '!=', $user->id)
                ->get();
            foreach ($teamMembers as $member) {
                $member->notify(new TaskAssignedNotification($task, $user));
            }
        }

        return back()->with('success', 'Task created.');
    }

    public function update(Request $request, Task $task): RedirectResponse
    {
        $user = $request->user();
        abort_unless($task->user_id === $user->id || ($user->team_id && $task->team_id === $user->team_id), 403);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'sometimes|required|in:low,normal,high,urgent',
            'due_at' => 'nullable|date',
            'due_date' => 'nullable|date',
            'reminder_at' => 'nullable|date',
        ]);

        // Reset reminder_sent_at when reminder_at changes
        if (array_key_exists('reminder_at', $validated) && $validated['reminder_at'] !== $task->reminder_at?->toDateTimeString()) {
            $validated['reminder_sent_at'] = null;
        }

        $task->update($validated);

        return back()->with('success', 'Task updated.');
    }

    public function destroy(Request $request, Task $task): RedirectResponse
    {
        $user = $request->user();
        abort_unless($task->user_id === $user->id || ($user->team_id && $task->team_id === $user->team_id), 403);

        $task->delete();

        return back()->with('success', 'Task deleted.');
    }

    public function toggleComplete(Request $request, Task $task): RedirectResponse
    {
        $user = $request->user();
        abort_unless($task->user_id === $user->id || ($user->team_id && $task->team_id === $user->team_id), 403);

        $task->update([
            'is_completed' => !$task->is_completed,
            'completed_at' => !$task->is_completed ? now() : null,
        ]);

        if ($task->is_completed) {
            TimelineService::log(
                user: $request->user(),
                eventType: 'task_completed',
                subject: "Task completed: {$task->title}",
                loggable: $task,
            );
        }

        return back()->with('success', $task->is_completed ? 'Task completed.' : 'Task reopened.');
    }
}
