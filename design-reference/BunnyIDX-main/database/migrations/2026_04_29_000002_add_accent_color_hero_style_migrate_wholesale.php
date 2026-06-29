<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->string('accent_color')->nullable()->after('color_scheme');
            $table->string('hero_style')->default('default')->after('hero_subtitle');
        });

        // Migrate wholesale bold → clean
        DB::table('agent_websites')
            ->where('template', 'wholesale')
            ->where('color_scheme', 'bold')
            ->update(['color_scheme' => 'clean']);
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn(['accent_color', 'hero_style']);
        });
    }
};
