<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relay_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('license_id')->constrained()->cascadeOnDelete();
            $table->string('mls_slug', 50);
            $table->string('endpoint', 500);
            $table->string('params_hash', 64)->nullable();
            $table->smallInteger('http_status');
            $table->smallInteger('response_ms')->nullable();
            $table->boolean('was_cached')->default(false);
            $table->string('error_message', 500)->nullable();
            $table->timestamp('requested_at')->useCurrent();

            $table->index(['license_id', 'requested_at']);
            $table->index(['mls_slug', 'requested_at']);
        });

        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('stripe_event_id')->unique();
            $table->string('event_type', 100);
            $table->timestamp('processed_at');
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
        Schema::dropIfExists('relay_logs');
    }
};
