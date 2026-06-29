<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AgentWebsite;
use App\Models\SiteVisitor;
use App\Services\Sites\VisitorAuth;
use App\Services\Sites\VisitorCrm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * Login / Register / Logout for agent-website visitors (the header auth modal
 * on the property search + detail pages). Visitors are scoped per site;
 * registering also creates a CRM lead on the site owner's account and visitor
 * behaviour syncs to that contact's timeline.
 */
class SiteVisitorAuthController extends Controller
{
    public function __construct(
        private readonly VisitorAuth $auth,
        private readonly VisitorCrm $crm,
    ) {}

    public function register(Request $request, string $slug): JsonResponse
    {
        $site = $this->site($slug);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:50',
            'password' => 'required|string|min:8|max:255',
            'consent' => 'accepted',
        ], [
            'consent.accepted' => 'Please agree to the Privacy Policy to continue.',
        ]);

        $exists = SiteVisitor::where('agent_website_id', $site->id)
            ->where('email', $validated['email'])
            ->exists();
        if ($exists) {
            return response()->json(['error' => 'An account with this email already exists. Try logging in.'], 422);
        }

        $visitor = SiteVisitor::create([
            'agent_website_id' => $site->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => $validated['password'],
            'last_login_at' => now(),
        ]);

        // CRM: new lead (or link to the existing contact) + signup activity.
        $this->crm->syncLead($site, $visitor, consented: true);
        $this->crm->logActivity($site, $visitor, 'website_signup', 'Signed up on the website', [
            'email' => $visitor->email,
            'phone' => $visitor->phone,
        ]);

        $this->auth->login($site, $visitor);

        return response()->json(['success' => true, 'name' => $visitor->name]);
    }

    public function login(Request $request, string $slug): JsonResponse
    {
        $site = $this->site($slug);

        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $visitor = SiteVisitor::where('agent_website_id', $site->id)
            ->where('email', $validated['email'])
            ->first();

        if (! $visitor || ! Hash::check($validated['password'], $visitor->password)) {
            return response()->json(['error' => 'Invalid email or password.'], 422);
        }

        $visitor->update(['last_login_at' => now()]);
        $this->auth->login($site, $visitor);
        $this->crm->logActivity($site, $visitor, 'website_login', 'Logged in on the website', [], 60);

        return response()->json(['success' => true, 'name' => $visitor->name]);
    }

    public function logout(Request $request, string $slug)
    {
        $site = $this->site($slug);
        $this->auth->logout($site);

        return $request->expectsJson()
            ? response()->json(['success' => true])
            : back();
    }

    private function site(string $slug): AgentWebsite
    {
        $site = AgentWebsite::where('slug', $slug)->firstOrFail();

        // Published sites only — except the owner previewing a draft.
        $user = auth()->user();
        $isOwner = $user && ($site->user_id === $user->id || ($user->team_id && $site->team_id === $user->team_id));
        abort_unless($site->is_published || $isOwner, 404);

        return $site;
    }
}
