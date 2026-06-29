<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Delivery/engagement tracking columns updated from Resend webhook events.
 * The `status` column already exists; these add the per-event timestamps and
 * reasons that the webhook handler fills in as events arrive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_send_logs', function (Blueprint $table) {
            $table->timestamp('delivered_at')->nullable()->after('sent_at');
            $table->timestamp('opened_at')->nullable()->after('delivered_at');
            $table->timestamp('last_opened_at')->nullable()->after('opened_at');
            $table->timestamp('clicked_at')->nullable()->after('last_opened_at');
            $table->timestamp('last_clicked_at')->nullable()->after('clicked_at');
            $table->string('bounce_reason')->nullable()->after('last_clicked_at');
            $table->timestamp('complaint_at')->nullable()->after('bounce_reason');
            $table->string('failed_reason')->nullable()->after('complaint_at');
        });
    }

    public function down(): void
    {
        Schema::table('email_send_logs', function (Blueprint $table) {
            $table->dropColumn([
                'delivered_at',
                'opened_at',
                'last_opened_at',
                'clicked_at',
                'last_clicked_at',
                'bounce_reason',
                'complaint_at',
                'failed_reason',
            ]);
        });
    }
};
