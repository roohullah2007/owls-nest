<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Jobs\SendLeadNotificationEmail;
use App\Models\Contact;
use App\Models\LandingPage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\View\View;

class PublicLandingPageController extends Controller
{
    /** Render a published landing page (owners may preview drafts). */
    public function show(Request $request, string $slug): View
    {
        $page = LandingPage::where('slug', $slug)->firstOrFail();

        $isOwner = $request->user() && $request->user()->id === $page->user_id;
        abort_unless($page->is_published || $isOwner, 404);

        $viewPath = "landing-pages.templates.{$page->template}.show";
        abort_unless(view()->exists($viewPath), 404);

        return view($viewPath, [
            'page' => $page,
            'isOwner' => $isOwner,
            'submitted' => $request->boolean('submitted'),
        ]);
    }

    /**
     * Full-screen continuation of the hero flow. After the homeowner confirms
     * their address (in the on-page modal), they land here for the multi-step
     * questionnaire + contact capture.
     */
    public function flow(Request $request, string $slug): View
    {
        $page = LandingPage::where('slug', $slug)->firstOrFail();

        $isOwner = $request->user() && $request->user()->id === $page->user_id;
        abort_unless($page->is_published || $isOwner, 404);

        $hero = collect($page->page_data['blocks'] ?? [])->firstWhere('type', 'hero')['data'] ?? [];

        return view('landing-pages.flow', [
            'page' => $page,
            'hero' => $hero,
            'address' => (string) $request->query('address', ''),
            'owner' => (string) $request->query('owner', ''),
            'submitted' => $request->boolean('submitted'),
        ]);
    }

    /** Capture a lead from the page's form → create a CRM Contact. */
    public function submit(Request $request, string $slug): RedirectResponse
    {
        $page = LandingPage::where('slug', $slug)->firstOrFail();

        // Visitors can only submit a published page; the owner may submit while
        // previewing a draft (so the flow can be tested before going live).
        $isOwner = $request->user() && $request->user()->id === $page->user_id;
        abort_unless($page->is_published || $isOwner, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'lead_type' => ['nullable', 'string', 'in:buyer,seller'],
            'message' => ['nullable', 'string', 'max:5000'],
            'consent' => ['nullable', 'boolean'],
            // Marketing attribution — captured client-side and posted with the form.
            'utm_source' => ['nullable', 'string', 'max:255'],
            'utm_medium' => ['nullable', 'string', 'max:255'],
            'utm_campaign' => ['nullable', 'string', 'max:255'],
            'utm_term' => ['nullable', 'string', 'max:255'],
            'utm_content' => ['nullable', 'string', 'max:255'],
            'gclid' => ['nullable', 'string', 'max:255'],
            'fbclid' => ['nullable', 'string', 'max:255'],
            'referrer' => ['nullable', 'string', 'max:1000'],
            'landing_url' => ['nullable', 'string', 'max:1000'],
        ]);

        $parts = explode(' ', trim($validated['name']), 2);
        $firstName = $parts[0] ?: 'Unknown';
        $lastName = $parts[1] ?? '';

        $consented = (bool) ($validated['consent'] ?? false);

        // The flow passes the homeowner's address + questionnaire answers; fold
        // them into the description so the agent sees the full submission.
        $description = "Landing page: {$page->name}";
        if (! empty($validated['address'])) {
            $description .= "\nProperty: {$validated['address']}";
        }
        if (! empty($validated['message'])) {
            $description .= "\n{$validated['message']}";
        }

        // Marketing attribution → custom_fields (and a compact line on the lead).
        $attribution = array_filter([
            'utm_source' => $validated['utm_source'] ?? null,
            'utm_medium' => $validated['utm_medium'] ?? null,
            'utm_campaign' => $validated['utm_campaign'] ?? null,
            'utm_term' => $validated['utm_term'] ?? null,
            'utm_content' => $validated['utm_content'] ?? null,
            'gclid' => $validated['gclid'] ?? null,
            'fbclid' => $validated['fbclid'] ?? null,
            'referrer' => $validated['referrer'] ?? null,
            'landing_url' => $validated['landing_url'] ?? null,
        ], fn ($v) => $v !== null && $v !== '');

        if (! empty($attribution['utm_source']) || ! empty($attribution['utm_campaign'])) {
            $description .= "\nSource: ".implode(' / ', array_filter([
                $attribution['utm_source'] ?? null,
                $attribution['utm_medium'] ?? null,
                $attribution['utm_campaign'] ?? null,
            ]));
        }

        $contact = Contact::create([
            'user_id' => $page->user_id,
            'team_id' => $page->team_id,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            // The hero flow can pick the lead type per page (sell/valuation → seller, buyer → buyer);
            // fall back to the page's own type.
            'type' => $validated['lead_type']
                ?? (in_array($page->type, ['buyer', 'seller'], true) ? $page->type : 'buyer'),
            'source' => 'Landing Page',
            'description' => trim($description),
            'custom_fields' => $attribution ?: null,
            'sms_consent' => $consented,
            'sms_consent_at' => $consented ? now() : null,
        ]);

        $page->increment('submissions_count');

        $this->dispatchWebhook($page, $contact, $validated, $attribution);

        // Email the page owner that a new lead came in (branded Resend key if the
        // owner has one, else the platform key). Idempotency key is per-contact
        // so a re-dispatched job can't double-send.
        SendLeadNotificationEmail::dispatch(
            $contact->id,
            $page->user_id,
            'Landing Page',
            'lead:contact:'.$contact->id,
        );

        // Leads from the full-screen flow get a full-screen thank-you; inline
        // forms return to the page with the success state shown.
        $route = $request->input('from') === 'flow' ? 'landing.flow' : 'landing.show';

        return redirect()->route($route, ['slug' => $slug, 'submitted' => 1]);
    }

    /** Fire a fire-and-forget POST to the page's configured webhook with the full submission. */
    private function dispatchWebhook(LandingPage $page, Contact $contact, array $validated, array $attribution): void
    {
        $url = $page->page_data['_config']['webhook_url'] ?? null;
        if (! $url || ! filter_var($url, FILTER_VALIDATE_URL)) {
            return;
        }

        try {
            Http::timeout(5)->post($url, [
                'event' => 'landing_page.lead',
                'landing_page' => ['slug' => $page->slug, 'name' => $page->name, 'type' => $page->type],
                'contact_id' => $contact->id,
                'lead' => [
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'phone' => $validated['phone'] ?? null,
                    'address' => $validated['address'] ?? null,
                    'type' => $contact->type,
                    'message' => $validated['message'] ?? null,
                    'consent' => (bool) ($validated['consent'] ?? false),
                ],
                'attribution' => $attribution,
                'submitted_at' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Landing page webhook failed', ['slug' => $page->slug, 'error' => $e->getMessage()]);
        }
    }
}
