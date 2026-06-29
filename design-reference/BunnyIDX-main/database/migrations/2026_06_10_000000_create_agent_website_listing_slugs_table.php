<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SEO slugs for public listing-detail URLs. The public site links to
 * /site/{slug}/property/{address-slug} instead of exposing the MLS slug and
 * the raw listing key; this table maps each per-site slug back to the
 * (mls_slug, listing_id) pair the gateway needs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_website_listing_slugs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_website_id')->constrained()->cascadeOnDelete();
            $table->string('slug');
            $table->string('mls_slug', 64);
            $table->string('listing_id', 128);
            $table->timestamps();

            $table->unique(['agent_website_id', 'slug']);
            $table->unique(['agent_website_id', 'mls_slug', 'listing_id'], 'aw_listing_slugs_site_listing_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_website_listing_slugs');
    }
};
