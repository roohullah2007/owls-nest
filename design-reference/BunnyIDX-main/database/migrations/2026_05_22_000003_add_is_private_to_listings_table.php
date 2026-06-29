<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            // Private listings are tied to a contact only — they don't appear on
            // the global Properties index. Used when a listing was added from a
            // contact page (e.g. linked from MLS or noted manually as a lead's
            // own property) without explicitly being published as the agent's own.
            $table->boolean('is_private')->default(false)->after('contact_id');
            $table->index(['user_id', 'is_private']);
        });
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'is_private']);
            $table->dropColumn('is_private');
        });
    }
};
