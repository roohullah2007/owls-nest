<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Email suppression list. A spam complaint (or hard bounce) adds the address
 * here so future property-alert / marketing sends can skip it. Transactional
 * emails (verification, password reset) deliberately ignore suppression — they
 * are user-requested and must always be deliverable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_suppressions', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            // complaint | bounce | manual
            $table->string('reason')->nullable();
            $table->string('source')->default('resend');
            $table->timestamp('suppressed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_suppressions');
    }
};
