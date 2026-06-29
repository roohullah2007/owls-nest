<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('website_areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_website_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('image')->nullable();
            $table->text('description')->nullable();
            $table->json('search_criteria')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['agent_website_id', 'slug']);
            $table->index(['agent_website_id', 'is_active', 'sort_order']);
        });

        // Add areas_label to agent_websites so user can choose "Areas" vs "Neighborhoods"
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->string('areas_label')->nullable()->after('page_data');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_areas');

        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn('areas_label');
        });
    }
};
