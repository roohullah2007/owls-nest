<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds hand-picked MLS listing numbers to the Featured Listings config. The
 * admin can pin exact listings by their MLS number (RESO ListingId) — the
 * "feature exactly these" selector, alongside the existing query/agent/office
 * filters. Stored as a JSON array of strings.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('featured_listing_settings', function (Blueprint $table) {
            $table->json('mls_numbers')->nullable()->after('search_query');
        });
    }

    public function down(): void
    {
        Schema::table('featured_listing_settings', function (Blueprint $table) {
            $table->dropColumn('mls_numbers');
        });
    }
};
