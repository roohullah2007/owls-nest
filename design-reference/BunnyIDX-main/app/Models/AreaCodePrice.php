<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Admin-managed override price for provisioning a phone number in a given
 * 3-digit US area code. Platform-wide (not tenant-scoped) — these are set on
 * the Admin panel and apply to every user's number search/purchase.
 */
class AreaCodePrice extends Model
{
    protected $fillable = [
        'area_code',
        'label',
        'monthly_price',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * The active override price to use for an area code: a specific per-area-code
     * price if one exists, otherwise the global default (the row with a NULL
     * area_code, which applies to all area codes). Null when neither is set —
     * callers then fall back to the upstream Telnyx cost.
     */
    public static function priceFor(?string $areaCode): ?string
    {
        if ($areaCode) {
            $specific = static::query()
                ->where('is_active', true)
                ->where('area_code', $areaCode)
                ->value('monthly_price');

            if ($specific !== null) {
                return $specific;
            }
        }

        return static::defaultPrice();
    }

    /**
     * The active global default price (applies to all area codes), or null.
     */
    public static function defaultPrice(): ?string
    {
        return static::query()
            ->where('is_active', true)
            ->whereNull('area_code')
            ->value('monthly_price');
    }

    /**
     * Extract the 3-digit area code from an E.164 US number (e.g. +13055551234 → "305").
     */
    public static function areaCodeFromNumber(?string $phoneNumber): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $phoneNumber);

        // Strip a leading US country code "1" if present, then take the next 3 digits.
        if (Str::startsWith($digits, '1') && strlen($digits) === 11) {
            $digits = substr($digits, 1);
        }

        return strlen($digits) >= 3 ? substr($digits, 0, 3) : null;
    }
}
