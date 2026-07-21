import type {
  GameState,
  Player,
  Character,
  ActionType,
  Card,
  PendingAction,
  PendingBlock,
  PendingLoss,
  GameLog,
} from "./types";
import {
  getRequiredCharacterForAction,
  isBlockAllowed,
  shuffleDeck,
  checkVictory,
  logMessage,
} from "./challengeEngine";

export class RoyalBluffEngine {
  public state: GameState;

  constructor() {
    this.state = this.createInitialState();
  }

  public createInitialState(): GameState {
    return {
      phase: 'LOBBY',
      players: [],
      activePlayerIndex: 0,
      deck: [],
      pendingAction: null,
      pendingBlock: null,
      pendingLoss: null,
      exchangeCards: [],
      winnerId: null,
      logs: [],
    };
  }

  public addPlayer(id: string, name: string, avatar: string = '👑', isHost: boolean = false): boolean {
    if (this.state.phase !== 'LOBBY') return false;
    if (this.state.players.find(p => p.id === id)) return false;

    this.state.players.push({
      id,
      name,
      avatar,
      isHost,
      isReady: false,
      coins: 2,
      cards: [],
      isEliminated: false,
    });

    logMessage(this.state, `${name} a rejoint le salon !`, 'system');
    return true;
  }

  public setPlayerReady(id: string, readyStatus: boolean): void {
    const p = this.state.players.find(p => p.id === id);
    if (p) p.isReady = readyStatus;
  }

  public startGame(): boolean {
    const activePlayers = this.state.players.filter(p => !p.isEliminated);
    if (activePlayers.length < 2 || activePlayers.length > 6) return false;

    // Generate deck: 3 copies of 5 characters
    const chars: Character[] = ['Duchesse', 'Assassin', 'Capitaine', 'Comtesse', 'Ambassadeur'];
    let rawDeck: Character[] = [];
    chars.forEach(c => {
      rawDeck.push(c, c, c);
    });

    this.state.deck = shuffleDeck(rawDeck);
    this.state.phase = 'ACTION_SELECTION';
    this.state.activePlayerIndex = 0;
    this.state.winnerId = null;
    this.state.pendingAction = null;
    this.state.pendingBlock = null;
    this.state.pendingLoss = null;

    this.state.players.forEach(p => {
      p.coins = 2;
      p.isEliminated = false;
      p.cards = [
        { id: `${p.id}_card_1`, character: this.state.deck.pop()!, isRevealed: false },
        { id: `${p.id}_card_2`, character: this.state.deck.pop()!, isRevealed: false },
      ];
    });

    logMessage(this.state, `La partie commence !`, 'system');
    return true;
  }

  public resetToLobby(): void {
    this.state.phase = 'LOBBY';
    this.state.players.forEach(p => {
      p.isReady = false;
      p.coins = 2;
      p.cards = [];
      p.isEliminated = false;
    });
    this.state.pendingAction = null;
    this.state.pendingBlock = null;
    this.state.pendingLoss = null;
    this.state.exchangeCards = [];
    this.state.winnerId = null;
    logMessage(this.state, `Retour au salon. En attente de préparation des conspirateurs.`, 'system');
  }

  public getActivePlayer(): Player {
    return this.state.players[this.state.activePlayerIndex];
  }

  public advanceTurn(): void {
    const victoryId = checkVictory(this.state);
    if (victoryId) {
      this.state.phase = 'GAME_OVER';
      this.state.winnerId = victoryId;
      const winner = this.state.players.find(p => p.id === victoryId);
      logMessage(this.state, `${winner?.name} a gagné la partie !`, 'victory');
      return;
    }

    const startIdx = this.state.activePlayerIndex;
    let nextIdx = (startIdx + 1) % this.state.players.length;

    while (nextIdx !== startIdx) {
      const p = this.state.players[nextIdx];
      if (!p.isEliminated) {
        this.state.activePlayerIndex = nextIdx;
        this.state.phase = 'ACTION_SELECTION';
        this.state.pendingAction = null;
        this.state.pendingBlock = null;
        this.state.pendingLoss = null;
        return;
      }
      nextIdx = (nextIdx + 1) % this.state.players.length;
    }
  }

