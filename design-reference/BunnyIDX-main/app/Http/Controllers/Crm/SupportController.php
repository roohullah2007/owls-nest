<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupportController extends Controller
{
    public function consultation(Request $request): Response
    {
        $user = $request->user();

        $requests = $user->supportRequests()
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return Inertia::render('Crm/Support/Consultation', [
            'requests' => $requests,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'topic' => 'required|string|in:idx_setup,mls_connection,plugin_help,billing,account,other',
            'message' => 'required|string|max:2000',
            'preferred_date' => 'required|date|after_or_equal:today',
            'preferred_time' => 'required|string|in:morning,afternoon,evening',
            'contact_method' => 'required|string|in:video_call,phone,chat',
        ]);

        $request->user()->supportRequests()->create($validated);

        return back()->with('success', 'Consultation request submitted. Our team will reach out to confirm your appointment.');
    }
}
