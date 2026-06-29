<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConnectLandingPageDomainRequest;
use App\Models\LandingPage;
use App\Services\Sites\CustomDomainService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * JSON API for the landing-page editor's Domain modal. Mirrors the agent-website
 * CustomDomainController but for LandingPage (served at /l/{slug}). Ownership is
 * enforced per request (the route only requires auth).
 */
class LandingPageDomainController extends Controller
{
    public function __construct(private readonly CustomDomainService $domains) {}

    public function show(Request $request, LandingPage $landingPage): JsonResponse
    {
        $this->authorizeAccess($request, $landingPage);

        return response()->json($this->payload($landingPage));
    }

    public function connect(ConnectLandingPageDomainRequest $request, LandingPage $landingPage): JsonResponse
    {
        $this->authorizeAccess($request, $landingPage);

        $domain = $this->domains->normalize($request->validated()['domain']);
        $this->domains->connect($landingPage, $domain);

        return response()->json($this->payload($landingPage->refresh()));
    }

    public function verify(Request $request, LandingPage $landingPage): JsonResponse
    {
        $this->authorizeAccess($request, $landingPage);
        abort_if(empty($landingPage->custom_domain), 422, 'No domain to verify.');

        $result = $this->domains->verify($landingPage);

        return response()->json($this->payload($landingPage->refresh()) + ['result' => $result]);
    }

    public function disconnect(Request $request, LandingPage $landingPage): JsonResponse
    {
        $this->authorizeAccess($request, $landingPage);

        $this->domains->disconnect($landingPage);

        return response()->json($this->payload($landingPage->refresh()));
    }

    /** Owner (personal or same team) or admin may manage the page's domain. */
    private function authorizeAccess(Request $request, LandingPage $page): void
    {
        $user = $request->user();
        $owns = $user && ($page->user_id === $user->id || ($page->team_id && $page->team_id === $user->team_id));
        abort_unless($owns || ($user && $user->isAdmin()), 403);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(LandingPage $page): array
    {
        return [
            'custom_domain' => $page->custom_domain,
            'domain_status' => $page->domain_status,
            'domain_verified_at' => $page->domain_verified_at,
            'domain_last_checked_at' => $page->domain_last_checked_at,
            'dns_records' => $page->custom_domain ? $this->domains->dnsInstructions($page->custom_domain) : [],
        ];
    }
}