  public executeAction(playerId: string, action: ActionType, targetUid?: string): boolean {
    if (this.state.phase !== 'ACTION_SELECTION') return false;
    const actor = this.getActivePlayer();
    if (actor.id !== playerId) return false;

    // Obligatory Coup at 10+ coins
    if (actor.coins >= 10 && action !== 'COUP') {
      logMessage(this.state, `${actor.name} a 10 pièces ou plus et doit faire un Coup d'État.`, 'warning');
      return false;
    }

    // Costs
    if (action === 'COUP' && actor.coins < 7) return false;
    if (action === 'ASSASSINAT' && actor.coins < 3) return false;

    // Pay costs
    if (action === 'COUP') actor.coins -= 7;
    if (action === 'ASSASSINAT') actor.coins -= 3;

    logMessage(this.state, `${actor.name} déclare l'action: ${action}${targetUid ? ` sur ` + this.state.players.find(p=>p.id===targetUid)?.name : ''}`, 'action');

    if (action === 'REVENU') {
      actor.coins += 1;
      this.advanceTurn();
      return true;
    }

    if (action === 'COUP') {
      if (!targetUid) return false;
      this.state.pendingLoss = {
        playerUid: targetUid,
        reason: 'COUP',
        nextPhaseAfterLoss: 'ACTION_SELECTION',
      };
      this.state.phase = 'CHOOSE_LOSS';
      return true;
    }

    // Challengeable action (TAXE, ASSASSINAT, VOL, ECHANGE, AIDE_EXTERIEURE)
    this.state.pendingAction = {
      playerUid: actor.id,
      action,
      targetUid,
      challengePassedUids: [],
      blockPassedUids: [],
    };
    this.state.phase = 'CHALLENGE_WINDOW';
    return true;
  }

  public submitChallengeDecision(playerId: string, challenge: boolean): boolean {
    if (this.state.phase !== 'CHALLENGE_WINDOW' || !this.state.pendingAction) return false;
    const actor = this.state.players.find(p => p.id === this.state.pendingAction!.playerUid)!;
    if (playerId === actor.id) return false; // Can't challenge own action

    const decider = this.state.players.find(p => p.id === playerId);
    if (!decider || decider.isEliminated) return false;

    if (challenge) {
      logMessage(this.state, `${decider.name} conteste l'action de ${actor.name} !`, 'challenge');
      const reqChar = getRequiredCharacterForAction(this.state.pendingAction.action);
      if (!reqChar) {
        // Foreign Aid has no associated character, cannot be challenged this way
        return false;
      }

      const hasChar = actor.cards.some(c => !c.isRevealed && c.character === reqChar);
      if (hasChar) {
        logMessage(this.state, `${actor.name} montre la carte ${reqChar} ! Défi réussi.`, 'challenge');
        // Shuffle & draw new card
        const cardIdx = actor.cards.findIndex(c => !c.isRevealed && c.character === reqChar);
        this.state.deck.push(actor.cards[cardIdx].character);
        this.state.deck = shuffleDeck(this.state.deck);
        actor.cards[cardIdx].character = this.state.deck.pop()!;

        // Challenger loses card
        const nextPhase = this.state.pendingAction.action === 'ASSASSINAT' ||
                          this.state.pendingAction.action === 'VOL'
                            ? 'BLOCK_WINDOW'
                            : 'ACTION_SELECTION';

        this.state.pendingLoss = {
          playerUid: decider.id,
          reason: 'CHALLENGE_LOST',
          nextPhaseAfterLoss: nextPhase,
        };
        this.state.phase = 'CHOOSE_LOSS';
      } else {
        logMessage(this.state, `${actor.name} n'a pas la carte ${reqChar} ! Défi perdu.`, 'challenge');
        // Actor loses card
        this.state.pendingLoss = {
          playerUid: actor.id,
          reason: 'CHALLENGE_LOST',
          nextPhaseAfterLoss: 'ACTION_SELECTION',
        };
        this.state.phase = 'CHOOSE_LOSS';
      }
      return true;
    } else {
      if (!this.state.pendingAction.challengePassedUids.includes(playerId)) {
        this.state.pendingAction.challengePassedUids.push(playerId);
      }
      const opponents = this.state.players.filter(p => !p.isEliminated && p.id !== actor.id);
      if (this.state.pendingAction.challengePassedUids.length === opponents.length) {
        this.resolveUnchallengedAction();
      }
      return true;
    }
  }

