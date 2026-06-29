<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extra paid seats a team has purchased beyond its plan's included_seats.
 * Phase 1 enforces the seat cap (included + purchased); Phase 2 keeps this in
 * sync with the Stripe per-seat quantity subscription item.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->unsignedInteger('purchased_seats')->default(0)->after('owner_id');
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn('purchased_seats');
        });
    }
};
