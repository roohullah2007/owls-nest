<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Lifetime grant: flag + the tier it covers lives in subscription_tier.
            $table->boolean('is_lifetime')->default(false)->after('subscription_tier');
            // Admin time-limited grant (null = no expiry; ignored for lifetime).
            $table->timestamp('subscription_expires_at')->nullable()->after('is_lifetime');
            // Self-serve trial: which paid plan it grants + when it ends.
            $table->string('trial_plan')->nullable()->after('subscription_expires_at');
            $table->timestamp('trial_ends_at')->nullable()->after('trial_plan');
            $table->boolean('trial_used')->default(false)->after('trial_ends_at');
            // Per-user feature overrides on top of the plan defaults: { "websites": true }.
            $table->json('feature_overrides')->nullable()->after('trial_used');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'is_lifetime',
                'subscription_expires_at',
                'trial_plan',
                'trial_ends_at',
                'trial_used',
                'feature_overrides',
            ]);
        });
    }
};
