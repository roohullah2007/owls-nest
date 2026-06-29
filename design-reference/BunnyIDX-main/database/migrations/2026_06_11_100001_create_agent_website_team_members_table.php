<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dynamic team system for agent websites: members power the public
     * /team page, the per-member page (bio + their listings via
     * mls_agent_id), and the insertable Team block.
     */
    public function up(): void
    {
        Schema::create('agent_website_team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_website_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug', 120);
            $table->string('title')->nullable();
            $table->string('photo')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email')->nullable();
            $table->text('bio')->nullable();
            $table->json('socials')->nullable();
            // MLS agent key — powers "this member's listings" on their page.
            $table->string('mls_agent_id', 100)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['agent_website_id', 'slug']);
            // Explicit name — the auto-generated one exceeds MySQL's 64-char limit.
            $table->index(['agent_website_id', 'is_active', 'sort_order'], 'awtm_site_active_sort_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_website_team_members');
    }
};
