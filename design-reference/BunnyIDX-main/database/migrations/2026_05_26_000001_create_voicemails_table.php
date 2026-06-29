<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Voicemails — pre-recorded audio clips the agent can drop on a live call
 * (Power Dialer "VM Drop" button) or use as the message for an outbound
 * cold-voicemail drop.
 *
 * Audio file is stored on the configured disk; `audio_url` is the
 * publicly-accessible URL Telnyx fetches when playing the clip.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voicemails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 120);
            $table->string('audio_url'); // public URL Telnyx fetches
            $table->string('audio_path')->nullable(); // local storage path (for cleanup)
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_team_shared')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_default']);
            $table->index(['team_id', 'is_team_shared']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voicemails');
    }
};
