<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idx_searches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('mls_slug', 50);
            $table->json('filters');
            $table->string('sort_by', 50)->default('modification_ts');
            $table->string('sort_dir', 4)->default('desc');
            $table->unsignedSmallInteger('per_page')->default(20);
            $table->timestamps();

            $table->index('user_id');
        });

        Schema::create('idx_widgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('license_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('idx_search_id')->nullable()->constrained('idx_searches')->nullOnDelete();
            $table->string('name');
            $table->string('widget_type', 30);
            $table->string('mls_slug', 50);
            $table->json('appearance')->nullable();
            $table->json('config')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idx_widgets');
        Schema::dropIfExists('idx_searches');
    }
};
