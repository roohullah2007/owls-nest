<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('phone_number_id')->nullable()->constrained('phone_numbers')->nullOnDelete();
            $table->string('telnyx_call_control_id')->nullable();
            $table->string('direction'); // inbound, outbound
            $table->string('from_number');
            $table->string('to_number');
            $table->string('status')->default('initiated'); // initiated, ringing, answered, completed, failed, missed
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->boolean('is_recorded')->default(false);
            $table->string('recording_url')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['contact_id', 'created_at']);
            $table->index('telnyx_call_control_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_records');
    }
};
