import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');

export default defineConfig({
  site: process.env.SITE_URL || env.SITE_URL || 'https://beaubnana.pages.dev',
  base: process.env.BASE_PATH ?? env.BASE_PATH ?? '/',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
