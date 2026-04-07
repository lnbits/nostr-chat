import { defineConfig } from '@playwright/test';

const appBaseUrl = process.env.APP_BASE_URL ?? 'http://127.0.0.1:4100';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  expect: {
    timeout: 15_000
  },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: appBaseUrl,
    browserName: 'chromium',
    headless: true,
    viewport: {
      width: 1440,
      height: 960
    },
    testIdAttribute: 'data-testid',
    trace: 'on',
    screenshot: 'on',
    video: 'on'
  },
  webServer: {
    command: 'npm run dev:e2e',
    url: appBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
