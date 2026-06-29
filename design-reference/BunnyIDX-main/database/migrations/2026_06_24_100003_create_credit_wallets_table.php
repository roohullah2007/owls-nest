<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phone-credit wallet (USD, stored in cents). One wallet per **billing owner**:
 * a team's wallet belongs to the team owner; a solo user owns their own wallet.
 * Team members draw down the team owner's balance (attributed via the ledger).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_wallets', function (Blueprint $table) {
            $table->id();
            // The billing owner (team owner or solo user). Unique = one wallet each.
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            // Set when the wallet belongs to a team (owner's team), else null.
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('balance_cents')->default(0);
            // Portion of the balance granted by the plan's monthly allowance.
            $table->integer('included_allowance_cents')->default(0);
            // When the included monthly allowance is next reset/granted.
            $table->timestamp('allowance_resets_at')->nullable();
            $table->timestamps();

            $table->index('team_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_wallets');
    }
};
