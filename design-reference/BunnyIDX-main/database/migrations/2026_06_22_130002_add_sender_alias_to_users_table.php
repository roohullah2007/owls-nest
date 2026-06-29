<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional per-user platform sending alias. The local-part username is stored
 * (e.g. "john.smith"); the full address {alias}.updates@{domain} is built by
 * App\Services\Email\SenderAliasService. Unique so two accounts can't share an
 * alias; nullable so accounts without one fall back to the default sender.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('sender_alias', 64)->nullable()->unique()->after('resend_last_tested_at');
            $table->string('sender_alias_display_name', 120)->nullable()->after('sender_alias');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['sender_alias', 'sender_alias_display_name']);
        });
    }
};
