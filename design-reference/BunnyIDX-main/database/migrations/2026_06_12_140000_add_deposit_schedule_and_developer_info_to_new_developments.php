<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pre-construction extras: the developer's deposit schedule (ordered
     * steps, e.g. "20% at Contract") and an About-the-Developer blurb shown
     * on the project page.
     */
    public function up(): void
    {
        Schema::table('new_developments', function (Blueprint $table) {
            $table->json('deposit_schedule')->nullable()->after('key_details');
            $table->text('developer_info')->nullable()->after('developer');
        });
    }

    public function down(): void
    {
        Schema::table('new_developments', function (Blueprint $table) {
            $table->dropColumn(['deposit_schedule', 'developer_info']);
        });
    }
};
