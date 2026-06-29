<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->renameColumn('brokerage_logo', 'brokerage_logo_light');
        });

        Schema::table('agent_websites', function (Blueprint $table) {
            $table->string('brokerage_logo_dark')->nullable()->after('brokerage_logo_light');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn('brokerage_logo_dark');
        });

        Schema::table('agent_websites', function (Blueprint $table) {
            $table->renameColumn('brokerage_logo_light', 'brokerage_logo');
        });
    }
};
