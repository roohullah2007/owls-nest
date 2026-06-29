<?php

declare(strict_types=1);

namespace App\Services\Email;

use App\Models\Contact;

class MergeFieldService
{
    /**
     * Replace merge field placeholders with contact data.
     *
     * @param  array<string,string|null>  $extra  Additional non-contact tokens
     *                                            (e.g. agent_name, plan_name, unsubscribe_url) supplied by the caller.
     *                                            Keys may be given with or without the surrounding {{ }} — both forms are
     *                                            accepted. Extra tokens win over the built-in contact tokens on collision.
     */
    public static function replace(string $template, Contact $contact, array $extra = []): string
    {
        $replacements = [
            '{{first_name}}' => $contact->first_name ?? '',
            '{{last_name}}' => $contact->last_name ?? '',
            '{{full_name}}' => trim(($contact->first_name ?? '').' '.($contact->last_name ?? '')),
            '{{recipient_name}}' => trim(($contact->first_name ?? '').' '.($contact->last_name ?? '')) ?: 'there',
            '{{email}}' => $contact->email ?? '',
            '{{phone}}' => $contact->phone ?? $contact->mobile ?? '',
            '{{city}}' => $contact->city ?? '',
            '{{company}}' => $contact->company?->name ?? '',
        ];

        foreach ($extra as $key => $value) {
            $token = str_starts_with($key, '{{') ? $key : '{{'.$key.'}}';
            $replacements[$token] = (string) ($value ?? '');
        }

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    /**
     * Return the available merge fields with labels. Drives the builder UI's
     * insert-token chips (ActionPlanController::edit → StepEditorModal). The
     * agent / plan / unsubscribe / website tokens only resolve to a real value
     * for email steps (the Action Plan sender supplies them); inserting them in
     * an SMS body resolves the contact tokens and leaves the rest blank-safe.
     */
    public static function availableFields(): array
    {
        return [
            '{{first_name}}' => 'First Name',
            '{{last_name}}' => 'Last Name',
            '{{full_name}}' => 'Full Name',
            '{{recipient_name}}' => 'Recipient Name',
            '{{email}}' => 'Email',
            '{{phone}}' => 'Phone',
            '{{city}}' => 'City',
            '{{company}}' => 'Company',
            '{{agent_name}}' => 'Agent Name',
            '{{agent_email}}' => 'Agent Email',
            '{{plan_name}}' => 'Plan Name',
            '{{website_url}}' => 'Website URL',
            '{{unsubscribe_url}}' => 'Unsubscribe Link',
        ];
    }
}
