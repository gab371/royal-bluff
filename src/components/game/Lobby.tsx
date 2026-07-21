import { useState } from "react";

interface LobbyProps {
  myPeerId: string | null;
  hostPeerId: string | null;
  isHost: boolean;
  players: any[];
  status: string;
  error: string | null;
  hostRoom: (name: string, avatar: string) => Promise<void>;
  joinRoom: (name: string, avatar: string, roomId: string) => Promise<void>;
  toggleReady: (ready: boolean) => void;
  startGame: () => void;
  disconnect: () => void;
}

const AVATARS = ["👑", "🏰", "🗡️", "⚜️", "🪙", "🛡️", "🦁", "🦅"];

export function Lobby({
  myPeerId,
  hostPeerId,
  isHost,
  players,
  status,
  error,
  hostRoom,
  joinRoom,
  toggleReady,
  startGame,
  disconnect,
}: LobbyProps) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("👑");
  const [roomToJoin, setRoomToJoin] = useState("");
  const [loading, setLoading] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleHost = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await hostRoom(name.trim(), avatar);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!name.trim() || !roomToJoin.trim()) return;
    setLoading(true);
    try {
      await joinRoom(name.trim(), avatar, roomToJoin.trim().toUpperCase());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleToggleReady = () => {
    const nextState = !localReady;
    setLocalReady(nextState);
    toggleReady(nextState);
  };

  const allReady = players.length >= 2 && players.every((p) => p.isHost || p.isReady);

  if (status === 'CONNECTED' && myPeerId) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Salon Royal : {hostPeerId}
            </h1>
            <button
              id="lobby-copy-btn"
              onClick={handleCopy}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-zinc-700"
              title="Copier le code"
            >
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
          <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-400 font-mono">
            {isHost ? "MONARQUE" : "COURTISAN"}
          </span>
        </div>
        <p className="text-zinc-400 text-sm mb-6">Partagez ce code avec vos courtisans pour les inviter à conspirer.</p>

        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-zinc-200">Conspirateurs connectés ({players.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-zinc-800/40 border border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{player.avatar}</span>
                  <div>
                    <span className="font-medium text-zinc-100">{player.name}</span>
                    {player.id === myPeerId && <span className="ml-2 text-xs text-amber-400">(Vous)</span>}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {player.isHost ? (
                    <span className="inline-block w-24 text-center text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                      Hôte
                    </span>
                  ) : player.isReady ? (
                    <span className="inline-block w-24 text-center text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                      Prêt
                    </span>
                  ) : (
                    <span className="inline-block w-24 text-center text-xs px-2.5 py-1 bg-zinc-800 text-zinc-500 border border-transparent rounded-full">
                      En attente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-800/60">
          {!isHost && (
            <button
              onClick={handleToggleReady}
              className={`flex-1 py-3.5 px-6 rounded-2xl font-bold transition-all ${
                localReady
                  ? "bg-amber-600 hover:bg-amber-500 text-zinc-950 shadow-lg shadow-amber-900/30"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              }`}
            >
              {localReady ? "Pas Prêt" : "Je suis Prêt !"}
            </button>
          )}

          {isHost && (
            <button
              onClick={startGame}
              disabled={!allReady}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 text-zinc-950 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
            >
              Lancer la partie ({players.length} conspirateur{players.length > 1 ? "s" : ""})
            </button>
          )}

          <button
            onClick={disconnect}
            className="py-3.5 px-6 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-850 font-medium transition-all"
          >
            Quitter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl relative">
      <div className="text-center mb-8">
        <span className="text-5xl inline-block mb-3 animate-bounce">👑</span>
        <h1 className="text-4xl font-black bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          ROYAL BLUFF
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Bluff, Trahison et Influence en Peer-to-Peer</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Pseudonyme</label>
          <input
            type="text"
            placeholder="Entrez votre nom..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            maxLength={14}
            className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-150 outline-none transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Choisir un Insigne</label>
          <div className="grid grid-cols-8 gap-2 bg-zinc-950 p-2.5 rounded-2xl border border-zinc-800/60">
            {AVATARS.map((av) => (
              <button
                key={av}
                onClick={() => setAvatar(av)}
                disabled={loading}
                className={`text-2xl p-1.5 rounded-xl transition-all flex items-center justify-center aspect-square ${
                  avatar === av ? "bg-amber-500/20 border border-amber-500 scale-110" : "hover:bg-zinc-850"
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="text-rose-500 text-sm p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">{error}</div>}

        <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800/60">
          <button
            onClick={handleHost}
            disabled={!name.trim() || loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-white/5"
          >
            {loading ? "Création..." : "Créer une Table"}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-800/60"></div>
            <span className="flex-shrink mx-4 text-zinc-500 text-xs font-bold uppercase tracking-widest">OU</span>
            <div className="flex-grow border-t border-zinc-800/60"></div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="CODE"
              value={roomToJoin}
              onChange={(e) => setRoomToJoin(e.target.value.toUpperCase())}
              disabled={loading}
              className="w-1/3 px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-150 text-center outline-none transition-all font-mono tracking-wider"
            />
            <button
              onClick={handleJoin}
              disabled={!name.trim() || !roomToJoin.trim() || loading}
              className="flex-grow py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 text-zinc-950 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/15"
            >
              Rejoindre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
