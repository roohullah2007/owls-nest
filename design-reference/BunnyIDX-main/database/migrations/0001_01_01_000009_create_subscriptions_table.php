<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('license_id')->constrained()->restrictOnDelete();
            $table->string('stripe_subscription_id')->unique();
            $table->string('stripe_customer_id');
            $table->string('mls_slug', 50);
            $table->enum('status', ['active', 'past_due', 'canceled', 'incomplete', 'trialing'])->default('active');
            $table->timestamp('current_period_start');
            $table->timestamp('current_period_end');
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();

            $table->index(['license_id', 'mls_slug']);
            $table->index('stripe_subscription_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
