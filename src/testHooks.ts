import { RoyalBluffEngine } from "./core/gameEngine";
import type { Character, Card, GamePhase } from "./core/types";

/**
 * Test hooks for Royal Bluff E2E tests.
 *
 * Exposed on `window.__testHooks__` ONLY in non-production builds (Playwright
 * runs `vite` in dev mode, so the hooks are present during tests; the prod
 * build strips them). Determinism comes from forcing hands/coins/phase and
 * driving the live engine via `act` — no seeded RNG, no PeerJS, no 2nd browser
 * context. See docs/plans/06_tests_e2e_par_jeu/plan.md (Idea 6, Step 2).
 */
declare global {
  interface Window {
    __testHooks__?: RoyalBluffTestHooks;
  }
}

export interface RoyalBluffTestHooks {
  /** Create a fresh standalone engine (no PeerJS) and register it for the other hooks. */
  createEngine(): unknown;
  /** Replace a player's cards by character list (fresh Card objects are built). */
  forceHands(hands: Record<string, Character[]>): void;
  /** Force a player's coin count. */
  forceCoins(playerId: string, coins: number): void;
  /** Force the engine phase. */
  setPhase(phase: GamePhase): void;
  /** Call an engine method by name with args (returns its result, serialized). */
  act(method: string, args: unknown[]): unknown;
  /** Read the live engine state. */
  getState(): unknown;
  /** Get the live engine instance (or null if not yet created). */
  getEngine(): RoyalBluffEngine | null;
}

let engineGetter: (() => RoyalBluffEngine | null) | null = null;
let testEngine: RoyalBluffEngine | null = null;

/** Called from useGame to expose the live engine ref to the test hooks. */
export function registerEngineGetter(getter: () => RoyalBluffEngine | null): void {
  engineGetter = getter;
}

function liveEngine(): RoyalBluffEngine | null {
  return testEngine ?? engineGetter?.() ?? null;
}

export function installTestHooks(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.PROD) return; // never expose in production builds
  if (window.__testHooks__) return; // idempotent

  window.__testHooks__ = {
    createEngine: () => {
      testEngine = new RoyalBluffEngine();
      return testEngine.state;
    },
    forceHands: (hands) => {
      const engine = liveEngine();
      if (!engine) return;
      for (const [playerId, characters] of Object.entries(hands)) {
        const p = engine.state.players.find((pl) => pl.id === playerId);
        if (!p) continue;
        const cards: Card[] = characters.map((character, i) => ({
          id: `${playerId}_test_${i}`,
          character,
          isRevealed: false,
        }));
        (p as unknown as { cards: Card[] }).cards = cards;
      }
    },
    forceCoins: (playerId, coins) => {
      const engine = liveEngine();
      const p = engine?.state.players.find((pl) => pl.id === playerId);
      if (p) (p as unknown as { coins: number }).coins = coins;
    },
    setPhase: (phase) => {
      const engine = liveEngine();
      if (engine) (engine.state as unknown as { phase: GamePhase }).phase = phase;
    },
    act: (method, args) => {
      const engine = liveEngine();
      if (!engine) return undefined;
      const fn = (engine as unknown as Record<string, (...a: unknown[]) => unknown>)[method];
      if (typeof fn !== "function") return undefined;
      return fn.apply(engine, args);
    },
    getState: () => liveEngine()?.state ?? null,
    getEngine: () => liveEngine(),
  };
}
