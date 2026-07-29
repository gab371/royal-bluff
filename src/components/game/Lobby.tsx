import { useState } from "react";
import { CopyRoomLinkButton } from "p2play-core";
import { Badge, Button } from "p2play-core/ui";
import { DECKS } from "../../core/decks";
import type { DeckId } from "../../core/decks";
import type { GameConfig, Player } from "../../core/types";
import { SpectatorRolePanel } from "./SpectatorRolePanel";
import { LobbyHome } from "./LobbyHome";

interface LobbyProps {
  myPeerId: string | null;
  hostPeerId: string | null;
  isHost: boolean;
  players: Player[];
  spectators?: Player[];
  spectatorLocks?: { [peerId: string]: boolean };
  status: string;
  error: string | null;
  hostRoom: (name: string, avatar: string) => Promise<void>;
  joinRoom: (name: string, avatar: string, roomId: string) => Promise<void>;
  toggleReady: (ready: boolean) => void;
  startGame: () => void;
  disconnect: () => void;
  onSetRole?: (peerId: string, role: 'player' | 'spectator') => void;
  onLockSpectator?: (peerId: string, locked: boolean) => void;
  config?: GameConfig;
  onChangeConfig?: (partial: Partial<GameConfig>) => void;
}

export function Lobby({
  myPeerId,
  hostPeerId,
  isHost,
  players,
  spectators = [],
  spectatorLocks = {},
  status,
  error,
  hostRoom,
  joinRoom,
  toggleReady,
  startGame,
  disconnect,
  onSetRole,
  onLockSpectator,
  config,
  onChangeConfig,
}: LobbyProps) {
  const [localReady, setLocalReady] = useState(false);

  const activeDeckId: DeckId = config?.deckId ?? 'CLASSIC';
  const actionHelper = config?.actionHelper ?? true;

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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
              Salon Royal : {hostPeerId}
            </h1>
            {hostPeerId && (
              <CopyRoomLinkButton
                id="lobby-copy-btn"
                code={hostPeerId}
                className="bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300"
              />
            )}
          </div>
          <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-400 font-mono">
            {isHost ? "MONARQUE" : "COURTISAN"}
          </Badge>
        </div>
        <p className="text-zinc-400 text-sm mb-6">Partagez ce code avec vos courtisans pour les inviter à conspirer.</p>

        <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-col gap-4">
          <div>
            <div className="text-xs text-amber-500 font-bold uppercase tracking-widest mb-2">Deck</div>
            {isHost ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(DECKS).map((deck) => (
                  <Button
                    key={deck.id}
                    type="button"
                    variant="outline"
                    onClick={() => onChangeConfig?.({ deckId: deck.id })}
                    className={`h-auto text-left justify-start p-3 rounded-xl border-2 whitespace-normal ${
                      activeDeckId === deck.id
                        ? "bg-amber-500/15 border-amber-500"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-zinc-100">{deck.name}</span>
                      <span className="text-[11px] text-zinc-400 leading-snug font-normal">{deck.description}</span>
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-zinc-200 font-semibold bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-sm">
                Actif : {DECKS[activeDeckId].name}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-amber-500 font-bold uppercase tracking-widest mb-2">Aide aux actions</div>
            {isHost ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onChangeConfig?.({ actionHelper: !actionHelper })}
                className={`w-full h-auto flex items-center justify-between p-3 rounded-xl border-2 whitespace-normal ${
                  actionHelper
                    ? "bg-emerald-500/15 border-emerald-500"
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <span className="text-left">
                  <span className="block text-sm font-bold text-zinc-100">
                    Aide aux actions : {actionHelper ? "Activée" : "Désactivée"}
                  </span>
                  <span className="block text-[11px] text-zinc-400 mt-0.5 leading-snug font-normal">
                    Bordure verte sur les cartes capables de bloquer, bulles d'info sur chaque influence.
                  </span>
                </span>
                <span className={`w-10 h-6 rounded-full relative transition-all shrink-0 ${actionHelper ? "bg-emerald-500" : "bg-zinc-700"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${actionHelper ? "left-[18px]" : "left-0.5"}`} />
                </span>
              </Button>
            ) : (
              <div className="text-zinc-200 font-semibold bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-sm">
                Aide aux actions : {actionHelper ? "Activée" : "Désactivée"}
              </div>
            )}
          </div>
        </div>

        <SpectatorRolePanel
          players={players}
          spectators={spectators}
          spectatorLocks={spectatorLocks}
          myPeerId={myPeerId}
          isHost={isHost}
          onSetRole={onSetRole || (() => {})}
          onLockSpectator={onLockSpectator || (() => {})}
        />

        <div className="flex flex-col gap-4 mb-8">
          <h2 className="text-lg font-bold text-zinc-200">
            Conspirateurs connectés ({players.length})
            {spectators.length > 0 && <span className="text-sky-300/80 text-sm"> · 👁 {spectators.length} spectateur(s)</span>}
          </h2>
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
                <Badge
                  variant={player.isHost ? "default" : player.isReady ? "secondary" : "outline"}
                  className={
                    player.isHost
                      ? "w-24 justify-center bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : player.isReady
                      ? "w-24 justify-center bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "w-24 justify-center bg-zinc-800 text-zinc-500"
                  }
                >
                  {player.isHost ? "Hôte" : player.isReady ? "Prêt" : "En attente"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-800/60">
          {!isHost && (
            <Button
              type="button"
              onClick={handleToggleReady}
              className={`flex-1 h-auto py-3.5 px-6 rounded-2xl font-bold ${
                localReady
                  ? "bg-amber-600 hover:bg-amber-500 text-zinc-950 shadow-lg shadow-amber-900/30"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              }`}
            >
              {localReady ? "Pas Prêt" : "Je suis Prêt !"}
            </Button>
          )}

          {isHost && (
            <Button
              type="button"
              onClick={startGame}
              disabled={!allReady}
              className="flex-1 h-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 text-zinc-950 font-bold disabled:opacity-40 shadow-lg shadow-amber-500/20"
            >
              Lancer la partie ({players.length} conspirateur{players.length > 1 ? "s" : ""})
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={disconnect}
            className="h-auto py-3.5 px-6 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800"
          >
            Quitter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LobbyHome
      status={status}
      error={error}
      hostRoom={hostRoom}
      joinRoom={joinRoom}
    />
  );
}
