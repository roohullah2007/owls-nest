<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Power Dialer session model.
 *
 * A DialerSession represents one user's working session of dialing through a queue of
 * contacts (or call-tasks). The queue itself lives in `dialer_session_calls` so we can
 * record per-attempt disposition, reorder/skip rows, and query historical
 * "contacts dialed in the last 7 days" cheaply.
 *
 * Stats columns are denormalized counters updated in transaction when a disposition
 * is written — querying COUNT(*) GROUP BY disposition across millions of pivot rows
 * gets expensive once we have heavy users.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dialer_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name')->nullable(); // optional user-given label, e.g. "Q3 Cold Call Push"

            // Lifecycle. 'abandoned' is for sessions the user walked away from without ending —
            // a daily scheduler can mark active/paused sessions older than 24h as abandoned.
            $table->enum('status', ['active', 'paused', 'completed', 'abandoned'])->default('active');

            // Where the queue came from. Drives UX hints ("Resumes from Smart List: Hot Leads")
            // and lets us deep-link back to the source after the session.
            $table->enum('source_type', ['contacts', 'smart_list', 'tasks', 'manual'])->default('manual');
            $table->unsignedBigInteger('source_id')->nullable(); // e.g. saved_contact_views.id for smart_list

            // Cursor + denormalized stats.
            $table->unsignedInteger('total_contacts')->default(0);
            $table->unsignedInteger('current_position')->default(0); // 0-based index into the queue
            $table->unsignedInteger('calls_attempted')->default(0);
            $table->unsignedInteger('calls_connected')->default(0);
            $table->unsignedInteger('calls_voicemail')->default(0);
            $table->unsignedInteger('calls_no_answer')->default(0);
            $table->unsignedInteger('calls_wrong_number')->default(0);
            $table->unsignedInteger('calls_dnc')->default(0);
            $table->unsignedInteger('callbacks_scheduled')->default(0);
            $table->unsignedInteger('calls_skipped')->default(0);

            $table->timestamp('started_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('last_resumed_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);    // "my active sessions"
            $table->index(['team_id', 'status']);    // team supervisor views
            $table->index(['status', 'created_at']); // scheduler scan for abandoned sessions
        });

        Schema::create('dialer_session_calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dialer_session_id')->constrained()->cascadeOnDelete();
            // Contact can be deleted while still referenced from old sessions; keep the row.
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            // For sessions sourced from tasks: completing the call completes the task.
            $table->foreignId('task_id')->nullable()->constrained()->nullOnDelete();

            $table->unsignedInteger('position'); // order in the queue (0-based, matches session.current_position)

            // Per-row lifecycle. 'in_progress' is the row the user is actively dialing.
            $table->enum('status', ['pending', 'in_progress', 'completed', 'skipped'])->default('pending');

            // Outcome the agent picked at end of call. Null until disposition recorded.
            $table->enum('disposition', [
                'connected',
                'no_answer',
                'voicemail',
                'wrong_number',
                'do_not_call',
                'callback_scheduled',
            ])->nullable();
            $table->text('disposition_notes')->nullable();

            // Link back to the actual call placed. Null when the row was skipped without dialing.
            $table->foreignId('call_record_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('duration_seconds')->nullable(); // denormalized for reporting

            // For callback_scheduled — when to follow up. Creates a Task automatically.
            $table->timestamp('callback_at')->nullable();

            $table->timestamp('attempted_at')->nullable();
            $table->timestamps();

            // (session, position) is the queue lookup key — used by getNext().
            $table->unique(['dialer_session_id', 'position']);
            // (session, status) for "next pending" scans.
            $table->index(['dialer_session_id', 'status']);
            // Per-contact history across all sessions.
            $table->index(['contact_id', 'created_at']);
            // For the daily Callback Report.
            $table->index('callback_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dialer_session_calls');
        Schema::dropIfExists('dialer_sessions');
    }
};
