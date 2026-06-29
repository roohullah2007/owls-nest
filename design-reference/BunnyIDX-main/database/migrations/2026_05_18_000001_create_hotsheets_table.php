<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotsheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 100);
            $table->enum('scope', ['personal', 'team'])->default('personal');
            $table->json('filters');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'position']);
            $table->index(['team_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotsheets');
    }
};
