import { useState } from "react";
import type { PeerManagerLike } from "p2play-core";
import { RoomCodeBadge } from "p2play-core";
import { TextChatPanel } from "p2play-core/chat";
import { useGame } from "./hooks/useGame";
import { useBoardExpand } from "./hooks/useBoardExpand";
import { Lobby } from "./components/game/Lobby";
import { GamePanel } from "./components/game/GamePanel";
import { PhaseStatusBar } from "./components/game/PhaseStatusBar";
import { SpectatorView } from "./components/game/SpectatorView";
import { LogConsole } from "./components/game/LogConsole";
import { Swords, FileText, X } from "lucide-react";
import { SoundToggle } from "p2play-core/ui";
import { soundManager } from "./core/soundFX";

interface AppProps {
  isEmbedded?: boolean;
  externalPeerManager?: PeerManagerLike;
  playerName?: string;
  playerAvatar?: string;
  isHost?: boolean;
  lateJoin?: boolean;
  gameConfig?: any;
  hubPhase?: string;
  onExit?: () => void;
}

export default function App({ isEmbedded = false, externalPeerManager, playerName, playerAvatar, isHost, lateJoin, gameConfig, hubPhase, onExit }: AppProps) {
  const game = useGame({ externalPeerManager, isEmbedded, playerName, playerAvatar, isHost, lateJoin, gameConfig, hubPhase });
  const [showRules, setShowRules] = useState(false);

  const {
    myPeerId,
    hostPeerId,
    isHost: gameIsHost,
    chatMessages,
    gameState,
    status,
    error,
    hostRoom,
    joinRoom,
    toggleReady,
    startGame,
    declareAction,
    challengeDecision,
    blockDecision,
    blockChallengeDecision,
    chooseLoss,
    exchangeSelect,
    inquisitionDecide,
    changeConfig,
    resetLobby,
    sendChatMessage,
    disconnect,
  } = game;

  const showLobby = !gameState || gameState.phase === 'LOBBY';
  const localIsSpectator = !!gameState?.spectators.some((s) => s.id === myPeerId);
  const { expanded: boardExpanded, toggle: toggleExpand } = useBoardExpand(
    showLobby || localIsSpectator,
  );

  return (
    <div
      className={
        boardExpanded
          ? "h-screen overflow-hidden flex flex-col relative"
          : "min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-between"
      }
    >
      {!boardExpanded && (
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <Swords className="w-6 h-6 text-amber-500" />
          <span className="text-xl font-black bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent tracking-tight whitespace-nowrap shrink-0">
            ROYAL BLUFF
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-full border border-zinc-800 font-bold transition-all"
            title="Règles du jeu"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Règles</span>
          </button>

          <SoundToggle soundManager={soundManager} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border-zinc-800" />

          {gameState && gameState.phase !== 'LOBBY' && (
            <>
              {hostPeerId && <RoomCodeBadge code={hostPeerId} accentClassName="text-amber-400" />}
              <button
                onClick={isEmbedded && onExit && gameIsHost ? onExit : disconnect}
                className="text-xs px-2.5 py-1.5 bg-rose-950/20 hover:bg-rose-900/20 text-rose-400 border border-rose-900/30 rounded-xl transition-all"
                title={isEmbedded ? (gameIsHost ? "Retour au Hub" : "Quitter le Hub (la partie continue)") : "Quitter"}
              >
                {isEmbedded ? (gameIsHost ? "← Hub" : "Quitter") : "Quitter"}
              </button>
            </>
          )}
        </div>
      </header>
      )}

      <main
        className={
          boardExpanded
            ? "fixed inset-0 z-40 overflow-auto p-4 sm:p-6 bg-[radial-gradient(circle_at_center,#1b160a_0%,#09090b_100%)]"
            : "flex-1 w-full max-w-7xl mx-auto"
        }
      >
        {showLobby ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <Lobby
              myPeerId={myPeerId}
              hostPeerId={hostPeerId}
              isHost={gameIsHost}
              players={gameState?.players || []}
              spectators={gameState?.spectators || []}
              spectatorLocks={gameState?.spectatorLocks || {}}
              status={status}
              error={error}
              hostRoom={hostRoom}
              joinRoom={joinRoom}
              toggleReady={toggleReady}
              startGame={startGame}
              disconnect={isEmbedded && onExit ? onExit : disconnect}
              onSetRole={game.setRole}
              onLockSpectator={game.lockSpectator}
              config={gameState?.config}
              onChangeConfig={changeConfig}
            />
          </div>
        ) : localIsSpectator ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <SpectatorView
              gameState={gameState}
              onDisconnect={isEmbedded && onExit ? onExit : disconnect}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <PhaseStatusBar
              gameState={gameState!}
              boardExpanded={boardExpanded}
              onToggleExpand={toggleExpand}
            />
            <div
              className={`grid grid-cols-1 gap-6 ${
                boardExpanded ? "xl:grid-cols-5" : "lg:grid-cols-4"
              }`}
            >
            <div className={`space-y-6 ${boardExpanded ? "xl:col-span-4" : "lg:col-span-3"}`}>
              <GamePanel
                myPeerId={myPeerId!}
                gameState={gameState}
                declareAction={declareAction}
                challengeDecision={challengeDecision}
                blockDecision={blockDecision}
                blockChallengeDecision={blockChallengeDecision}
                chooseLoss={chooseLoss}
                exchangeSelect={exchangeSelect}
                inquisitionDecide={inquisitionDecide}
                resetLobby={resetLobby}
                boardExpanded={boardExpanded}
              />
            </div>

            <div className="flex flex-col gap-6">
              {/* Event Logs */}
              <div className="h-[360px] flex flex-col">
                <LogConsole logs={gameState.logs} />
              </div>

              {/* Chat Panel */}
              <TextChatPanel
                messages={chatMessages}
                onSend={sendChatMessage}
                title="Salon de Messagerie"
                placeholder="Chuchotez vos intrigues ici..."
                emptyLabel="Chuchotez vos intrigues ici..."
                className="bg-zinc-900/60 backdrop-blur-md border border-amber-900/40 rounded-3xl p-5 shadow-xl shadow-amber-950/10 flex flex-col h-[280px] text-zinc-100 text-xs"
                scrollbarAccent="amber"
              />
            </div>
          </div>
          </div>
        )}
      </main>

      {!boardExpanded && (
      <footer className="max-w-7xl mx-auto w-full text-center text-[10px] text-zinc-650 py-6 px-4 border-t border-zinc-900 flex justify-between items-center mt-8">
        <div>
          Royal Bluff (Coup) - Réseau Privé Peer-to-Peer - Version v0.3.0
        </div>
        <a
          href="https://github.com/gab371/royal-bluff"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-amber-500 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          <span>Dépôt GitHub</span>
        </a>
      </footer>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md transition-all">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl text-zinc-100 shadow-2xl relative max-h-[90vh] overflow-y-auto font-sans">
            <button
              onClick={() => setShowRules(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
              👑 Règles : Royal Bluff
            </h2>

            <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
              <section>
                <h3 className="font-bold text-amber-500 uppercase tracking-wide text-xs mb-1">Objectif</h3>
                <p>
                  Éliminer l'influence de tous vos adversaires. Chaque joueur commence avec deux cartes d'influence cachées (personnages) et 2 pièces d'or. Si vous perdez vos deux influences, vous êtes éliminé. Le dernier en vie gagne.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-amber-500 uppercase tracking-wide text-xs mb-1">Actions Générales</h3>
                <p className="mb-2">À votre tour, vous pouvez effectuer une action. Aucune carte n'est requise pour ces actions :</p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li><strong className="text-zinc-100">Revenu :</strong> Prenez 1 pièce d'or de la banque (action inciblable, imblocable).</li>
                  <li><strong className="text-zinc-100">Aide Extérieure :</strong> Prenez 2 pièces d'or. (Peut être bloqué par le <em>Duc/Duchesse</em>).</li>
                  <li><strong className="text-zinc-100">Coup d'État :</strong> Payez 7 pièces d'or pour forcer un joueur ciblé à perdre une influence de son choix (imblocable, incontestable).</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-amber-500 uppercase tracking-wide text-xs mb-1">Actions de Rôles (Bluff autorisé !)</h3>
                <p className="mb-2">Vous pouvez prétendre posséder n'importe quel rôle pour effectuer son action associée :</p>
                <ul className="list-disc list-inside pl-2 space-y-1.5">
                  <li>
                    <strong className="text-amber-300">Duchesse (Taxe) :</strong> Prenez 3 pièces d'or à la banque.
                  </li>
                  <li>
                    <strong className="text-amber-300">Assassin (Assassinat) :</strong> Payez 3 pièces d'or pour forcer un joueur ciblé à perdre une influence. (Peut être bloqué par la <em>Comtesse</em>).
                  </li>
                  <li>
                    <strong className="text-amber-300">Capitaine (Vol) :</strong> Volez 2 pièces d'or à un autre joueur. (Peut être bloqué par un <em>Capitaine</em> ou un <em>Ambassadeur</em>).
                  </li>
                  <li>
                    <strong className="text-amber-300">Ambassadeur (Échange) :</strong> Piochez 2 cartes du deck, mélangez-les avec vos cartes d'influence cachées, et remettez-en 2 sous le deck.
                  </li>
                  <li>
                    <strong className="text-amber-300">Inquisiteur (Inquisition) — extension Réformation :</strong> Inspectez secrètement une influence d'un adversaire et choisissez de forcer son échange avec la pioche. Bloque aussi l'Aide Extérieure (comme la Duchesse).
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-amber-500 uppercase tracking-wide text-xs mb-1">Decks & Aide aux actions</h3>
                <p className="mb-2">Avant le lancement, l'hôte choisit le deck et l'aide aux actions dans le salon :</p>
                <ul className="list-disc list-inside pl-2 space-y-1.5">
                  <li><strong className="text-zinc-100">Coup Classique :</strong> 5 influences (15 cartes).</li>
                  <li><strong className="text-zinc-100">Coup : Réformation :</strong> ajoute l'Inquisiteur (18 cartes).</li>
                  <li><strong className="text-zinc-100">Aide aux actions :</strong> bordure verte sur les influences capables de bloquer l'action en cours et bulles d'info au survol des cartes.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-amber-500 uppercase tracking-wide text-xs mb-1">Contestation & Blocage</h3>
                <p className="mb-2">Chaque action (sauf Revenu et Coup d'État) peut être contestée ou bloquée par les autres joueurs :</p>
                <ul className="list-disc list-inside pl-2 space-y-1.5">
                  <li>
                    <strong className="text-zinc-100">La Contestation :</strong> N'importe quel joueur peut accuser l'auteur d'une action ou d'un blocage de mentir sur sa carte. Le joueur accusé doit révéler sa carte. S'il l'a, il la remplace dans le deck, et l'accusateur perd une influence. S'il mentait, il perd l'influence lui-même.
                  </li>
                  <li>
                    <strong className="text-zinc-100">Le Blocage :</strong> Les cibles d'un vol ou d'un assassinat (ou n'importe qui pour l'Aide Extérieure) peuvent déclarer bloquer l'action en prétendant avoir le contre-rôle adéquat. Le blocage peut lui aussi être contesté !
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
