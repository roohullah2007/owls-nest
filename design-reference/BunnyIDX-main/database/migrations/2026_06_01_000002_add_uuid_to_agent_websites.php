<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
        });

        // Backfill existing rows.
        foreach (DB::table('agent_websites')->whereNull('uuid')->pluck('id') as $id) {
            DB::table('agent_websites')->where('id', $id)->update(['uuid' => (string) Str::uuid()]);
        }

        Schema::table('agent_websites', function (Blueprint $table) {
            $table->unique('uuid');
        });
    }

    public function down(): void
    {
        Schema::table('agent_websites', function (Blueprint $table) {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};
