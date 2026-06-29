<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadImport extends Model
{
    use BelongsToTeamOrUser, HasFactory;

    protected $fillable = [
        'user_id',
        'team_id',
        'original_filename',
        'stored_path',
        'row_count',
        'headers',
        'mapping',
        'default_type',
        'default_source',
        'status',
        'imported_count',
        'skipped_count',
        'error',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'headers' => 'array',
            'mapping' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
