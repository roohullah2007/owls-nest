<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\NotDisposableEmail;
use App\Rules\NotReservedName;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', new NotReservedName],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class, new NotDisposableEmail],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'country' => ['required', 'in:US,CA'],
            // The frontend marks the checkbox `required`, but that's trivially
            // bypassed by a direct POST — enforce acceptance server-side too.
            'terms' => ['accepted'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'settings' => ['country' => $validated['country']],
        ]);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('crm.dashboard', absolute: false));
    }
}
