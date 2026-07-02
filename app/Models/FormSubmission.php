<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A single submission from any public marketing form — the unit of the admin
 * "Leads" CRM. One row per submit; leads are listed newest-first, marked read,
 * and moved through the pipeline (`status`) with internal `notes`.
 *
 * @property int $id
 * @property string $type
 * @property string|null $name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $message
 * @property array<string,mixed>|null $data
 * @property string|null $source_url
 * @property string $status
 * @property string|null $notes
 * @property Carbon|null $read_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class FormSubmission extends Model
{
    public const TYPE_CONTACT = 'contact';

    public const TYPE_VALUATION = 'valuation';

    public const TYPE_SHOWING = 'showing';

    public const TYPE_BUYER = 'buyer';

    public const TYPE_SELLER = 'seller';

    public const TYPE_NEWSLETTER = 'newsletter';

    /** Human labels for each known form type (used by the admin UI). */
    public const TYPE_LABELS = [
        self::TYPE_CONTACT => 'Contact',
        self::TYPE_VALUATION => 'Valuation Request',
        self::TYPE_SHOWING => 'Showing Request',
        self::TYPE_BUYER => 'Buyer Enquiry',
        self::TYPE_SELLER => 'Seller Enquiry',
        self::TYPE_NEWSLETTER => 'Newsletter',
    ];

    public const STATUS_NEW = 'new';

    public const STATUS_CONTACTED = 'contacted';

    public const STATUS_QUALIFIED = 'qualified';

    public const STATUS_WON = 'won';

    public const STATUS_LOST = 'lost';

    /** Pipeline stages, in order, with human labels (used by the CRM UI). */
    public const STATUS_LABELS = [
        self::STATUS_NEW => 'New',
        self::STATUS_CONTACTED => 'Contacted',
        self::STATUS_QUALIFIED => 'Qualified',
        self::STATUS_WON => 'Won',
        self::STATUS_LOST => 'Lost',
    ];

    protected $fillable = [
        'type',
        'name',
        'email',
        'phone',
        'message',
        'data',
        'source_url',
        'status',
        'notes',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }
}
