<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AreaCodePrice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AreaCodePriceController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'area_code' => ['required', 'digits:3', Rule::unique('area_code_prices', 'area_code')],
            'label' => ['nullable', 'string', 'max:120'],
            'monthly_price' => ['required', 'numeric', 'min:0', 'max:9999.99'],
            'is_active' => ['boolean'],
        ]);

        AreaCodePrice::create($validated);

        return back()->with('success', "Price for area code {$validated['area_code']} added.");
    }

    public function update(Request $request, AreaCodePrice $areaCodePrice): RedirectResponse
    {
        $validated = $request->validate([
            'area_code' => ['required', 'digits:3', Rule::unique('area_code_prices', 'area_code')->ignore($areaCodePrice->id)],
            'label' => ['nullable', 'string', 'max:120'],
            'monthly_price' => ['required', 'numeric', 'min:0', 'max:9999.99'],
            'is_active' => ['boolean'],
        ]);

        $areaCodePrice->update($validated);

        return back()->with('success', "Price for area code {$validated['area_code']} updated.");
    }

    public function destroy(AreaCodePrice $areaCodePrice): RedirectResponse
    {
        $code = $areaCodePrice->area_code;
        $areaCodePrice->delete();

        return back()->with('success', "Price for area code {$code} removed.");
    }

    /**
     * Set (or clear) the global default price that applies to every area code
     * without a specific override. Stored as the single NULL-area_code row.
     */
    public function updateDefault(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'monthly_price' => ['nullable', 'numeric', 'min:0', 'max:9999.99'],
        ]);

        $default = AreaCodePrice::whereNull('area_code')->first();

        // Empty price clears the default (falls back to the Telnyx cost).
        if ($validated['monthly_price'] === null || $validated['monthly_price'] === '') {
            $default?->delete();

            return back()->with('success', 'Default area-code price cleared.');
        }

        if ($default) {
            $default->update(['monthly_price' => $validated['monthly_price'], 'is_active' => true]);
        } else {
            AreaCodePrice::create([
                'area_code' => null,
                'label' => 'All area codes',
                'monthly_price' => $validated['monthly_price'],
                'is_active' => true,
            ]);
        }

        return back()->with('success', 'Default price for all area codes saved.');
    }
}
