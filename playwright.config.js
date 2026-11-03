import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  forbidOnly: !!process.env.CI,
  workers: 1,
  use: {
    trace: 'retain-on-failure',
  },
});
