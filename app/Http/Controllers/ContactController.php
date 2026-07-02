<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ContactStoreRequest;
use App\Models\FormSubmission;
use Illuminate\Http\RedirectResponse;

class ContactController extends Controller
{
    /**
     * Handle a contact form submission — persist it to the admin inbox.
     */
    public function store(ContactStoreRequest $request): RedirectResponse
    {
        $data = $request->validated();

        FormSubmission::create([
            'type' => FormSubmission::TYPE_CONTACT,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'message' => $data['message'],
            'data' => ['consent' => (bool) ($data['consent'] ?? false)],
            'source_url' => url()->previous(),
        ]);

        return back()->with('success', "Thanks! Your message has been sent. We'll get back to you shortly.");
    }
}
