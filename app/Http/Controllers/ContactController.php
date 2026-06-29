<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactStoreRequest;
use Illuminate\Http\RedirectResponse;

class ContactController extends Controller
{
    /**
     * Handle a contact form submission.
     */
    public function store(ContactStoreRequest $request): RedirectResponse
    {
        $request->validated();

        // TODO: send mail (notify the office / persist the enquiry).

        return back()->with('success', "Thanks! Your message has been sent. We'll get back to you shortly.");
    }
}
