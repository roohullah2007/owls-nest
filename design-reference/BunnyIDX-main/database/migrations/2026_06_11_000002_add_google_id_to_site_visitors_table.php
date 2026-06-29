<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Google sign-in for site visitors (single platform OAuth client, broker flow). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_visitors', function (Blueprint $table) {
            $table->string('google_id')->nullable()->after('contact_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('site_visitors', function (Blueprint $table) {
            $table->dropColumn('google_id');
        });
    }
};
