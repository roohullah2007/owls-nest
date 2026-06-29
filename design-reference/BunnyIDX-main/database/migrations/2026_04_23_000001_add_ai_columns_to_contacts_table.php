<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->text('ai_summary')->nullable()->after('lead_score');
            $table->timestamp('ai_summary_at')->nullable()->after('ai_summary');
            $table->text('ai_next_action')->nullable()->after('ai_summary_at');
            $table->timestamp('ai_next_action_at')->nullable()->after('ai_next_action');
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn(['ai_summary', 'ai_summary_at', 'ai_next_action', 'ai_next_action_at']);
        });
    }
};
