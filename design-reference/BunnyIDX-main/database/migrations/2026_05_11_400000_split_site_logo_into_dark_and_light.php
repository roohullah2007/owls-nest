<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->renameColumn('site_logo', 'site_logo_light');
        });
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->string('site_logo_dark')->nullable()->after('site_logo_light');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn('site_logo_dark');
        });
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->renameColumn('site_logo_light', 'site_logo');
        });
    }
};
