<?php

declare(strict_types=1);

namespace App\Services\Sites;

use App\Models\AgentWebsite;
use App\Models\SiteVisitor;

/**
 * Session-based auth for agent-website visitors. Deliberately NOT a Laravel
 * guard: visitors are scoped per site (the same browser can be logged in to
 * two different agent sites at once), so the session key carries the site id.
 */
class VisitorAuth
{
    public function login(AgentWebsite $site, SiteVisitor $visitor): void
    {
        session()->put($this->key($site), $visitor->id);
        session()->regenerate();
    }

    public function logout(AgentWebsite $site): void
    {
        session()->forget($this->key($site));
    }

    /** The logged-in visitor for this site, or null. */
    public function current(AgentWebsite $site): ?SiteVisitor
    {
        $id = session()->get($this->key($site));
        if (! $id) {
            return null;
        }

        $visitor = SiteVisitor::find($id);
        // Stale session (visitor deleted, or belongs to another site) → treat as logged out.
        if (! $visitor || $visitor->agent_website_id !== $site->id) {
            session()->forget($this->key($site));

            return null;
        }

        return $visitor;
    }

    private function key(AgentWebsite $site): string
    {
        return "site_visitor_auth.{$site->id}";
    }
}
