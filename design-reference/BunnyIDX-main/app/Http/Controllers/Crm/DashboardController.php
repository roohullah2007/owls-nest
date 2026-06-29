<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Listing;
use App\Models\Meeting;
use App\Models\Task;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $stats = [
            'total_contacts' => Contact::forUser($user)->count(),
            'total_listings' => Listing::forUser($user)->count(),
            'new_contacts_this_month' => Contact::forUser($user)->where('created_at', '>=', now()->startOfMonth())->count(),
            'active_deals' => Deal::forUser($user)->whereNull('won_at')->whereNull('lost_at')->count(),
            'deals_value' => Deal::forUser($user)->whereNull('won_at')->whereNull('lost_at')->sum('value'),
            'won_deals' => Deal::forUser($user)->whereNotNull('won_at')->count(),
            'won_value' => Deal::forUser($user)->whereNotNull('won_at')->sum('value'),
            'total_commission' => Deal::forUser($user)->whereNotNull('won_at')->sum('commission_amount'),
            'leads_by_status' => Contact::forUser($user)
                ->selectRaw('status, count(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status'),
        ];

        $upcomingMeetings = Meeting::forUser($user)
            ->where('starts_at', '>=', now())
            ->with('contact:id,uuid,first_name,last_name')
            ->orderBy('starts_at')
            ->take(5)
            ->get();

        $recentLeads = Contact::forUser($user)
            ->select('id', 'uuid', 'first_name', 'last_name', 'email', 'phone', 'source', 'type', 'status', 'created_at')
            ->with('assignedUsers:id,name')
            ->withCount(['deals', 'tasks'])
            ->latest()
            ->take(10)
            ->get();

        $tasksDueToday = Task::forUser($user)
            ->incomplete()
            ->where(function ($q) {
                $q->whereDate('due_at', '<=', now()->toDateString())
                  ->orWhereDate('due_date', '<=', now()->toDateString());
            })
            ->orderBy('due_at')
            ->orderBy('due_date')
            ->take(10)
            ->get();

        return Inertia::render('Crm/Dashboard', [
            'stats' => $stats,
            'upcomingMeetings' => $upcomingMeetings,
            'recentLeads' => $recentLeads,
            'tasksDueToday' => $tasksDueToday,
        ]);
    }
}
