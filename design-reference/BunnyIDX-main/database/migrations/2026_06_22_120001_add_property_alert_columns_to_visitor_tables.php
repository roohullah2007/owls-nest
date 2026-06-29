<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-subscription alert state on the existing visitor tables. Saved searches
 * remember which listing keys they've already alerted on (so only genuinely
 * new matches fire); favorites carry the snapshot baseline already, plus a
 * last-alerted stamp. Visitors get an alert opt-out + unsubscribe token.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_visitor_saved_searches', function (Blueprint $table) {
            $table->timestamp('last_alerted_at')->nullable()->after('search_text');
            // Listing keys ("mls_slug|mls_id") already seen — diff target for "new match".
            $table->json('seen_listing_ids')->nullable()->after('last_alerted_at');
            $table->boolean('alerts_enabled')->default(true)->after('seen_listing_ids');
        });

        Schema::table('site_visitor_favorites', function (Blueprint $table) {
            $table->timestamp('last_alerted_at')->nullable()->after('snapshot');
        });

        Schema::table('site_visitors', function (Blueprint $table) {
            $table->timestamp('alerts_unsubscribed_at')->nullable()->after('last_login_at');
            $table->string('alerts_unsubscribe_token', 64)->nullable()->after('alerts_unsubscribed_at');
            $table->unique('alerts_unsubscribe_token');
        });
    }

    public function down(): void
    {
        Schema::table('site_visitor_saved_searches', function (Blueprint $table) {
            $table->dropColumn(['last_alerted_at', 'seen_listing_ids', 'alerts_enabled']);
        });

        Schema::table('site_visitor_favorites', function (Blueprint $table) {
            $table->dropColumn('last_alerted_at');
        });

        Schema::table('site_visitors', function (Blueprint $table) {
            $table->dropUnique(['alerts_unsubscribe_token']);
            $table->dropColumn(['alerts_unsubscribed_at', 'alerts_unsubscribe_token']);
        });
    }
};
