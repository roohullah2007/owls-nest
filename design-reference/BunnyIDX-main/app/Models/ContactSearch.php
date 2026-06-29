<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactSearch extends Model
{
    protected $fillable = [
        'contact_id',
        'user_id',
        'team_id',
        'name',
        'filters',
        'notes',
        'last_run_at',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'last_run_at' => 'datetime',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
