<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Realtyna accounts are provisioned per customer — the admin team stores the
 * account's client_id / client_secret (plus the existing api_key column) on
 * the connection when integrating an MLS request. Both secretish values are
 * encrypted at rest via the model's `encrypted` cast.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('idx_connections', function (Blueprint $table) {
            $table->string('client_id')->nullable()->after('api_key');
            $table->text('client_secret')->nullable()->after('client_id');
        });
    }

    public function down(): void
    {
        Schema::table('idx_connections', function (Blueprint $table) {
            $table->dropColumn(['client_id', 'client_secret']);
        });
    }
};
