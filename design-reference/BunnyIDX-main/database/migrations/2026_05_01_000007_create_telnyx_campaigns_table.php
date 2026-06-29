<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telnyx_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('telnyx_brand_id')->constrained('telnyx_brands')->cascadeOnDelete();
            $table->string('telnyx_campaign_id')->nullable();
            $table->string('use_case')->default('MIXED'); // MIXED, MARKETING, CUSTOMER_CARE, etc.
            $table->text('description')->nullable();
            $table->text('sample_message_1')->nullable();
            $table->text('sample_message_2')->nullable();
            $table->boolean('subscriber_optin')->default(true);
            $table->boolean('subscriber_optout')->default(true);
            $table->boolean('subscriber_help')->default(true);
            $table->string('status')->default('pending'); // pending, active, failed, rejected
            $table->json('rejection_reasons')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telnyx_campaigns');
    }
};
