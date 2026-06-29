<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-account temporary lockout after repeated failed sign-in attempts.
 * Separate counters for password login and the 2FA challenge; a single
 * `locked_until` timestamp freezes the account (auto-unlocks when it passes).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedSmallInteger('failed_login_attempts')->default(0)->after('password');
            $table->unsignedSmallInteger('failed_two_factor_attempts')->default(0)->after('failed_login_attempts');
            $table->timestamp('locked_until')->nullable()->after('failed_two_factor_attempts');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['failed_login_attempts', 'failed_two_factor_attempts', 'locked_until']);
        });
    }
};
