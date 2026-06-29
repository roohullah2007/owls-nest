<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Calling Scripts — reusable scripts + questionnaires the agent reads from while dialing.
 *
 * A script is owned by either a user (personal) or a team (team-shared). When team-shared,
 * any member can read it; only admins / the original author can edit. Questions live as
 * JSON on the row — for a v1 we don't need a separate table to query against.
 *
 * Wires into the dialer via:
 *   - dialer_sessions.calling_script_id  (which script the session is using)
 *   - dialer_session_calls.answers       (the agent's per-contact answers, JSON)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calling_scripts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('intro')->nullable();           // optional opening line
            $table->longText('body')->nullable();        // main script content (markdown or plain)
            $table->json('questions')->nullable();       // [{id, text, type:text|yes_no|multi, options?}]
            $table->boolean('is_team_shared')->default(false);
            $table->unsignedInteger('usage_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'is_team_shared']); // team's shared library
            $table->index(['user_id', 'created_at']);     // user's personal library
        });

        Schema::table('dialer_sessions', function (Blueprint $table) {
            $table->foreignId('calling_script_id')->nullable()->after('source_id')->constrained()->nullOnDelete();
        });

        Schema::table('dialer_session_calls', function (Blueprint $table) {
            // Per-call questionnaire answers: { questionId: answerValue }
            $table->json('answers')->nullable()->after('disposition_notes');
        });
    }

    public function down(): void
    {
        Schema::table('dialer_session_calls', function (Blueprint $table) {
            $table->dropColumn('answers');
        });
        Schema::table('dialer_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('calling_script_id');
        });
        Schema::dropIfExists('calling_scripts');
    }
};
