import { useState, useEffect } from "react";
import type { GameState, Character, ActionType, GameConfig } from "../../core/types";
import { Coins, Shield, Swords, RefreshCw, Eye } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { getBlockOptions } from "../../core/decks";
import type { DeckId } from "../../core/decks";

const getCharacterTooltip = (char: Character): string => {
  switch (char) {
    case 'Duchesse':
      return "Taxe : Gagne 3 pièces à la banque. Bloque l'Aide Extérieure.";
    case 'Assassin':
      return "Assassinat : Paye 3 pièces pour faire perdre une influence à un joueur (Bloqué par la Comtesse).";
    case 'Capitaine':
      return "Vol : Vole 2 pièces à un joueur (Bloqué par le Capitaine ou l'Ambassadeur).";
    case 'Comtesse':
      return "Contre : Bloque l'Assassinat.";
    case 'Ambassadeur':
      return "Échange : Pioche 2 cartes de la pioche, les mélange avec ses influences cachées, puis en remet 2 dans la pioche. Bloque le Vol.";
    case 'Inquisiteur':
      return "Inquisition : Inspecte une influence adverse et peut forcer son échange avec la pioche. Bloque l'Aide Extérieure (extension Réformation).";
    default:
      return "Influence secrète.";
  }
};

interface GamePanelProps {
  myPeerId: string;
  gameState: GameState;
  declareAction: (action: ActionType, targetUid?: string) => void;
  challengeDecision: (challenge: boolean) => void;
  blockDecision: (blockCharacter: Character | null) => void;
  blockChallengeDecision: (challenge: boolean) => void;
  chooseLoss: (cardId: string) => void;
  exchangeSelect: (keptCardIds: string[]) => void;
  inquisitionDecide: (forceSwap: boolean) => void;
  resetLobby: () => void;
}

