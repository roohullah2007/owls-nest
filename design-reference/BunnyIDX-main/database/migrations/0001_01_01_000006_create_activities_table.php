<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type', 50);
            $table->string('subject');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->nullableMorphs('loggable');
            $table->timestamps();

            $table->index(['contact_id', 'created_at']);
            $table->index(['deal_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
