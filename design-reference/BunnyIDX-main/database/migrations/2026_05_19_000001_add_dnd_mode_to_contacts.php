<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            // Allowed values: 'none', 'all', 'sms', 'calls'
            $table->string('dnd_mode', 16)->default('none')->after('sms_opted_out_at');
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn('dnd_mode');
        });
    }
};
