<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Website curation flag on CRM listings: 'featured' | 'sold' | null.
     * A flagged listing appears on the owner's agent-website Featured
     * Properties / Past Transactions pages (single source of truth — the
     * CRM /properties store).
     */
    public function up(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->string('website_section', 20)->nullable()->after('is_private');
            $table->index(['user_id', 'website_section']);
        });
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'website_section']);
            $table->dropColumn('website_section');
        });
    }
};
