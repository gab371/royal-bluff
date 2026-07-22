import type { Character, ActionType } from "./types";

export type DeckId = 'CLASSIC' | 'REFORMATION';

export interface DeckDefinition {
  id: DeckId;
  name: string;
  shortName: string;
  description: string;
  characters: Character[];
  copiesPerCharacter: number;
  /** Actions available in this deck (beyond the universal REVENU/AIDE_EXTERIEURE/COUP). */
  roleActions: ActionType[];
  /** For each blockable action, the characters that may block it. */
  blockOptions: Partial<Record<Exclude<ActionType, 'REVENU' | 'COUP' | 'TAXE' | 'ECHANGE' | 'INQUISITION'>, Character[]>>;
}

export const DECKS: Record<DeckId, DeckDefinition> = {
  CLASSIC: {
    id: 'CLASSIC',
    name: 'Coup Classique',
    shortName: 'Classique',
    description:
      "Les 5 influences classiques : Duchesse, Assassin, Capitaine, Comtesse, Ambassadeur. L'expérience Coup originelle.",
    characters: ['Duchesse', 'Assassin', 'Capitaine', 'Comtesse', 'Ambassadeur'],
    copiesPerCharacter: 3,
    roleActions: ['TAXE', 'ASSASSINAT', 'VOL', 'ECHANGE'],
    blockOptions: {
      AIDE_EXTERIEURE: ['Duchesse'],
      ASSASSINAT: ['Comtesse'],
      VOL: ['Capitaine', 'Ambassadeur'],
    },
  },
  REFORMATION: {
    id: 'REFORMATION',
    name: 'Coup : Réformation',
    shortName: 'Réformation',
    description:
      "Extension ajoutant l'Inquisiteur : bloque l'Aide Extérieure (comme la Duchesse) et peut lancer une Inquisition pour inspecter une influence adverse et forcer son échange avec la pioche.",
    characters: ['Duchesse', 'Assassin', 'Capitaine', 'Comtesse', 'Ambassadeur', 'Inquisiteur'],
    copiesPerCharacter: 3,
    roleActions: ['TAXE', 'ASSASSINAT', 'VOL', 'ECHANGE', 'INQUISITION'],
    blockOptions: {
      AIDE_EXTERIEURE: ['Duchesse', 'Inquisiteur'],
      ASSASSINAT: ['Comtesse'],
      VOL: ['Capitaine', 'Ambassadeur'],
    },
  },
};

export const DEFAULT_DECK_ID: DeckId = 'CLASSIC';

export function getDeck(id: DeckId): DeckDefinition {
  return DECKS[id] ?? DECKS[DEFAULT_DECK_ID];
}

/** Characters that may block the given action in the given deck. */
export function getBlockOptions(deckId: DeckId, action: ActionType): Character[] {
  const deck = getDeck(deckId);
  return deck.blockOptions[action as keyof typeof deck.blockOptions] ?? [];
}
