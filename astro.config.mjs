import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');

export default defineConfig({
  site: process.env.SITE_URL || env.SITE_URL || 'https://sylvgira.github.io',
  base: process.env.BASE_PATH ?? env.BASE_PATH ?? '/beaubnana',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
