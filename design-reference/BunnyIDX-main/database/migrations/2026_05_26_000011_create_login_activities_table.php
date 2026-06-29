<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('login_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('event', 20); // login, logout, failed, 2fa_failed
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('device', 100)->nullable();   // parsed
            $table->string('browser', 100)->nullable();  // parsed
            $table->string('platform', 100)->nullable(); // parsed
            $table->timestamp('occurred_at')->index();
            $table->index(['user_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_activities');
    }
};
