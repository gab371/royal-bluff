import { useState } from "react";
import { useGame } from "./hooks/useGame";
import { Lobby } from "./components/game/Lobby";
import { GamePanel } from "./components/game/GamePanel";
import { LogConsole } from "./components/game/LogConsole";
import { Swords, MessageSquare, Send, FileText, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppProps {
  isEmbedded?: boolean;
  externalPeerManager?: any;
  playerName?: string;
  playerAvatar?: string;
  onExit?: () => void;
}

export default function App({ isEmbedded = false, externalPeerManager, playerName, playerAvatar, onExit }: AppProps) {
  const game = useGame({ externalPeerManager, isEmbedded, playerName, playerAvatar });
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const {
    myPeerId,
    hostPeerId,
    isHost,
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

  const handleCopy = () => {
    if (hostPeerId) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(hostPeerId)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {
            fallbackCopy(hostPeerId);
          });
      } else {
        fallbackCopy(hostPeerId);
      }
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
    document.body.removeChild(textArea);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput("");
  };

  const showLobby = !gameState || gameState.phase === 'LOBBY';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <Swords className="w-6 h-6 text-amber-500" />
          <span className="text-xl font-black bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent tracking-tight">
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

          {gameState && gameState.phase !== 'LOBBY' && (
            <>
              <span className="text-xs text-zinc-400 font-mono bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                Salon : <span className="text-amber-400 font-bold">{hostPeerId}</span>
              </span>
              <button
                onClick={handleCopy}
                className="text-xs px-2.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold rounded-xl transition-all"
              >
                {copied ? "Copié !" : "Copier le code"}
              </button>
              <button
                onClick={isEmbedded && onExit ? onExit : disconnect}
                className="text-xs px-2.5 py-1.5 bg-rose-950/20 hover:bg-rose-900/20 text-rose-400 border border-rose-900/30 rounded-xl transition-all"
              >
                Quitter
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto">
        {showLobby ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <Lobby
              myPeerId={myPeerId}
              hostPeerId={hostPeerId}
              isHost={isHost}
              players={gameState?.players || []}
              status={status}
              error={error}
              hostRoom={hostRoom}
              joinRoom={joinRoom}
              toggleReady={toggleReady}
              startGame={startGame}
              disconnect={isEmbedded && onExit ? onExit : disconnect}
              config={gameState?.config}
              onChangeConfig={changeConfig}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
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
              />
            </div>

            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Event Logs */}
              <div className="h-[360px] flex flex-col">
                <LogConsole logs={gameState.logs} />
              </div>

              {/* Chat Panel */}
              <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col h-[280px]">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                  Salon de Messagerie
                </h3>
                <ScrollArea className="flex-1 mb-3 pr-1.5">
                  <div className="space-y-2">
                    {chatMessages.map((msg, index) => (
                      <div key={index} className="text-xs">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-zinc-300">{msg.sender}</span>
                          <span className="text-[9px] text-zinc-650">{msg.time}</span>
                        </div>
                        <p className="text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-950 leading-relaxed break-all">
                          {msg.text}
                        </p>
                      </div>
                    ))}
                    {chatMessages.length === 0 && (
                      <div className="text-zinc-650 text-center py-8">Chuchotez vos intrigues ici...</div>
                    )}
                  </div>
                </ScrollArea>
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Écrivez un message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-850 px-3 py-2 text-xs rounded-2xl outline-none focus:border-amber-500 text-zinc-150"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-2xl transition-all shadow-md shadow-amber-500/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto w-full text-center text-[10px] text-zinc-650 py-6 px-4 border-t border-zinc-900 flex justify-between items-center mt-8">
        <div>
          Royal Bluff (Coup) - Réseau Privé Peer-to-Peer - Version v0.1.0
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
