<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Note extends Model
{
    use BelongsToTeamOrUser;

    protected $fillable = [
        'user_id',
        'team_id',
        'notable_id',
        'notable_type',
        'body',
        'mentions',
        'is_pinned',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'mentions' => 'array',
        ];
    }

    public static function parseMentions(string $body): array
    {
        preg_match_all('/@\[([^\]]+)\]\((\d+)\)/', $body, $matches, PREG_SET_ORDER);

        return array_map(fn ($m) => ['user_id' => (int) $m[2], 'name' => $m[1]], $matches);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function notable(): MorphTo
    {
        return $this->morphTo();
    }
}
