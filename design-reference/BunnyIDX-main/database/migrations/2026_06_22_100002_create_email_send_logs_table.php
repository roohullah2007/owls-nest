<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Transactional send log for platform/branded emails delivered through Resend.
 * This is distinct from `email_logs` (which records Gmail-synced conversation
 * messages); this table tracks one row per outbound provider send with its
 * delivery status, provider message id and any error.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_send_logs', function (Blueprint $table) {
            $table->id();
            // Account the send belongs to (recipient agent for lead notifications,
            // the user being verified/reset for auth emails). Nullable so platform
            // emails without a user context can still be logged.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->default('resend');
            $table->string('template_type')->nullable();
            $table->string('recipient');
            $table->string('sender')->nullable();
            $table->string('subject')->nullable();
            // queued | sent | failed
            $table->string('status')->default('queued');
            $table->string('provider_message_id')->nullable();
            $table->text('error_message')->nullable();
            // Whether a user's own key was used (branded) vs the platform key.
            $table->boolean('branded')->default(false);
            // Optional categorisation (e.g. 'lead_notification'); NOT tied to any
            // property-alert quota — that is handled separately.
            $table->string('quota_category')->nullable();
            // Idempotency guard so a re-dispatched job cannot double-send.
            $table->string('idempotency_key')->nullable()->unique();
            $table->json('meta')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'template_type']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_send_logs');
    }
};
