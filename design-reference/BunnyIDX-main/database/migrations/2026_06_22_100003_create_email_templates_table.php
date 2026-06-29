<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Customisable email templates. A row overrides the code default for a given
 * template `type`. user_id/team_id null = a system-wide override (admin); a
 * user_id row = that user's branded override. The editor UI ships later; this
 * table + the renderer's safe-render layer land now so defaults flow through
 * Resend immediately and overrides can be added without a schema change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained()->cascadeOnDelete();
            // email_verification | password_reset | new_lead_notification |
            // saved_search_alert | property_update_alert | action_plan_email
            $table->string('type');
            $table->string('subject');
            $table->text('body_html');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};
