<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('email_account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->string('gmail_thread_id');
            $table->string('subject')->nullable();
            $table->text('snippet')->nullable();
            $table->unsignedInteger('message_count')->default(0);
            $table->boolean('is_read')->default(false);
            $table->boolean('is_starred')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->unique(['email_account_id', 'gmail_thread_id']);
            $table->index(['user_id', 'is_archived', 'last_message_at']);
            $table->index('contact_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_threads');
    }
};
