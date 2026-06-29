<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->boolean('sms_consent')->default(false)->after('custom_fields');
            $table->timestamp('sms_consent_at')->nullable()->after('sms_consent');
            $table->boolean('sms_opted_out')->default(false)->after('sms_consent_at');
            $table->timestamp('sms_opted_out_at')->nullable()->after('sms_opted_out');
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn(['sms_consent', 'sms_consent_at', 'sms_opted_out', 'sms_opted_out_at']);
        });
    }
};
