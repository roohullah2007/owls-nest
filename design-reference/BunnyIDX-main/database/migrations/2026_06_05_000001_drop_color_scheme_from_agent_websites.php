<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Removes the dark-mode "feature": the legacy `color_scheme` (dark/light) toggle.
 * Templates render a single fixed palette and no longer read this column, so the
 * stored value is dead. Dropping it removes the dark-mode concept from the schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('agent_websites', 'color_scheme')) {
            Schema::table('agent_websites', function (Blueprint $table) {
                $table->dropColumn('color_scheme');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('agent_websites', 'color_scheme')) {
            Schema::table('agent_websites', function (Blueprint $table) {
                $table->string('color_scheme')->default('dark')->after('template');
            });
        }
    }
};
