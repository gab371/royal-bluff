import type { GameState, Player, Character, ActionType, Card } from "./types";

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
    default:
      return null;
  }
}

export function isBlockAllowed(action: ActionType, blockCharacter: Character): boolean {
  switch (action) {
    case 'AIDE_EXTERIEURE':
      return blockCharacter === 'Duchesse';
    case 'ASSASSINAT':
      return blockCharacter === 'Comtesse';
    case 'VOL':
      return blockCharacter === 'Capitaine' || blockCharacter === 'Ambassadeur';
    default:
      return false;
  }
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
