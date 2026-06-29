<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->string('type', 50)->default('buyer');
            $table->string('status', 50)->default('new_lead');
            $table->enum('source', ['website', 'referral', 'open_house', 'social_media', 'cold_call', 'idx', 'manual', 'other'])->default('manual');
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state_province', 50)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('country', 2)->default('US');
            $table->text('description')->nullable();
            $table->json('custom_fields')->nullable();
            $table->tinyInteger('lead_score')->unsigned()->nullable();
            $table->date('date_of_birth')->nullable();
            $table->timestamp('last_contacted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'type']);
            $table->index(['user_id', 'last_name', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
