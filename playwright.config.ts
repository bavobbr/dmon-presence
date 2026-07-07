import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e', fullyParallel: false, reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: { command: 'npm run seed -- --reset && npm run start', url: 'http://127.0.0.1:4173', reuseExistingServer: false,
    env: { ...process.env, HOST: '127.0.0.1', PORT: '4173', STATE_DIR: '/tmp/dmon-e2e-state' } }
});
