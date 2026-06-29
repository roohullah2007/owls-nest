<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Monthly property-alert email usage per account. Only successfully sent
 * property alerts increment property_alert_emails_sent. Overage ($/1000 over
 * the included limit) is computed from this — never stored as a charge.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_alert_usage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('year_month', 7); // e.g. "2026-06"
            $table->unsignedInteger('property_alert_emails_sent')->default(0);
            $table->unsignedInteger('included_limit')->default(10000);
            $table->timestamps();

            $table->unique(['user_id', 'year_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_alert_usage');
    }
};
