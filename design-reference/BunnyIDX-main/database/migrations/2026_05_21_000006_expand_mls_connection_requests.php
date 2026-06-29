<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the rest of the identifiers MLS data-feed vendors universally require:
 * NRDS ID, broker MLS ID, brokerage name, IDX domain, and listing scope.
 *
 * Together with the existing agent_mls_id / agent_license_number / office_mls_id,
 * this covers signup for IDX Broker, Showcase IDX, Realtyna, and direct MLS feeds.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mls_connection_requests', function (Blueprint $table) {
            // NAR's National Realtor Database System ID — 9 digits, used by most MLSes
            // to verify IDX agreement coverage.
            $table->string('nrds_id', 32)->nullable()->after('agent_license_number');

            // The managing broker's MLS ID (often different from the office's MLS ID).
            // Required by MLSes that enforce broker-level IDX participation.
            $table->string('broker_mls_id', 64)->nullable()->after('office_mls_id');

            // Display name of the brokerage. Surfaces in attribution per MLS rules.
            $table->string('brokerage_name', 200)->nullable()->after('broker_mls_id');

            // The website domain where listings will be displayed.
            // IDX Broker, Showcase IDX, and most MLSes pre-approve per domain.
            $table->string('idx_domain', 255)->nullable()->after('brokerage_name');

            // Which listings to surface to the user: mine | office | all.
            // Drives the ListAgentMlsId / ListOfficeMlsId filter at query time.
            $table->string('listing_scope', 16)->default('mine')->after('idx_domain');
        });
    }

    public function down(): void
    {
        Schema::table('mls_connection_requests', function (Blueprint $table) {
            $table->dropColumn(['nrds_id', 'broker_mls_id', 'brokerage_name', 'idx_domain', 'listing_scope']);
        });
    }
};
