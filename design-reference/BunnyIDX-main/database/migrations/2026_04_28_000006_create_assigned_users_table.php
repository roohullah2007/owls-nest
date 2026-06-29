<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assigned_users', function (Blueprint $table) {
            $table->id();
            $table->morphs('assignable');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['assignable_id', 'assignable_type', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assigned_users');
    }
};
