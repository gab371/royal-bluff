import type { GameState, Card, Player, ActionType, Character } from "../core/types";

export type MessageType = 'JOIN' | 'STATE_UPDATE' | 'ACTION' | 'CHAT';

export interface NetworkMessage {
  type: MessageType;
  [key: string]: any;
}

export interface ChatMessage extends NetworkMessage {
  type: 'CHAT';
  sender: string;
  text: string;
  time: string;
}

export interface StateUpdateMessage extends NetworkMessage {
  type: 'STATE_UPDATE';
  state: GameState;
}

export type ClientActionType =
  | 'DECLARE_ACTION'
  | 'CHALLENGE_DECISION'
  | 'BLOCK_DECISION'
  | 'BLOCK_CHALLENGE_DECISION'
  | 'CHOOSE_LOSS'
  | 'EXCHANGE_SELECT'
  | 'INQUISITION_DECIDE'
  | 'READY'
  | 'START_GAME'
  | 'RESET_LOBBY'
  | 'CHANGE_CONFIG';

export interface ActionMessage extends NetworkMessage {
  type: 'ACTION';
  actionName: ClientActionType;
  playerId: string;
  payload: any;
}

/**
 * Sanitizes the game state for a specific player before sending it over the network.
 * Hides other players' unrevealed cards and the deck content.
 */
export function sanitizeGameState(state: GameState, targetPlayerId: string): GameState {
  const sanitizedPlayers = state.players.map((player): Player => {
    if (player.id === targetPlayerId) {
      return {
        ...player,
        cards: player.cards.map(c => ({ ...c })),
      };
    }

    return {
      ...player,
      cards: player.cards.map(c => {
        if (c.isRevealed) {
          return { ...c };
        }
        return {
          id: c.id,
          character: 'Comtesse' as Character, // Mask character
          isRevealed: false,
          isMasked: true, // Custom flag to help front-end render it as hidden
        } as Card & { isMasked?: boolean };
      }),
    };
  });

  // Only the active player should see the exchangeCards if they are in the EXCHANGE_DECISION phase
  const showExchange = state.phase === 'EXCHANGE_DECISION' && state.players[state.activePlayerIndex]?.id === targetPlayerId;

  // Only the Inquisitor actor may see the inspected card's real character.
  const reveal = state.inquisitionReveal;
  const sanitizedReveal = reveal && reveal.actorUid === targetPlayerId
    ? { ...reveal }
    : null;

  return {
    ...state,
    deck: [], // Hide remaining deck
    exchangeCards: showExchange ? [...state.exchangeCards] : [],
    inquisitionReveal: sanitizedReveal,
    players: sanitizedPlayers,
  };
}
