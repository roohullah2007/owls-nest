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
            $table->string('template')->default('luxury')->after('custom_domain');
            $table->string('color_scheme')->default('dark')->after('template');
        });

        // Migrate existing data
        DB::table('agent_websites')->where('theme', 'luxury_dark')->update([
            'template' => 'luxury',
            'color_scheme' => 'dark',
        ]);
        DB::table('agent_websites')->where('theme', 'luxury_light')->update([
            'template' => 'luxury',
            'color_scheme' => 'light',
        ]);

        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn('theme');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->string('theme')->default('luxury_dark')->after('custom_domain');
        });

        DB::table('agent_websites')->where('template', 'luxury')->where('color_scheme', 'dark')->update([
            'theme' => 'luxury_dark',
        ]);
        DB::table('agent_websites')->where('template', 'luxury')->where('color_scheme', 'light')->update([
            'theme' => 'luxury_light',
        ]);

        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn(['template', 'color_scheme']);
        });
    }
};
