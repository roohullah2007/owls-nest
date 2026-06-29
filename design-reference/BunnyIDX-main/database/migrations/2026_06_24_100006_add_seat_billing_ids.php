<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stripe ids needed for per-seat billing. The CRM subscription lives on the
 * billing owner (user); seats are a recurring subscription-item quantity on that
 * same subscription. The team mirrors the subscription id + seat item id so the
 * webhook can sync `purchased_seats` authoritatively.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('stripe_subscription_id')->nullable()->after('stripe_customer_id');
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->string('stripe_subscription_id')->nullable()->after('purchased_seats');
            $table->string('stripe_seat_item_id')->nullable()->after('stripe_subscription_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('stripe_subscription_id');
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn(['stripe_subscription_id', 'stripe_seat_item_id']);
        });
    }
};
