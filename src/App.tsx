import { useState } from "react";
import { useGame } from "./hooks/useGame";
import { Lobby } from "./components/game/Lobby";
import { GamePanel } from "./components/game/GamePanel";
import { LogConsole } from "./components/game/LogConsole";
import { Swords, MessageSquare, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function App() {
  const game = useGame();
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);

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
        {gameState && gameState.phase !== 'LOBBY' && (
          <div className="flex items-center gap-3">
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
              onClick={disconnect}
              className="text-xs px-2.5 py-1.5 bg-rose-950/20 hover:bg-rose-900/20 text-rose-400 border border-rose-900/30 rounded-xl transition-all"
            >
              Quitter
            </button>
          </div>
        )}
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
              disconnect={disconnect}
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

      <footer className="max-w-7xl mx-auto w-full text-center text-[10px] text-zinc-650 mt-8 pt-4 border-t border-zinc-900">
        Royal Bluff (Coup) - Réseau Privé Peer-to-Peer - Version 1.0.0
      </footer>
    </div>
  );
}
