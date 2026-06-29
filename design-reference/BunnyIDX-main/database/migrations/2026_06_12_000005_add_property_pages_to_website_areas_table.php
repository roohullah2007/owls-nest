<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Property Type / Sub-Type SEO pages per community (taxonomy-driven, see
 * CommunityPropertyPages). Rows: {kind: property_type|property_subtype,
 * value: <MLS enum verbatim>, copy?}.
 *
 * Also converts the property-type-ish entries that used to live in
 * `lifestyle_pages` (Condos, Single Family Homes, Townhomes, Multi-Family,
 * Vacant Land, Rentals — removed from CommunityLifestyles::CATALOG because
 * they're property types, not lifestyles) into equivalent property pages,
 * carrying any owner-edited copy along.
 */
return new class extends Migration
{
    /** old lifestyle key => property page row */
    private const CONVERSIONS = [
        'single-family-homes' => ['kind' => 'property_subtype', 'value' => 'Single Family Residence'],
        'condos' => ['kind' => 'property_subtype', 'value' => 'Condominium'],
        'townhomes' => ['kind' => 'property_subtype', 'value' => 'Townhouse'],
        'multi-family' => ['kind' => 'property_type', 'value' => 'Residential Income'],
        'vacant-land' => ['kind' => 'property_type', 'value' => 'Land'],
        'rentals' => ['kind' => 'property_type', 'value' => 'Residential Lease'],
    ];

    public function up(): void
    {
        Schema::table('website_areas', function (Blueprint $table) {
            $table->json('property_pages')->nullable()->after('lifestyle_pages');
        });

        foreach (DB::table('website_areas')->whereNotNull('lifestyle_pages')->get(['id', 'lifestyle_pages']) as $row) {
            $lifestyles = json_decode((string) $row->lifestyle_pages, true);
            if (! is_array($lifestyles) || $lifestyles === []) {
                continue;
            }

            $kept = [];
            $converted = [];
            foreach ($lifestyles as $entry) {
                $key = (string) ($entry['key'] ?? '');
                if (isset(self::CONVERSIONS[$key])) {
                    $converted[] = self::CONVERSIONS[$key] + ['copy' => $entry['copy'] ?? null];
                } else {
                    $kept[] = $entry;
                }
            }

            if ($converted !== []) {
                DB::table('website_areas')->where('id', $row->id)->update([
                    'lifestyle_pages' => json_encode(array_values($kept)),
                    'property_pages' => json_encode($converted),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('website_areas', function (Blueprint $table) {
            $table->dropColumn('property_pages');
        });
    }
};
