<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Full project address: street (address) + city + zip. */
    public function up(): void
    {
        Schema::table('new_developments', function (Blueprint $table) {
            $table->string('zip', 12)->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('new_developments', function (Blueprint $table) {
            $table->dropColumn('zip');
        });
    }
};
