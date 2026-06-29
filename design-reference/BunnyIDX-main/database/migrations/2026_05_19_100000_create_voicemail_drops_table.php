<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voicemail_drops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            // The audio file. Stored as a relative storage path; served via a signed URL.
            $table->string('audio_path');
            $table->string('audio_url');                // public/signed URL for Telnyx to fetch
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('mime_type', 64)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'is_default']);
            $table->index(['team_id', 'is_default']);
        });

        Schema::table('call_records', function (Blueprint $table) {
            $table->boolean('is_voicedrop')->default(false)->after('is_recorded');
            $table->foreignId('voicemail_drop_id')->nullable()->after('is_voicedrop')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('call_records', function (Blueprint $table) {
            $table->dropConstrainedForeignId('voicemail_drop_id');
            $table->dropColumn('is_voicedrop');
        });

        Schema::dropIfExists('voicemail_drops');
    }
};
