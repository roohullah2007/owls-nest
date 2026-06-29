<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mls_providers', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();           // 'miamire', 'stellar', ...
            $table->string('display_name');                  // 'Miami Association of REALTORS'
            $table->string('region', 32)->nullable();        // 'FL', 'TX', 'CA', ...
            $table->string('country', 2)->default('US');     // 'US', 'CA'
            $table->string('logo_url')->nullable();

            // Which integration powers this MLS. Hidden from end users.
            $table->enum('data_source', ['bridge', 'realtyna', 'repliers'])->default('bridge');

            // Provider-specific config (Bridge dataset id, Realtyna endpoint, etc.).
            $table->json('data_source_config')->nullable();

            // Feeds available for this MLS.
            $table->boolean('has_idx_feed')->default(true);
            $table->boolean('has_vow_feed')->default(false);

            // Pass-through fee charged on top of any base subscription. 0 = no fee.
            $table->unsignedInteger('monthly_fee_cents')->default(0);

            // 'draft' = admin still configuring, 'visible' = users can request.
            $table->enum('visibility', ['draft', 'visible'])->default('draft');

            // Optional schema hints carried over from config/idx.php.
            $table->json('property_types')->nullable();
            $table->json('statuses')->nullable();

            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['visibility', 'sort_order']);
            $table->index('data_source');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mls_providers');
    }
};
