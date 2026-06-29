<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Owner-editable main heading shown above the community description on
     * the public page. Null → the default "Welcome to {name}".
     */
    public function up(): void
    {
        Schema::table('website_areas', function (Blueprint $table) {
            $table->string('description_heading', 160)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('website_areas', function (Blueprint $table) {
            $table->dropColumn('description_heading');
        });
    }
};
