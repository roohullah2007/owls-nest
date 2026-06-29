<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Visitor-account data for agent websites: favorited listings (with a display
 * snapshot so the panel renders without MLS round-trips) and saved searches
 * (the search page's filter payload).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_visitor_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_visitor_id')->constrained()->cascadeOnDelete();
            $table->string('mls_slug', 64);
            $table->string('listing_id', 128);
            // Display snapshot: address, price_formatted, photo, href, beds, baths…
            $table->json('snapshot')->nullable();
            $table->timestamps();

            $table->unique(['site_visitor_id', 'mls_slug', 'listing_id'], 'sv_favorites_visitor_listing_unique');
        });

        Schema::create('site_visitor_saved_searches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_visitor_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            // The search page's filter payload (MlsQuery-shaped keys) + free text.
            $table->json('filters')->nullable();
            $table->string('search_text')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_visitor_saved_searches');
        Schema::dropIfExists('site_visitor_favorites');
    }
};
