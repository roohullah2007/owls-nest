# CLAUDE.md — Owl's Nest Pro

Engineering guide for this repository. Read this before writing any code. These are not suggestions — they are the rules every contributor (human or AI) follows so the codebase stays consistent, DRY, and professional.

---

## 1. What this project is

Owl's Nest Pro is the marketing + property-search website for **Owl's Nest Real Estate** (Waterville Valley / Lakes Region, NH). Navy & gold brand, Soleil typeface.

It is being rebuilt from a static HTML site into a modern app **without changing the design**. The original pixel-faithful HTML lives in `design-reference/` and is the **design contract** — when in doubt about spacing, color, or markup, that folder is the source of truth. Do not "improve" the design unless explicitly asked.

### Stack
- **Laravel 12** (PHP 8.4) — backend, routing, data.
- **Inertia.js v3 + React 19 + TypeScript** — the frontend is React, served through Inertia (no separate API/SPA router).
- **Tailwind CSS v4** — CSS-first config in `resources/css/app.css` (there is **no** `tailwind.config.js`; theme tokens are CSS variables under `@theme`).
- **shadcn/ui** primitives (Radix) already vendored under `resources/js/components/ui/`.
- **Vite** for bundling. **Wayfinder** for typed routes.

---

## 2. The golden rule: build it once, reuse it everywhere (DRY)

This is the most important rule in this file and the reason it exists.

> **If a button, card, section, or any visual element appears on more than one page — or more than once on the same page — it MUST be a single shared component. Never copy-paste markup.**

Concretely:
- There is **one** `Button` component. Every button on every page renders it with a `variant` prop. We do **not** hand-write `<a class="... rounded-full ...">` per page. If you need a button style that doesn't exist yet, **add a variant** to the Button component — don't fork it.
- The header and footer are defined **once** (`SiteHeader`, `SiteFooter`) and used through a layout. If the nav links change, they change in exactly one file.
- Repeated sections (hero band, testimonials carousel, "Work With Us" band, CTA band, image+text split, instagram grid, card rails) are **section components** that take props/`children`. Pages compose sections; pages do not re-implement them.
- Repeated cards (listing card, team member, neighborhood card, process step) are **card components** driven by data props.

**Before writing any markup, ask: "does a component for this already exist?"** Search `resources/js/components/` first. If something similar exists, reuse or extend it. Only create a new component when nothing fits.

**Before duplicating, extract.** The moment you'd paste a block of JSX a second time, stop and lift it into a component (with props for what differs).

---

## 3. Directory & file conventions

```
design-reference/              # FROZEN original static HTML — the design contract. Read-only.
app/                           # Laravel: Http/Controllers, Models, ...
routes/web.php                 # Public + app routes (Inertia)
resources/
  css/app.css                  # Tailwind v4 @theme tokens, @font-face, global CSS
  js/
    pages/                     # Inertia page components — ONE per route. Thin: compose sections.
      home.tsx, about.tsx, buyers.tsx, sellers.tsx, contact.tsx, ...
    layouts/
      site-layout.tsx          # Public marketing layout = SiteHeader + {children} + SiteFooter
      (app-layout/auth-layout already exist for the authed dashboard)
    components/
      ui/                      # shadcn primitives (Button, Dialog, ...). Low-level, design-system.
      site/                    # OUR shared site components, grouped by kind:
        buttons/   cards/   sections/   nav/   forms/
    hooks/                     # useTypewriter, useCarousel, ...
    lib/utils.ts               # cn() helper (clsx + tailwind-merge) — ALWAYS use for className merging
    types/                     # shared TS types (Listing, TeamMember, ...)
public/assets/                 # images, listings, fonts copied from design-reference
```

Rules:
- **Pages are thin.** A page file imports sections and arranges them. Business markup lives in components, not pages. If a page file is getting long with raw JSX, you're missing a component.
- **One component per file.** File name = `kebab-case.tsx`, component name = `PascalCase`. Match the existing starter-kit naming (it already uses kebab-case filenames).
- **Co-locate nothing page-specific in `components/site/` unless it's reused.** Truly one-off page markup can live in the page file, but the bar for "reusable" is low here — most sections are shared.

---

## 4. Styling rules (Tailwind v4)

- **Theme tokens are defined once** in `resources/css/app.css` under `@theme` as CSS variables. Brand colors are available as utilities: `navy` (`#04345c`), `navydark` (`#062a4a`), `navydeep` (`#01182b`), `gold` (`#b5832a`), `golddk` (`#a0731f`). Use `bg-navy`, `text-gold`, etc. **Never** hardcode `#04345c` inline when a token exists.
  - ⚠️ In the original, `bg-black` was remapped to navy. In the rebuild use `bg-navy` explicitly; do not rely on `black` meaning navy.
