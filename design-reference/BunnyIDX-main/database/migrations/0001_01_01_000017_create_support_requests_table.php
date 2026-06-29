<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('topic', 50);
            $table->text('message');
            $table->date('preferred_date')->nullable();
            $table->string('preferred_time', 30)->nullable();
            $table->string('contact_method', 30)->default('video_call');
            $table->string('status', 20)->default('pending'); // pending, scheduled, completed, canceled
            $table->text('admin_notes')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_requests');
    }
};
