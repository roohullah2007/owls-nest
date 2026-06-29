<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VoicemailDrop extends Model
{
    use HasFactory, BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'name',
        'description',
        'audio_path',
        'audio_url',
        'duration_seconds',
        'size_bytes',
        'mime_type',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'size_bytes' => 'integer',
            'is_default' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function calls(): HasMany
    {
        return $this->hasMany(CallRecord::class);
    }
}
