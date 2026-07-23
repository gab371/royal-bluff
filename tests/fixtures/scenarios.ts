import type { Character } from "../../src/core/types";

/**
 * Mock-data fixtures for Royal Bluff E2E tests. Determinism comes from
 * forcing hands (no seeded RNG). Each fixture describes a setup + the
 * expected outcome. See docs/plans/06_tests_e2e_par_jeu/plan.md (Idea 6).
 */

export interface HandsFixture {
  name: string;
  /** 2 characters per player (Royal Bluff starts with 2 cards). */
  hands: Record<string, Character[]>;
}

/** John has the Duchesse, so a challenge against his TAXE is lost by the challenger. */
export const challengeWonByActor: HandsFixture = {
  name: "Défi perdu : l'acteur a la Duchesse",
  hands: {
    j1: ["Duchesse", "Assassin"],
    j2: ["Capitaine", "Comtesse"],
  },
};

/** John does NOT have the Duchesse, so a challenge against his TAXE is won by the challenger. */
export const challengeWonByChallenger: HandsFixture = {
  name: "Défi gagné : l'acteur n'a pas la Duchesse",
  hands: {
    j1: ["Assassin", "Capitaine"],
    j2: ["Duchesse", "Comtesse"],
  },
};

/** Bob has the Comtesse, so he can block an ASSASSINAT. */
export const blockAssassinat: HandsFixture = {
  name: "Blocage d'assassinat par la Comtesse",
  hands: {
    j1: ["Assassin", "Capitaine"],
    j2: ["Comtesse", "Ambassadeur"],
  },
};

/** Igor has the Capitaine, so he can block a VOL targeting him. */
export const blockVol: HandsFixture = {
  name: "Blocage de vol par le Capitaine",
  hands: {
    j1: ["Duchesse", "Assassin"],
    j2: ["Capitaine", "Comtesse"],
  },
};

/** Deck Réformation: Ina has the Inquisiteur to declare an INQUISITION. */
export const inquisitionReformation: HandsFixture = {
  name: "Inquisition (deck Réformation)",
  hands: {
    i1: ["Inquisiteur", "Duchesse"],
    i2: ["Capitaine", "Assassin"],
  },
};
