<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Allow a single "default" area-code price row that applies to every area code
 * without a specific override. The default row stores a NULL area_code; the
 * unique index still keeps each concrete 3-digit code unique (NULLs are
 * distinct in SQLite/MySQL, and the controller guards a single default row).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('area_code_prices', function (Blueprint $table) {
            $table->string('area_code', 3)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('area_code_prices', function (Blueprint $table) {
            $table->string('area_code', 3)->nullable(false)->change();
        });
    }
};
