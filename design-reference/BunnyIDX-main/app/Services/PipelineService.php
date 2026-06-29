<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Deal;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;

class PipelineService
{
    /**
     * Default pipeline stages per lead type.
     */
    private static array $defaultStages = [
        'buyer' => [
            ['name' => 'New Lead', 'type' => 'open', 'color' => '#0891b2', 'position' => 0],
            ['name' => 'Consultation', 'type' => 'open', 'color' => '#0d9488', 'position' => 1],
            ['name' => 'Showing', 'type' => 'open', 'color' => '#2563eb', 'position' => 2],
            ['name' => 'Offer Submitted', 'type' => 'open', 'color' => '#f59e0b', 'position' => 3],
            ['name' => 'Under Contract', 'type' => 'open', 'color' => '#7c3aed', 'position' => 4],
            ['name' => 'Closed', 'type' => 'won', 'color' => '#10b981', 'position' => 5],
            ['name' => 'Lost', 'type' => 'lost', 'color' => '#ef4444', 'position' => 6],
        ],
        'seller' => [
            ['name' => 'New Lead', 'type' => 'open', 'color' => '#0891b2', 'position' => 0],
            ['name' => 'Listing Appointment', 'type' => 'open', 'color' => '#0d9488', 'position' => 1],
            ['name' => 'Listing Prep', 'type' => 'open', 'color' => '#2563eb', 'position' => 2],
            ['name' => 'Active Listing', 'type' => 'open', 'color' => '#f59e0b', 'position' => 3],
            ['name' => 'Under Contract', 'type' => 'open', 'color' => '#7c3aed', 'position' => 4],
            ['name' => 'Closed', 'type' => 'won', 'color' => '#10b981', 'position' => 5],
            ['name' => 'Lost', 'type' => 'lost', 'color' => '#ef4444', 'position' => 6],
        ],
    ];

    private static array $fallbackStages = [
        ['name' => 'New', 'type' => 'open', 'color' => '#0891b2', 'position' => 0],
        ['name' => 'Qualifying', 'type' => 'open', 'color' => '#0d9488', 'position' => 1],
        ['name' => 'Proposal', 'type' => 'open', 'color' => '#2563eb', 'position' => 2],
        ['name' => 'Negotiation', 'type' => 'open', 'color' => '#f59e0b', 'position' => 3],
        ['name' => 'Under Contract', 'type' => 'open', 'color' => '#7c3aed', 'position' => 4],
        ['name' => 'Won', 'type' => 'won', 'color' => '#10b981', 'position' => 5],
        ['name' => 'Lost', 'type' => 'lost', 'color' => '#ef4444', 'position' => 6],
    ];

    /**
     * Create default pipelines for all lead types of a user.
     */
    public static function createDefaultPipelines(User $user): void
    {
        $leadTypes = $user->getLeadTypes();
        $position = 0;

        foreach ($leadTypes as $leadType) {
            self::createPipelineForLeadType($user, $leadType, $position === 0, $position);
            $position++;
        }
    }

    /**
     * Create a single pipeline for a lead type.
     */
    public static function createPipelineForLeadType(User $user, string $leadType, bool $isDefault = false, int $position = 0): Pipeline
    {
        $name = ucfirst(str_replace('_', ' ', $leadType)) . ' Pipeline';

        $pipeline = $user->pipelines()->create([
            'name' => $name,
            'lead_type' => $leadType,
            'is_default' => $isDefault,
            'position' => $position,
        ]);

        $stages = self::$defaultStages[$leadType] ?? self::$fallbackStages;

        foreach ($stages as $stage) {
            $pipeline->stages()->create($stage);
        }

        return $pipeline;
    }

    /**
     * Get default stages array for a given lead type.
     */
    public static function getDefaultStagesForLeadType(?string $leadType): array
    {
        if ($leadType && isset(self::$defaultStages[$leadType])) {
            return self::$defaultStages[$leadType];
        }

        return [
            ['name' => 'New', 'type' => 'open', 'color' => '#0891b2', 'position' => 0],
            ['name' => 'Won', 'type' => 'won', 'color' => '#10b981', 'position' => 1],
            ['name' => 'Lost', 'type' => 'lost', 'color' => '#ef4444', 'position' => 2],
        ];
    }

    /**
     * Move a deal to a new stage, handling won/lost transitions.
     */
    public static function moveDealToStage(Deal $deal, PipelineStage $newStage, ?string $lostReason = null): void
    {
        $oldStage = $deal->pipelineStage;

        if ($newStage->type === 'won') {
            $deal->update([
                'pipeline_stage_id' => $newStage->id,
                'won_at' => now(),
                'lost_at' => null,
                'lost_reason' => null,
            ]);
        } elseif ($newStage->type === 'lost') {
            $deal->update([
                'pipeline_stage_id' => $newStage->id,
                'lost_at' => now(),
                'lost_reason' => $lostReason,
                'won_at' => null,
            ]);
        } else {
            $deal->update([
                'pipeline_stage_id' => $newStage->id,
                'won_at' => null,
                'lost_at' => null,
                'lost_reason' => null,
            ]);
        }

        TimelineService::log(
            user: $deal->user,
            eventType: 'deal_stage_changed',
            subject: "Stage changed from {$oldStage?->name} to {$newStage->name}",
            deal: $deal,
            contact: $deal->contacts->first(),
            metadata: [
                'old_stage_id' => $oldStage?->id,
                'old_stage_name' => $oldStage?->name,
                'new_stage_id' => $newStage->id,
                'new_stage_name' => $newStage->name,
            ],
        );

        $deal->touchActivity();
    }
}
