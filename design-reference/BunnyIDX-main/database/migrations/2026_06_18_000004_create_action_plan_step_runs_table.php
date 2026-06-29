<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('action_plan_step_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('action_plan_enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('action_plan_step_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            // pending|sent|skipped|failed
            $table->string('status')->default('pending');
            // quiet_hours|opted_out|dnd|no_email|no_phone|10dlc_unapproved|no_email_account
            $table->string('skip_reason')->nullable();
            // Links to the produced record (SmsMessage / EmailMessage / Task) for audit.
            $table->nullableMorphs('result_ref');
            $table->text('error')->nullable();
            $table->timestamp('ran_at')->nullable();
            $table->timestamps();

            // Idempotency guard: one run row per (enrollment, step). The engine relies
            // on this so a retried job can never double-send a step.
            $table->unique(['action_plan_enrollment_id', 'action_plan_step_id'], 'apsr_enrollment_step_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('action_plan_step_runs');
    }
};
