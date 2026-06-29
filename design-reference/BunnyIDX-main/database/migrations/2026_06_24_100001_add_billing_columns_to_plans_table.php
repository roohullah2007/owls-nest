<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Per-plan quotas, limits and seat pricing. All money is stored in **cents**.
 * These are admin-editable in Admin > Plans; the DB row is the source of truth
 * after seed. Nullable integer limits mean "unlimited" where noted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            // Monthly phone-credit allowance granted by the plan (USD cents).
            $table->integer('included_credits_cents')->default(0)->after('features');
            // Max active phone numbers; null = unlimited.
            $table->integer('phone_number_limit')->nullable()->after('included_credits_cents');
            // Max agent websites; null = unlimited.
            $table->integer('website_limit')->nullable()->after('phone_number_limit');
            // Transactional (quota-counting) emails per user per month; null = unlimited.
            $table->integer('email_quota_monthly')->nullable()->after('website_limit');
            // Team seats included before per-seat charges kick in.
            $table->integer('included_seats')->default(1)->after('email_quota_monthly');
            // Price per extra active member beyond included_seats (USD cents).
            $table->integer('extra_seat_price_cents')->default(0)->after('included_seats');
            // Price per team-member website beyond the included allowance (USD cents); null = not billed.
            $table->integer('per_member_website_price_cents')->nullable()->after('extra_seat_price_cents');
            // Stripe price id for the per-seat quantity subscription item (Phase 2).
            $table->string('extra_seat_stripe_price_id')->nullable()->after('per_member_website_price_cents');
        });

        // Seed sensible starter values; the owner tunes these in Admin > Plans.
        $defaults = [
            'free' => [
                'included_credits_cents' => 0,
                'phone_number_limit' => 0,
                'website_limit' => 0,
                'email_quota_monthly' => 50,
                'included_seats' => 1,
                'extra_seat_price_cents' => 0,
                'per_member_website_price_cents' => null,
            ],
            'pro' => [
                'included_credits_cents' => 1000,   // $10 included phone credit
                'phone_number_limit' => 1,
                'website_limit' => 1,
                'email_quota_monthly' => 1000,
                'included_seats' => 1,
                'extra_seat_price_cents' => 0,
                'per_member_website_price_cents' => null,
            ],
            'enterprise' => [
                'included_credits_cents' => 5000,   // $50 included phone credit
                'phone_number_limit' => 5,
                'website_limit' => null,            // unlimited team websites
                'email_quota_monthly' => 2000,
                'included_seats' => 5,              // 5 members included
                'extra_seat_price_cents' => 2000,  // $20 / additional member / month
                'per_member_website_price_cents' => 1000, // $10 / member website (Phase 2 billing)
            ],
        ];

        foreach ($defaults as $key => $values) {
            DB::table('plans')->where('key', $key)->update($values);
        }
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn([
                'included_credits_cents',
                'phone_number_limit',
                'website_limit',
                'email_quota_monthly',
                'included_seats',
                'extra_seat_price_cents',
                'per_member_website_price_cents',
                'extra_seat_stripe_price_id',
            ]);
        });
    }
};
