<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('calendar_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 20);                // google, microsoft
            $table->string('email_address');               // calendar owner email
            $table->string('calendar_id')->nullable();     // provider's primary calendar id
            $table->string('color', 7)->default('#1693C9');
            $table->text('access_token')->nullable();      // encrypted
            $table->text('refresh_token')->nullable();     // encrypted
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['user_id', 'provider', 'email_address']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_accounts');
    }
};
