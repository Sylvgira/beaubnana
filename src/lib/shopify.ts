import snapshot from '../data/shopify-snapshot.json';
import { publicShopifyConfig } from './config';
import { productsQuery } from './products-query';

export type Product = (typeof snapshot.products)[number];
export type Policy = (typeof snapshot.policies)[number];
export interface ShopData { products: Product[]; policies: Policy[]; }

async function query<T>(document: string, variables: Record<string, unknown> = {}): Promise<T> {
  const { storefront } = publicShopifyConfig();
  const response = await fetch(`https://${storefront.domain}/api/2026-10/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': storefront.storefrontAccessToken },
    body: JSON.stringify({ query: document, variables }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Shopify request failed (${response.status}).`);
  const result = await response.json();
  if (result.errors || !result.data) throw new Error('Shopify returned incomplete content. Build stopped.');
  return result.data;
}

async function loadShopData(): Promise<ShopData> {
  const mode = import.meta.env.SHOPIFY_DATA_SOURCE || (import.meta.env.SHOPIFY_STORE_NAME ? 'live' : 'snapshot');
  console.info(`[shopify] Building from ${mode} data.`);
  if (mode === 'snapshot') return snapshot;
  if (mode !== 'live') throw new Error('SHOPIFY_DATA_SOURCE must be live or snapshot.');
  if (!import.meta.env.SHOPIFY_STORE_NAME || !import.meta.env.SHOPIFY_STOREFRONT_TOKEN) {
    throw new Error('Live builds require SHOPIFY_STORE_NAME and SHOPIFY_STOREFRONT_TOKEN.');
  }
  // Explicit live builds fail rather than silently deploying stale content.
  publicShopifyConfig();
  const products: Product[] = [];
  let after: string | null = null;
  do {
    const data: { products: { edges: { node: Product }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } = await query(productsQuery, { after });
    products.push(...data.products.edges.map(edge => edge.node));
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after);
  if (!products.length) throw new Error('Shopify returned no products. Build stopped.');
  const policyFields = {
    'privacy-policy': 'privacyPolicy',
    'refund-policy': 'refundPolicy',
    'shipping-policy': 'shippingPolicy',
    'terms-of-service-policy': 'termsOfService',
  } as const;
  const { shop } = await query<{ shop: Record<string, { title: string; body: string } | null> }>(
    '{ shop { privacyPolicy { title body } refundPolicy { title body } shippingPolicy { title body } termsOfService { title body } } }',
  );
  const policies = Object.entries(policyFields).map(([handle, field]) => {
    const policy = shop[field];
    if (!policy?.body || /\{[{%]/.test(policy.body)) throw new Error(`Policy ${handle} is missing or unrendered.`);
    return { handle, ...policy };
  });
  // Storefront does not expose Contact Information; retain its reviewed content.
  policies.push(...snapshot.policies.filter(policy => policy.handle === 'contact-information-policy'));
  return { products, policies };
}

let pending: Promise<ShopData> | undefined;
export const getShopData = () => pending ??= loadShopData();
