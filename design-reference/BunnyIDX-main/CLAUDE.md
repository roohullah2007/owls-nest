# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BunnyIDX / BunBuilder / BunPilot — a Laravel 13 + React (Inertia, TypeScript) SaaS for real estate agents. It bundles a CRM, an MLS/IDX data layer, a no-code agent-website builder, telephony (Telnyx SMS/voice/power-dialer), email (Gmail OAuth sync), team collaboration, and AI assist features. PHP 8.3.

## Skill router (use before coding)

Before writing or changing code, check whether a project skill in `.claude/skills/` applies and use it. These skills encode this repo's real architecture; prefer them over generic assumptions, and ignore any global skill that assumes a different stack (e.g. multi-database stancl/tenancy, or a `BunPilot/CssGenerators` path — neither exists here; tenancy is single-DB row-level, and published sites are Blade). Most non-trivial tasks need 2–3 skills (a domain skill + scoping + testing/logging), and every change ends with `task-logging`.

| Touches… | Skill |
|---|---|
| Any read/write of tenant data, team/admin gates | `tenant-data-scoping` |
| Controllers, routes, JSON APIs, webhooks | `laravel-controller-api` |
| `.tsx/.ts` UI in the main app | `inertia-crm-page` |
| Tables/columns/models, schema changes | `database-migration` |
| Website blocks, editor, Blade templates, domains | `agent-website-builder` |
| MLS/IDX search, datasets/drivers, gateway, widgets | `mls-idx-data` |
| Cross-domain workflows (lead→contact→deal, telephony, email, AI) | `crm-product-workflows` |
| Credentials, webhooks, uploads, auth, leak risk | `security-practices` |
| Slow lists/searches, N+1, shared-prop cost, API fan-out | `performance` |
| Writing/running tests + the `npm run build` gate | `qa-testing` |
| Diagnosing a bug/complaint (isolate layer, prove root cause) | `debugging` |
| Extracting/renaming/restructuring safely | `refactor-safety` |
| Setup, release build, queue/Reverb, env, deploy/ops | `deployment-devops` |
| Final step of EVERY change | `task-logging` |

Non-negotiables enforced by these skills: scope tenant data via `forUser`/`withPermissions` (never raw `where('user_id')`); run `npm run build` after frontend changes and `php artisan test` after backend changes; API/webhook routes go in `bootstrap/app.php` (not `routes/api.php`); public agent sites are Blade while the editor is React — keep both sides in sync; log every change in `.claude-tasks.md`.

## Commands

```bash
# Full dev environment (server + queue + logs + vite + reverb, via concurrently)
composer dev

# Frontend only (Vite dev server with HMR)
npm run dev

# Production build — runs tsc typecheck then vite build. Run after any frontend (.tsx/.ts) change.
npm run build

# Tests (clears config first, then runs PHPUnit)
composer test
php artisan test                         # direct
php artisan test --filter=ContactControllerTest   # single test class
php artisan test tests/Feature/DealControllerTest.php

# Lint / format (Laravel Pint)
./vendor/bin/pint                        # fix
./vendor/bin/pint --test                 # check only

# First-time setup (install, .env, key, migrate, npm install, build)
composer setup
```

Tests run on in-memory SQLite (see `phpunit.xml`); the dev/prod DB is configured via `.env`.

## Mandatory: log every change

After finishing ANY code change (fix, feature, refactor, style, docs, perf, chore), append an entry to `.claude-tasks.md` at the repo root. Use the `log-task` skill, or follow the existing format: a dated `## YYYY-MM-DD` section with a `**[TYPE]**` bullet listing files changed, root cause/details, and how it was verified. This log is a hard project convention — see existing entries for the expected depth.

## Architecture

### Request flow
Laravel routes → controllers → Inertia responses that render React page components. There is no separate REST frontend; Inertia bridges Laravel and React. Ziggy exposes named routes to JS. Shared Inertia props (auth user, team, permissions, notifications, phone/email/10DLC status, dialer session, flash) are injected globally by `app/Http/Middleware/HandleInertiaRequests.php` — read it before adding new globally-available frontend data.

- **Web/Inertia routes**: `routes/web.php`. Almost everything authenticated lives under the `crm.*` name prefix and `/crm` URL prefix. Admin panel under `/admin` (gated by `admin` middleware → `EnsureAdmin`). Public agent websites under `/site/{slug}`.
- **API + webhook routes**: defined inline in the `then:` closure of `bootstrap/app.php` (NOT a separate `routes/api.php`). This is where MLS gateway APIs, the website-editor JSON API, WordPress plugin API, Stripe/Telnyx webhooks, and the custom-domain TLS endpoint are registered, each with bespoke middleware stacks.
- **Custom middleware** (registered in `bootstrap/app.php`): `ResolveCustomDomain` (prepended globally — maps connected customer domains to `/site/{slug}`), `website.owner`, `admin`, plus `ApiCors`/`RelayLogger` on relay routes.

### Frontend
- Two Vite entry points (`vite.config.js`): `resources/js/app.tsx` (the main Inertia app — CRM, admin, auth) and `resources/js/website-editor/app.tsx` (the standalone visual website editor). A third input compiles the luxury template CSS.
- Inertia pages live in `resources/js/Pages/**`; the bulk of the app is under `Pages/Crm/**`. Shared components in `resources/js/Components/**`.
- Tailwind CSS v3, Headless UI, react-select, leaflet (maps). TypeScript throughout — `npm run build` will fail on type errors.

