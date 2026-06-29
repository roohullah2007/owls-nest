<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Services\Reports\ReportService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportsController extends Controller
{
    /** Supported preset ranges, in display order. */
    private const RANGES = ['7d', '30d', '90d', 'mtd', 'qtd', 'ytd', '12m', 'custom'];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $inTeamContext = $user->isInTeamContext() && $user->team_id !== null;

        $range = in_array($request->query('range'), self::RANGES, true)
            ? $request->query('range')
            : '30d';

        [$start, $end] = $this->resolveRange($range, $request);

        // The per-agent filter is a Team-plan feature, and only meaningful in
        // team context. Non-entitled users always see their own data only.
        $agents = [];
        $agentId = null;
        if ($inTeamContext && $user->canUseTeamFeatures()) {
            $agents = $user->team->members()
                ->where('is_active', true)
                ->with('user:id,name')
                ->get()
                ->filter(fn ($m) => $m->user !== null)
                ->map(fn ($m) => ['id' => $m->user_id, 'name' => $m->user->name])
                ->sortBy('name')
                ->values();

            $requested = $request->integer('agent');
            if ($requested && $agents->contains(fn ($a) => $a['id'] === $requested)) {
                $agentId = $requested;
            }
        }

        $service = new ReportService($user, $start, $end, $agentId);

        return Inertia::render('Crm/Reports/Index', [
            'report' => $service->build(),
            'filters' => [
                'range' => $range,
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'agent' => $agentId,
                'granularity' => $service->granularity(),
                'context' => $inTeamContext ? 'team' : 'personal',
            ],
            'agents' => $agents,
        ]);
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function resolveRange(string $range, Request $request): array
    {
        $now = CarbonImmutable::now();
        $end = $now->endOfDay();

        return match ($range) {
            '7d' => [$now->subDays(6)->startOfDay(), $end],
            '90d' => [$now->subDays(89)->startOfDay(), $end],
            'mtd' => [$now->startOfMonth(), $end],
            'qtd' => [$now->startOfQuarter(), $end],
            'ytd' => [$now->startOfYear(), $end],
            '12m' => [$now->subMonths(11)->startOfMonth(), $end],
            'custom' => $this->resolveCustom($request, $now),
            default => [$now->subDays(29)->startOfDay(), $end], // 30d
        };
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function resolveCustom(Request $request, CarbonImmutable $now): array
    {
        try {
            $start = CarbonImmutable::parse($request->query('start'))->startOfDay();
            $end = CarbonImmutable::parse($request->query('end'))->endOfDay();
        } catch (\Throwable) {
            return [$now->subDays(29)->startOfDay(), $now->endOfDay()];
        }

        if ($start > $end) {
            [$start, $end] = [$end->startOfDay(), $start->endOfDay()];
        }

        // Guard against absurd ranges (keeps PHP bucketing bounded).
        if ($start->diffInDays($end) > 366) {
            $start = $end->subDays(366)->startOfDay();
        }

        return [$start, $end];
    }
}
