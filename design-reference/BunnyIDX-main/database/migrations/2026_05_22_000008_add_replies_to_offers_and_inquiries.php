<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_offers', function (Blueprint $table) {
            $table->json('replies')->nullable()->after('notes');
        });

        Schema::table('contact_inquiries', function (Blueprint $table) {
            $table->json('replies')->nullable()->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('contact_offers', function (Blueprint $table) {
            $table->dropColumn('replies');
        });

        Schema::table('contact_inquiries', function (Blueprint $table) {
            $table->dropColumn('replies');
        });
    }
};
