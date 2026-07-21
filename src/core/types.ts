export type Character = 'Duchesse' | 'Assassin' | 'Capitaine' | 'Comtesse' | 'Ambassadeur';

export interface Card {
  id: string;
  character: Character;
  isRevealed: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  coins: number;
  cards: Card[];
  isEliminated: boolean;
}

export type ActionType =
  | 'REVENU'
  | 'AIDE_EXTERIEURE'
  | 'COUP'
  | 'TAXE'
  | 'ASSASSINAT'
  | 'VOL'
  | 'ECHANGE';

export type GamePhase =
  | 'LOBBY'
  | 'ACTION_SELECTION'
  | 'CHALLENGE_WINDOW'
  | 'BLOCK_WINDOW'
  | 'CHALLENGE_BLOCK_WINDOW'
  | 'CHOOSE_LOSS'
  | 'EXCHANGE_DECISION'
  | 'GAME_OVER';

export interface PendingAction {
  playerUid: string;
  action: ActionType;
  targetUid?: string; // For Assassinat, Vol, Coup
  challengePassedUids: string[]; // Players who decided not to challenge
  blockPassedUids: string[]; // Players who decided not to block
}

export interface PendingBlock {
  playerUid: string;
  character: Character;
  challengePassedUids: string[];
}

export interface PendingLoss {
  playerUid: string;
  reason: 'CHALLENGE_LOST' | 'COUP' | 'ASSASSINAT' | 'BLOCK_CHALLENGE_LOST';
  nextPhaseAfterLoss: GamePhase;
}

export interface GameLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'system' | 'warning' | 'action' | 'challenge' | 'block' | 'loss' | 'victory';
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  activePlayerIndex: number;
  deck: Character[];
  pendingAction: PendingAction | null;
  pendingBlock: PendingBlock | null;
  pendingLoss: PendingLoss | null;
  exchangeCards: Character[]; // Temp cards drawn during exchange
  winnerId: string | null;
  logs: GameLog[];
}
