<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every public marketing-form submission (contact enquiry, valuation request,
 * …) lands in one inbox table so the admin panel can surface them all in a
 * single "Form Submissions" view. `type` distinguishes which form it came from;
 * `data` carries any per-form extra fields that don't map to the shared columns.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('type')->index();          // contact | valuation | …
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('message')->nullable();
            $table->json('data')->nullable();          // per-form extra fields
            $table->string('source_url')->nullable();  // page the form was on
            $table->timestamp('read_at')->nullable();  // admin has seen it
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_submissions');
    }
};
