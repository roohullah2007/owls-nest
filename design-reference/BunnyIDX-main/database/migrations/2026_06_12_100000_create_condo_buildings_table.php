<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Platform-level Condo Directory catalog — buildings are curated by the
     * admin team (no user_id/team_id: every agent site shares the catalog and
     * renders it at /condos when the owner enables the directory).
     */
    public function up(): void
    {
        Schema::create('condo_buildings', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            // Grouping label on the public directory ("Brickell", "Aventura", …).
            $table->string('area');
            $table->string('city')->nullable();
            $table->string('address')->nullable();
            $table->string('image', 500)->nullable();
            $table->text('description')->nullable();
            // What the MLS search matches for this building's live listings —
            // usually the subdivision/condo name in the feed. Defaults to name.
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
        Schema::dropIfExists('condo_buildings');
    }
};
