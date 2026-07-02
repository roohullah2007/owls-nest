<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FormSubmission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin Panel → Leads. The CRM: every public marketing-form submission (contact,
 * valuation, …) is a lead here. Lists them newest-first, filterable by form type
 * and pipeline status, with read/unread, status, notes and delete actions.
 */
class LeadsController extends Controller
{
    public function index(Request $request): Response
    {
        $type = $request->string('type')->toString() ?: null;
        $status = $request->string('status')->toString() ?: null;

        $query = FormSubmission::query()->latest();

        if ($type !== null && array_key_exists($type, FormSubmission::TYPE_LABELS)) {
            $query->where('type', $type);
        }

        if ($status !== null && array_key_exists($status, FormSubmission::STATUS_LABELS)) {
            $query->where('status', $status);
        }

        $leads = $query->get()->map(fn (FormSubmission $s): array => [
            'id' => $s->id,
            'type' => $s->type,
            'type_label' => FormSubmission::TYPE_LABELS[$s->type] ?? ucfirst($s->type),
            'name' => $s->name,
            'email' => $s->email,
            'phone' => $s->phone,
            'message' => $s->message,
            'data' => $s->data,
            'source_url' => $s->source_url,
            'status' => $s->status,
            'status_label' => FormSubmission::STATUS_LABELS[$s->status] ?? ucfirst($s->status),
            'notes' => $s->notes,
            'is_read' => $s->read_at !== null,
            'created_at' => $s->created_at?->toIso8601String(),
            'created_human' => $s->created_at?->diffForHumans(),
        ])->all();

        return Inertia::render('admin/leads', [
            'leads' => $leads,
            'filterType' => $type,
            'filterStatus' => $status,
            'types' => FormSubmission::TYPE_LABELS,
            'statuses' => FormSubmission::STATUS_LABELS,
            'counts' => [
                'all' => FormSubmission::count(),
                'unread' => FormSubmission::whereNull('read_at')->count(),
                'by_type' => FormSubmission::query()
                    ->selectRaw('type, count(*) as aggregate')
                    ->groupBy('type')
                    ->pluck('aggregate', 'type'),
                'by_status' => FormSubmission::query()
                    ->selectRaw('status, count(*) as aggregate')
                    ->groupBy('status')
                    ->pluck('aggregate', 'status'),
            ],
        ]);
    }

    /** Move a lead to a different pipeline stage. */
    public function updateStatus(Request $request, FormSubmission $lead): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(array_keys(FormSubmission::STATUS_LABELS))],
        ]);

        $lead->update(['status' => $validated['status']]);

        return back()->with('success', 'Lead status updated.');
    }

    /** Save the internal agent notes for a lead. */
    public function updateNotes(Request $request, FormSubmission $lead): RedirectResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:10000'],
        ]);

        $lead->update(['notes' => $validated['notes'] ?? null]);

        return back()->with('success', 'Notes saved.');
    }

    /** Toggle a lead's read/unread state. */
    public function toggleRead(FormSubmission $lead): RedirectResponse
    {
        $lead->read_at = $lead->read_at ? null : now();
        $lead->save();

        return back();
    }

    public function destroy(FormSubmission $lead): RedirectResponse
    {
        $lead->delete();

        return back()->with('success', 'Lead deleted.');
    }
}