  private resolveUnchallengedAction(): void {
    const act = this.state.pendingAction!;
    const actor = this.state.players.find(p => p.id === act.playerUid)!;

    if (act.action === 'TAXE') {
      actor.coins += 3;
      this.advanceTurn();
    } else if (act.action === 'ECHANGE') {
      this.state.exchangeCards = [this.state.deck.pop()!, this.state.deck.pop()!];
      this.state.phase = 'EXCHANGE_DECISION';
    } else if (act.action === 'AIDE_EXTERIEURE' || act.action === 'ASSASSINAT' || act.action === 'VOL') {
      this.state.phase = 'BLOCK_WINDOW';
    }
  }

  public submitBlockDecision(playerId: string, blockCharacter: Character | null): boolean {
    if (this.state.phase !== 'BLOCK_WINDOW' || !this.state.pendingAction) return false;
    const actor = this.state.players.find(p => p.id === this.state.pendingAction.playerUid)!;
    const decider = this.state.players.find(p => p.id === playerId);
    if (!decider || decider.isEliminated) return false;

    // Check if player is allowed to block
    const isTarget = this.state.pendingAction.targetUid === playerId;
    const isForeignAid = this.state.pendingAction.action === 'AIDE_EXTERIEURE';
    if (!isTarget && !isForeignAid) return false; // Only target or anyone for Foreign Aid

    if (blockCharacter) {
      if (!isBlockAllowed(this.state.pendingAction.action, blockCharacter)) return false;
      logMessage(this.state, `${decider.name} bloque l'action avec ${blockCharacter}.`, 'block');
      this.state.pendingBlock = {
        playerUid: decider.id,
        character: blockCharacter,
        challengePassedUids: [],
      };
      this.state.phase = 'CHALLENGE_BLOCK_WINDOW';
      return true;
    } else {
      if (!this.state.pendingAction.blockPassedUids.includes(playerId)) {
        this.state.pendingAction.blockPassedUids.push(playerId);
      }
      const eligibleBlockersCount = isForeignAid
        ? this.state.players.filter(p => !p.isEliminated && p.id !== actor.id).length
        : 1;

      if (this.state.pendingAction.blockPassedUids.length === eligibleBlockersCount) {
        this.resolveActionEffects();
      }
      return true;
    }
  }

  public submitBlockChallengeDecision(playerId: string, challenge: boolean): boolean {
    if (this.state.phase !== 'CHALLENGE_BLOCK_WINDOW' || !this.state.pendingBlock || !this.state.pendingAction) return false;
    const blocker = this.state.players.find(p => p.id === this.state.pendingBlock.playerUid)!;
    if (playerId === blocker.id) return false;

    const decider = this.state.players.find(p => p.id === playerId);
    if (!decider || decider.isEliminated) return false;

    if (challenge) {
      logMessage(this.state, `${decider.name} conteste le blocage de ${blocker.name} !`, 'challenge');
      const reqChar = this.state.pendingBlock.character;
      const hasChar = blocker.cards.some(c => !c.isRevealed && c.character === reqChar);

      if (hasChar) {
        logMessage(this.state, `${blocker.name} montre la carte ${reqChar} ! Blocage réussi.`, 'challenge');
        const cardIdx = blocker.cards.findIndex(c => !c.isRevealed && c.character === reqChar);
        this.state.deck.push(blocker.cards[cardIdx].character);
        this.state.deck = shuffleDeck(this.state.deck);
        blocker.cards[cardIdx].character = this.state.deck.pop()!;

        // Challenger loses card, original action cancelled
        this.state.pendingLoss = {
          playerUid: decider.id,
          reason: 'BLOCK_CHALLENGE_LOST',
          nextPhaseAfterLoss: 'ACTION_SELECTION',
        };
        this.state.phase = 'CHOOSE_LOSS';
      } else {
        logMessage(this.state, `${blocker.name} n'a pas la carte ${reqChar} ! Blocage annulé.`, 'challenge');
        // Blocker loses card. Original action applies!
        // We will store this sequence in a helper check so we can run the action after they choose their loss.
        this.state.pendingLoss = {
          playerUid: blocker.id,
          reason: 'BLOCK_CHALLENGE_LOST',
          nextPhaseAfterLoss: 'ACTION_SELECTION', // Will trigger resolveActionEffects in chooseLoss
        };
        this.state.phase = 'CHOOSE_LOSS';
      }
      return true;
    } else {
      if (!this.state.pendingBlock.challengePassedUids.includes(playerId)) {
        this.state.pendingBlock.challengePassedUids.push(playerId);
      }
      const opponents = this.state.players.filter(p => !p.isEliminated && p.id !== blocker.id);
      if (this.state.pendingBlock.challengePassedUids.length === opponents.length) {
        logMessage(this.state, `Le blocage est accepté. Action de ${this.state.players.find(p=>p.id===this.state.pendingAction!.playerUid)?.name} annulée.`, 'block');
        this.advanceTurn();
      }
      return true;
    }
  }

