<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Partition landing_pages into two products that share the table but never mix
 * in the UI: 'landing' (the block-based Landing Pages) and 'listing' (the
 * IDX Squeeze / Listing Lead Pages, edited via their own simple flow).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('landing_pages', function (Blueprint $table) {
            $table->string('kind')->default('landing')->after('type')->index();
        });

        // Existing IDX-squeeze pages belong to the new 'listing' product.
        DB::table('landing_pages')->where('template', 'idx-squeeze')->update(['kind' => 'listing']);
    }

    public function down(): void
    {
        Schema::table('landing_pages', function (Blueprint $table) {
            $table->dropColumn('kind');
        });
    }
};
