<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            // null = no custom domain; 'pending' = awaiting DNS; 'connected' = verified + live.
            $table->string('domain_status')->nullable()->after('custom_domain');
            $table->string('domain_verification_token')->nullable()->after('domain_status');
            $table->timestamp('domain_verified_at')->nullable()->after('domain_verification_token');
            $table->timestamp('domain_last_checked_at')->nullable()->after('domain_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn([
                'domain_status',
                'domain_verification_token',
                'domain_verified_at',
                'domain_last_checked_at',
            ]);
        });
    }
};
