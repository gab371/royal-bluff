import { test, expect } from "@playwright/test";
import { createEngine, act, forceCoins, getState } from "./helpers/engine";

/**
 * Royal Bluff — full-game E2E spec. Drives a complete 2-player game from
 * ACTION_SELECTION to GAME_OVER via the engine hooks (deterministic, no PeerJS),
 * mixing economic actions (REVENU, TAXE) and an endgame of two COUPs.
 */
async function lobbyVisible(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Créer une Table/i })).toBeVisible({ timeout: 30_000 });
}

test("full game: REVENU/TAXE then two COUPs → GAME_OVER", async ({ page }) => {
  await lobbyVisible(page);
  await createEngine(page);
  await act(page, "addPlayer", "j1", "John", "👑", true);
  await act(page, "addPlayer", "j2", "Seb", "🧙", false);
  await act(page, "startGame");

  // Economic phase: alternate REVENU and an unchallenged TAXE.
  await act(page, "executeAction", "j1", "REVENU"); // j1: 3 → turn j2
  await act(page, "executeAction", "j2", "TAXE"); // challenge window
  await act(page, "submitChallengeDecision", "j1", false); // pass → j2: 5 → turn j1
  await act(page, "executeAction", "j1", "REVENU"); // j1: 4 → turn j2
  await act(page, "executeAction", "j2", "REVENU"); // j2: 6 → turn j1

  // Endgame: accelerate to two coups.
  await forceCoins(page, "j1", 14);
  await act(page, "executeAction", "j1", "COUP", "j2");
  let state = await getState(page);
  expect(state.phase).toBe("CHOOSE_LOSS");
  await act(page, "chooseLoss", "j2", state.players[1].cards.find((c: any) => !c.isRevealed).id);
  expect((await getState(page)).players[1].isEliminated).toBe(false); // 1 card left

  // j2's turn — j2 takes REVENU to give the turn back to j1.
  await act(page, "executeAction", "j2", "REVENU");

  // Second coup eliminates j2.
  await act(page, "executeAction", "j1", "COUP", "j2");
  state = await getState(page);
  await act(page, "chooseLoss", "j2", state.players[1].cards.find((c: any) => !c.isRevealed).id);

  const final = await getState(page);
  expect(final.players[1].isEliminated).toBe(true);
  expect(final.phase).toBe("GAME_OVER");
  expect(final.winnerId).toBe("j1");
});
