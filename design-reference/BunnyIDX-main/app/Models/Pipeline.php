<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pipeline extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'name',
        'lead_type',
        'is_default',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function stages(): HasMany
    {
        return $this->hasMany(PipelineStage::class)->orderBy('position');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function openStages(): HasMany
    {
        return $this->hasMany(PipelineStage::class)->where('type', 'open')->orderBy('position');
    }

    public function wonStage(): HasMany
    {
        return $this->hasMany(PipelineStage::class)->where('type', 'won');
    }

    public function lostStage(): HasMany
    {
        return $this->hasMany(PipelineStage::class)->where('type', 'lost');
    }
}
