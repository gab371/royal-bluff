import { test, expect } from "@playwright/test";
import {
  createEngine,
  act,
  forceHands,
  forceCoins,
  getState,
} from "./helpers/engine";
import {
  challengeWonByActor,
  challengeWonByChallenger,
  blockAssassinat,
  blockVol,
  inquisitionReformation,
} from "./fixtures/scenarios";

/**
 * Royal Bluff — per-rule E2E specs. The engine is driven directly via
 * window.__testHooks__ (no PeerJS, no 2nd browser context) for fast,
 * deterministic coverage. Each test sets up a 2-player game, forces hands
 * for the scenario, and asserts the rule's observable effect on engine state.
 */

async function lobbyVisible(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Créer une Table/i })).toBeVisible({ timeout: 30_000 });
}

async function setupTwoPlayers(page: import("@playwright/test").Page) {
  await createEngine(page);
  await act(page, "addPlayer", "j1", "John", "👑", true);
  await act(page, "addPlayer", "j2", "Seb", "🧙", false);
  expect(await act(page, "startGame")).toBe(true);
  const state = await getState(page);
  expect(state.phase).toBe("ACTION_SELECTION");
  expect(state.players[0].coins).toBe(2);
  expect(state.players[0].cards.length).toBe(2);
  expect(state.activePlayerIndex).toBe(0);
}

test("REVENU: +1 coin and turn passes to next player", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await act(page, "executeAction", "j1", "REVENU");
  const state = await getState(page);
  expect(state.players[0].coins).toBe(3);
  expect(state.activePlayerIndex).toBe(1);
  expect(state.phase).toBe("ACTION_SELECTION");
});

test("TAXE (unchallenged): +3 coins and turn passes", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await act(page, "executeAction", "j1", "TAXE");
  expect((await getState(page)).phase).toBe("CHALLENGE_WINDOW");
  await act(page, "submitChallengeDecision", "j2", false); // pass
  const state = await getState(page);
  expect(state.players[0].coins).toBe(5); // 2 + 3
  expect(state.activePlayerIndex).toBe(1);
});

test("TAXE: challenge lost by challenger (actor has the Duchesse) — actor still gets +3", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await forceHands(page, challengeWonByActor.hands);
  const coinsBefore = (await getState(page)).players[0].coins;
  await act(page, "executeAction", "j1", "TAXE");
  expect((await getState(page)).phase).toBe("CHALLENGE_WINDOW");
  await act(page, "submitChallengeDecision", "j2", true); // wrong challenge
  let state = await getState(page);
  expect(state.phase).toBe("CHOOSE_LOSS");
  expect(state.pendingLoss.playerUid).toBe("j2");
  const sebCardId = state.players[1].cards[0].id;
  await act(page, "chooseLoss", "j2", sebCardId);
  state = await getState(page);
  expect(state.players[1].cards[0].isRevealed).toBe(true);
  expect(state.players[0].coins).toBe(coinsBefore + 3); // actor proved role → +3
  expect(state.phase).toBe("ACTION_SELECTION");
});

test("TAXE: challenge won by challenger (actor lacks the Duchesse) — actor loses a card, no +3", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await forceHands(page, challengeWonByChallenger.hands);
  await act(page, "executeAction", "j1", "TAXE");
  await act(page, "submitChallengeDecision", "j2", true); // correct challenge
  let state = await getState(page);
  expect(state.phase).toBe("CHOOSE_LOSS");
  expect(state.pendingLoss.playerUid).toBe("j1"); // actor loses
  const johnCardId = state.players[0].cards[0].id;
  await act(page, "chooseLoss", "j1", johnCardId);
  state = await getState(page);
  expect(state.players[0].cards[0].isRevealed).toBe(true);
  expect(state.players[0].coins).toBe(2); // no +3, action cancelled
});

test("AIDE_EXTERIEURE (unchallenged, unblocked): +2 coins", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await act(page, "executeAction", "j1", "AIDE_EXTERIEURE");
  // Foreign aid cannot be challenged (no required character) → challenge window
  // resolves once the opponent passes; then block window resolves once no one blocks.
  expect((await getState(page)).phase).toBe("CHALLENGE_WINDOW");
  await act(page, "submitChallengeDecision", "j2", false);
  expect((await getState(page)).phase).toBe("BLOCK_WINDOW");
  await act(page, "submitBlockDecision", "j2", null); // no block
  const state = await getState(page);
  expect(state.players[0].coins).toBe(4); // 2 + 2
  expect(state.activePlayerIndex).toBe(1);
});

test("VOL (unblocked): steal up to 2 coins from target", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await act(page, "executeAction", "j1", "VOL", "j2");
  await act(page, "submitChallengeDecision", "j2", false);
  await act(page, "submitBlockDecision", "j2", null); // no block
  const state = await getState(page);
  expect(state.players[0].coins).toBe(4); // 2 + 2
  expect(state.players[1].coins).toBe(0); // 2 - 2
  expect(state.activePlayerIndex).toBe(1);
});

