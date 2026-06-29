<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Models\CallLog;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\EmailLog;
use App\Models\Meeting;
use App\Models\Note;
use App\Models\Pipeline;
use App\Models\SmsLog;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Computes the metrics powering the CRM Reports screen.
 *
 * Scoping mirrors the rest of the CRM: when the user is in team context we
 * report across the whole team (optionally narrowed to a single agent), and in
 * personal context we report on the user's own records only. All queries flow
 * through the `forUser` scope from BelongsToTeamOrUser, with an optional
 * `user_id` narrowing for the agent filter — never a raw team_id assumption.
 *
 * Time-series are bucketed in PHP (not via DB date functions) so the same code
 * runs identically on SQLite (tests) and MySQL (prod).
 */
class ReportService
{
    private CarbonImmutable $start;

    private CarbonImmutable $end;

    /** Previous comparison window of equal length, immediately before {@see $start}. */
    private CarbonImmutable $prevStart;

    private CarbonImmutable $prevEnd;

    /** 'day' | 'week' | 'month' — bucket size for trend charts. */
    private string $granularity;

    public function __construct(
        private readonly User $user,
        CarbonInterface $start,
        CarbonInterface $end,
        private readonly ?int $agentId = null,
    ) {
        $this->start = CarbonImmutable::instance($start)->startOfDay();
        $this->end = CarbonImmutable::instance($end)->endOfDay();

        $lengthInDays = $this->start->diffInDays($this->end) + 1;
        $this->prevEnd = $this->start->subSecond();
        $this->prevStart = $this->start->subDays($lengthInDays);

        $days = $lengthInDays;
        $this->granularity = $days <= 31 ? 'day' : ($days <= 184 ? 'week' : 'month');
    }

    public function granularity(): string
    {
        return $this->granularity;
    }

    /**
     * The full report payload for the active filters.
     *
     * @return array<string, mixed>
     */
    public function build(): array
    {
        return [
            'summary' => $this->summary(),
            'trends' => $this->trends(),
            'leads' => $this->leadBreakdowns(),
            'pipeline' => $this->pipeline(),
            'conversion' => $this->conversionFunnel(),
            'activity' => $this->activityTotals(),
            'calls' => $this->calls(),
            'leaderboard' => $this->leaderboard(),
        ];
    }

    // ---------------------------------------------------------------------
    // Scoped base queries
    // ---------------------------------------------------------------------

    /**
     * Base query for a tenant-scoped model, narrowed to the agent filter when set.
     *
     * @param  class-string<Model>  $model
     */
    private function scoped(string $model): Builder
    {
        /** @var Builder $query */
        $query = $model::query()->forUser($this->user);

        if ($this->agentId !== null && $this->user->isInTeamContext()) {
            $query->where('user_id', $this->agentId);
        }

        return $query;
    }

    private function inRange(Builder $query, string $column = 'created_at'): Builder
    {
        return $query->whereBetween($column, [$this->start, $this->end]);
    }