  private resolveActionEffects(): void {
    const act = this.state.pendingAction!;
    const actor = this.state.players.find(p => p.id === act.playerUid)!;
    const target = act.targetUid ? this.state.players.find(p => p.id === act.targetUid)! : null;

    if (act.action === 'AIDE_EXTERIEURE') {
      actor.coins += 2;
      this.advanceTurn();
    } else if (act.action === 'VOL') {
      if (target) {
        const stealAmount = Math.min(2, target.coins);
        target.coins -= stealAmount;
        actor.coins += stealAmount;
      }
      this.advanceTurn();
    } else if (act.action === 'ASSASSINAT') {
      if (target && !target.isEliminated) {
        this.state.pendingLoss = {
          playerUid: target.id,
          reason: 'ASSASSINAT',
          nextPhaseAfterLoss: 'ACTION_SELECTION',
        };
        this.state.phase = 'CHOOSE_LOSS';
      } else {
        this.advanceTurn();
      }
    }
  }

  public chooseLoss(playerId: string, cardId: string): boolean {
    if (this.state.phase !== 'CHOOSE_LOSS' || !this.state.pendingLoss) return false;
    if (this.state.pendingLoss.playerUid !== playerId) return false;

    const player = this.state.players.find(p => p.id === playerId)!;
    const card = player.cards.find(c => c.id === cardId && !c.isRevealed);
    if (!card) return false;

    card.isRevealed = true;
    logMessage(this.state, `${player.name} révèle et perd son influence : ${card.character}.`, 'loss');

    // Check if player is eliminated
    const aliveCards = player.cards.filter(c => !c.isRevealed);
    if (aliveCards.length === 0) {
      player.isEliminated = true;
      logMessage(this.state, `${player.name} est éliminé de la partie !`, 'warning');
    }

    const nextPhase = this.state.pendingLoss.nextPhaseAfterLoss;
    const wasBlockChallengeFailure =
      this.state.pendingLoss.reason === 'BLOCK_CHALLENGE_LOST' &&
      this.state.pendingBlock &&
      this.state.pendingBlock.playerUid === playerId &&
      !player.cards.some(c => !c.isRevealed && c.character === this.state.pendingBlock!.character);

    if (wasBlockChallengeFailure) {
      // Blocker failed the challenge. The original action must now execute.
      this.state.pendingBlock = null;
      this.state.pendingLoss = null;
      this.resolveActionEffects();
    } else {
      this.state.pendingLoss = null;
      if (nextPhase === 'ACTION_SELECTION') {
        this.advanceTurn();
      } else {
        this.state.phase = nextPhase;
      }
    }
    return true;
  }

  public exchangeSelect(playerId: string, keptCardIds: string[]): boolean {
    if (this.state.phase !== 'EXCHANGE_DECISION') return false;
    const actor = this.getActivePlayer();
    if (actor.id !== playerId) return false;

    const aliveCards = actor.cards.filter(c => !c.isRevealed);
    const totalHandSize = aliveCards.length;

    if (keptCardIds.length !== totalHandSize) return false;

    // Combine all selectable cards: alive cards + drawn exchange cards
    const pool = [...aliveCards.map(c => c.character), ...this.state.exchangeCards];

    // Verify keptCardIds map exactly to valid indices
    const nextCharacters: Character[] = [];
    const poolCopy = [...pool];

    for (const char of keptCardIds) {
      const idx = poolCopy.indexOf(char as Character);
      if (idx === -1) return false;
      nextCharacters.push(char as Character);
      poolCopy.splice(idx, 1);
    }

    // Set updated cards
    let keptIdx = 0;
    actor.cards.forEach(c => {
      if (!c.isRevealed) {
        c.character = nextCharacters[keptIdx++];
      }
    });

    // Put remaining back to deck
    poolCopy.forEach(char => {
      this.state.deck.push(char);
    });
    this.state.deck = shuffleDeck(this.state.deck);

    this.state.exchangeCards = [];
    logMessage(this.state, `${actor.name} a terminé son échange.`, 'action');
    this.advanceTurn();
    return true;
  }
}
