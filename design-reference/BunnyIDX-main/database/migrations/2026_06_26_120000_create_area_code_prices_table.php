<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Platform-wide override prices for provisioning a phone number, keyed by the
 * 3-digit US area code. Set by admins; when an entry exists for the searched
 * area code its monthly price replaces the raw Telnyx cost shown/charged to
 * users. Area codes without an entry fall back to the upstream Telnyx cost.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('area_code_prices', function (Blueprint $table) {
            $table->id();
            $table->string('area_code', 3)->unique();
            $table->string('label')->nullable();
            // Monthly price in USD shown/charged for numbers in this area code.
            $table->decimal('monthly_price', 8, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('area_code_prices');
    }
};
