<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactRelationship extends Model
{
    use HasFactory;

    protected $fillable = [
        'contact_id',
        'related_contact_id',
        'type',
        'custom_label',
    ];

    /**
     * Map every supported relationship type to its inverse — the type that should
     * be written on the reciprocal row from the other contact's perspective.
     */
    public const INVERSE = [
        'spouse' => 'spouse',
        'partner' => 'partner',
        'sibling' => 'sibling',
        'in_law' => 'in_law',
        'other' => 'other',
        'parent' => 'child',
        'child' => 'parent',
        'grandparent' => 'grandchild',
        'grandchild' => 'grandparent',
        'guardian' => 'dependent',
        'dependent' => 'guardian',
    ];

    public const TYPES = [
        'spouse' => 'Spouse',
        'partner' => 'Partner',
        'parent' => 'Parent',
        'child' => 'Child',
        'sibling' => 'Sibling',
        'grandparent' => 'Grandparent',
        'grandchild' => 'Grandchild',
        'in_law' => 'In-law',
        'guardian' => 'Guardian',
        'dependent' => 'Dependent',
        'other' => 'Other',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function relatedContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'related_contact_id');
    }

    public static function inverseOf(string $type): string
    {
        return self::INVERSE[$type] ?? 'other';
    }
}
