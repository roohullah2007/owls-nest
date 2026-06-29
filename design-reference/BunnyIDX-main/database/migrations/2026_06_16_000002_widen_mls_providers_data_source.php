<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `data_source` was an enum locked to bridge/realtyna/repliers. We onboard new
 * MLS providers over time (paragon now; mlsgrid and others later) — each would
 * otherwise need an enum-altering migration. Widen it to a plain string so
 * adding a provider is a code-only change (new driver + MlsProvider::SOURCE_*).
 * The value space is still controlled by validation in MlsProviderController.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mls_providers', function (Blueprint $table) {
            $table->string('data_source', 32)->default('bridge')->change();
        });
    }

    public function down(): void
    {
        Schema::table('mls_providers', function (Blueprint $table) {
            $table->enum('data_source', ['bridge', 'realtyna', 'repliers'])->default('bridge')->change();
        });
    }
};
