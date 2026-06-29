<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_website_id')->constrained()->cascadeOnDelete();
            $table->string('slug');
            $table->string('title');
            $table->string('excerpt', 500)->nullable();
            $table->longText('body');
            $table->string('featured_image')->nullable();
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 500)->nullable();
            $table->timestamps();

            $table->index(['agent_website_id', 'status', 'published_at']);
            $table->unique(['agent_website_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
