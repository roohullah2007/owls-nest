<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // We will send the password reset link to this user. Once we have attempted
        // to send the link, we will examine the response then see the message we
        // need to show to the user. Finally, we'll send out a proper response.
        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return back()->with('status', __($status));
        }

        // Audit non-success outcomes (unknown email, throttled, mail failure)
        // server-side. Never log the password/token — only the (non-secret) email,
        // the originating IP, and the broker status string.
        Log::warning('Password reset link not sent', [
            'email' => (string) $request->input('email'),
            'ip' => $request->ip(),
            'status' => $status,
        ]);

        // Surface throttling so a legitimate user knows to wait.
        if ($status === Password::RESET_THROTTLED) {
            throw ValidationException::withMessages([
                'email' => [__('Please wait a moment before requesting another reset link.')],
            ]);
        }

        // For every other case (e.g. the email isn't registered) return the same
        // generic "we sent a link" message so the form can't be used to enumerate
        // which email addresses have accounts.
        return back()->with('status', __(Password::RESET_LINK_SENT));
    }
}
