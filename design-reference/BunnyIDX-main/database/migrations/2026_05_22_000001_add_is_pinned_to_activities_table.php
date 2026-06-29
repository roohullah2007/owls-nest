<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->boolean('is_pinned')->default(false)->after('metadata');
            $table->index(['contact_id', 'is_pinned']);
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropIndex(['contact_id', 'is_pinned']);
            $table->dropColumn('is_pinned');
        });
    }
};
