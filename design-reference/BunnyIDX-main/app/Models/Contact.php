<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTeamOrUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Contact extends Model
{
    use BelongsToTeamOrUser, HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'team_id',
        'assigned_to',
        'company_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'mobile',
        'type',
        'status',
        'source',
        'address',
        'city',
        'state_province',
        'postal_code',
        'country',
        'description',
        'custom_fields',
        'lead_score',
        'ai_summary',
        'ai_summary_at',
        'ai_next_action',
        'ai_next_action_at',
        'ai_activity_count',
        'dnd_mode',
        'date_of_birth',
        'last_contacted_at',
        'sms_consent',
        'sms_consent_at',
        'sms_opted_out',
        'sms_opted_out_at',
        'email_opted_out',
        'email_opted_out_at',
        'email_unsubscribe_token',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function booted(): void
    {
        static::creating(function (Contact $contact) {
            if (empty($contact->uuid)) {
                $contact->uuid = (string) Str::uuid();
            }
        });

        // Clean up morph + many-to-many relations on delete. The DB-level cascades
        // handle most HasMany (files, searches, offers, etc.), but morph rows
        // (notes, tasks, timeline events, tag pivots, assigned-user pivots) have no
        // FK to follow, so we wipe them here. Wrapped in a transaction by the
        // caller (or Laravel's default) so a partial delete is impossible.
        static::deleting(function (Contact $contact) {
            // Morph children
            $contact->notes()->delete();
            $contact->tasks()->delete();
            $contact->timelineEvents()->delete();
            $contact->tags()->detach();
            $contact->assignedUsers()->detach();

            // Many-to-many pivots
            $contact->deals()->detach();
            $contact->relationships()->delete();
            // The inverse side of the relationships (where this contact is the related_contact_id)
            ContactRelationship::where('related_contact_id', $contact->id)->delete();

            // HasMany that aren't already cascaded at the DB level
            $contact->meetings()->delete();
            $contact->smsMessages()->delete();
            $contact->emailMessages()->delete();
            $contact->emailThreads()->delete();
            $contact->listings()->delete();
            // call_records use nullOnDelete (keep the row for historical reporting,
            // just unlink the contact). dialer_session_calls also nullOnDelete via
            // the existing migration. No-op needed here.
        });
    }

    protected function casts(): array
    {
        return [
            'last_contacted_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'custom_fields' => 'array',
            'lead_score' => 'integer',
            'ai_activity_count' => 'integer',
            'ai_summary_at' => 'datetime',
            'ai_next_action_at' => 'datetime',
            'date_of_birth' => 'date:Y-m-d',
            'sms_consent' => 'boolean',
            'sms_consent_at' => 'datetime',
            'sms_opted_out' => 'boolean',
            'sms_opted_out_at' => 'datetime',
            'email_opted_out' => 'boolean',
            'email_opted_out_at' => 'datetime',
        ];
    }

    /**
     * Has this contact opted out of automated / marketing email (Action Plans)?
     * One-to-one inbox email is never gated by this.
     */
    public function emailUnsubscribed(): bool
    {
        return (bool) $this->email_opted_out;
    }

    /**
     * Lazily generate + persist a stable unsubscribe token for the public
     * one-click unsubscribe link. Mirrors SiteVisitor::ensureUnsubscribeToken().
     */
    public function ensureEmailUnsubscribeToken(): string
    {
        if (! $this->email_unsubscribe_token) {
            $this->forceFill(['email_unsubscribe_token' => Str::random(48)])->save();
        }

        return $this->email_unsubscribe_token;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function deals(): BelongsToMany
    {
        return $this->belongsToMany(Deal::class, 'deal_contact');
    }

    public function relationships(): HasMany
    {
        return $this->hasMany(ContactRelationship::class);
    }

    public function relatives(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'contact_relationships', 'contact_id', 'related_contact_id')
            ->withPivot('id', 'type', 'custom_label')
            ->withTimestamps();
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function notes(): MorphMany
    {
        return $this->morphMany(Note::class, 'notable');
    }

    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(ContactFile::class);
    }

    public function searches(): HasMany
    {
        return $this->hasMany(ContactSearch::class);
    }

    public function offers(): HasMany
    {
        return $this->hasMany(ContactOffer::class);
    }

    public function inquiries(): HasMany
    {
        return $this->hasMany(ContactInquiry::class);
    }

    public function tasks(): MorphMany
    {
        return $this->morphMany(Task::class, 'taskable');
    }

    public function callLogs(): HasMany
    {
        return $this->hasMany(CallLog::class);
    }

    public function emailLogs(): HasMany
    {
        return $this->hasMany(EmailLog::class);
    }

    public function smsLogs(): HasMany
    {
        return $this->hasMany(SmsLog::class);
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(Meeting::class);
    }

    public function smsMessages(): HasMany
    {
        return $this->hasMany(SmsMessage::class);
    }

    public function emailMessages(): HasMany
    {
        return $this->hasMany(EmailMessage::class);
    }

    public function emailThreads(): HasMany
    {
        return $this->hasMany(EmailThread::class);
    }

    public function callRecords(): HasMany
    {
        return $this->hasMany(CallRecord::class);
    }

    public function assignedUsers(): MorphToMany
    {
        return $this->morphToMany(User::class, 'assignable', 'assigned_users')
            ->withPivot('assigned_by')
            ->withTimestamps();
    }

    public function timelineEvents(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function actionPlanEnrollments(): HasMany
    {
        return $this->hasMany(ActionPlanEnrollment::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
