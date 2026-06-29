<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Developer taxonomy for New Developments. A null agent_website_id is a
     * platform-level developer (admin/seed curated, shared); site-owned rows
     * belong to the owner who created them in the editor. new_developments
     * keep the denormalized `developer` name + `developer_info` for display,
     * synced from the linked developer on save.
     */
    public function up(): void
    {
        Schema::create('developers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_website_id')->nullable()
                ->constrained('agent_websites')->cascadeOnDelete();
            $table->string('name', 160);
            $table->string('slug')->unique();
            $table->string('logo', 500)->nullable();
            $table->text('info')->nullable();
            $table->timestamps();

            $table->index(['agent_website_id', 'name']);
        });

        Schema::table('new_developments', function (Blueprint $table) {
            $table->foreignId('developer_id')->nullable()->after('developer')
                ->constrained('developers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('new_developments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('developer_id');
        });
        Schema::dropIfExists('developers');
    }
};
