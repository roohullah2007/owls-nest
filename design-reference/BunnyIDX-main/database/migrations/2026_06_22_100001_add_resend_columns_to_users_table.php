<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-user "bring your own Resend key" for branded notification emails.
 * The key is stored encrypted (Eloquent 'encrypted' cast on the model); the
 * last four chars are kept in clear for a "ending in abcd" status display so
 * the secret itself never has to be read back.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('resend_api_key')->nullable()->after('settings');
            $table->string('resend_from_email')->nullable()->after('resend_api_key');
            $table->string('resend_from_name')->nullable()->after('resend_from_email');
            $table->string('resend_last_four', 8)->nullable()->after('resend_from_name');
            $table->string('resend_test_status', 16)->nullable()->after('resend_last_four');
            $table->timestamp('resend_last_tested_at')->nullable()->after('resend_test_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'resend_api_key',
                'resend_from_email',
                'resend_from_name',
                'resend_last_four',
                'resend_test_status',
                'resend_last_tested_at',
            ]);
        });
    }
};
