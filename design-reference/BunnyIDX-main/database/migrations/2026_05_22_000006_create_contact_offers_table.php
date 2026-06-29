<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('listing_id')->nullable()->constrained()->nullOnDelete();
            $table->string('listing_address')->nullable();
            $table->decimal('amount', 14, 2)->nullable();
            $table->string('status')->default('submitted'); // submitted, accepted, rejected, countered, withdrawn, expired
            $table->text('notes')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->string('source')->default('manual'); // manual | website
            $table->timestamps();

            $table->index(['contact_id', 'created_at']);
            $table->index('listing_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_offers');
    }
};