    // ---------------------------------------------------------------------
    // Summary KPIs
    // ---------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function summary(): array
    {
        $newLeads = $this->inRange($this->scoped(Contact::class))->count();
        $newLeadsPrev = $this->scoped(Contact::class)
            ->whereBetween('created_at', [$this->prevStart, $this->prevEnd])->count();

        $activeDeals = $this->scoped(Deal::class)->whereNull('won_at')->whereNull('lost_at')->count();
        $activePipelineValue = (float) $this->scoped(Deal::class)
            ->whereNull('won_at')->whereNull('lost_at')->sum('value');

        // Won/lost are attributed to the period in which they closed (won_at/lost_at).
        $wonInRange = $this->scoped(Deal::class)->whereBetween('won_at', [$this->start, $this->end]);
        $dealsWon = (clone $wonInRange)->count();
        $wonVolume = (float) (clone $wonInRange)->sum('value');
        $gci = (float) (clone $wonInRange)->sum('commission_amount');

        $wonPrev = (float) $this->scoped(Deal::class)
            ->whereBetween('won_at', [$this->prevStart, $this->prevEnd])->sum('value');

        $lostInRange = $this->scoped(Deal::class)
            ->whereBetween('lost_at', [$this->start, $this->end])->count();

        $closed = $dealsWon + $lostInRange;
        $winRate = $closed > 0 ? round($dealsWon / $closed * 100, 1) : null;

        $avgDealValue = $dealsWon > 0 ? round($wonVolume / $dealsWon) : 0;

        // Average days-to-close for deals won in range (created_at -> won_at).
        $avgDaysToClose = null;
        $wonDeals = (clone $wonInRange)->get(['created_at', 'won_at']);
        if ($wonDeals->isNotEmpty()) {
            $totalDays = $wonDeals->sum(
                fn ($d) => $d->created_at && $d->won_at
                    ? abs(CarbonImmutable::instance($d->created_at)->diffInDays($d->won_at))
                    : 0
            );
            $avgDaysToClose = (int) round($totalDays / $wonDeals->count());
        }

        $calls = $this->inRange($this->scoped(CallLog::class))->count();
        $emails = $this->inRange($this->scoped(EmailLog::class))->count();
        $texts = $this->inRange($this->scoped(SmsLog::class))->count();
        $notes = $this->inRange($this->scoped(Note::class))->count();
        $tasksCompleted = $this->scoped(Task::class)
            ->whereBetween('completed_at', [$this->start, $this->end])->count();
        $meetings = $this->inRange($this->scoped(Meeting::class))->count();

        return [
            'new_leads' => $newLeads,
            'new_leads_prev' => $newLeadsPrev,
            'active_deals' => $activeDeals,
            'active_pipeline_value' => $activePipelineValue,
            'deals_won' => $dealsWon,
            'won_volume' => $wonVolume,
            'won_volume_prev' => $wonPrev,
            'gci' => $gci,
            'win_rate' => $winRate,
            'deals_lost' => $lostInRange,
            'avg_deal_value' => $avgDealValue,
            'avg_days_to_close' => $avgDaysToClose,
            'activities' => $calls + $emails + $texts + $notes + $tasksCompleted + $meetings,
            'calls' => $calls,
            'emails' => $emails,
            'texts' => $texts,
            'meetings' => $meetings,
        ];
    }

    // ---------------------------------------------------------------------
    // Trends (time-series)
    // ---------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function trends(): array
    {
        $buckets = $this->buckets();

        $leadDates = $this->inRange($this->scoped(Contact::class))->pluck('created_at');
        $wonDeals = $this->scoped(Deal::class)
            ->whereBetween('won_at', [$this->start, $this->end])
            ->get(['won_at', 'value']);

        $leads = $this->bucketCounts($buckets, $leadDates);
        $wonCount = $this->bucketCounts($buckets, $wonDeals->pluck('won_at'));
        $wonValue = $this->bucketSums($buckets, $wonDeals, 'won_at', 'value');

        // Activity series — one stacked row per bucket.
        $calls = $this->bucketCounts($buckets, $this->inRange($this->scoped(CallLog::class))->pluck('created_at'));
        $emails = $this->bucketCounts($buckets, $this->inRange($this->scoped(EmailLog::class))->pluck('created_at'));
        $texts = $this->bucketCounts($buckets, $this->inRange($this->scoped(SmsLog::class))->pluck('created_at'));
        $notes = $this->bucketCounts($buckets, $this->inRange($this->scoped(Note::class))->pluck('created_at'));
        $meetings = $this->bucketCounts($buckets, $this->inRange($this->scoped(Meeting::class))->pluck('created_at'));

        $labels = array_map(fn ($b) => $b['label'], $buckets);

        $activity = [];
        foreach ($buckets as $i => $b) {
            $activity[] = [
                'label' => $b['label'],
                'calls' => $calls[$i],
                'emails' => $emails[$i],
                'texts' => $texts[$i],
                'notes' => $notes[$i],
                'meetings' => $meetings[$i],
            ];
        }

        return [
            'labels' => $labels,
            'leads' => $this->series($labels, $leads),
            'won_count' => $this->series($labels, $wonCount),
            'won_value' => $this->series($labels, $wonValue),
            'activity' => $activity,
        ];
    }

