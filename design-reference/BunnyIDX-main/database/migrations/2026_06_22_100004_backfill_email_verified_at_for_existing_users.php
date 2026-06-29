<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Verification was never enforced before (User did not implement
 * MustVerifyEmail), so existing accounts have no email_verified_at. Enabling
 * enforcement would lock every current user out behind the `verified`
 * middleware. Grandfather them in: any pre-existing account is treated as
 * verified. New signups from here on must confirm their email.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->whereNull('email_verified_at')
            ->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // No-op: we cannot know which users were unverified before the backfill,
        // and we never want to forcibly un-verify accounts.
    }
};
