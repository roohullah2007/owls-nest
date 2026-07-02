<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\FormSubmission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ValuationController extends Controller
{
    /**
     * Capture an "Instant Property Valuation" request from the valuation widget.
     * Only the address is collected at this step; it lands in the same admin
     * Leads CRM as contact enquiries, tagged as a valuation request.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'address' => ['required', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        FormSubmission::create([
            'type' => FormSubmission::TYPE_VALUATION,
            'name' => $data['name'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'message' => 'Property valuation requested for: '.$data['address'],
            'data' => ['address' => $data['address']],
            'source_url' => url()->previous(),
        ]);

        return back()->with('success', "Thanks! We'll prepare your valuation and be in touch shortly.");
    }
}
