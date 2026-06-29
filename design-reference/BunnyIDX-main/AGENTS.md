# BunnyIDX — Agent Instructions

## Project Overview

BunnyIDX is an all-in-one SaaS platform for real estate agents, built on **Laravel 13** (PHP 8.3) with an **Inertia.js + React + TypeScript** frontend. It combines MLS/IDX data, a full CRM, communications (email/SMS/voice), AI assistants, team collaboration, and an agent website builder.

### Key Modules
- **IDX/MLS**: Bridge Data Output API + Repliers (Canadian BYOK)
- **CRM**: Contacts, Deals, Pipelines, Tasks, Meetings, Calendar
- **Communications**: Gmail OAuth inbox, Telnyx SMS/Voice, Team Chat (Reverb WebSockets)
- **AI**: Gemini-powered contact insights, lead scoring, follow-ups, website copy
- **Website Builder**: Template-based agent sites with blog, areas, lead capture
- **Billing**: License-based subscriptions with Stripe

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 13, PHP 8.3, SQLite |
| Frontend | Inertia.js, React 18, TypeScript |
| Styling | Tailwind CSS v3 |
| Build | Vite |
| Real-time | Laravel Reverb (WebSockets) |
| Maps | Leaflet + React-Leaflet |

---

## Directory Structure

```
app/
  Http/Controllers/Crm/    # CRM controllers (ContactController, DealController, etc.)
  Http/Controllers/Api/    # API controllers (MlsRelayController, WebsiteEditorController)
  Http/Controllers/Auth/   # Auth + Google OAuth
  Models/                  # Eloquent models
  Services/
    Ai/                    # Gemini client, lead scoring, contact insights
    Idx/                   # BridgeApiClient, RepliersApiClient
    Telnyx/                # SMS/Voice service
    Email/Gmail/           # Gmail OAuth integration
  Notifications/           # In-app + email notifications

resources/js/
  Layouts/CrmLayout.tsx    # Main CRM shell with nav, chat, dialer
  Pages/Crm/
    Websites/              # Website builder (Index, EditView, CreateFlow)
    Contacts/              # CRM contacts
    Deals/                 # Pipeline board
    Listings/              # MLS listings
    ...
  Components/Crm/          # Shared CRM components
  Components/ui/           # Low-level UI primitives
  website-editor/          # Website editor sub-system (modals, blocks)

resources/views/
  agent-website/templates/ # Blade templates for public sites (luxury, modern, etc.)
```

---

## Coding Conventions

### PHP (Laravel)
- Use `declare(strict_types=1);` at the top of every PHP file.
- Controllers use Inertia rendering: `return Inertia::render('Crm/Deals/Index', [...])`.
- Route names are prefixed: `crm.contacts.index`, `crm.websites.update`, etc.
- Form requests are validated inline in controllers (no separate FormRequest classes for simple cases).
- Image uploads go to `storage/app/public/` and are served via `/storage/{path}`.

### React / TypeScript
- All page components are default exports named after the file.
- Use functional components with hooks. No class components.
- Types live in `resources/js/types/` or co-located in `types.ts` near the feature.
- Form state uses Inertia's `useForm` hook.
- API calls outside Inertia forms use `axios` directly.
- Icons are inline SVGs (no icon library dependency).

### Tailwind CSS
- **No arbitrary values** unless absolutely necessary. Prefer design tokens.
- Common spacing scale: `px-8 py-6`, `gap-4`, `rounded-xl`, `rounded-lg`.
- Colors are hex literals matching the project's neutral palette:
  - Background: `#F9FAFB`
  - Borders: `#E4E7EB`
  - Primary text: `#111315`
  - Secondary text: `#5F656D`, `#6B7280`, `#8B9096`
  - Success: `#059669`
- Focus states use `focus:ring-2 focus:ring-[#111315]/5 focus:border-[#111315]`.
- Buttons use `active:scale-[0.98]` for tactile feedback.

---

## UI/UX Patterns

### Form Inputs
```ts
// From resources/js/Pages/Crm/Websites/constants.ts
export const inputClass = 'block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] bg-white text-[#111315] placeholder-[#9CA3AF] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-2 focus:ring-[#111315]/5 transition-all';
export const textareaClass = 'block w-full px-3 py-2 text-[13px] border border-[#E4E7EB] bg-white text-[#111315] placeholder-[#9CA3AF] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-2 focus:ring-[#111315]/5 resize-none transition-all';
export const labelClass = 'block text-[12px] font-medium text-[#374151] mb-1.5';
export const cardClass = 'bg-white border border-[#E4E7EB] rounded-xl shadow-sm';
```

### Cards
Content is grouped into cards using `cardClass` (white background, subtle border, rounded-xl, light shadow). Inside cards, use `sectionHeading` for sub-section labels.

### Save Patterns
- The website editor uses a sticky top bar with a **Save Changes** button.
- Form sections track dirty state by comparing current `form.data` against an initial snapshot ref.
- Show **"Unsaved changes"** in amber when dirty, and **"Saved X ago"** in green after successful save.
- Non-form tabs (Pages, Testimonials, Blog, Areas) manage their own save state and expose it to the parent via refs or callbacks.

