<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add team_id to users
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('team_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        // Add team_id and assigned_to to contacts
        Schema::table('contacts', function (Blueprint $table) {
            $table->foreignId('team_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->after('team_id')->constrained('users')->nullOnDelete();
        });

        // Add team_id and assigned_to to deals
        Schema::table('deals', function (Blueprint $table) {
            $table->foreignId('team_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->after('team_id')->constrained('users')->nullOnDelete();
        });

        // Add team_id to other CRM tables
        $tables = ['listings', 'companies', 'pipelines', 'tags', 'activities', 'tasks', 'notes', 'meetings',
                   'call_logs', 'email_logs', 'sms_logs', 'saved_contact_views', 'saved_listing_views', 'idx_connections'];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->foreignId('team_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        $tables = ['contacts', 'deals', 'listings', 'companies', 'pipelines', 'tags', 'activities', 'tasks',
                   'notes', 'meetings', 'call_logs', 'email_logs', 'sms_logs', 'saved_contact_views',
                   'saved_listing_views', 'idx_connections'];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'team_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropConstrainedForeignId('team_id');
                });
            }
        }

        if (Schema::hasColumn('contacts', 'assigned_to')) {
            Schema::table('contacts', function (Blueprint $table) {
                $table->dropConstrainedForeignId('assigned_to');
            });
        }

        if (Schema::hasColumn('deals', 'assigned_to')) {
            Schema::table('deals', function (Blueprint $table) {
                $table->dropConstrainedForeignId('assigned_to');
            });
        }

        if (Schema::hasColumn('users', 'team_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropConstrainedForeignId('team_id');
            });
        }
    }
};
