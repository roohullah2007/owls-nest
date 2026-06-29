<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->json('permissions')->nullable()->after('role');
            $table->boolean('is_active')->default(true)->after('permissions');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('active_context', 20)->default('personal')->after('team_id');
        });
    }

    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropColumn(['permissions', 'is_active']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('active_context');
        });
    }
};
