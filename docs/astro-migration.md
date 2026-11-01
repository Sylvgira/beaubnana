# Astro migration notes

The Webflow markup and styles are preserved in native Astro components. The old repeated HTML pages, Express development server, Apache rewrite rules and custom page-generation scripts have been removed.

- `SiteLayout.astro` owns the shared head, navigation, footer, public Shopify config and scripts. Policy/error pages load no commerce runtime. The homepage does not eagerly load the Buy Button SDK.
- `getStaticPaths()` generates product and policy pages from one cached build-time Storefront read. Product reads use cursor pagination; generated routes retain their `.html` extension.
- Storefront supplies rendered privacy, refund, shipping and terms policies. The reviewed Contact Information content remains in the snapshot. No Admin API token is required.
- The snapshot is an explicit development/test data source. Production live builds fail if Shopify content is unavailable rather than silently substituting sample policies or an empty catalogue.
- `withBase()` uses Astro's configured base for links and assets. Browser product links derive the same base from the classic script location. The default Cloudflare domain-root build and the legacy Pages prefix are both verified.
- Existing cart, filter/sort, motion and outage behaviour remain. Shopify's “Top Seller” tag is normalized so merchandising works with the existing `top-seller` filter spelling.
- The main hero and first product-gallery image load eagerly; remaining imagery stays lazy. Native font CSS replaces the old WebFont loader, and the unused jQuery include is removed.

Validation includes Astro checks, static route/asset/metadata tests, browser journeys with deterministic fixtures, and a separate real Storefront/Buy Button cart check. No orders were submitted. Cloudflare Pages now hosts the static artifact. The old GitHub Pages source setting is unchanged; small repository-root redirect pages forward its URLs to Cloudflare. Cloudflare Git integration returned an installation error, so publishing currently uses Direct Upload.

Future work can modernize the retained browser integration into smaller TypeScript modules and refine responsive image delivery independently of this migration.
