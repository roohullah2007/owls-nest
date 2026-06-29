<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_logs', function (Blueprint $table) {
            $table->text('cc')->nullable()->after('to_address');
            $table->text('bcc')->nullable()->after('cc');
        });
    }

    public function down(): void
    {
        Schema::table('email_logs', function (Blueprint $table) {
            $table->dropColumn(['cc', 'bcc']);
        });
    }
};
