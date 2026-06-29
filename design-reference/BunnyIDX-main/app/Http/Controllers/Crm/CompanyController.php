<?php

declare(strict_types=1);

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    public function index(Request $request): Response
    {
        $companies = Company::forUser($request->user())
            ->withCount('contacts')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Crm/Companies/Index', [
            'companies' => $companies,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Crm/Companies/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'website' => 'nullable|url|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state_province' => 'nullable|string|max:50',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|size:2',
            'notes' => 'nullable|string',
        ]);

        $company = $request->user()->companies()->create($validated);

        return redirect()->route('crm.companies.show', $company)
            ->with('success', 'Company created.');
    }

    public function show(Request $request, Company $company): Response
    {
        $this->authorize($request, $company);

        $company->load([
            'contacts' => fn ($q) => $q->latest()->take(10),
            'deals' => fn ($q) => $q->latest()->take(5),
        ]);

        return Inertia::render('Crm/Companies/Show', [
            'company' => $company,
        ]);
    }

    public function edit(Request $request, Company $company): Response
    {
        $this->authorize($request, $company);

        return Inertia::render('Crm/Companies/Edit', [
            'company' => $company,
        ]);
    }

    public function update(Request $request, Company $company): RedirectResponse
    {
        $this->authorize($request, $company);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'website' => 'nullable|url|max:255',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state_province' => 'nullable|string|max:50',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|size:2',
            'notes' => 'nullable|string',
        ]);

        $company->update($validated);

        return redirect()->route('crm.companies.show', $company)
            ->with('success', 'Company updated.');
    }

    public function destroy(Request $request, Company $company): RedirectResponse
    {
        $this->authorize($request, $company);

        $company->delete();

        return redirect()->route('crm.companies.index')
            ->with('success', 'Company deleted.');
    }

    private function authorize(Request $request, Company $company): void
    {
        $user = $request->user();
        abort_unless($company->user_id === $user->id || ($user->team_id && $company->team_id === $user->team_id), 403);
    }
}
