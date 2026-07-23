import { test, expect } from "@playwright/test";

/**
 * Verifies the dev build exposes window.__testHooks__ with the expected API.
 * (The prod build strips these — covered by a separate prod-absence check.)
 */
test("test hooks are exposed in dev build", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Créer une Table/i })).toBeVisible({ timeout: 30_000 });

  const hasHooks = await page.evaluate(() => {
    const h = (window as any).__testHooks__;
    return typeof h === "object" && h !== null;
  });
  expect(hasHooks).toBe(true);

  const api = await page.evaluate(() => Object.keys((window as any).__testHooks__));
  for (const fn of ["createEngine", "forceHands", "forceCoins", "setPhase", "act", "getState", "getEngine"]) {
    expect(api).toContain(fn);
  }
});
