<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Listing extends Model
{
    use BelongsToTeamOrUser, HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'team_id',
        'contact_id',
        'deal_id',
        'listing_type',
        'status',
        'title',
        'address',
        'unit',
        'city',
        'state_province',
        'postal_code',
        'country',
        'mls_number',
        'price',
        'bedrooms',
        'bathrooms',
        'sqft',
        'lot_size',
        'year_built',
        'description',
        'features',
        'photos',
        'custom_fields',
        'listed_at',
        'sold_at',
        'expired_at',
        'idx_connection_id',
        'mls_listing_id',
        'mls_slug',
        'synced_at',
        'sync_status',
        'is_private',
        'website_section',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'bathrooms' => 'decimal:1',
            'lot_size' => 'decimal:2',
            'features' => 'array',
            'photos' => 'array',
            'custom_fields' => 'array',
            'is_private' => 'boolean',
            'listed_at' => 'date',
            'sold_at' => 'date',
            'expired_at' => 'date',
            'synced_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function idxConnection(): BelongsTo
    {
        return $this->belongsTo(IdxConnection::class);
    }

    public function scopeFromMls($query)
    {
        return $query->whereNotNull('mls_listing_id');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function notes(): MorphMany
    {
        return $this->morphMany(Note::class, 'notable');
    }

    public function tasks(): MorphMany
    {
        return $this->morphMany(Task::class, 'taskable');
    }

    public function timelineEvents(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}
