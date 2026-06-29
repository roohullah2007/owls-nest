<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a custom domain for a landing page. The domain must be unique across
 * BOTH landing pages and agent websites — a host can only point at one thing.
 */
class ConnectLandingPageDomainRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership is enforced in the controller (authorizeAccess).
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $page = $this->route('landingPage');

        return [
            'domain' => [
                'required',
                'string',
                'max:255',
                // A bare host like example.com or sub.example.co.uk — no scheme/path.
                'regex:/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i',
                Rule::unique('landing_pages', 'custom_domain')->ignore($page?->id),
                Rule::unique('agent_websites', 'custom_domain'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'domain.regex' => 'Enter a valid domain like example.com (no http:// or paths).',
            'domain.unique' => 'That domain is already connected to another site or page.',
        ];
    }
}