    // ---------------------------------------------------------------------
    // Lead breakdowns
    // ---------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function leadBreakdowns(): array
    {
        $bySource = $this->inRange($this->scoped(Contact::class))
            ->selectRaw('source, count(*) as aggregate')
            ->groupBy('source')->pluck('aggregate', 'source');

        $byStatus = $this->inRange($this->scoped(Contact::class))
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')->pluck('aggregate', 'status');

        $byType = $this->inRange($this->scoped(Contact::class))
            ->selectRaw('type, count(*) as aggregate')
            ->groupBy('type')->pluck('aggregate', 'type');

        return [
            'by_source' => $this->labelledBreakdown($bySource),
            'by_status' => $this->labelledBreakdown($byStatus),
            'by_type' => $this->labelledBreakdown($byType),
        ];
    }

    // ---------------------------------------------------------------------
    // Pipeline
    // ---------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function pipeline(): array
    {
        // Open-stage breakdown per pipeline (current snapshot — like the dashboard).
        $pipelineQuery = Pipeline::query()->forUser($this->user);
        $pipelines = $pipelineQuery
            ->with(['stages' => fn ($q) => $q->where('type', 'open')
                ->withCount(['deals' => fn ($d) => $this->applyAgent($d)])
                ->withSum(['deals as deals_sum_value' => fn ($d) => $this->applyAgent($d)], 'value')
                ->orderBy('position')])
            ->orderBy('position')
            ->get()
            ->map(fn ($pipeline) => [
                'id' => $pipeline->id,
                'name' => $pipeline->name,
                'stages' => $pipeline->stages->map(fn ($stage) => [
                    'id' => $stage->id,
                    'name' => $stage->name,
                    'color' => $stage->color,
                    'count' => (int) $stage->deals_count,
                    'value' => (float) ($stage->deals_sum_value ?? 0),
                ])->values(),
            ])->values();

        // Projected income: open deals grouped by expected close month.
        $openDeals = $this->scoped(Deal::class)
            ->whereNull('won_at')->whereNull('lost_at')
            ->whereNotNull('expected_close_date')
            ->get(['expected_close_date', 'value']);

        $projected = [];
        foreach ($openDeals as $deal) {
            $month = CarbonImmutable::instance($deal->expected_close_date)->format('Y-m');
            $projected[$month] = ($projected[$month] ?? 0) + (float) $deal->value;
        }
        ksort($projected);
        $projectedSeries = [];
        foreach ($projected as $month => $value) {
            $projectedSeries[] = [
                'label' => CarbonImmutable::createFromFormat('Y-m', $month)->format('M Y'),
                'value' => $value,
            ];
        }

        // Deals by type (won in range).
        $byType = $this->scoped(Deal::class)
            ->whereBetween('won_at', [$this->start, $this->end])
            ->selectRaw('type, count(*) as aggregate, sum(value) as total')
            ->groupBy('type')->get()
            ->map(fn ($r) => [
                'key' => $r->type,
                'label' => $this->humanize($r->type),
                'count' => (int) $r->aggregate,
                'value' => (float) $r->total,
            ])->values();

        return [
            'pipelines' => $pipelines,
            'projected' => $projectedSeries,
            'won_by_type' => $byType,
        ];
    }

    // ---------------------------------------------------------------------
    // Conversion funnel
    // ---------------------------------------------------------------------

    /**
     * A coarse lead-to-close funnel for leads created in the range. Stages are
     * honest counts (not forced monotonic): new leads, those that have been
     * contacted, those that became a deal, and those whose deal was won.
     *
     * @return array<int, array<string, mixed>>
     */
    private function conversionFunnel(): array
    {
        $leads = $this->inRange($this->scoped(Contact::class));
        $total = (clone $leads)->count();
        $contacted = (clone $leads)->whereNotNull('last_contacted_at')->count();

        $dealsCreated = $this->inRange($this->scoped(Deal::class))->count();
        $dealsWon = $this->scoped(Deal::class)
            ->whereBetween('won_at', [$this->start, $this->end])->count();

        return [
            ['key' => 'leads', 'label' => 'New Leads', 'value' => $total],
            ['key' => 'contacted', 'label' => 'Contacted', 'value' => $contacted],
            ['key' => 'deals', 'label' => 'Deals Created', 'value' => $dealsCreated],
            ['key' => 'won', 'label' => 'Deals Won', 'value' => $dealsWon],
        ];
    }

