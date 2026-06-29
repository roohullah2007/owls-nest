<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Condo Directory becomes a full duplicate of the New Developments
     * architecture: site-owned buildings (null agent_website_id = the admin
     * platform catalog) plus the same project fields — logo, developer
     * taxonomy link, project team, media (gallery / floor plans / brochure),
     * key details, deposit schedule, status and pricing.
     */
    public function up(): void
    {
        Schema::table('condo_buildings', function (Blueprint $table) {
            $table->foreignId('agent_website_id')->nullable()->after('id')
                ->constrained('agent_websites')->cascadeOnDelete();
            $table->string('zip', 12)->nullable()->after('city');
            $table->string('logo', 500)->nullable()->after('image');
            $table->string('developer', 160)->nullable()->after('description');
            $table->foreignId('developer_id')->nullable()->after('developer')
                ->constrained('developers')->nullOnDelete();
            $table->text('developer_info')->nullable()->after('developer_id');
            $table->string('architect', 160)->nullable()->after('developer_info');
            $table->string('interior_design', 160)->nullable()->after('architect');
            // Buildings are usually built — 'completed' is the default.
            $table->string('status', 32)->default('completed')->after('interior_design');
            $table->string('completion_year', 12)->nullable()->after('status');
            $table->string('price_label', 64)->nullable()->after('completion_year');
            $table->json('highlights')->nullable()->after('price_label');
            $table->string('video_url', 500)->nullable()->after('highlights');
            $table->string('brochure', 500)->nullable()->after('video_url');
            $table->json('floor_plans')->nullable()->after('brochure');
            $table->json('gallery')->nullable()->after('floor_plans');
            $table->json('key_details')->nullable()->after('gallery');
            $table->json('deposit_schedule')->nullable()->after('key_details');
        });
    }

    public function down(): void
    {
        Schema::table('condo_buildings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('agent_website_id');
            $table->dropConstrainedForeignId('developer_id');
            $table->dropColumn([
                'zip', 'logo', 'developer', 'developer_info', 'architect', 'interior_design',
                'status', 'completion_year', 'price_label', 'highlights', 'video_url',
                'brochure', 'floor_plans', 'gallery', 'key_details', 'deposit_schedule',
            ]);
        });
    }
};
