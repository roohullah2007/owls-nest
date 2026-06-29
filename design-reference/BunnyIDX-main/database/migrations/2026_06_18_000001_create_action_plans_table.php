<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('action_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            // Trigger: how contacts get enrolled. MVP supports 'manual' and 'status_changed'.
            $table->string('trigger_type')->default('manual');
            $table->json('trigger_config')->nullable();
            $table->boolean('is_active')->default(false);
            $table->boolean('stop_on_reply')->default(true);
            $table->json('stop_on_status')->nullable();
            $table->boolean('allow_reenroll')->default(false);
            $table->unsignedInteger('enrolled_count')->default(0);
            $table->unsignedInteger('completed_count')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['team_id', 'is_active']);
            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('action_plans');
    }
};
