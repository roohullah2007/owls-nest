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

class Company extends Model
{
    use BelongsToTeamOrUser, HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'team_id',
        'name',
        'email',
        'phone',
        'website',
        'address',
        'city',
        'state_province',
        'postal_code',
        'country',
        'notes',
        'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'custom_fields' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function notes(): MorphMany
    {
        return $this->morphMany(Note::class, 'notable');
    }

    public function timelineEvents(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}
