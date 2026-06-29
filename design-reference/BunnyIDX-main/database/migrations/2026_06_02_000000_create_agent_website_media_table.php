<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_website_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_website_id')->constrained()->cascadeOnDelete();
            $table->string('path');               // storage path on the public disk
            $table->string('filename')->nullable(); // original file name
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->timestamps();

            $table->index('agent_website_id');
            $table->unique(['agent_website_id', 'path']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_website_media');
    }
};
