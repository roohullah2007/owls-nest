<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();          // free | pro | enterprise (matches users.subscription_tier)
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('monthly_price')->nullable(); // display string, e.g. "$29"
            $table->boolean('is_paid')->default(false);
            $table->unsignedInteger('trial_days')->default(0); // 0 = no self-serve trial
            $table->json('features')->nullable();      // array of feature keys this plan grants
            $table->string('stripe_price_id')->nullable(); // optional override; falls back to config
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed the three baseline plans from config defaults so they exist in
        // every environment (including the test DB under RefreshDatabase).
        $defaults = config('features.defaults', [
            'free' => [],
            'pro' => ['websites', 'ai', 'email', 'phone', 'idx'],
            'enterprise' => ['websites', 'ai', 'email', 'phone', 'idx'],
        ]);

        $now = now();
        $rows = [
            ['key' => 'free', 'name' => 'Starter', 'description' => 'Essential CRM to get started.', 'monthly_price' => '$0', 'is_paid' => false, 'trial_days' => 0, 'sort_order' => 0],
            ['key' => 'pro', 'name' => 'Solo Agent', 'description' => 'Everything a solo agent needs to close more deals.', 'monthly_price' => '$29', 'is_paid' => true, 'trial_days' => 14, 'sort_order' => 1],
            ['key' => 'enterprise', 'name' => 'Team', 'description' => 'Built for teams and brokerages.', 'monthly_price' => '$99', 'is_paid' => true, 'trial_days' => 14, 'sort_order' => 2],
        ];

        foreach ($rows as $row) {
            $row['features'] = json_encode($defaults[$row['key']] ?? []);
            $row['is_active'] = true;
            $row['created_at'] = $now;
            $row['updated_at'] = $now;
            DB::table('plans')->insert($row);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