    // ---------------------------------------------------------------------
    // Activity totals + outcome breakdowns
    // ---------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function activityTotals(): array
    {
        $callOutcomes = $this->inRange($this->scoped(CallLog::class))
            ->selectRaw('outcome, count(*) as aggregate')
            ->groupBy('outcome')->pluck('aggregate', 'outcome');

        $callDirection = $this->inRange($this->scoped(CallLog::class))
            ->selectRaw('direction, count(*) as aggregate')
            ->groupBy('direction')->pluck('aggregate', 'direction');

        return [
            'totals' => [
                'calls' => $this->inRange($this->scoped(CallLog::class))->count(),
                'emails' => $this->inRange($this->scoped(EmailLog::class))->count(),
                'texts' => $this->inRange($this->scoped(SmsLog::class))->count(),
                'notes' => $this->inRange($this->scoped(Note::class))->count(),
                'meetings' => $this->inRange($this->scoped(Meeting::class))->count(),
                'tasks_completed' => $this->scoped(Task::class)
                    ->whereBetween('completed_at', [$this->start, $this->end])->count(),
            ],
            'call_outcomes' => $this->labelledBreakdown($callOutcomes),
            'call_direction' => $this->labelledBreakdown($callDirection),
            'connected_rate' => $this->connectedRate($callOutcomes),
        ];
    }

    private function connectedRate(Collection $outcomes): ?float
    {
        $total = $outcomes->sum();
        if ($total === 0) {
            return null;
        }

        return round(($outcomes['connected'] ?? 0) / $total * 100, 1);
    }

    // ---------------------------------------------------------------------
    // Calling analytics
    // ---------------------------------------------------------------------

    /**
     * Telephony report: volume, connect rate, talk time, direction mix, hourly
     * distribution and a per-agent breakdown (team context).
     *
     * @return array<string, mixed>
     */
    private function calls(): array
    {
        $rows = $this->inRange($this->scoped(CallLog::class))
            ->get(['user_id', 'direction', 'outcome', 'duration_seconds', 'started_at', 'created_at']);

        $total = $rows->count();
        $connected = $rows->where('outcome', 'connected');
        $connectedCount = $connected->count();
        $talkTime = (int) $rows->sum(fn ($r) => (int) $r->duration_seconds);
        $connectedTalk = (int) $connected->sum(fn ($r) => (int) $r->duration_seconds);

        // Volume over time, split inbound vs outbound.
        $buckets = $this->buckets();
        $inbound = $this->bucketCounts($buckets, $rows->where('direction', 'inbound')->pluck('created_at'));
        $outbound = $this->bucketCounts($buckets, $rows->where('direction', 'outbound')->pluck('created_at'));
        $trend = [];
        foreach ($buckets as $i => $b) {
            $trend[] = ['label' => $b['label'], 'inbound' => $inbound[$i], 'outbound' => $outbound[$i]];
        }

        // Distribution across hour-of-day (busiest calling times). started_at
        // falls back to created_at; bucketed in PHP to stay DB-portable.
        $byHour = array_fill(0, 24, 0);
        foreach ($rows as $r) {
            $when = $r->started_at ?? $r->created_at;
            if ($when) {
                $byHour[(int) CarbonImmutable::instance($when)->format('G')]++;
            }
        }

        return [
            'summary' => [
                'total' => $total,
                'connected' => $connectedCount,
                'connect_rate' => $total > 0 ? round($connectedCount / $total * 100, 1) : null,
                'talk_time_seconds' => $talkTime,
                'avg_duration_seconds' => $connectedCount > 0 ? (int) round($connectedTalk / $connectedCount) : 0,
                'outbound' => $rows->where('direction', 'outbound')->count(),
                'inbound' => $rows->where('direction', 'inbound')->count(),
                'voicemails' => $rows->where('outcome', 'left_voicemail')->count(),
                'no_answer' => $rows->where('outcome', 'no_answer')->count(),
            ],
            'trend' => $trend,
            'by_hour' => array_values($byHour),
            'outcomes' => $this->labelledBreakdown(
                $rows->groupBy('outcome')->map->count()
            ),
            'direction' => $this->labelledBreakdown(
                $rows->groupBy('direction')->map->count()
            ),
            'by_agent' => $this->callsByAgent($rows),
        ];
    }

