<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Tag extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = ['user_id', 'team_id', 'name', 'color'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contacts(): MorphToMany
    {
        return $this->morphedByMany(Contact::class, 'taggable');
    }

    public function deals(): MorphToMany
    {
        return $this->morphedByMany(Deal::class, 'taggable');
    }

    public function companies(): MorphToMany
    {
        return $this->morphedByMany(Company::class, 'taggable');
    }
}
