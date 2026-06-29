<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->string('listing_type', 50);
            $table->string('status', 50);
            $table->string('title', 255);
            $table->string('address')->nullable();
            $table->string('city', 255)->nullable();
            $table->string('state_province', 50)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('country', 2)->default('US');
            $table->string('mls_number', 50)->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->unsignedTinyInteger('bedrooms')->nullable();
            $table->decimal('bathrooms', 3, 1)->nullable();
            $table->unsignedInteger('sqft')->nullable();
            $table->decimal('lot_size', 10, 2)->nullable();
            $table->unsignedSmallInteger('year_built')->nullable();
            $table->text('description')->nullable();
            $table->json('features')->nullable();
            $table->json('photos')->nullable();
            $table->json('custom_fields')->nullable();
            $table->date('listed_at')->nullable();
            $table->date('sold_at')->nullable();
            $table->date('expired_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'listing_type']);
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'mls_number']);
        });

        // Add listing_id to activities (listings table must exist first for FK)
        Schema::table('activities', function (Blueprint $table) {
            $table->foreignId('listing_id')->nullable()->after('company_id')->constrained()->nullOnDelete();
            $table->index(['listing_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropConstrainedForeignId('listing_id');
        });

        Schema::dropIfExists('listings');
    }
};
