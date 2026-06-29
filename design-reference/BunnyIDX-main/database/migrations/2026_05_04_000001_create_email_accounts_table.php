<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->default('google');
            $table->string('email_address');
            $table->string('provider_account_id')->nullable();
            $table->text('access_token');
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->string('sync_state')->default('pending'); // pending, syncing, active, error
            $table->string('history_id')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamp('last_full_sync_at')->nullable();
            $table->string('sync_error')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'email_address']);
            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_accounts');
    }
};
