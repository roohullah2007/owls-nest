<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotency anchor for Stripe-driven credits (top-ups). A Stripe checkout
 * session / payment grants credits at most once, even though both the webhook
 * and the success-page reconciliation try. Unique allows many NULLs (non-Stripe
 * ledger entries).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->string('stripe_reference')->nullable()->unique()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->dropColumn('stripe_reference');
        });
    }
};
