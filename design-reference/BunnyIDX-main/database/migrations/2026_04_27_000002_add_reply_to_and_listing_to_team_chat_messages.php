<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_chat_messages', function (Blueprint $table) {
            $table->foreignId('reply_to_id')->nullable()->after('contact_id')
                ->constrained('team_chat_messages')->nullOnDelete();
            $table->foreignId('listing_id')->nullable()->after('reply_to_id')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('team_chat_messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reply_to_id');
            $table->dropConstrainedForeignId('listing_id');
        });
    }
};
