<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_websites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('slug')->unique();
            $table->string('custom_domain')->nullable()->unique();

            // Theme
            $table->string('theme')->default('luxury_dark'); // luxury_dark | luxury_light

            // Agent info
            $table->string('agent_name');
            $table->string('agent_title')->nullable(); // e.g. "Your San Diego Realtor"
            $table->text('agent_tagline')->nullable();
            $table->text('agent_bio')->nullable();
            $table->string('agent_photo')->nullable();
            $table->string('agent_email')->nullable();
            $table->string('agent_phone')->nullable();
            $table->string('agent_city')->nullable();
            $table->string('agent_state')->nullable();
            $table->string('agent_license_number')->nullable();
            $table->string('brokerage_name')->nullable();
            $table->string('brokerage_logo')->nullable();

            // Hero
            $table->string('hero_image')->nullable();
            $table->string('hero_headline')->nullable();
            $table->string('hero_subtitle')->nullable();

            // Pages content
            $table->text('buy_headline')->nullable();
            $table->text('buy_description')->nullable();
            $table->text('sell_headline')->nullable();
            $table->text('sell_description')->nullable();
            $table->text('about_extended')->nullable();

            // Testimonials (JSON array)
            $table->json('testimonials')->nullable();

            // Social links
            $table->string('social_facebook')->nullable();
            $table->string('social_instagram')->nullable();
            $table->string('social_linkedin')->nullable();
            $table->string('social_youtube')->nullable();
            $table->string('social_tiktok')->nullable();

            // SEO
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();

            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_websites');
    }
};