test("VOL blocked by Capitaine: action cancelled, no steal", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await forceHands(page, blockVol.hands);
  await act(page, "executeAction", "j1", "VOL", "j2");
  await act(page, "submitChallengeDecision", "j2", false);
  expect((await getState(page)).phase).toBe("BLOCK_WINDOW");
  await act(page, "submitBlockDecision", "j2", "Capitaine");
  expect((await getState(page)).phase).toBe("CHALLENGE_BLOCK_WINDOW");
  await act(page, "submitBlockChallengeDecision", "j1", false); // actor accepts block
  const state = await getState(page);
  expect(state.players[0].coins).toBe(2); // unchanged
  expect(state.players[1].coins).toBe(2); // unchanged
  expect(state.phase).toBe("ACTION_SELECTION");
});

test("ASSASSINAT blocked by Comtesse: action cancelled, target keeps influence", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await forceHands(page, blockAssassinat.hands);
  await forceCoins(page, "j1", 5); // need ≥3 for assassinat
  await act(page, "executeAction", "j1", "ASSASSINAT", "j2");
  await act(page, "submitChallengeDecision", "j2", false);
  await act(page, "submitBlockDecision", "j2", "Comtesse");
  await act(page, "submitBlockChallengeDecision", "j1", false);
  const state = await getState(page);
  expect(state.players[0].coins).toBe(2); // 5 - 3 cost, action cancelled
  expect(state.players[1].cards.every((c: any) => !c.isRevealed)).toBe(true);
  expect(state.phase).toBe("ACTION_SELECTION");
});

test("COUP is mandatory at ≥10 coins: REVENU is refused", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await forceCoins(page, "j1", 10);
  const ok = await act(page, "executeAction", "j1", "REVENU");
  expect(ok).toBe(false); // refused — must coup
  let state = await getState(page);
  expect(state.phase).toBe("ACTION_SELECTION");
  expect(state.players[0].coins).toBe(10); // unchanged
  // Now perform the coup on j2.
  await act(page, "executeAction", "j1", "COUP", "j2");
  state = await getState(page);
  expect(state.phase).toBe("CHOOSE_LOSS");
  expect(state.pendingLoss.playerUid).toBe("j2");
  expect(state.players[0].coins).toBe(3); // 10 - 7
});

test("ECHANGE: enters EXCHANGE_DECISION then returns to ACTION_SELECTION", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await act(page, "executeAction", "j1", "ECHANGE");
  await act(page, "submitChallengeDecision", "j2", false);
  let state = await getState(page);
  expect(state.phase).toBe("EXCHANGE_DECISION");
  expect(state.exchangeCards.length).toBe(2);
  // Keep the two current alive characters (unchanged hand).
  const aliveChars = state.players[0].cards.filter((c: any) => !c.isRevealed).map((c: any) => c.character);
  await act(page, "exchangeSelect", "j1", aliveChars);
  state = await getState(page);
  expect(state.phase).toBe("ACTION_SELECTION");
  expect(state.activePlayerIndex).toBe(1);
});

test("INQUISITION (deck Réformation): inspect then force-swap, returns to ACTION_SELECTION", async ({ page }) => {
  await lobbyVisible(page);
  await createEngine(page);
  await act(page, "addPlayer", "i1", "Ina", "🦅", true);
  await act(page, "addPlayer", "i2", "Igor", "🛡️", false);
  await act(page, "setConfig", { deckId: "REFORMATION" });
  await act(page, "startGame");
  await forceHands(page, inquisitionReformation.hands);
  await act(page, "executeAction", "i1", "INQUISITION", "i2");
  await act(page, "submitChallengeDecision", "i2", false);
  let state = await getState(page);
  expect(state.phase).toBe("INQUISITION_DECISION");
  expect(state.inquisitionReveal?.targetUid).toBe("i2");
  await act(page, "inquisitionDecide", "i1", true); // force swap
  state = await getState(page);
  expect(state.phase).toBe("ACTION_SELECTION");
  expect(state.inquisitionReveal).toBe(null);
});

test("Victory: eliminating the only opponent ends the game", async ({ page }) => {
  await lobbyVisible(page);
  await setupTwoPlayers(page);
  await forceCoins(page, "j1", 14); // enough for two coups (7 each)

  // First coup — j2 loses one influence (1 card left, not eliminated).
  await act(page, "executeAction", "j1", "COUP", "j2");
  let state = await getState(page);
  expect(state.phase).toBe("CHOOSE_LOSS");
  let cardId = state.players[1].cards.find((c: any) => !c.isRevealed).id;
  await act(page, "chooseLoss", "j2", cardId);
  state = await getState(page);
  expect(state.players[1].isEliminated).toBe(false);
  expect(state.players[0].coins).toBe(7); // 14 - 7

  // Turn passed to j2 — j2 takes REVENU so the turn goes back to j1.
  expect(state.activePlayerIndex).toBe(1);
  await act(page, "executeAction", "j2", "REVENU");

  // Second coup — j2 loses last influence and is eliminated.
  await act(page, "executeAction", "j1", "COUP", "j2");
  state = await getState(page);
  cardId = state.players[1].cards.find((c: any) => !c.isRevealed).id;
  await act(page, "chooseLoss", "j2", cardId);

  const final = await getState(page);
  expect(final.players[1].isEliminated).toBe(true);
  expect(final.phase).toBe("GAME_OVER");
  expect(final.winnerId).toBe("j1");
});
