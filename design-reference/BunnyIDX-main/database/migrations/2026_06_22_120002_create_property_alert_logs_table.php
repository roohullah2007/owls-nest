<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per property-alert email attempt — the dedup + audit store. The
 * unique idempotency_key prevents the same (visitor + listing + alert_type +
 * change-signature) from sending twice; links back to the email_send_logs row.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_alert_logs', function (Blueprint $table) {
            $table->id();
            // The account (agent/website owner) the quota counts against.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('site_visitor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('site_visitor_saved_search_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('email_send_log_id')->nullable()->constrained()->nullOnDelete();
            // saved_search_match | price_drop | status_change | (future) open_house | back_on_market
            $table->string('alert_type', 40);
            $table->string('mls_slug', 64)->nullable();
            $table->string('listing_id', 128)->nullable();
            $table->string('idempotency_key')->unique();
            // queued | sent | failed
            $table->string('status', 16)->default('queued');
            $table->timestamp('sent_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['site_visitor_id', 'listing_id', 'alert_type', 'created_at'], 'pa_logs_dedup_window_idx');
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_alert_logs');
    }
};
