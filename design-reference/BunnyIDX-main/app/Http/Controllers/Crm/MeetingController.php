<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Meeting;
use App\Models\Task;
use App\Services\TimelineService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class MeetingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $scope = $request->scope ?? 'all';

        // Calendar month range
        $month = $request->input('month', now()->format('Y-m'));
        $startOfMonth = Carbon::parse($month . '-01')->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();

        // Extend range to cover full calendar grid (start of week to end of week)
        $calendarStart = $startOfMonth->copy()->startOfWeek(Carbon::SUNDAY);
        $calendarEnd = $endOfMonth->copy()->endOfWeek(Carbon::SATURDAY);

        // Use permission-aware scoping for meetings
        $meetingQuery = Meeting::withPermissions($user, 'calendar');
        if ($scope === 'own' && $user->isInTeamContext()) {
            $meetingQuery = Meeting::where('team_id', $user->team_id)->where('user_id', $user->id);
        }

        // All meetings in calendar range
        $meetings = $meetingQuery
            ->with(['contact:id,uuid,first_name,last_name', 'deal:id,title'])
            ->whereBetween('starts_at', [$calendarStart, $calendarEnd])
            ->orderBy('starts_at')
            ->get();

        // Use permission-aware scoping for tasks
        $taskQuery = Task::withPermissions($user, 'tasks');
        if ($scope === 'own' && $user->isInTeamContext()) {
            $taskQuery = Task::where('team_id', $user->team_id)->where('user_id', $user->id);
        }

        // All tasks with due dates in calendar range
        $tasks = $taskQuery
            ->with(['taskable'])
            ->where(function ($q) use ($calendarStart, $calendarEnd) {
                $q->whereBetween('due_at', [$calendarStart, $calendarEnd])
                    ->orWhereBetween('due_date', [$calendarStart->toDateString(), $calendarEnd->toDateString()]);
            })
            ->orderBy('due_at')
            ->get()
            ->map(function ($task) {
                $taskable = $task->taskable;
                $taskableLabel = null;
                if ($taskable) {
                    if ($task->taskable_type === 'App\\Models\\Contact') {
                        $taskableLabel = $taskable->first_name . ' ' . $taskable->last_name;
                    } else {
                        $taskableLabel = $taskable->title ?? $taskable->name ?? null;
                    }
                }

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'priority' => $task->priority,
                    'due_at' => $task->due_at?->toISOString(),
                    'due_date' => $task->due_date?->toDateString(),
                    'is_completed' => $task->is_completed,
                    'taskable_type' => $task->taskable_type,
                    'taskable_label' => $taskableLabel,
                ];
            });

        // Upcoming meetings for sidebar
        $upcomingQuery = Meeting::withPermissions($user, 'calendar');
        if ($scope === 'own' && $user->isInTeamContext()) {
            $upcomingQuery = Meeting::where('team_id', $user->team_id)->where('user_id', $user->id);
        }

        $upcomingMeetings = $upcomingQuery
            ->with(['contact:id,uuid,first_name,last_name', 'deal:id,title'])
            ->where('starts_at', '>=', now())
            ->where('is_completed', false)
            ->orderBy('starts_at')
            ->take(10)
            ->get();

        $contacts = Contact::forUser($user)->select('id', 'uuid', 'first_name', 'last_name')->get();
        $deals = Deal::forUser($user)->select('id', 'title')->get();

        // Calendar feeds (imported external calendars)
        $calendarFeeds = $user->calendarFeeds()->where('is_active', true)->get();

        // Determine if scope toggle should be shown
        $teamMember = $user->getTeamMember();
        $canSeeAllCalendar = $user->isInTeamContext() && $teamMember && $teamMember->canSeeAll('calendar');

        return Inertia::render('Crm/Calendar/Index', [
            'meetings' => $meetings,
            'tasks' => $tasks,
            'upcomingMeetings' => $upcomingMeetings,
            'contacts' => $contacts,
            'deals' => $deals,
            'calendarFeeds' => $calendarFeeds,
            'month' => $month,
            'scope' => $scope,
            'canSeeAllCalendar' => $canSeeAllCalendar,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'contact_id' => 'nullable|exists:contacts,id',
            'deal_id' => 'nullable|exists:deals,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'meeting_type' => 'required|in:in_person,phone,video,showing,open_house',
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'reminder_minutes' => 'nullable|integer|in:0,5,10,15,30,60,120,1440',
        ]);

        $meeting = $request->user()->meetings()->create($validated);

        TimelineService::log(
            user: $request->user(),
            eventType: 'meeting_scheduled',
            subject: "Meeting scheduled: {$meeting->title}",
            contact: $meeting->contact,
            deal: $meeting->deal,
            loggable: $meeting,
            metadata: [
                'meeting_type' => $validated['meeting_type'],
                'starts_at' => $validated['starts_at'],
            ],
        );

        if ($meeting->contact_id) {
            app(\App\Services\Ai\ContactInsightsService::class)->recordActivity($meeting->contact, 'meeting_created');
        }

        if ($meeting->deal_id) {
            $meeting->deal->touchActivity();
        }

        return back()->with('success', 'Meeting scheduled.');
    }

    public function update(Request $request, Meeting $meeting): RedirectResponse
    {
        $user = $request->user();
        abort_unless($meeting->user_id === $user->id || ($user->team_id && $meeting->team_id === $user->team_id), 403);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'meeting_type' => 'sometimes|required|in:in_person,phone,video,showing,open_house',
            'starts_at' => 'sometimes|required|date',
            'ends_at' => 'nullable|date',
            'outcome' => 'nullable|string|max:255',
            'reminder_minutes' => 'nullable|integer|in:0,5,10,15,30,60,120,1440',
        ]);

        // Reset reminder_sent_at when reminder_minutes or starts_at changes
        if (array_key_exists('reminder_minutes', $validated) || array_key_exists('starts_at', $validated)) {
            $validated['reminder_sent_at'] = null;
        }

        $meeting->update($validated);

        return back()->with('success', 'Meeting updated.');
    }

    public function destroy(Request $request, Meeting $meeting): RedirectResponse
    {
        $user = $request->user();
        abort_unless($meeting->user_id === $user->id || ($user->team_id && $meeting->team_id === $user->team_id), 403);

        $meeting->delete();

        return back()->with('success', 'Meeting deleted.');
    }

    public function toggleComplete(Request $request, Meeting $meeting): RedirectResponse
    {
        $user = $request->user();
        abort_unless($meeting->user_id === $user->id || ($user->team_id && $meeting->team_id === $user->team_id), 403);

        $meeting->update(['is_completed' => !$meeting->is_completed]);

        if ($meeting->is_completed) {
            TimelineService::log(
                user: $request->user(),
                eventType: 'meeting_completed',
                subject: "Meeting completed: {$meeting->title}",
                contact: $meeting->contact,
                deal: $meeting->deal,
                loggable: $meeting,
            );
        }

        return back()->with('success', $meeting->is_completed ? 'Meeting completed.' : 'Meeting reopened.');
    }

    /**
     * Export calendar as iCal (.ics) file.
     */
    public function exportIcal(Request $request): HttpResponse
    {
        $user = $request->user();

        $meetings = Meeting::forUser($user)
            ->with(['contact:id,first_name,last_name'])
            ->where('starts_at', '>=', now()->subMonths(3))
            ->orderBy('starts_at')
            ->get();

        $tasks = Task::forUser($user)
            ->where('is_completed', false)
            ->where(function ($q) {
                $q->whereNotNull('due_at')->orWhereNotNull('due_date');
            })
            ->orderBy('due_at')
            ->get();

        $ical = "BEGIN:VCALENDAR\r\n";
        $ical .= "VERSION:2.0\r\n";
        $ical .= "PRODID:-//BunnyChamp//CRM Calendar//EN\r\n";
        $ical .= "CALSCALE:GREGORIAN\r\n";
        $ical .= "METHOD:PUBLISH\r\n";
        $ical .= "X-WR-CALNAME:BunnyChamp CRM\r\n";

        foreach ($meetings as $meeting) {
            $ical .= "BEGIN:VEVENT\r\n";
            $ical .= 'UID:meeting-' . $meeting->id . "@bunnychamp\r\n";
            $ical .= 'DTSTART:' . $meeting->starts_at->format('Ymd\THis\Z') . "\r\n";
            if ($meeting->ends_at) {
                $ical .= 'DTEND:' . $meeting->ends_at->format('Ymd\THis\Z') . "\r\n";
            } else {
                $ical .= 'DTEND:' . $meeting->starts_at->addHour()->format('Ymd\THis\Z') . "\r\n";
            }
            $ical .= 'SUMMARY:' . $this->escapeIcal($meeting->title) . "\r\n";
            if ($meeting->location) {
                $ical .= 'LOCATION:' . $this->escapeIcal($meeting->location) . "\r\n";
            }
            if ($meeting->description) {
                $ical .= 'DESCRIPTION:' . $this->escapeIcal($meeting->description) . "\r\n";
            }
            if ($meeting->reminder_minutes) {
                $ical .= "BEGIN:VALARM\r\n";
                $ical .= "TRIGGER:-PT{$meeting->reminder_minutes}M\r\n";
                $ical .= "ACTION:DISPLAY\r\n";
                $ical .= 'DESCRIPTION:' . $this->escapeIcal($meeting->title) . "\r\n";
                $ical .= "END:VALARM\r\n";
            }
            $ical .= "END:VEVENT\r\n";
        }

        foreach ($tasks as $task) {
            $dueDate = $task->due_at ?? ($task->due_date ? Carbon::parse($task->due_date) : null);
            if (! $dueDate) {
                continue;
            }

            $ical .= "BEGIN:VTODO\r\n";
            $ical .= 'UID:task-' . $task->id . "@bunnychamp\r\n";
            $ical .= 'DUE:' . $dueDate->format('Ymd\THis\Z') . "\r\n";
            $ical .= 'SUMMARY:' . $this->escapeIcal($task->title) . "\r\n";
            $ical .= 'PRIORITY:' . $this->icalPriority($task->priority) . "\r\n";
            if ($task->is_completed) {
                $ical .= "STATUS:COMPLETED\r\n";
            } else {
                $ical .= "STATUS:NEEDS-ACTION\r\n";
            }
            $ical .= "END:VTODO\r\n";
        }

        $ical .= "END:VCALENDAR\r\n";

        $disposition = $request->query('download') ? 'attachment' : 'inline';

        return response($ical, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => $disposition . '; filename="bunnychamp-calendar.ics"',
        ]);
    }

    private function escapeIcal(string $text): string
    {
        return str_replace(["\n", "\r", ',', ';', '\\'], ['\\n', '', '\\,', '\\;', '\\\\'], $text);
    }

    private function icalPriority(string $priority): int
    {
        return match ($priority) {
            'urgent' => 1,
            'high' => 3,
            'normal' => 5,
            'low' => 9,
            default => 5,
        };
    }
}
