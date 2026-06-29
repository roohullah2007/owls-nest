# Owl's Nest

Marketing + property-search website for **Owl's Nest Real Estate** (Waterville Valley / Lakes Region, NH) — navy & gold theme, Soleil typeface.

Rebuilt from a static HTML site into a modern app **without changing the design**. The original pixel-faithful HTML is preserved in [`design-reference/`](design-reference/) as the design contract.

## Tech stack

- **Laravel 13** (PHP 8.4)
- **Inertia.js v3 + React 19 + TypeScript**
- **Tailwind CSS v4** (CSS-first config in `resources/css/app.css`)
- **shadcn/ui** primitives, **Wayfinder** typed routes, **Vite**
- **Leaflet / react-leaflet** for the property-search map

## Pages

Home · Property Search · Featured Properties · Buyers · Sellers · About · Communities & Projects · Neighborhoods · Contact

## Architecture

Everything reusable is a single shared component (see [`CLAUDE.md`](CLAUDE.md) for the engineering rules):

```
resources/js/
  pages/                 # one thin Inertia page per route
  layouts/site-layout.tsx
  components/site/        # shared UI: button, nav, cards/, sections/, forms/, search/
  data/                  # typed page data (no data hardcoded in JSX)
  hooks/                 # useTypewriter, useCarousel
resources/css/app.css    # theme tokens, @font-face, global CSS
design-reference/        # frozen original static HTML (design source of truth)
```

## Local development

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate

# run (serve + queue + vite)
composer run dev
# or separately:
php artisan serve
npm run dev
```

## Quality gates

```bash
npm run types:check
npm run lint
npm run build
vendor/bin/pint
```
