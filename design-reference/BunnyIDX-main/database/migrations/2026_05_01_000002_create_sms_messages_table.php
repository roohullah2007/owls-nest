<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('phone_number_id')->nullable()->constrained('phone_numbers')->nullOnDelete();
            $table->string('telnyx_message_id')->nullable()->unique();
            $table->string('direction'); // inbound, outbound
            $table->string('from_number');
            $table->string('to_number');
            $table->text('body');
            $table->string('status')->default('queued'); // queued, sent, delivered, failed, received
            $table->string('error_code')->nullable();
            $table->unsignedSmallInteger('segment_count')->default(1);
            $table->timestamps();

            $table->index(['contact_id', 'created_at']);
            $table->index(['from_number', 'created_at']);
            $table->index(['to_number', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_messages');
    }
};
