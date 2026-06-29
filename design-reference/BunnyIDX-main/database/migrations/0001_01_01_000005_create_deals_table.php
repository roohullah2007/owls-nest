<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // contact_id removed — uses deal_contact pivot table instead
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('pipeline_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pipeline_stage_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->decimal('value', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->enum('type', ['buy', 'sell', 'lease', 'referral', 'other'])->default('buy');
            $table->string('property_address')->nullable();
            $table->string('mls_number')->nullable();
            $table->date('expected_close_date')->nullable();
            $table->date('actual_close_date')->nullable();
            $table->decimal('commission_rate', 5, 2)->nullable();
            $table->decimal('commission_amount', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('won_at')->nullable();
            $table->timestamp('lost_at')->nullable();
            $table->string('lost_reason')->nullable();
            $table->json('custom_fields')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'pipeline_id', 'pipeline_stage_id']);
            $table->index(['user_id', 'expected_close_date']);
        });

        Schema::create('deal_contact', function (Blueprint $table) {
            $table->foreignId('deal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->primary(['deal_id', 'contact_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deal_contact');
        Schema::dropIfExists('deals');
    }
};
