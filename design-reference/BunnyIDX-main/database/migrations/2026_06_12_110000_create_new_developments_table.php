<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Platform-level New Developments catalog (pre-construction projects) —
     * curated by the admin team like condo_buildings; every agent site shares
     * the catalog and renders it at /new-developments when enabled.
     */
    public function up(): void
    {
        Schema::create('new_developments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            // Grouping label on the public directory ("Brickell", "Aventura", …).
            $table->string('area');
            $table->string('city')->nullable();
            $table->string('address')->nullable();
            $table->string('image', 500)->nullable();
            $table->text('description')->nullable();
            $table->string('developer')->nullable();
            // pre-construction | under-construction | completed
            $table->string('status', 32)->default('pre-construction');
            $table->string('completion_year', 12)->nullable();
            // Display label, e.g. "From $850K" — pricing is developer-set, not MLS.
            $table->string('price_label', 64)->nullable();
            $table->json('highlights')->nullable();
            $table->string('video_url', 500)->nullable();
            // What the MLS search matches for resale/active listings in the
            // project — usually the subdivision/condo name. Defaults to name.
            $table->string('mls_keyword')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'area', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('new_developments');
    }
};
