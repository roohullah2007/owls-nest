<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pipelines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('lead_type', 50)->nullable();
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'name']);
            $table->index(['user_id', 'lead_type']);
        });

        Schema::create('pipeline_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pipeline_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['open', 'won', 'lost'])->default('open');
            $table->string('color', 7)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['pipeline_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pipeline_stages');
        Schema::dropIfExists('pipelines');
    }
};
