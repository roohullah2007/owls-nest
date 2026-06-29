<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Simplifies the user-facing request form.
 *
 * Most MLSes require broker authorization before an agent's IDX agreement
 * can be activated, so we collect just the broker info upfront. The remaining
 * agent-level identifiers (license #, NRDS, etc.) are gathered later when
 * the broker actually authorizes the request via the MLS portal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mls_connection_requests', function (Blueprint $table) {
            $table->boolean('is_principal_broker')->default(false)->after('listing_scope');
            $table->string('principal_broker_name', 200)->nullable()->after('is_principal_broker');
            $table->string('principal_broker_email', 200)->nullable()->after('principal_broker_name');
        });
    }

    public function down(): void
    {
        Schema::table('mls_connection_requests', function (Blueprint $table) {
            $table->dropColumn(['is_principal_broker', 'principal_broker_name', 'principal_broker_email']);
        });
    }
};
