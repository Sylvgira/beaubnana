# Beaubnana

An Astro 7 static storefront for handmade crochet accessories, with the original Webflow visual design and Shopify Storefront / Buy Button integration. Shopify remains the product and checkout backend; the migration does not require a different Shopify plan.

## Development

Use Node 24 or later.

```sh
npm ci
npm run dev
```

Open `http://localhost:4321/beaubnana/`. Development and preview support the existing `.html` links. A checked-in public Shopify snapshot lets the site build without credentials; the browser continues to use the existing public Storefront and Buy Button configuration.

To build fresh product and policy pages, copy `.env.example` to `.env` and set both `SHOPIFY_STORE_NAME` and `SHOPIFY_STOREFRONT_TOKEN`. The optional `SHOPIFY_BUY_SDK_TOKEN` overrides the public token used for purchase controls. No Admin API token is needed.

`SHOPIFY_DATA_SOURCE` selects:

- `snapshot`: use `src/data/shopify-snapshot.json` for reproducible builds and local development.
- `live`: fetch all products with cursor pagination and rendered policies through Storefront. Failed, empty or incomplete responses stop the build.
- Unset: choose live when a store is configured, otherwise snapshot.

Only public Storefront/Buy Button credentials are serialized into HTML. Never place an Admin API token in public configuration. The Contact Information policy is retained in the reviewed snapshot because Storefront does not expose that policy field.

## Commands

```sh
npm run check       # Astro and TypeScript checks
npm run build       # Static HTML and assets in dist/
npm test            # Route, metadata, asset, policy and request-cache regression checks
npm run preview     # Serve the production build locally
npm run test:e2e    # Browser journeys against the production preview
```

Before the first browser test run, install Chromium with `npx playwright install chromium`. Browser tests use recorded public Storefront responses and a Buy Button test double; they do not submit real orders. The real Shopify cart was also checked separately during migration.

## Project structure

```text
src/
  components/      Shared navigation, footer, cards, galleries and page sections
  layouts/         Shared HTML shell, metadata, styles and page-specific scripts
  pages/           Astro routes, including products/[handle] and policies/[handle]
  lib/             Hosting paths, public configuration and build-time Shopify data
  data/            Public configuration and the reviewed product/policy snapshot
public/
  css/             Existing visual styles
  images/          Brand and local image assets
  js/              Existing browser integration, UI controls and homepage motion
tests/
  browser/         Playwright navigation, filter/sort, keyboard and failure journeys
  fixtures/        Recorded public Storefront data and an isolated Buy Button double
```

Astro generates the existing 55 public pages, including all 46 product URLs. `build.format: 'file'` keeps `/all-products.html`, `/products/<handle>.html`, and `/policies/<handle>.html` working. Shared elements are Astro components; there are no string-replacement HTML generators or Express server.

The browser Shopify integration is retained as a classic script to keep its working SDK and filter behaviour stable. It resolves the hosting base from its own script URL, deduplicates Storefront reads, and preserves pre-rendered content during API failures. Images continue to use Shopify's CDN.

## Hosting

The default build uses `BASE_PATH=/beaubnana` and `SITE_URL=https://sylvgira.github.io` for the existing GitHub Pages URL. The deployment workflow builds fresh Shopify content, runs checks, and publishes only `dist/` to `gh-pages`. GitHub Pages must publish that branch rather than the raw Astro source on `main`.

For a later domain-root host such as Cloudflare, use:

```sh
BASE_PATH=/ SITE_URL=https://your-domain.example npm run build
```

Upload the generated `dist/` directory. The app uses static output and needs no server adapter, Worker, runtime database, or deployment credentials to build the migration. No Cloudflare resources have been created or changed.

Both the project-path and domain-root builds are checked in CI. The GitHub Pages publication setting and any future Cloudflare deployment are separate from this migration branch.
