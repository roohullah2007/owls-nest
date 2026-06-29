<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('original_filename');
            $table->string('stored_path');
            $table->unsignedInteger('row_count')->default(0);
            $table->json('headers')->nullable();
            $table->json('mapping')->nullable();
            $table->string('default_type')->nullable();
            $table->string('default_source')->nullable();
            $table->enum('status', ['pending', 'mapped', 'processing', 'completed', 'failed'])->default('pending');
            $table->unsignedInteger('imported_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);
            $table->text('error')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'status']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_imports');
    }
};