- **Font:** Soleil is the default sans (`font-sans`), self-hosted via `@font-face` in `app.css`. Don't add Google Fonts.
- **Preserve exact design values.** The class strings in `design-reference/` are the contract — copy arbitrary values faithfully (e.g. `text-[clamp(32px,5vw,56px)]`, `[font-variation-settings:'opsz'_144,'wdth'_100]`, `max-w-[1400px]`). Don't round or "tidy" them.
- **Global behaviors stay global.** The sitewide image-zoom-on-hover (`.overflow-hidden > img`) and `overflow-x-hidden` rules live in `app.css`, not repeated per component.
- **Merge classNames with `cn()`** from `lib/utils.ts` so component consumers can override. Every shared component should accept and merge a `className` prop.
- Mobile-first and responsive: keep the original breakpoints (custom `xs: 480px`). The original had no working mobile nav — building a real one is an allowed, expected improvement (see §7).

---

## 5. Component API conventions (React/TS)

- **TypeScript everywhere.** Props are explicit interfaces (`interface ButtonProps { ... }`). No `any`.
- **Variants via a prop + a lookup map** (or `class-variance-authority`, already installed), not via boolean soup. Example: `<Button variant="outline-dark" />`, not `<Button outline dark big />`.
- **Composition over configuration.** Sections take `children` and small data props rather than dozens of flags. A card takes a typed data object (`listing: Listing`), not 15 primitive props.
- **Links:** use Inertia's `<Link>` for internal navigation and Wayfinder route helpers; plain `<a>` for `tel:`, `mailto:`, and external URLs. The `Button` component should support rendering as a link (`href`) or button (`onClick`)/`asChild`.
- **Accessibility:** real `<button>`/`<a>` semantics, `alt` on images, `aria-label` on icon-only controls, keyboard-operable dropdowns/menus.
- Reuse the starter-kit primitives in `components/ui/` (Dialog, Sheet, Tooltip, etc.) instead of reinventing modals/drawers.

---

## 6. Data & backend rules

- **No hardcoded listing arrays in components.** The original embedded property data inline in HTML. In the rebuild, property/listing data comes from the backend (Eloquent models → Inertia props) or a typed fixtures module under `resources/js/data/` as an interim step — never pasted into JSX.
- Page data is passed as **Inertia props** from a controller. Keep controllers thin; put query/filter logic in the model or a query/service class.
- Validate all form input server-side (Laravel form requests). The contact form must hit a real route, not just a JS success message.
- Keep secrets in `.env`; never commit credentials.

---

## 7. Migration rules (porting design-reference → React)

When converting a static page:
1. **Identify sections** top-to-bottom and map each to an existing or new section component (see the component inventory the team maintains).
2. **Reuse first.** Header/footer/buttons/cards/testimonials/CTA are already shared — wire them up, don't recreate.
3. **Match markup faithfully** — same classes, same structure, same copy, same assets.
4. **Convert inline `<script>` to React** — hooks/handlers/state. No jQuery, no global DOM scripts. (Typewriter, carousels, tab switchers, filters → hooks.)
5. **Do NOT port `design-reference/scripts/`** — those are one-off Node build scripts from the old site's history.
6. Allowed improvements during migration (do these, they're not "design changes"): a working mobile nav menu, real form submission, replacing dead/remnant menu markup, moving inline data to props. Anything that changes the *look* is out of scope unless asked.

---

## 8. Workflow & quality gates

- **Dev:** `composer run dev` (runs serve + queue + vite) or `npm run dev` + `php artisan serve`.
- **Before considering work done, it must pass:**
  - `npm run types:check` (TypeScript) — no errors.
  - `npm run lint` (ESLint) and `npm run format` (Prettier) — clean.
  - `vendor/bin/pint` (PHP formatting) for any PHP touched.
  - `npm run build` succeeds.
- Match the existing code style; let Prettier/ESLint/Pint decide formatting — don't fight the tools.
- Keep commits focused. Don't commit `node_modules`, `vendor`, `.env`, or build output.

---

## 9. Quick checklist before you submit code

- [ ] Did I reuse an existing component instead of copying markup?
- [ ] If I repeated any block, did I extract it into a shared component?
- [ ] Is every button the shared `Button` (a variant), not bespoke markup?
- [ ] Are header/footer/sections coming from shared components/layout?
- [ ] Do the classes/colors/spacing match `design-reference/` exactly?
- [ ] Are brand colors used via tokens (`bg-navy`) not hex literals?
- [ ] Is data from props/backend, not hardcoded in JSX?
- [ ] Does it pass types:check, lint, format, and build?
