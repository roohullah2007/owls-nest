<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('phone_numbers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('telnyx_phone_number_id')->nullable();
            $table->string('telnyx_messaging_profile_id')->nullable();
            $table->string('phone_number')->unique();
            $table->string('friendly_name')->nullable();
            $table->json('capabilities')->nullable();
            $table->decimal('monthly_cost', 8, 4)->default(0);
            $table->string('status')->default('pending'); // active, pending, released, failed
            $table->string('number_type')->default('personal'); // personal, team
            $table->boolean('is_default')->default(false);
            $table->timestamp('provisioned_at')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['team_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phone_numbers');
    }
};
