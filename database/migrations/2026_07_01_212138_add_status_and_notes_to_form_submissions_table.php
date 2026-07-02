<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Turns the "Form Submissions" inbox into a lightweight CRM: every submission is
 * a lead moving through a pipeline (`status`) and carrying internal agent
 * `notes`. Existing rows default to the "new" stage.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_submissions', function (Blueprint $table) {
            $table->string('status')->default('new')->index()->after('source_url');
            $table->text('notes')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('form_submissions', function (Blueprint $table) {
            $table->dropColumn(['status', 'notes']);
        });
    }
};
