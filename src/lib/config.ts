import saved from '../data/public-shopify.json';

/** Only public Storefront/Buy Button credentials belong in browser markup. */
export function publicShopifyConfig(env: Record<string, string | undefined> = import.meta.env) {
  const configured = Boolean(env.SHOPIFY_STORE_NAME || env.SHOPIFY_STOREFRONT_TOKEN);
  if (configured && (!env.SHOPIFY_STORE_NAME || !env.SHOPIFY_STOREFRONT_TOKEN)) {
    throw new Error('Set both SHOPIFY_STORE_NAME and SHOPIFY_STOREFRONT_TOKEN.');
  }
  const domain = configured ? env.SHOPIFY_STORE_NAME! : saved.storefront.domain;
  if (!/^[a-z0-9-]+\.myshopify\.com$/i.test(domain)) throw new Error('Invalid Shopify store domain.');
  return {
    storefront: {
      domain,
      storefrontAccessToken: configured ? env.SHOPIFY_STOREFRONT_TOKEN! : saved.storefront.storefrontAccessToken,
    },
    buy: {
      ...saved.buy,
      domain,
      storefrontAccessToken: configured
        ? env.SHOPIFY_BUY_SDK_TOKEN || env.SHOPIFY_STOREFRONT_TOKEN!
        : saved.buy.storefrontAccessToken,
    },
  };
}