### Multi-tenancy / data scoping
Row-level, single database. Most CRM models use the `App\Models\Concerns\BelongsToTeamOrUser` trait, which provides `scopeForUser` / `scopeWithPermissions` and auto-sets `team_id` on create. A user has an `active_context` of `personal` (own `user_id` rows only) or `team` (team rows, further filtered by per-resource permission level `all`/`own`/`none` from their `TeamMember` role). When querying tenant-scoped models, scope through these helpers rather than raw `where('user_id', …)`.

### MLS / IDX data layer
This is the most layered subsystem. The canonical entry point is `App\Services\Mls\MlsGateway` — all new MLS-touching code should go through the `api/v1/mls/*` gateway routes (`MlsDataController`), not the legacy single-connection paths. Architecture:
- `MlsGateway` resolves which datasets to search and fans out across a user's active `IdxConnection`s, normalizes per-dataset, tags listings with `mls_slug`, and merges results with per-MLS totals/errors.
- `MlsDriverManager` + `Drivers/` (`BridgeDriver`, `RealtynaDriver`) wrap the upstream MLS HTTP APIs; `Datasets/` hold per-MLS normalization (e.g. `StellarMls`, `MiamiReMls`); `Dto/` are typed value objects (`MlsListing`, `MlsQuery`, `MlsTaxonomy`, …).
- Responses carry a compliance block (public `api/mls/compliance/{mlsProvider}` endpoint serves it to embedded widgets/website footers).
- Separately, `App\Services\Idx\*` powers IDX search widgets and the WordPress plugin relay (`/api/v1/mls/*` relay routes + `/api/v1/plugin/*`).

### Agent websites (public sites + builder)
- Published sites are server-rendered **Blade**, not React: `resources/views/agent-website/**`. Templates live under `templates/{template}/` (e.g. `luxury/`) with shared `partials/` for hero/header/blocks. Reusable content blocks are `partials/blocks/*.blade.php`. New templates must satisfy `templates/TEMPLATE-CONTRACT.md` (the CSS variables + component classes shared blocks rely on).
- The editor is the React app at `resources/js/website-editor/**`, talking to the JSON `api/website-editor/*` routes (`WebsiteEditorController`). Site content/config is stored as structured `page_data` JSON on the `agent_websites` table.
- Sitemap, robots, llms.txt, custom domains, and blog/areas are system-level and theme-agnostic — keep them working for any template.
- **Every NEW public agent-site route/page must also be wired into SEO**: add its URLs to `buildSitemapUrls()` in `PublicWebsiteController` (respecting `disabled_pages`), add the page key to `validPage()` in `Api/WebsiteEditor/PageContentController` AND to `PAGE_SEO_OPTIONS` in `resources/js/website-editor/modals/SeoModal.tsx` (so owners can set per-page meta), have the controller prefer `page_data.{page}.meta_title/meta_description` over its generated defaults, and add nav via `navTree()` (never hand-edit a header partial). This applies to feature pages like /team, /featured-properties, /condos — use those as the reference pattern.

### Other notable services (`app/Services/`)
`Ai/*` (AiClient + lead scoring, contact insights, team-chat AI, website copy), `Telnyx/TelnyxService` (SMS/voice/10DLC), `Gmail/*` (OAuth email sync via queued `SyncGmailMessages` job), `BillingService`/`LicenseService` (Stripe + IDX licenses), `EncryptionService` (credential storage), `Sites/CustomDomainService`.

### Realtime
Laravel Reverb (websockets) + Laravel Echo on the frontend. Broadcast channels in `routes/channels.php`; events in `app/Events/*` (chat, calls, typing, SMS/email arrival). Reverb runs as part of `composer dev`.

## Production ops / troubleshooting (live: Ploi, nginx + php8.4-fpm)

Per-site logs live under `~/<site>/storage/logs/laravel.log`, `/var/log/nginx/<site>-error.log`, and `/var/log/php8.4-fpm.log` (the global nginx `/var/log/nginx/error.log` is only the default server block — mostly bot noise, not the site). Reproduce + `tail -f` the **site-specific** nginx error log to catch the real cause.

- **502 Bad Gateway — `upstream sent too big header` (seen on `/crm/properties`):** This is an **nginx response-header buffer** limit, NOT a PHP/code bug and NOT the response body/Inertia props (props go in the body; moving them to an API call does NOT fix this). Session is `database`-backed so the session cookie is small — the fix is to raise the FastCGI header buffer in the site's nginx config (Ploi → site → Manage → Nginx Configuration), then `sudo nginx -t && sudo service nginx reload`:
  ```nginx
  fastcgi_buffer_size 32k;
  fastcgi_buffers 16 16k;
  fastcgi_busy_buffers_size 64k;
  ```
  `service php8.4-fpm reload` does NOT help here (wrong layer). Other 502 flavors map to PHP-FPM: `upstream timed out` → slow page/external API (optimize/queue); `upstream prematurely closed` / SIGSEGV / `Allowed memory size exhausted` → OOM/crash (check `memory_limit`, heavy unbounded queries).
- **Malformed/bot query params:** public, unauthenticated endpoints (e.g. `App\Services\Mls\PublicPropertySearch`) get hit with array-where-scalar input like `?query[]=x`. Scalar coercion in `MlsQuery::fromArray` collapses arrays to their first scalar so a stray array can't fatal with "Array to string conversion"; keep any new scalar cast on visitor input array-safe the same way.

## Git commits
- Do NOT add the AI co-author tagline to commit messages.
  Specifically, never append:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
  (or any other `Co-Authored-By: Claude ...` / "Generated with Claude" line).
- Keep commit messages clean and human-authored in style.
</content>
</invoke>
