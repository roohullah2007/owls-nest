<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Explicit per-email quota flag. quota_category still records the category
 * string; counts_toward_quota is the authoritative boolean (set from
 * App\Services\Email\EmailCategory::countsTowardQuota at send time) so reporting
 * doesn't have to re-derive classification from config.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_send_logs', function (Blueprint $table) {
            $table->boolean('counts_toward_quota')->default(false)->after('quota_category');
        });
    }

    public function down(): void
    {
        Schema::table('email_send_logs', function (Blueprint $table) {
            $table->dropColumn('counts_toward_quota');
        });
    }
};
