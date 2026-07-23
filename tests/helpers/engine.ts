import type { Page } from "@playwright/test";

/**
 * Playwright helpers wrapping window.__testHooks__ for Royal Bluff E2E tests.
 * The engine is driven directly (no PeerJS, no 2nd browser context) for fast,
 * deterministic per-rule coverage. See docs/plans/06_tests_e2e_par_jeu/plan.md.
 */

/** Create a fresh standalone engine and return its initial state. */
export async function createEngine(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__testHooks__.createEngine());
}

/** Call an engine method by name with args; returns its (serialized) result. */
export async function act(page: Page, method: string, ...args: any[]): Promise<any> {
  return page.evaluate(
    ({ method, args }) => (window as any).__testHooks__.act(method, args),
    { method, args },
  );
}

/** Replace players' cards by character list (fresh Card objects are built). */
export async function forceHands(page: Page, hands: Record<string, string[]>): Promise<void> {
  await page.evaluate((h) => (window as any).__testHooks__.forceHands(h), hands);
}

/** Force a player's coin count. */
export async function forceCoins(page: Page, playerId: string, coins: number): Promise<void> {
  await page.evaluate(
    ({ playerId, coins }) => (window as any).__testHooks__.forceCoins(playerId, coins),
    { playerId, coins },
  );
}

/** Force the engine phase. */
export async function setPhase(page: Page, phase: string): Promise<void> {
  await page.evaluate((p) => (window as any).__testHooks__.setPhase(p), phase);
}

/** Read the live engine state. */
export async function getState(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__testHooks__.getState());
}

/** Wait until a predicate over the live state returns true. */
export async function waitForState(
  page: Page,
  predicate: (state: any) => boolean,
  timeout = 10_000,
): Promise<void> {
  await expect.poll(async () => predicate(await getState(page)), { timeout }).toBe(true);
}

// Re-export expect for convenience in specs.
export { expect } from "@playwright/test";
