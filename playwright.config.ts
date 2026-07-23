import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Royal Bluff E2E tests.
 *
 * Strategy: full-game + per-rule specs, determinism via hand-forcing
 * (window.__testHooks__), no seeded RNG. See
 * docs/plans/06_tests_e2e_par_jeu/plan.md (Idea 6).
 *
 * The dev server is started by Playwright on http://localhost:3011.
 */
const BASE_URL = "http://localhost:3011";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 120_000,
  expect: { timeout: 20_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
    launchOptions: { slowMo: isCI ? 0 : 250 },
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npx vite --port 3011 --strictPort",
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
