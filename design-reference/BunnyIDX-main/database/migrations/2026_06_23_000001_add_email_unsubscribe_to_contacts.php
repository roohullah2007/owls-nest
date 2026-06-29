<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contact-level email opt-out + a public, token-based unsubscribe handle for
 * automated (Action Plan) emails. Mirrors the SiteVisitor alert-unsubscribe
 * pattern (alerts_unsubscribed_at / alerts_unsubscribe_token) so the two
 * audiences behave consistently. Manual one-to-one inbox email is unaffected —
 * this only gates bulk/automated Resend sends.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->boolean('email_opted_out')->default(false)->after('sms_opted_out_at');
            $table->timestamp('email_opted_out_at')->nullable()->after('email_opted_out');
            $table->string('email_unsubscribe_token', 64)->nullable()->unique()->after('email_opted_out_at');
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropUnique(['email_unsubscribe_token']);
            $table->dropColumn(['email_opted_out', 'email_opted_out_at', 'email_unsubscribe_token']);
        });
    }
};
