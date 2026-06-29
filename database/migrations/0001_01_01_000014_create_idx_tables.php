<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idx_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 30); // bridge, repliers, paragon
            $table->string('mls_slug', 50);
            $table->string('display_name');
            $table->text('api_key')->nullable(); // encrypted at model level, null for Bridge (uses system token)
            $table->string('agent_id', 100)->nullable();
            $table->string('office_id', 100)->nullable();
            $table->json('constraints')->nullable(); // global data limitations
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_tested_at')->nullable();
            $table->string('test_status', 20)->default('untested'); // untested, passed, failed
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->unique(['user_id', 'mls_slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idx_connections');
    }
};
