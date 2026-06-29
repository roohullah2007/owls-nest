<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('key', 20)->unique();
            $table->string('email');
            $table->string('purchase_ref');
            $table->enum('purchase_source', ['stripe', 'gumroad', 'manual'])->default('stripe');
            $table->enum('status', ['active', 'revoked', 'suspended'])->default('active');
            $table->text('note')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->string('revoked_reason')->nullable();
            $table->timestamps();

            $table->index('email');
            $table->index('status');
        });

        Schema::create('license_domains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('license_id')->constrained()->cascadeOnDelete();
            $table->string('domain');
            $table->boolean('is_active')->default(true);
            $table->timestamp('activated_at');
            $table->timestamp('deactivated_at')->nullable();
            $table->string('ip_address', 45)->nullable();

            $table->index(['license_id', 'domain']);
            $table->index(['domain', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('license_domains');
        Schema::dropIfExists('licenses');
    }
};
