<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'contacts',
            'deals',
            'listings',
            'companies',
            'notes',
            'tasks',
            'call_logs',
            'email_logs',
            'sms_logs',
            'tags',
            'pipelines',
            'meetings',
            'activities',
            'saved_contact_views',
            'saved_listing_views',
            'idx_connections',
        ];

        // Get all users who have a team_id
        $usersWithTeams = DB::table('users')
            ->whereNotNull('team_id')
            ->pluck('team_id', 'id');

        foreach ($tables as $table) {
            if (! DB::getSchemaBuilder()->hasColumn($table, 'team_id')) {
                continue;
            }
            if (! DB::getSchemaBuilder()->hasColumn($table, 'user_id')) {
                continue;
            }

            foreach ($usersWithTeams as $userId => $teamId) {
                DB::table($table)
                    ->where('user_id', $userId)
                    ->whereNull('team_id')
                    ->update(['team_id' => $teamId]);
            }
        }
    }

    public function down(): void
    {
        // Not reversible — would lose the distinction of which records were backfilled
    }
};