    /**
     * Per-agent calling rollup, used in the Calls tab (team context only).
     *
     * @param  Collection<int, Model>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function callsByAgent(Collection $rows): array
    {
        if (! $this->user->isInTeamContext() || ! $this->user->team_id) {
            return [];
        }

        $names = $this->user->team->members()
            ->where('is_active', true)
            ->with('user:id,name')
            ->get()
            ->filter(fn ($m) => $m->user !== null)
            ->pluck('user.name', 'user_id');

        return $rows->groupBy('user_id')
            ->map(function ($group, $uid) use ($names) {
                $calls = $group->count();
                $connected = $group->where('outcome', 'connected')->count();

                return [
                    'id' => (int) $uid,
                    'name' => $names[$uid] ?? 'Unknown',
                    'calls' => $calls,
                    'connected' => $connected,
                    'connect_rate' => $calls > 0 ? round($connected / $calls * 100, 1) : null,
                    'talk_time_seconds' => (int) $group->sum(fn ($r) => (int) $r->duration_seconds),
                ];
            })
            ->sortByDesc('calls')
            ->values()
            ->all();
    }

    // ---------------------------------------------------------------------
    // Agent leaderboard (team context only)
    // ---------------------------------------------------------------------

    /** @return array<int, array<string, mixed>> */
    private function leaderboard(): array
    {
        if (! $this->user->isInTeamContext() || ! $this->user->team_id) {
            return [];
        }

        $members = $this->user->team->members()
            ->where('is_active', true)
            ->with('user:id,name,email,avatar')
            ->get()
            ->filter(fn ($m) => $m->user !== null);

        // Pre-aggregate per user_id so we run a handful of grouped queries
        // instead of N queries per member.
        $leads = $this->groupByUser(Contact::class, 'created_at');
        $emailsByUser = $this->groupByUser(EmailLog::class, 'created_at');
        $textsByUser = $this->groupByUser(SmsLog::class, 'created_at');
        $meetingsByUser = $this->groupByUser(Meeting::class, 'created_at');

        // Calls carry talk time + connect rate, so they need a richer rollup
        // than a plain count. CASE-WHEN with a binding is SQLite/MySQL-portable.
        $callsByUser = CallLog::query()->forUser($this->user)
            ->whereBetween('created_at', [$this->start, $this->end])
            ->selectRaw(
                'user_id, count(*) as calls, sum(duration_seconds) as talk_time, '
                .'sum(case when outcome = ? then 1 else 0 end) as connected',
                ['connected']
            )
            ->groupBy('user_id')->get()->keyBy('user_id');

        $wonByUser = Deal::query()->forUser($this->user)
            ->whereBetween('won_at', [$this->start, $this->end])
            ->selectRaw('user_id, count(*) as deals_won, sum(value) as volume, sum(commission_amount) as gci')
            ->groupBy('user_id')->get()->keyBy('user_id');

        $rows = $members->map(function ($member) use ($leads, $callsByUser, $emailsByUser, $textsByUser, $meetingsByUser, $wonByUser) {
            $uid = $member->user_id;
            $callStat = $callsByUser[$uid] ?? null;
            $calls = (int) ($callStat->calls ?? 0);
            $connected = (int) ($callStat->connected ?? 0);
            $emails = (int) ($emailsByUser[$uid] ?? 0);
            $texts = (int) ($textsByUser[$uid] ?? 0);
            $meetings = (int) ($meetingsByUser[$uid] ?? 0);
            $won = $wonByUser[$uid] ?? null;

            return [
                'id' => $uid,
                'name' => $member->user->name,
                'email' => $member->user->email,
                'avatar' => $member->user->avatar,
                'role' => $member->role,
                'leads' => (int) ($leads[$uid] ?? 0),
                'calls' => $calls,
                'talk_time_seconds' => (int) ($callStat->talk_time ?? 0),
                'connect_rate' => $calls > 0 ? round($connected / $calls * 100, 1) : null,
                'emails' => $emails,
                'texts' => $texts,
                'meetings' => $meetings,
                'activities' => $calls + $emails + $texts + $meetings,
                'deals_won' => (int) ($won->deals_won ?? 0),
                'volume' => (float) ($won->volume ?? 0),
                'gci' => (float) ($won->gci ?? 0),
            ];
        });

        return $rows->sortByDesc('volume')->values()->all();
    }

    /**
     * @param  class-string<Model>  $model
     * @return Collection<int, int> keyed by user_id
     */
    private function groupByUser(string $model, string $dateColumn): Collection
    {
        return $model::query()->forUser($this->user)
            ->whereBetween($dateColumn, [$this->start, $this->end])
            ->selectRaw('user_id, count(*) as aggregate')
            ->groupBy('user_id')
            ->pluck('aggregate', 'user_id');
    }

