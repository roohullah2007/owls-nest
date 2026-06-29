<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_pages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();

            $table->string('slug')->unique();
            $table->string('name');                 // internal label shown in the CRM list
            $table->string('type')->default('buyer'); // buyer | seller | …
            $table->string('template')->default('classic');

            // Branding / contact shown on the public page.
            $table->string('accent_color')->default('#1693C9');
            $table->string('agent_name')->nullable();
            $table->string('agent_email')->nullable();
            $table->string('agent_phone')->nullable();
            $table->string('agent_photo')->nullable();

            // The block-based content: { "blocks": [ { id, type, hidden, data } ], "_config": {} }
            $table->json('page_data')->nullable();

            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();

            $table->boolean('is_published')->default(false);
            $table->unsignedInteger('submissions_count')->default(0);

            $table->timestamps();

            $table->index(['user_id', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_pages');
    }
};
