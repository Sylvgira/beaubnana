import { defineConfig } from '@playwright/test';
const base = (process.env.BASE_PATH ?? '/beaubnana').replace(/\/$/, '');

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4322',
    viewport: {width:1440,height:1000},
    launchOptions: process.env.BROWSER_EXECUTABLE_PATH ? {
      executablePath: process.env.BROWSER_EXECUTABLE_PATH,
      args: ['--no-sandbox'],
    } : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4322 --ignore-lock',
    env: { ASTRO_TELEMETRY_DISABLED: '1' },
    url: `http://127.0.0.1:4322${base}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
