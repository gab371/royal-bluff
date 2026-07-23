import { test, expect } from "@playwright/test";

/**
 * Smoke test: the Royal Bluff standalone lobby renders on load.
 * Does not connect to PeerJS — only asserts the host-creation form is visible.
 */
test("lobby renders on load", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Créer une Table/i }),
  ).toBeVisible({ timeout: 30_000 });
});
