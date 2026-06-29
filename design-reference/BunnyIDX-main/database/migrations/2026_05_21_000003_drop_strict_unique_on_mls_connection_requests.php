<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The original unique(user_id, mls_provider_id) blocked re-submission after a
 * denied request. Real rule: only ONE OPEN/INTEGRATED request per user per MLS.
 * We enforce that at the application layer in MlsConnectionRequestController.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mls_connection_requests', function (Blueprint $table) {
            $table->dropUnique('one_active_request_per_user_per_mls');
        });
    }

    public function down(): void
    {
        Schema::table('mls_connection_requests', function (Blueprint $table) {
            $table->unique(['user_id', 'mls_provider_id'], 'one_active_request_per_user_per_mls');
        });
    }
};
