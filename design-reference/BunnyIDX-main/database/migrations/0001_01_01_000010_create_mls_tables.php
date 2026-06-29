<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mls_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('license_id')->constrained()->cascadeOnDelete();
            $table->string('mls_slug', 50);
            $table->text('client_id');
            $table->text('client_secret');
            $table->string('member_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_verified_at')->nullable();
            $table->timestamps();

            $table->unique(['license_id', 'mls_slug']);
            $table->index('mls_slug');
        });

        Schema::create('mls_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('credential_id')->constrained('mls_credentials')->cascadeOnDelete();
            $table->text('access_token');
            $table->text('refresh_token')->nullable();
            $table->string('token_type', 50)->default('Bearer');
            $table->timestamp('expires_at');
            $table->string('scope', 500)->nullable();
            $table->timestamps();

            $table->index('credential_id');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mls_tokens');
        Schema::dropIfExists('mls_credentials');
    }
};
