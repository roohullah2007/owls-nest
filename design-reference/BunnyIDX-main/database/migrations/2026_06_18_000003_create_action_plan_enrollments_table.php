<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('action_plan_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('action_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            // active|paused|completed|stopped
            $table->string('status')->default('active');
            // Points at the step that will run next (null once completed).
            $table->foreignId('current_step_id')->nullable()->constrained('action_plan_steps')->nullOnDelete();
            // When the current step is due. The runner polls on this column.
            $table->timestamp('next_run_at')->nullable();
            $table->foreignId('enrolled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('enrolled_via')->default('manual'); // manual|trigger
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('stopped_at')->nullable();
            $table->string('stop_reason')->nullable(); // replied|opted_out|status_changed|manual|plan_deactivated
            $table->timestamps();

            // Drives the runner query: find active enrollments whose step is due.
            $table->index(['status', 'next_run_at']);
            $table->index(['contact_id', 'status']);
            $table->index(['action_plan_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('action_plan_enrollments');
    }
};
