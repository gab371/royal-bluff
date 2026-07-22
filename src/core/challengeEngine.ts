import type { GameState, Player, Character, ActionType, Card } from "./types";
import { getDeck } from "./decks";

export function getRequiredCharacterForAction(action: ActionType): Character | null {
  switch (action) {
    case 'TAXE':
      return 'Duchesse';
    case 'ASSASSINAT':
      return 'Assassin';
    case 'VOL':
      return 'Capitaine';
    case 'ECHANGE':
      return 'Ambassadeur';
    case 'INQUISITION':
      return 'Inquisiteur';
    default:
      return null;
  }
}

export function isBlockAllowed(state: GameState, blockCharacter: Character): boolean {
  if (!state.pendingAction) return false;
  const action = state.pendingAction.action;
  const options = getDeck(state.config.deckId).blockOptions;
  const allowed = options[action as keyof typeof options];
  if (!allowed) return false;
  return allowed.includes(blockCharacter);
}

export function shuffleDeck(deck: Character[]): Character[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export function checkVictory(state: GameState): string | null {
  const activePlayers = state.players.filter(p => !p.isEliminated);
  if (activePlayers.length === 1) {
    return activePlayers[0].id;
  }
  return null;
}

export function logMessage(state: GameState, message: string, type: any = 'info'): void {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  state.logs.unshift({
    id: Math.random().toString(36).substring(2, 9),
    timestamp,
    message,
    type,
  });
  if (state.logs.length > 50) state.logs.pop();
}
