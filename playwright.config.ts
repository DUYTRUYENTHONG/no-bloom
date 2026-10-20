import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 20_000,
  retries: 0,
  use: { baseURL: "http://localhost:3100", ...devices["Desktop Chrome"], channel: "chrome" },
  webServer: { command: "npm run dev -- --port 3100", url: "http://localhost:3100", reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
