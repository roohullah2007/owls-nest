<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sub-areas power the community SEO structure (Sierra-style): each community
 * page can declare zip-code and neighborhood sub-pages, each rendering its own
 * listing page at /areas/{area}/{sub} with the parent's filters narrowed to
 * that zip / neighborhood. Shape per entry:
 *   { type: 'zip'|'neighborhood', label: string, value: string, slug: string }
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('website_areas', function (Blueprint $table) {
            $table->json('sub_areas')->nullable()->after('search_criteria');
            // Enabled lifestyle pages: [{key: catalog key, copy?: html}] —
            // see App\Services\Sites\CommunityLifestyles.
            $table->json('lifestyle_pages')->nullable()->after('sub_areas');
        });
    }

    public function down(): void
    {
        Schema::table('website_areas', function (Blueprint $table) {
            $table->dropColumn(['sub_areas', 'lifestyle_pages']);
        });
    }
};
