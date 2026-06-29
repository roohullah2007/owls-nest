<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Visitor accounts for published agent websites (Login/Register on the
 * property-search header). Scoped per site — the same email can register on
 * two different agent sites independently. Auth is a lightweight session key
 * (no Laravel guard): see SiteVisitorAuthController.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_visitors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_website_id')->constrained()->cascadeOnDelete();
            // The CRM lead this visitor syncs activity to (created at signup).
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('password');
            $table->string('phone', 50)->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();

            $table->unique(['agent_website_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_visitors');
    }
};
