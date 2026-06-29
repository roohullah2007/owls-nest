<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('notable');
            $table->text('body');
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->nullableMorphs('taskable');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->timestamp('due_at')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamp('reminder_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->boolean('is_completed')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_completed', 'due_at']);
        });

        Schema::create('call_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('direction', ['inbound', 'outbound']);
            $table->enum('outcome', ['connected', 'no_answer', 'left_voicemail', 'busy', 'wrong_number'])->default('connected');
            $table->string('phone_number', 20)->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['contact_id', 'created_at']);
        });

        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('direction', ['inbound', 'outbound']);
            $table->string('from_address');
            $table->string('to_address');
            $table->string('subject');
            $table->text('body_preview')->nullable();
            $table->string('thread_id')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamps();

            $table->index(['contact_id', 'created_at']);
        });

        Schema::create('sms_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('direction', ['inbound', 'outbound']);
            $table->string('phone_number', 20)->nullable();
            $table->text('body');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->index(['contact_id', 'created_at']);
        });

        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->enum('meeting_type', ['in_person', 'phone', 'video', 'showing', 'open_house']);
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->boolean('is_completed')->default(false);
            $table->string('outcome')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'starts_at']);
        });

        Schema::create('calendar_feeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('url', 2048);
            $table->string('color', 7)->default('#6B7280');
            $table->json('cached_events')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_feeds');
        Schema::dropIfExists('meetings');
        Schema::dropIfExists('sms_logs');
        Schema::dropIfExists('email_logs');
        Schema::dropIfExists('call_logs');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('notes');
    }
};
