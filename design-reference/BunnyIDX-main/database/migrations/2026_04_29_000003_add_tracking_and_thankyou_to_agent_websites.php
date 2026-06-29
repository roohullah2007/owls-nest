<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->text('tracking_head')->nullable()->after('meta_description');
            $table->text('tracking_body')->nullable()->after('tracking_head');
            $table->string('thank_you_headline', 255)->nullable()->after('tracking_body');
            $table->text('thank_you_message')->nullable()->after('thank_you_headline');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropColumn(['tracking_head', 'tracking_body', 'thank_you_headline', 'thank_you_message']);
        });
    }
};
