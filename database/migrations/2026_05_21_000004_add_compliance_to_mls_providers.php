<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mls_providers', function (Blueprint $table) {
            // Legal/compliance text shown verbatim in listing footers.
            $table->text('disclaimer')->nullable()->after('statuses');

            // Template for the per-listing attribution line.
            // Supports {agent}, {office}, {updated_at}, {mls_name} placeholders.
            $table->string('attribution_template', 500)->nullable()->after('disclaimer');

            // Some MLSes mandate a SPECIFIC logo file separate from the brand logo we show.
            // Kept as a separate column from logo_url so admins can manage display vs compliance.
            $table->string('compliance_logo_url')->nullable()->after('attribution_template');

            // Link to the MLS's terms of use.
            $table->string('terms_url')->nullable()->after('compliance_logo_url');

            // Flexible rules map: { show_updated_at: bool, link_back_required: bool,
            //                       refresh_minutes: int, fair_housing_required: bool, ... }
            $table->json('compliance_rules')->nullable()->after('terms_url');
        });
    }

    public function down(): void
    {
        Schema::table('mls_providers', function (Blueprint $table) {
            $table->dropColumn(['disclaimer', 'attribution_template', 'compliance_logo_url', 'terms_url', 'compliance_rules']);
        });
    }
};
