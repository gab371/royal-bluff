export type Character = 'Duchesse' | 'Assassin' | 'Capitaine' | 'Comtesse' | 'Ambassadeur' | 'Inquisiteur';

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
  | 'ECHANGE'
  | 'INQUISITION';

export type GamePhase =
  | 'LOBBY'
  | 'ACTION_SELECTION'
  | 'CHALLENGE_WINDOW'
  | 'BLOCK_WINDOW'
  | 'CHALLENGE_BLOCK_WINDOW'
  | 'CHOOSE_LOSS'
  | 'EXCHANGE_DECISION'
  | 'INQUISITION_DECISION'
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
  // When true, the original pending action must still resolve after this loss
  // (e.g. a challenge was made against the actor but the actor had the right card).
  resolveActionAfterLoss?: boolean;
}

/** Inquisition reveal: exposes one target card to the actor only. */
export interface InquisitionReveal {
  actorUid: string;
  targetUid: string;
  cardId: string;
  character: Character;
}

export interface GameConfig {
  deckId: 'CLASSIC' | 'REFORMATION';
  /** When true, the action helper (green borders on block-capable cards + info bubbles) is shown. */
  actionHelper: boolean;
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
  inquisitionReveal: InquisitionReveal | null; // Card revealed to the Inquisitor actor
  config: GameConfig;
  winnerId: string | null;
  logs: GameLog[];
}
