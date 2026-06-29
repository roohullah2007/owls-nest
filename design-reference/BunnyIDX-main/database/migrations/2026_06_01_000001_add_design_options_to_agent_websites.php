<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            // Per-theme color overrides, e.g. { "primary": "#1693C9", "secondary": "#0D9488" }.
            $table->json('custom_colors')->nullable()->after('accent_color');
            // Header background treatment: 'transparent' over the hero, or 'solid'.
            $table->string('header_style')->nullable()->default('solid')->after('custom_colors');
            // Whether the header sticks to the top on scroll.
            $table->boolean('header_sticky')->default(true)->after('header_style');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn(['custom_colors', 'header_style', 'header_sticky']);
        });
    }
};
