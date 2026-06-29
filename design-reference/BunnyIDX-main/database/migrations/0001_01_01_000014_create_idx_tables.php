<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idx_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 30); // bridge, repliers
            $table->string('mls_slug', 50);
            $table->string('display_name');
            $table->text('api_key')->nullable(); // encrypted at model level, null for Bridge (uses system token)
            $table->string('agent_id', 100)->nullable();
            $table->string('office_id', 100)->nullable();
            $table->json('constraints')->nullable(); // global data limitations
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_tested_at')->nullable();
            $table->string('test_status', 20)->default('untested'); // untested, passed, failed
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->unique(['user_id', 'mls_slug']);
        });

        // Add IDX fields to listings table
        Schema::table('listings', function (Blueprint $table) {
            $table->foreignId('idx_connection_id')->nullable()->after('expired_at')->constrained('idx_connections')->nullOnDelete();
            $table->string('mls_listing_id', 100)->nullable()->after('idx_connection_id');
            $table->string('mls_slug', 50)->nullable()->after('mls_listing_id');
            $table->timestamp('synced_at')->nullable()->after('mls_slug');
            $table->string('sync_status', 20)->nullable()->after('synced_at'); // synced, stale, manual

            $table->index(['user_id', 'mls_slug', 'mls_listing_id']);
        });
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'mls_slug', 'mls_listing_id']);
            $table->dropConstrainedForeignId('idx_connection_id');
            $table->dropColumn(['mls_listing_id', 'mls_slug', 'synced_at', 'sync_status']);
        });

        Schema::dropIfExists('idx_connections');
    }
};
