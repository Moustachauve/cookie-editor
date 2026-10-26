import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    trace: 'retain-on-failure',
  },
});