    // ---------------------------------------------------------------------
    // Bucketing helpers
    // ---------------------------------------------------------------------

    /**
     * Ordered list of time buckets spanning the active range.
     *
     * @return array<int, array{key: string, label: string, start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function buckets(): array
    {
        $buckets = [];
        $cursor = match ($this->granularity) {
            'day' => $this->start->startOfDay(),
            'week' => $this->start->startOfWeek(),
            default => $this->start->startOfMonth(),
        };

        while ($cursor <= $this->end) {
            [$bucketEnd, $next, $label] = match ($this->granularity) {
                'day' => [$cursor->endOfDay(), $cursor->addDay(), $cursor->format('M j')],
                'week' => [$cursor->endOfWeek(), $cursor->addWeek(), $cursor->format('M j')],
                default => [$cursor->endOfMonth(), $cursor->addMonth(), $cursor->format('M Y')],
            };

            $buckets[] = [
                'key' => $cursor->format('Y-m-d'),
                'label' => $label,
                'start' => $cursor,
                'end' => $bucketEnd,
            ];
            $cursor = $next;
        }

        return $buckets;
    }

    /**
     * @param  array<int, array{start: CarbonImmutable, end: CarbonImmutable}>  $buckets
     * @param  Collection<int, mixed>  $dates  Carbon timestamps
     * @return array<int, int>
     */
    private function bucketCounts(array $buckets, Collection $dates): array
    {
        $counts = array_fill(0, count($buckets), 0);
        foreach ($dates as $date) {
            if ($date === null) {
                continue;
            }
            $i = $this->bucketIndex($buckets, CarbonImmutable::instance($date));
            if ($i !== null) {
                $counts[$i]++;
            }
        }

        return $counts;
    }

    /**
     * @param  array<int, array{start: CarbonImmutable, end: CarbonImmutable}>  $buckets
     * @param  Collection<int, Model>  $rows
     * @return array<int, float>
     */
    private function bucketSums(array $buckets, Collection $rows, string $dateColumn, string $valueColumn): array
    {
        $sums = array_fill(0, count($buckets), 0.0);
        foreach ($rows as $row) {
            $date = $row->{$dateColumn};
            if ($date === null) {
                continue;
            }
            $i = $this->bucketIndex($buckets, CarbonImmutable::instance($date));
            if ($i !== null) {
                $sums[$i] += (float) $row->{$valueColumn};
            }
        }

        return $sums;
    }

    /**
     * @param  array<int, array{start: CarbonImmutable, end: CarbonImmutable}>  $buckets
     */
    private function bucketIndex(array $buckets, CarbonImmutable $date): ?int
    {
        foreach ($buckets as $i => $bucket) {
            if ($date >= $bucket['start'] && $date <= $bucket['end']) {
                return $i;
            }
        }

        return null;
    }

    /**
     * @param  array<int, string>  $labels
     * @param  array<int, int|float>  $values
     * @return array<int, array{label: string, value: int|float}>
     */
    private function series(array $labels, array $values): array
    {
        $out = [];
        foreach ($labels as $i => $label) {
            $out[] = ['label' => $label, 'value' => $values[$i] ?? 0];
        }

        return $out;
    }

    // ---------------------------------------------------------------------
    // Misc helpers
    // ---------------------------------------------------------------------

    private function applyAgent(Builder $query): Builder
    {
        if ($this->agentId !== null && $this->user->isInTeamContext()) {
            $query->where('user_id', $this->agentId);
        }

        return $query;
    }

    /**
     * @param  Collection<string, int>  $counts  keyed by raw value
     * @return array<int, array{key: string, label: string, value: int}>
     */
    private function labelledBreakdown(Collection $counts): array
    {
        return $counts
            ->map(fn ($value, $key) => [
                'key' => (string) $key,
                'label' => $this->humanize((string) $key),
                'value' => (int) $value,
            ])
            ->sortByDesc('value')
            ->values()
            ->all();
    }

    private function humanize(?string $value): string
    {
        if ($value === null || $value === '') {
            return 'Unspecified';
        }

        return ucwords(str_replace(['_', '-'], ' ', $value));
    }
}
