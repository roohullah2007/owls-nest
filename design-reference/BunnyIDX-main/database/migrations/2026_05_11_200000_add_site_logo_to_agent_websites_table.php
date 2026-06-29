<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->string('site_logo')->nullable()->after('brokerage_logo');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn('site_logo');
        });
    }
};
