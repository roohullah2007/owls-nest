<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * New Developments grow site-owned entries + richer project media. A null
     * agent_website_id keeps a row in the admin-curated platform catalog;
     * site-owned rows render only on their own site (editor → New Developments).
     */
    public function up(): void
    {
        Schema::table('new_developments', function (Blueprint $table) {
            $table->foreignId('agent_website_id')->nullable()->after('id')
                ->constrained('agent_websites')->cascadeOnDelete();
            $table->string('logo', 500)->nullable()->after('image');
            $table->string('architect', 160)->nullable()->after('developer');
            $table->string('interior_design', 160)->nullable()->after('architect');
            // Project brochure (PDF) offered as a download on the public page.
            $table->string('brochure', 500)->nullable()->after('video_url');
            // Floor plans: [{label, image}]; gallery: [url, …]; key details: [{label, value}]
            $table->json('floor_plans')->nullable()->after('brochure');
            $table->json('gallery')->nullable()->after('floor_plans');
            $table->json('key_details')->nullable()->after('gallery');
        });
    }

    public function down(): void
    {
        Schema::table('new_developments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('agent_website_id');
            $table->dropColumn(['logo', 'architect', 'interior_design', 'brochure', 'floor_plans', 'gallery', 'key_details']);
        });
    }
};
