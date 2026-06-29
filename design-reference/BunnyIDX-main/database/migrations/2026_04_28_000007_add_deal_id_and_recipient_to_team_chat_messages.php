<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_chat_messages', function (Blueprint $table) {
            $table->foreignId('deal_id')->nullable()->after('listing_id')->constrained('deals')->nullOnDelete();
            $table->foreignId('recipient_id')->nullable()->after('deal_id')->constrained('users')->nullOnDelete();

            $table->index(['team_id', 'contact_id']);
            $table->index(['team_id', 'deal_id']);
            $table->index(['team_id', 'listing_id']);
            $table->index(['team_id', 'recipient_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('team_chat_messages', function (Blueprint $table) {
            $table->dropForeign(['deal_id']);
            $table->dropForeign(['recipient_id']);
            $table->dropIndex(['team_id', 'contact_id']);
            $table->dropIndex(['team_id', 'deal_id']);
            $table->dropIndex(['team_id', 'listing_id']);
            $table->dropIndex(['team_id', 'recipient_id', 'user_id']);
            $table->dropColumn(['deal_id', 'recipient_id']);
        });
    }
};
