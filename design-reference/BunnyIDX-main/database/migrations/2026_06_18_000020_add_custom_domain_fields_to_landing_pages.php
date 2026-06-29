<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Custom-domain support for landing pages — mirrors the agent-website domain
 * fields so the same CustomDomainService / Cloudflare / DNS pipeline can serve a
 * connected domain straight to the React /l/{slug} page.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('landing_pages', function (Blueprint $table) {
            $table->string('custom_domain')->nullable()->unique()->after('is_published');
            $table->string('domain_status')->nullable()->after('custom_domain');
            $table->string('domain_verification_token')->nullable()->after('domain_status');
            $table->timestamp('domain_verified_at')->nullable()->after('domain_verification_token');
            $table->timestamp('domain_last_checked_at')->nullable()->after('domain_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('landing_pages', function (Blueprint $table) {
            $table->dropColumn([
                'custom_domain',
                'domain_status',
                'domain_verification_token',
                'domain_verified_at',
                'domain_last_checked_at',
            ]);
        });
    }
};