### Image Uploaders
- Hidden `<input type="file">` triggered by clicking a visual preview area.
- Preview areas have `hover:border-[#8B9096] hover:shadow-sm` and `bg-[#F9FAFB]` background.
- Uploads use `router.post(..., { forceFormData: true })` for Inertia file uploads.

### Sidebars
- Sidebar width: `w-[240px]`
- Active nav item: `bg-[#F3F4F6] text-[#111315] font-medium rounded-md` (no border-shift layout bugs)
- Inactive: `text-[#5F656D] hover:bg-[#FAFAFA] hover:text-[#111315]`
- Group labels: `text-[10px] font-semibold text-[#8B9096] uppercase tracking-wider`

### Empty States
- Centered icon in a `bg-[#F3F4F6] rounded-2xl` container
- Title: `text-[13px] font-medium text-[#374151]`
- Description: `text-[11px] text-[#5F656D]`

---

## Website Editor Module

### Files
- `resources/js/Pages/Crm/Websites/Index.tsx` — Website list/grid
- `resources/js/Pages/Crm/Websites/components/EditView.tsx` — Main editor (sidebar + content)
- `resources/js/Pages/Crm/Websites/components/CreateFlow.tsx` — Multi-step creation wizard
- `resources/js/Pages/Crm/Websites/components/PagesTab.tsx` — Page config (nav order, disabled pages, custom pages)
- `resources/js/Pages/Crm/Websites/components/BlogTab.tsx` — Blog post management
- `resources/js/Pages/Crm/Websites/components/AreasTab.tsx` — Neighborhood/area pages
- `resources/js/Pages/Crm/Websites/components/MediaTab.tsx` — Image library
- `resources/js/Pages/Crm/Websites/constants.ts` — Shared Tailwind classes + US_STATES

### Editor Layout
- Left sidebar: back link, site info + publish toggle, section navigation, "View Live Site" button
- Top bar: section title, dirty/saved indicator, Preview link, Save button
- Content: max-w-4xl, conditionally rendered sections

### Key Behavior
- The editor does **not** use `<form>` elements with IDs for submission. Instead, the Save button calls `form.patch()` directly via `onClick`. This avoids duplicate-ID bugs.
- `color_scheme` can be changed in the Branding tab but `template` is read-only after creation.
- State field uses a `<select>` dropdown populated from `US_STATES`.
- Testimonials are client-side state; saved via `axios.patch` to `/api/website-editor/{id}/testimonials`.

---

## Recent Changes (May 2026)

### Website Editor UI Redesign
1. **Fixed sidebar layout shift** — active state uses background pill instead of border-left padding change.
2. **Fixed duplicate form IDs** — removed all `id="website-form"` duplicates; save buttons call handlers directly.
3. **Added dirty state tracking** — compares current form data against initial snapshot; shows "Unsaved changes" / "Saved X ago".
4. **Added breadcrumbs** — "← Websites" back link in sidebar.
5. **Added Preview button** — opens live site in new tab from the top bar.
6. **Added Color Scheme picker** — visual swatch cards in Branding tab (was missing in edit mode).
7. **Added State dropdown** — replaced free-text state input with `<select>` using `US_STATES`.
8. **Modernized cards** — added `shadow-sm`, improved spacing, better section headings.
9. **Improved inputs** — added `focus:ring-2 focus:ring-[#111315]/5` and `transition-all`.
10. **Improved image uploaders** — added `hover:shadow-sm`, `bg-[#F9FAFB]`, better visual affordance.
11. **Improved index cards** — hover overlay with explicit Edit/View buttons instead of whole-card link.
12. **Removed dead "Web Services" button** from index page.

### Design Tokens Updated
- `inputClass`, `textareaClass`, `labelClass`, `sectionLabel` — improved focus rings and typography
- Added `cardClass` — reusable white card with subtle shadow

### Website Editor Refactor
The editor was extracted from a single 744-line `EditView.tsx` into a clean component architecture:

**Hooks**
- `hooks/useWebsiteForm.ts` — wraps `useForm<WebsiteFormData>` with dirty tracking and `handleSubmit`
- `hooks/useTestimonials.ts` — manages testimonial CRUD + API save

**Layout**
- `editor/EditorSidebar.tsx` — navigation + publish toggle + back link
- `editor/EditorTopBar.tsx` — title, dirty indicator, preview, save button

**Shared Components**
- `editor/ImageUploadField.tsx` — reusable image upload with preview
- `editor/navConfig.tsx` — `ActiveSection` type, `NAV_GROUPS`, `NavIcon`, `SECTION_TITLES`

**Sections**
- `editor/sections/GeneralSection.tsx` — agent info + contact/location
- `editor/sections/BrandingSection.tsx` — template, color scheme, photos, logos, accent color
- `editor/sections/SocialSection.tsx` — social links
- `editor/sections/SeoSection.tsx` — meta title/description + search preview
- `editor/sections/DomainSection.tsx` — default URL + custom domain

**Orchestrator**
- `EditView.tsx` — thin 179-line component that wires hooks + layout + sections together

---

## Environment Notes
- Local dev URL: `http://bunnyidx.test`
- Run `composer dev` to start all services (server, queue, logs, Vite, Reverb)
- SQLite database at `database/database.sqlite`
