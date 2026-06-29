<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A visitor account on a published agent website (per-site Login/Register).
 * Authenticated via a per-site session key, not a Laravel guard — see
 * SiteVisitorAuthController. Passwords are hashed by the `password` cast.
 */
class SiteVisitor extends Model
{
    protected $fillable = [
        'agent_website_id',
        'contact_id',
        'google_id',
        'name',
        'email',
        'password',
        'phone',
        'last_login_at',
        'alerts_unsubscribed_at',
        'alerts_unsubscribe_token',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'alerts_unsubscribed_at' => 'datetime',
        ];
    }

    /** Has this visitor opted out of property-alert emails? */
    public function alertsUnsubscribed(): bool
    {
        return $this->alerts_unsubscribed_at !== null;
    }

    /** Lazily mint (and persist) the unsubscribe token used in alert links. */
    public function ensureUnsubscribeToken(): string
    {
        if (empty($this->alerts_unsubscribe_token)) {
            $this->alerts_unsubscribe_token = \Illuminate\Support\Str::random(48);
            $this->save();
        }

        return $this->alerts_unsubscribe_token;
    }

    public function website(): BelongsTo
    {
        return $this->belongsTo(AgentWebsite::class, 'agent_website_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function favorites()
    {
        return $this->hasMany(SiteVisitorFavorite::class);
    }

    public function savedSearches()
    {
        return $this->hasMany(SiteVisitorSavedSearch::class);
    }
}
