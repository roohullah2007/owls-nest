<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConnectDomainRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership is enforced by the `website.owner` route middleware.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $site = $this->route('agentWebsite');

        return [
            'domain' => [
                'required',
                'string',
                'max:255',
                // A bare host like example.com or sub.example.co.uk — no scheme/path.
                'regex:/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i',
                Rule::unique('agent_websites', 'custom_domain')->ignore($site?->id),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'domain.regex' => 'Enter a valid domain like example.com (no http:// or paths).',
            'domain.unique' => 'That domain is already connected to another website.',
        ];
    }
}
