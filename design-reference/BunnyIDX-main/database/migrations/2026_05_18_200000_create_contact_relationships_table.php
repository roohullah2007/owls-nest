<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignId('related_contact_id')->constrained('contacts')->cascadeOnDelete();
            // Slug for the relationship from contact_id's perspective:
            // spouse, partner, parent, child, sibling, grandparent, grandchild,
            // in_law, guardian, dependent, other
            $table->string('type', 30);
            // Free-text override shown to the user (e.g. "step-mother", "ex").
            $table->string('custom_label', 100)->nullable();
            $table->timestamps();

            $table->unique(['contact_id', 'related_contact_id']);
            $table->index(['related_contact_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_relationships');
    }
};
