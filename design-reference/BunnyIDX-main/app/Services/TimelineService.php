<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Activity;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class TimelineService
{
    public static function log(
        User $user,
        string $eventType,
        string $subject,
        ?string $description = null,
        ?Contact $contact = null,
        ?Deal $deal = null,
        ?Company $company = null,
        ?Listing $listing = null,
        ?Model $loggable = null,
        ?array $metadata = null,
    ): Activity {
        return Activity::create([
            'user_id' => $user->id,
            'contact_id' => $contact?->id,
            'deal_id' => $deal?->id,
            'company_id' => $company?->id,
            'listing_id' => $listing?->id,
            'event_type' => $eventType,
            'subject' => $subject,
            'description' => $description,
            'metadata' => $metadata,
            'loggable_id' => $loggable?->getKey(),
            'loggable_type' => $loggable ? $loggable->getMorphClass() : null,
        ]);
    }
}
