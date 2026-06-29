<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConnectDomainRequest;
use App\Models\AgentWebsite;
use App\Models\LandingPage;
use App\Services\Sites\CustomDomainService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * JSON API for the editor's Domain tab. Owner access is enforced by the
 * `website.owner` middleware on the route group.
 */
class CustomDomainController extends Controller
{
    public function __construct(private readonly CustomDomainService $domains) {}

    public function show(AgentWebsite $agentWebsite): JsonResponse
    {
        return response()->json($this->payload($agentWebsite));
    }

    public function connect(ConnectDomainRequest $request, AgentWebsite $agentWebsite): JsonResponse
    {
        $domain = $this->domains->normalize($request->validated()['domain']);
        $this->domains->connect($agentWebsite, $domain);

        return response()->json($this->payload($agentWebsite->refresh()));
    }

    public function verify(AgentWebsite $agentWebsite): JsonResponse
    {
        abort_if(empty($agentWebsite->custom_domain), 422, 'No domain to verify.');

        $result = $this->domains->verify($agentWebsite);

        return response()->json($this->payload($agentWebsite->refresh()) + ['result' => $result]);
    }

    public function disconnect(AgentWebsite $agentWebsite): JsonResponse
    {
        $this->domains->disconnect($agentWebsite);

        return response()->json($this->payload($agentWebsite->refresh()));
    }

    /**
     * On-demand TLS "ask" endpoint (Caddy / edge). Returns 200 ONLY for domains
     * we have connected, so certificates are issued solely for legitimate
     * customer domains. Public + unauthenticated — called server-to-server by
     * the TLS layer, never by a browser, and leaks only a yes/no.
     */
    public function allowed(Request $request): Response
    {
        $domain = strtolower(trim((string) $request->query('domain')));

        $connected = fn (string $model) => $domain !== '' && $model::query()
            ->where('custom_domain', $domain)
            ->where('domain_status', $model::DOMAIN_CONNECTED)
            ->where('is_published', true)
            ->exists();

        $allowed = $connected(AgentWebsite::class) || $connected(LandingPage::class);

        return response($allowed ? 'ok' : 'denied', $allowed ? 200 : 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(AgentWebsite $site): array
    {
        return [
            'custom_domain' => $site->custom_domain,
            'domain_status' => $site->domain_status,
            'domain_verified_at' => $site->domain_verified_at,
            'domain_last_checked_at' => $site->domain_last_checked_at,
            'dns_records' => $site->custom_domain ? $this->domains->dnsInstructions($site->custom_domain) : [],
        ];
    }
}
