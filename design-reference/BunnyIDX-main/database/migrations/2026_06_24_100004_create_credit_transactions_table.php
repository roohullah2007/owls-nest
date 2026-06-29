<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Append-only ledger for every change to a credit wallet. `amount_cents` is
 * always positive; `direction` (debit|credit) gives the sign. `balance_after_cents`
 * snapshots the running balance for audit/reporting without recomputation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('credit_wallet_id')->constrained()->cascadeOnDelete();
            // The user who triggered the entry (attributes team usage to the member).
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('direction');   // debit | credit
            $table->string('category');    // sms|voice|number_rental|monthly_grant|purchase|refund|adjustment
            $table->integer('amount_cents');          // always positive
            $table->integer('balance_after_cents');
            $table->string('description')->nullable();
            // Optional polymorphic link to what was charged (SmsMessage/CallRecord/PhoneNumber).
            $table->nullableMorphs('reference');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['credit_wallet_id', 'created_at']);
            $table->index(['category', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_transactions');
    }
};
