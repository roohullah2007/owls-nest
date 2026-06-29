<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AreaCodePrice;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin "Settings" shell — mirrors the user-side settings page (a left tab
 * sidebar + section panes). Currently hosts the Phone Pricing section
 * (per-area-code + default phone-number prices).
 */
class SettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Settings/Index', [
            // Concrete per-area-code overrides (default row excluded — surfaced separately).
            'areaCodePrices' => AreaCodePrice::query()
                ->whereNotNull('area_code')
                ->orderBy('area_code')
                ->get(['id', 'area_code', 'label', 'monthly_price', 'is_active']),
            // The single global default that applies to every other area code.
            'defaultPrice' => AreaCodePrice::defaultPrice(),
        ]);
    }
}
