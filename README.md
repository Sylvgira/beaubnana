# Beaubnana

An Astro 7 static storefront for handmade crochet accessories, with the original Webflow visual design and Shopify Storefront / Buy Button integration. Shopify remains the product and checkout backend; the migration does not require a different Shopify plan.

## Development

Use Node 24 or later.

```sh
npm ci
npm run dev
```

Open `http://localhost:4321/`. Development and preview support the existing `.html` links. A checked-in public Shopify snapshot lets the site build without credentials; the browser continues to use the existing public Storefront and Buy Button configuration.

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

Astro generates the existing 55 public pages, including all 46 product URLs. `build.format: 'file'` keeps `/all-products.html`, `/products/<handle>.html`, and `/policies/<handle>.html` working. Shared elements are Astro components; there are no string-replacement HTML generators or Express server. The repository-root `index.html` and `404.html` only redirect the former GitHub Pages URL; Astro builds the real site from `src/pages/`.

The browser Shopify integration is retained as a classic script to keep its working SDK and filter behaviour stable. It resolves the hosting base from its own script URL, deduplicates Storefront reads, and preserves pre-rendered content during API failures. Images continue to use Shopify's CDN.

## Hosting

Production is Cloudflare Pages at **https://bibeau.com.au**. The default Astro build uses `BASE_PATH=/` and that origin. Only `dist/` is uploaded; no server adapter or runtime backend is needed.

The initial migration uses Direct Upload because Cloudflare returned an error for the account's GitHub installation. Automatic deployments are not connected. For an authenticated account, publish a fresh live build with:

```sh
SHOPIFY_DATA_SOURCE=live npm run build
npm test
npx wrangler pages deploy dist --project-name beaubnana --branch main
```

Set the two Shopify environment variables described above before the live build. `wrangler.jsonc` records the project name and output directory. Use the existing Cloudflare account (`6059774b3388c84bc8a50de5f3e86bd4`); never commit Cloudflare credentials.

To enable automatic builds later, repair the Cloudflare Pages GitHub installation and connect `Sylvgira/beaubnana`, production branch `main`, build command `npm run check && npm run build && npm test`, output `dist`, Node 24, `BASE_PATH=/`, `SITE_URL=https://bibeau.com.au`, and the Shopify live-build variables. CI currently checks both hosting paths on PRs and main pushes; it does not publish.

The old GitHub Pages deployment workflow has been removed. Repository-root redirect pages send the old project URL and deep links to Cloudflare, preserving query strings and fragments. They are not included in the Cloudflare artifact. A legacy project-path build is still available with `BASE_PATH=/beaubnana SITE_URL=https://sylvgira.github.io npm run build`.
