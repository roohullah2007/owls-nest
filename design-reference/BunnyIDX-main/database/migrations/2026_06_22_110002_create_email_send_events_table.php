<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Raw delivery/engagement events received from the Resend (Svix) webhook.
 * `event_id` holds the svix-id and is unique — it is the dedup key for webhook
 * retries. Each row links to its email_send_log when the provider message id
 * can be matched. The stored payload is sanitised (whitelisted fields only).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_send_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_send_log_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->default('resend');
            // svix-id — unique so a retried webhook is ignored.
            $table->string('event_id')->unique();
            $table->string('event_type');
            $table->string('provider_message_id')->nullable();
            $table->string('recipient')->nullable();
            $table->text('clicked_url')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('occurred_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index('provider_message_id');
            $table->index('event_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_send_events');
    }
};