export function GamePanel({
  myPeerId,
  gameState,
  declareAction,
  challengeDecision,
  blockDecision,
  blockChallengeDecision,
  chooseLoss,
  exchangeSelect,
  inquisitionDecide,
  resetLobby,
}: GamePanelProps) {
  const { players, activePlayerIndex, phase, pendingAction, pendingBlock, pendingLoss, exchangeCards, inquisitionReveal, config } = gameState;
  const activePlayer = players[activePlayerIndex];
  const localPlayer = players.find(p => p.id === myPeerId)!;
  const isMyTurn = activePlayer?.id === myPeerId;
  const actionHelper = config?.actionHelper ?? true;
  const deckId: DeckId = config?.deckId ?? 'CLASSIC';

  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [selectedExchange, setSelectedExchange] = useState<string[]>([]);

  // Tracks whether the local player has already submitted their deliberation
  // decision (challenge / block / block-challenge) for the current window.
  // Gives immediate UI feedback while the host collects the other players'
  // decisions, instead of leaving the buttons looking unresponsive.
  const [localDecisionMade, setLocalDecisionMade] = useState(false);

  const deliberationKey = `${phase}:${pendingAction?.playerUid ?? ""}:${pendingAction?.action ?? ""}:${pendingBlock?.playerUid ?? ""}:${pendingBlock?.character ?? ""}`;
  useEffect(() => {
    setLocalDecisionMade(false);
  }, [deliberationKey]);

  const onChallengeDecision = (challenge: boolean) => {
    setLocalDecisionMade(true);
    challengeDecision(challenge);
  };
  const onBlockDecision = (blockCharacter: Character | null) => {
    setLocalDecisionMade(true);
    blockDecision(blockCharacter);
  };
  const onBlockChallengeDecision = (challenge: boolean) => {
    setLocalDecisionMade(true);
    blockChallengeDecision(challenge);
  };

  // Eligible comploteurs + response counts for the waiting hint. The engine
  // tracks who has passed in pendingAction/pendingBlock; we add the local
  // player immediately so the count reflects their just-registered decision.
  const comploteurs = pendingAction
    ? players.filter((p) => !p.isEliminated && p.id !== pendingAction.playerUid)
    : [];
  const challengeResponded = new Set<string>([
    ...(pendingAction?.challengePassedUids ?? []),
    ...(localDecisionMade ? [myPeerId] : []),
  ]).size;
  const blockEligible = pendingAction
    ? players.filter(
        (p) =>
          !p.isEliminated &&
          p.id !== pendingAction.playerUid &&
          (p.id === pendingAction.targetUid || pendingAction.action === "AIDE_EXTERIEURE"),
      )
    : [];
  const blockResponded = new Set<string>([
    ...(pendingAction?.blockPassedUids ?? []),
    ...(localDecisionMade ? [myPeerId] : []),
  ]).size;
  const blockChallengeComploteurs = pendingBlock
    ? players.filter((p) => !p.isEliminated && p.id !== pendingBlock.playerUid)
    : [];
  const blockChallengeResponded = new Set<string>([
    ...(pendingBlock?.challengePassedUids ?? []),
    ...(localDecisionMade ? [myPeerId] : []),
  ]).size;

  if (!localPlayer) return null;

  const renderPlayerCards = (player: typeof localPlayer) => {
    const isSelf = player.id === myPeerId;
    const blockableChars = isSelf ? getBlockableCharacters() : [];
    return (
      <div className="flex gap-4 mt-4 justify-center">
        {player.cards.map((card) => {
          const isMasked = (card as any).isMasked;
          const displayChar = card.isRevealed ? card.character : (isSelf ? card.character : "🔒");
          
          let cardBg = "bg-zinc-800/80 border-zinc-700";
          if (card.isRevealed) {
            cardBg = "bg-rose-950/20 border-rose-900/40 text-rose-350 opacity-60";
          } else if (isSelf) {
            cardBg = "bg-zinc-800 border-amber-500/40 text-zinc-100 shadow-md shadow-amber-500/5";
          }

          // Green border on cards that can block the current pending action
          const canBlockCurrent = !card.isRevealed && blockableChars.includes(card.character);
          if (canBlockCurrent) {
            cardBg = "bg-emerald-950/40 border-emerald-500 text-emerald-100 shadow-md shadow-emerald-500/20";
          }

          const canClick = phase === 'CHOOSE_LOSS' && pendingLoss?.playerUid === myPeerId && !card.isRevealed && isSelf;
          const showTooltip = card.isRevealed || isSelf;
          const showInfoBadge = actionHelper && showTooltip && !card.isRevealed;

          const cardButton = (
            <button
              disabled={!canClick}
              onClick={() => chooseLoss(card.id)}
              className={`relative w-24 h-32 sm:w-28 sm:h-36 rounded-2xl border flex flex-col items-center justify-between p-3 sm:p-4 transition-all ${cardBg} ${
                canClick
                  ? "hover:scale-105 border-rose-500 hover:shadow-lg hover:shadow-rose-500/20 cursor-pointer animate-pulse"
                  : canBlockCurrent
                    ? "hover:scale-105 cursor-help animate-pulse"
                    : "cursor-default"
              }`}
            >
              {showInfoBadge && (
                <span
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-zinc-700/80 text-zinc-200 text-[9px] font-bold flex items-center justify-center"
                  aria-hidden="true"
                >
                  ⓘ
                </span>
              )}
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                {card.isRevealed ? "Éliminé" : canBlockCurrent ? "Blocage" : "Influence"}
              </span>
              <span className="text-sm sm:text-base font-black tracking-tight text-center break-words max-w-full px-0.5">
                {displayChar}
              </span>
              <span className="text-[9px] text-zinc-655">
                {card.isRevealed ? "Révélé" : "Secret"}
              </span>
            </button>
          );

          return (
            <TooltipProvider key={card.id}>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  {cardButton}
                </TooltipTrigger>
                {showTooltip && (
                  <TooltipContent side="top" className="text-center font-medium">
                    <p className="font-bold text-amber-400 mb-0.5">{card.character}</p>
                    <p className="text-zinc-300">{getCharacterTooltip(card.character)}</p>
                    {canBlockCurrent && (
                      <p className="text-emerald-400 font-bold mt-1">🛡️ Peut bloquer l'action en cours</p>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  };

  const getTargetablePlayers = (action: ActionType) => {
    return players.filter(p => !p.isEliminated && p.id !== myPeerId);
  };

  // Characters the local player can use to block the current pending action.
  // Used to highlight block-capable cards in the local hand with a green border.
  const getBlockableCharacters = (): Character[] => {
    if (!actionHelper || phase !== 'BLOCK_WINDOW' || !pendingAction) return [];
    const isTarget = pendingAction.targetUid === myPeerId;
    const isForeignAid = pendingAction.action === 'AIDE_EXTERIEURE';
    if (!isTarget && !isForeignAid) return [];
    return getBlockOptions(deckId, pendingAction.action);
  };

  const handleAction = (action: ActionType) => {
    const targets = getTargetablePlayers(action);
    if (action === 'COUP' || action === 'ASSASSINAT' || action === 'VOL' || action === 'INQUISITION') {
      if (!selectedTarget) return;
      declareAction(action, selectedTarget);
      setSelectedTarget("");
    } else {
      declareAction(action);
    }
  };

  const handleExchangeConfirm = () => {
    const aliveHandSize = localPlayer.cards.filter(c => !c.isRevealed).length;
    if (selectedExchange.length !== aliveHandSize) return;
    exchangeSelect(selectedExchange);
    setSelectedExchange([]);
  };

  const toggleExchangeCard = (char: Character) => {
    const aliveHandSize = localPlayer.cards.filter(c => !c.isRevealed).length;
    if (selectedExchange.includes(char)) {
      setSelectedExchange(prev => prev.filter(c => c !== char));
    } else if (selectedExchange.length < aliveHandSize) {
      setSelectedExchange(prev => [...prev, char]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Board grid of all conspirators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {players.map((player) => {
            const isActive = player.id === activePlayer?.id;
            const isEliminated = player.isEliminated;
            return (
              <div
                key={player.id}
                className={`p-4 rounded-3xl bg-zinc-900/60 backdrop-blur-md border transition-all ${
                  isActive
                    ? "border-amber-500/60 shadow-lg shadow-amber-500/5 bg-amber-500/[0.01]"
                    : "border-zinc-800"
                } ${isEliminated ? "opacity-40" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{player.avatar}</span>
                    <div>
                      <h4 className="font-bold text-zinc-100 flex items-center gap-1.5">
                        {player.name}
                        {player.id === myPeerId && <span className="text-[10px] text-amber-500 font-normal">(Vous)</span>}
                      </h4>
                      <p className="text-[10px] text-zinc-500">
                        {isEliminated ? "Éliminé" : "Au pouvoir"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 font-bold text-xs">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{player.coins}</span>
                  </div>
                </div>
                {renderPlayerCards(player)}
              </div>
            );
          })}
        </div>

        {/* Local Player Console / Actions */}
        <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pupitre des Décisions</h3>

          {/* 1. Selecting Action on my turn */}
          {phase === 'ACTION_SELECTION' && isMyTurn && !localPlayer.isEliminated && (
            <div className="space-y-4">
              <p className="text-sm text-amber-400">À votre tour de régner. Sélectionnez votre action :</p>
              
              {localPlayer.coins >= 10 && (
                <p className="text-xs text-rose-400 font-bold">⚠️ Vous avez 10 pièces ou plus. Vous devez obligatoirement effectuer un Coup d'État.</p>
              )}

              {/* Targets selectors if needed */}
              {localPlayer.coins < 10 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleAction('REVENU')}
                    className="py-3 px-4 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-xs font-bold flex flex-col items-center gap-1"
                  >
                    <Coins className="w-4 h-4 text-amber-400" />
                    Revenu (+1)
                  </button>
                  <button
                    onClick={() => handleAction('AIDE_EXTERIEURE')}
                    className="py-3 px-4 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-xs font-bold flex flex-col items-center gap-1"
                  >
                    <Shield className="w-4 h-4 text-blue-400" />
                    Aide Ext (+2)
                  </button>
                  <button
                    onClick={() => handleAction('TAXE')}
                    className="py-3 px-4 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-xs font-bold flex flex-col items-center gap-1"
                  >
                    <Coins className="w-4 h-4 text-emerald-400" />
                    Taxe (+3)
                  </button>
                  <button
                    onClick={() => handleAction('ECHANGE')}
                    className="py-3 px-4 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-xs font-bold flex flex-col items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                    Échange
                  </button>
                </div>
              )}

              {/* Target actions */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="text-xs text-zinc-400">Cibler un conspirateur :</label>
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="bg-zinc-950 border border-zinc-850 text-xs px-3 py-1.5 rounded-xl outline-none"
                  >
                    <option value="">-- Choisir cible --</option>
                    {players.filter(p => !p.isEliminated && p.id !== myPeerId).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAction('COUP')}
                    disabled={localPlayer.coins < 7 || !selectedTarget}
                    className="py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
                  >
                    <Swords className="w-4 h-4" />
                    Coup d'État (-7)
                  </button>
                  {localPlayer.coins < 10 && (
                    <>
                      <button
                        onClick={() => handleAction('ASSASSINAT')}
                        disabled={localPlayer.coins < 3 || !selectedTarget}
                        className="py-3 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                      >
                        Assassinat (-3)
                      </button>
                      <button
                        onClick={() => handleAction('VOL')}
                        disabled={!selectedTarget}
                        className="py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                      >
                        Voler 2 pièces
                      </button>
                    </>
                  )}
                  {deckId === 'REFORMATION' && localPlayer.coins < 10 && (
                    <button
                      onClick={() => handleAction('INQUISITION')}
                      disabled={!selectedTarget}
                      className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Eye className="w-4 h-4" />
                      Inquisition
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. Challenge Window Decisions */}
          {phase === 'CHALLENGE_WINDOW' && pendingAction && pendingAction.playerUid !== myPeerId && !localPlayer.isEliminated && (
            <div className="space-y-4">
              {localDecisionMade ? (
                <div className="text-xs text-zinc-400 italic text-center py-3 flex items-center justify-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Décision enregistrée — en attente des autres comploteurs
                  {" "}({challengeResponded}/{comploteurs.length})...
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-300">
                    <span className="font-bold text-amber-400">
                      {players.find(p => p.id === pendingAction.playerUid)?.name}
                    </span>{" "}
                    déclare l'action <span className="text-yellow-400 font-bold">{pendingAction.action}</span>.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onChallengeDecision(true)}
                      className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs shadow-md"
                    >
                      Contester (Bluff !)
                    </button>
                    <button
                      onClick={() => onChallengeDecision(false)}
                      className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl text-xs"
                    >
                      Laisser passer
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 3. Block Window Decisions */}
          {phase === 'BLOCK_WINDOW' && pendingAction && !localPlayer.isEliminated && (
            (() => {
              const isTarget = pendingAction.targetUid === myPeerId;
              const isForeignAid = pendingAction.action === 'AIDE_EXTERIEURE';
              if (!isTarget && !isForeignAid) return null;

              if (localDecisionMade) {
                return (
                  <div className="text-xs text-zinc-400 italic text-center py-3 flex items-center justify-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> Décision enregistrée — en attente des autres comploteurs
                    {" "}({blockResponded}/{blockEligible.length})...
                  </div>
                );
              }

              let blockOptions: Character[] = getBlockOptions(deckId, pendingAction.action);

              return (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-300">
                    L'action de{" "}
                    <span className="font-bold text-amber-400">
                      {players.find(p => p.id === pendingAction.playerUid)?.name}
                    </span>{" "}
                    va se résoudre. Voulez-vous la bloquer ?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {blockOptions.map(char => (
                      <button
                        key={char}
                        onClick={() => onBlockDecision(char)}
                        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs shadow-md"
                      >
                        Bloquer avec : {char}
                      </button>
                    ))}
                    <button
                      onClick={() => onBlockDecision(null)}
                      className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl text-xs"
                    >
                      Ne pas bloquer
                    </button>
                  </div>
                </div>
              );
            })()
          )}

          {/* 4. Challenge Block Window Decisions */}
          {phase === 'CHALLENGE_BLOCK_WINDOW' && pendingBlock && pendingBlock.playerUid !== myPeerId && !localPlayer.isEliminated && (
            <div className="space-y-4">
              {localDecisionMade ? (
                <div className="text-xs text-zinc-400 italic text-center py-3 flex items-center justify-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> Décision enregistrée — en attente des autres comploteurs
                  {" "}({blockChallengeResponded}/{blockChallengeComploteurs.length})...
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-300">
                    <span className="font-bold text-amber-400">
                      {players.find(p => p.id === pendingBlock.playerUid)?.name}
                    </span>{" "}
                    bloque avec la carte <span className="text-blue-400 font-bold">{pendingBlock.character}</span>.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onBlockChallengeDecision(true)}
                      className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs shadow-md"
                    >
                      Contester le Blocage (Bluff !)
                    </button>
                    <button
                      onClick={() => onBlockChallengeDecision(false)}
                      className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl text-xs"
                    >
                      Accepter le blocage
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 5. Choose Loss Indicator */}
          {phase === 'CHOOSE_LOSS' && pendingLoss?.playerUid === myPeerId && !localPlayer.isEliminated && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-center animate-pulse">
              <p className="text-xs font-bold">⚠️ Défi perdu ou Attaque subie ! Cliquez sur une de vos influences ci-dessus pour la révéler et l'éliminer.</p>
            </div>
          )}

          {/* 6. Exchange Decisions (Ambassador) */}
          {phase === 'EXCHANGE_DECISION' && isMyTurn && !localPlayer.isEliminated && (
            <div className="space-y-4">
              <p className="text-xs text-amber-400">
                Sélectionnez exactement{" "}
                <span className="font-bold">{localPlayer.cards.filter(c => !c.isRevealed).length}</span> carte(s) à conserver parmi vos cartes actuelles et les cartes piochées :
              </p>

              {/* Pool of exchange cards */}
              <div className="flex flex-wrap gap-2.5 justify-center py-2">
                {[...localPlayer.cards.filter(c => !c.isRevealed).map(c => c.character), ...exchangeCards].map((char, index) => {
                  const isSelected = selectedExchange.includes(char);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleExchangeCard(char)}
                      className={`w-24 h-32 rounded-2xl border flex flex-col items-center justify-center p-3 transition-all ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-500 text-amber-400 scale-105 shadow-md shadow-amber-500/10"
                          : "bg-zinc-800 border-zinc-750 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-200"
                      }`}
                    >
                      <span className="text-base font-bold">{char}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleExchangeConfirm}
                disabled={selectedExchange.length !== localPlayer.cards.filter(c => !c.isRevealed).length}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 to-yellow-600 disabled:opacity-40 text-zinc-950 font-bold rounded-2xl text-xs transition-all shadow-md"
              >
                Confirmer l'Échange
              </button>
            </div>
          )}

          {/* 6b. Inquisition Decision (Inquisitor) */}
          {phase === 'INQUISITION_DECISION' && isMyTurn && inquisitionReveal && !localPlayer.isEliminated && (
            <div className="space-y-4">
              <p className="text-xs text-indigo-400">
                Vous inspectez une influence de{" "}
                <span className="font-bold">
                  {players.find(p => p.id === inquisitionReveal.targetUid)?.name}
                </span>{" "}
                : <span className="font-bold text-amber-400">{inquisitionReveal.character}</span>.
                Forcer son échange avec la pioche ?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => inquisitionDecide(true)}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs shadow-md"
                >
                  Forcer l'échange
                </button>
                <button
                  onClick={() => inquisitionDecide(false)}
                  className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl text-xs"
                >
                  Ne rien faire
                </button>
              </div>
            </div>
          )}

          {/* 7. Game Over Screen with Restart */}
          {phase === 'GAME_OVER' && (
            <div className="space-y-4 text-center py-4">
              <span className="text-4xl">🏆</span>
              <p className="text-sm text-zinc-300">
                La partie est terminée ! Le vainqueur est{" "}
                <span className="font-bold text-amber-400">
                  {players.find(p => p.id === gameState.winnerId)?.name || "inconnu"}
                </span>.
              </p>
              {localPlayer.isHost ? (
                <button
                  onClick={resetLobby}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 text-zinc-950 font-bold rounded-2xl text-xs transition-all shadow-md"
                >
                  Retourner au Salon (Rejouer)
                </button>
              ) : (
                <div className="text-xs text-zinc-500 italic">
                  En attente que le monarque (hôte) relance le salon...
                </div>
              )}
            </div>
          )}

          {/* Status Message if not my turn or action in progress */}
          {(!isMyTurn || phase !== 'ACTION_SELECTION') && (
            <div className="text-xs text-zinc-400 text-center py-2">
              {phase === 'ACTION_SELECTION' && `En attente du tour de ${activePlayer?.name}...`}
              {phase === 'CHALLENGE_WINDOW' && `Les comploteurs délibèrent d'un défi...`}
              {phase === 'BLOCK_WINDOW' && `Vérification des tentatives de blocage...`}
              {phase === 'CHALLENGE_BLOCK_WINDOW' && `Les comploteurs décident de contester le blocage...`}
              {phase === 'CHOOSE_LOSS' && pendingLoss?.playerUid !== myPeerId && `En attente de la révélation d'influence de ${players.find(p=>p.id===pendingLoss?.playerUid)?.name}...`}
              {phase === 'INQUISITION_DECISION' && !isMyTurn && `${activePlayer?.name} inspecte une influence...`}
            </div>
          )}
        </div>
      </div>

      {/* Log Narratives sidebar */}
      <div className="lg:col-span-1">
        <div className="h-[400px] lg:h-[600px]">
          {/* Custom sidebar components or LogConsole could be embedded directly here in App.tsx */}
        </div>
      </div>
    </div>
  );
}
