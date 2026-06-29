<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telnyx_brands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('telnyx_brand_id')->nullable();
            $table->string('company_name');
            $table->text('ein')->nullable(); // encrypted at model level
            $table->string('entity_type')->nullable(); // PRIVATE_PROFIT, PUBLIC_PROFIT, NON_PROFIT, GOVERNMENT, SOLE_PROPRIETOR
            $table->string('vertical')->nullable(); // REAL_ESTATE, etc.
            $table->string('website')->nullable();
            $table->string('status')->default('pending'); // pending, verified, failed, rejected
            $table->json('rejection_reasons')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telnyx_brands');
    }
};
