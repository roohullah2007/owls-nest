<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('action_plan_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('action_plan_id')->constrained()->cascadeOnDelete();
            // Tenant columns are denormalized onto steps so they scope the same way
            // as the parent plan (BelongsToTeamOrUser).
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('position')->default(0);
            // Step type: 'email', 'sms', 'task' (MVP).
            $table->string('step_type');
            // Delay before this step runs, relative to the previous step (or enrollment
            // start for the first step). delay_amount=0 means "immediately".
            $table->unsignedInteger('delay_amount')->default(0);
            $table->string('delay_unit')->default('days'); // minutes|hours|days
            $table->json('config')->nullable();
            $table->timestamps();

            $table->index(['action_plan_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('action_plan_steps');
    }
};
