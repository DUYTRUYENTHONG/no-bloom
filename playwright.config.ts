import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 20_000,
  retries: 0,
  workers: 2,
  use: { baseURL: "http://localhost:3100" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], ...(process.env.CI ? {} : { channel: "chrome" }) } },
    { name: "webkit", workers: 1, use: { ...devices["Desktop Safari"] }, grep: /header visitor count|silent welcome|greeting hint|automatic welcome|static bilingual|guide keeps the full actor|landscape guide|guide welcome|guide hint|greeting celebration|recorded bloom|guide responsive|new entries vary compliments|gift box|flower photograph|actor introduction|Vietnamese name|anonymous greeting|320px|personal link|language changes|guide keyboard|clipboard rejection|reduced motion|dance is optional/ },
  ],
  webServer: { command: "npm run dev -- --port 3100", url: "http://localhost:3100", reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
