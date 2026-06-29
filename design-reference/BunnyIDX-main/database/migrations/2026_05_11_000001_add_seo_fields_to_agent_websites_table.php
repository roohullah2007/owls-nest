<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->string('favicon')->nullable()->after('meta_description');
            $table->string('og_image')->nullable()->after('favicon');
            $table->string('og_title', 255)->nullable()->after('og_image');
            $table->text('og_description')->nullable()->after('og_title');
            $table->text('robots_txt')->nullable()->after('og_description');
            $table->text('llms_txt')->nullable()->after('robots_txt');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn(['favicon', 'og_image', 'og_title', 'og_description', 'robots_txt', 'llms_txt']);
        });
    }
};
