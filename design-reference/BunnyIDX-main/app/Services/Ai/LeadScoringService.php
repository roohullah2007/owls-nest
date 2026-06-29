<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Models\Contact;

class LeadScoringService
{
    /**
     * Calculate a lead score (0-100) based on rule-based heuristics.
     */
    public function calculate(Contact $contact): int
    {
        $weights = config('ai.lead_scoring.weights');
        $score = 0;

        $score += $this->profileCompleteness($contact, $weights['profile_completeness']);
        $score += $this->engagement($contact, $weights['engagement']);
        $score += $this->communicationRecency($contact, $weights['communication_recency']);
        $score += $this->dealInvolvement($contact, $weights['deal_involvement']);
        $score += $this->tagsNotes($contact, $weights['tags_notes']);
        $score += $this->meetingsTasks($contact, $weights['meetings_tasks']);

        return min(100, max(0, $score));
    }

    /**
     * Calculate score and persist it on the contact.
     */
    public function calculateAndSave(Contact $contact): int
    {
        $score = $this->calculate($contact);
        $contact->update(['lead_score' => $score]);

        return $score;
    }

    private function profileCompleteness(Contact $contact, int $max): int
    {
        $fields = 0;
        $total = 5;

        if (!empty($contact->email)) $fields++;
        if (!empty($contact->phone)) $fields++;
        if (!empty($contact->mobile)) $fields++;
        if (!empty($contact->address) || !empty($contact->city)) $fields++;
        if (!empty($contact->date_of_birth)) $fields++;

        return (int) round(($fields / $total) * $max);
    }

    private function engagement(Contact $contact, int $max): int
    {
        $count = $contact->callLogs()->count()
            + $contact->emailLogs()->count()
            + $contact->smsLogs()->count();

        if ($count === 0) return 0;
        if ($count <= 2) return (int) round($max * 0.25);
        if ($count <= 5) return (int) round($max * 0.50);
        if ($count <= 10) return (int) round($max * 0.75);

        return $max;
    }

    private function communicationRecency(Contact $contact, int $max): int
    {
        if (!$contact->last_contacted_at) {
            return 0;
        }

        $daysSince = (int) $contact->last_contacted_at->diffInDays(now());

        if ($daysSince <= 3) return $max;
        if ($daysSince <= 7) return (int) round($max * 0.75);
        if ($daysSince <= 14) return (int) round($max * 0.50);
        if ($daysSince <= 30) return (int) round($max * 0.25);

        return 0;
    }

    private function dealInvolvement(Contact $contact, int $max): int
    {
        $count = $contact->deals()->count();

        if ($count === 0) return 0;
        if ($count === 1) return (int) round($max * 0.50);

        return $max;
    }

    private function tagsNotes(Contact $contact, int $max): int
    {
        $score = 0;

        if ($contact->tags()->count() > 0) {
            $score += (int) round($max * 0.50);
        }

        if ($contact->notes()->count() > 0) {
            $score += (int) round($max * 0.50);
        }

        return min($max, $score);
    }

    private function meetingsTasks(Contact $contact, int $max): int
    {
        $score = 0;

        if ($contact->meetings()->count() > 0) {
            $score += (int) round($max * 0.50);
        }

        if ($contact->tasks()->count() > 0) {
            $score += (int) round($max * 0.50);
        }

        return min($max, $score);
    }
}
