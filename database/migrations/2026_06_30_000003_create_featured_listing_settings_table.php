<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Singleton config row driving the public Featured Listings page. An admin
 * sets a free-text query, MLS dataset slugs, an agent id and office id; the
 * public page replays this against the live MLS gateway. When absent/inactive
 * the page defaults to the latest general listings.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('featured_listing_settings', function (Blueprint $table) {
            $table->id();
            $table->string('search_query')->nullable();
            $table->json('mls_slugs')->nullable();
            $table->string('agent_id')->nullable();
            $table->string('office_id')->nullable();
            $table->unsignedInteger('result_limit')->default(12);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('featured_listing_settings');
    }
};
