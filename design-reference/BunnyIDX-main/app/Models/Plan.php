<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'key',
        'name',
        'description',
        'monthly_price',
        'is_paid',
        'trial_days',
        'features',
        'stripe_price_id',
        'sort_order',
        'is_active',
        'included_credits_cents',
        'phone_number_limit',
        'website_limit',
        'email_quota_monthly',
        'included_seats',
        'extra_seat_price_cents',
        'per_member_website_price_cents',
        'extra_seat_stripe_price_id',
    ];

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'is_paid' => 'boolean',
            'is_active' => 'boolean',
            'trial_days' => 'integer',
            'sort_order' => 'integer',
            'included_credits_cents' => 'integer',
            'phone_number_limit' => 'integer',
            'website_limit' => 'integer',
            'email_quota_monthly' => 'integer',
            'included_seats' => 'integer',
            'extra_seat_price_cents' => 'integer',
            'per_member_website_price_cents' => 'integer',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    public function hasFeature(string $key): bool
    {
        return in_array($key, $this->features ?? [], true);
    }

    public function offersTrial(): bool
    {
        return $this->is_paid && $this->trial_days > 0;
    }

    /** The canonical gateable feature catalog (key => label). */
    public static function featureCatalog(): array
    {
        return config('features.catalog', []);
    }

    /** Resolve a plan by its key (free/pro/enterprise). */
    public static function findByKey(?string $key): ?self
    {
        if (! $key) {
            return null;
        }

        return static::where('key', $key)->first();
    }
}
