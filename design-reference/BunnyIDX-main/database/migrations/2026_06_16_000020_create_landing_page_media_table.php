<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_page_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landing_page_id')->constrained()->cascadeOnDelete();
            $table->string('path');                 // storage path on the public disk
            $table->string('filename')->nullable(); // original file name
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->timestamps();

            $table->index('landing_page_id');
            $table->unique(['landing_page_id', 'path']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_page_media');
    }
};
