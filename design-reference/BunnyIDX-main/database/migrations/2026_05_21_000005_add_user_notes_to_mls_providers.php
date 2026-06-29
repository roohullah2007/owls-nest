<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mls_providers', function (Blueprint $table) {
            // Free-form notice shown to USERS when they request this MLS.
            // Use it to flag paperwork, expected turnaround, fees, prerequisites.
            // Hidden from the available-MLSes card; revealed in the request modal
            // and on the pending request card so users know what to expect.
            $table->text('setup_notes_user')->nullable()->after('terms_url');
        });
    }

    public function down(): void
    {
        Schema::table('mls_providers', function (Blueprint $table) {
            $table->dropColumn('setup_notes_user');
        });
    }
};
