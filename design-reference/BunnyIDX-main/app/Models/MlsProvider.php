<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MlsProvider extends Model
{
    use HasFactory;

    public const VISIBILITY_DRAFT = 'draft';
    public const VISIBILITY_VISIBLE = 'visible';

    public const SOURCE_BRIDGE = 'bridge';
    public const SOURCE_REALTYNA = 'realtyna';
    public const SOURCE_REPLIERS = 'repliers';
    public const SOURCE_PARAGON = 'paragon';
    public const SOURCE_MLSGRID = 'mlsgrid';

    protected $fillable = [
        'slug',
        'display_name',
        'region',
        'country',
        'logo_url',
        'data_source',
        'data_source_config',
        'has_idx_feed',
        'has_vow_feed',
        'monthly_fee_cents',
        'visibility',
        'property_types',
        'statuses',
        'sort_order',
        'disclaimer',
        'attribution_template',
        'compliance_logo_url',
        'terms_url',
        'compliance_rules',
        'setup_notes_user',
    ];

    protected function casts(): array
    {
        return [
            'data_source_config' => 'array',
            'property_types' => 'array',
            'statuses' => 'array',
            'compliance_rules' => 'array',
            'has_idx_feed' => 'boolean',
            'has_vow_feed' => 'boolean',
            'monthly_fee_cents' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Default compliance rules shape. Admin-set values override these.
     */
    public function getResolvedComplianceRules(): array
    {
        return array_merge([
            'show_updated_at' => false,
            'link_back_required' => false,
            'fair_housing_required' => false,
            'refresh_minutes' => 60,
        ], $this->compliance_rules ?? []);
    }

    /**
     * The canonical compliance block consumers should render.
     * Used by MlsDataService and surfaced on every search/listing response.
     */
    public function complianceBlock(): array
    {
        return [
            'mls_name' => $this->display_name,
            'mls_logo_url' => $this->logo_url,
            'compliance_logo_url' => $this->compliance_logo_url,
            'disclaimer' => $this->disclaimer,
            'attribution_template' => $this->attribution_template,
            'terms_url' => $this->terms_url,
            'rules' => $this->getResolvedComplianceRules(),
        ];
    }

    public function connections(): HasMany
    {
        return $this->hasMany(IdxConnection::class);
    }

    public function requests(): HasMany
    {
        return $this->hasMany(MlsConnectionRequest::class);
    }

    public function scopeVisible($q)
    {
        return $q->where('visibility', self::VISIBILITY_VISIBLE);
    }

    public function getMonthlyFeeFormattedAttribute(): string
    {
        if ($this->monthly_fee_cents === 0) return 'Free';
        return '$' . number_format($this->monthly_fee_cents / 100, 2) . '/mo';
    }
}
