// A deterministic test double. Real Shopify cart behaviour is checked separately.
window.ShopifyBuy = {
  buildClient(config) { return config; },
  UI: {
    onReady() {
      return Promise.resolve({
        createComponent(type, options) {
          if (type === 'product') {
            const frame = document.createElement('iframe');
            frame.title = 'Shopify purchase control';
            frame.srcdoc = '<button type="button">Add to cart</button>';
            options.node.append(frame);
          }
          return Promise.resolve({});
        },
      });
    },
  },
};
