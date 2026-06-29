<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('email_account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('email_thread_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('deal_id')->nullable()->constrained()->nullOnDelete();
            $table->string('gmail_message_id');
            $table->string('direction'); // inbound, outbound
            $table->string('from_address');
            $table->string('from_name')->nullable();
            $table->json('to_addresses');
            $table->json('cc_addresses')->nullable();
            $table->json('bcc_addresses')->nullable();
            $table->string('subject')->nullable();
            $table->text('body_text')->nullable();
            $table->longText('body_html')->nullable();
            $table->text('snippet')->nullable();
            $table->json('label_ids')->nullable();
            $table->boolean('is_read')->default(false);
            $table->boolean('is_starred')->default(false);
            $table->boolean('has_attachments')->default(false);
            $table->json('attachments_metadata')->nullable();
            $table->string('in_reply_to')->nullable();
            $table->text('references')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['email_account_id', 'gmail_message_id']);
            $table->index(['email_thread_id', 'sent_at']);
            $table->index('contact_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_messages');
    }
};
