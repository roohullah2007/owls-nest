<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links an IDX connection to the catalog MlsProvider it was provisioned from.
 * Nullable — a connection can exist before/without a catalog row; the FK nulls
 * out if the provider is ever deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('idx_connections', function (Blueprint $table) {
            $table->unsignedBigInteger('mls_provider_id')->nullable()->after('user_id');
            $table->foreign('mls_provider_id')
                ->references('id')
                ->on('mls_providers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('idx_connections', function (Blueprint $table) {
            $table->dropForeign(['mls_provider_id']);
            $table->dropColumn('mls_provider_id');
        });
    }
};
