<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_chat_messages', function (Blueprint $table) {
            $table->boolean('is_ai_response')->default(false)->after('edited_at');
        });
    }

    public function down(): void
    {
        Schema::table('team_chat_messages', function (Blueprint $table) {
            $table->dropColumn('is_ai_response');
        });
    }
};
