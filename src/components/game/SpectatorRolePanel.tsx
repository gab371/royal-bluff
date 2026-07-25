import React from "react";
import type { Player } from "../../core/types";

interface SpectatorRolePanelProps {
  players: Player[];
  spectators: Player[];
  spectatorLocks: { [peerId: string]: boolean };
  myPeerId: string | null;
  isHost: boolean;
  onSetRole: (peerId: string, role: 'player' | 'spectator') => void;
  onLockSpectator: (peerId: string, locked: boolean) => void;
}

const RoleBadge: React.FC<{ role: 'player' | 'spectator' }> = ({ role }) => (
  <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold border ${
    role === 'spectator'
      ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
  }`}>
    {role === 'spectator' ? '👁 Spectateur' : '👑 Joueur'}
  </span>
);

export const SpectatorRolePanel: React.FC<SpectatorRolePanelProps> = ({
  players, spectators, spectatorLocks, myPeerId, isHost, onSetRole, onLockSpectator,
}) => {
  const all = [...players, ...spectators];
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 mb-6 flex flex-col gap-2">
      <div className="text-xs text-amber-500 font-bold uppercase tracking-widest">Rôle (Joueur / Spectateur)</div>
      <p className="text-[11px] text-zinc-400">
        {isHost
          ? "Chacun choisit son rôle. Vous pouvez seulement forcer le mode spectateur (et verrouiller) — jamais forcer le mode joueur."
          : "Basculez votre propre rôle librement, sauf si l'hôte vous a verrouillé en spectateur."}
      </p>
      <div className="flex flex-col gap-1.5 mt-1">
        {all.map((p) => {
          const isMe = p.id === myPeerId;
          const locked = !!spectatorLocks[p.id];
          const targetRole: 'player' | 'spectator' = p.role === 'spectator' ? 'player' : 'spectator';
          // Self: both directions (lock blocks only spectator → player).
          // Host on others: only player → spectator (never force player).
          const canToggle = p.isHost
            ? false
            : isMe
              ? (p.role === 'player' || !locked)
              : isHost && p.role === 'player';
          return (
            <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{p.avatar}</span>
                <span className="font-medium text-zinc-100 truncate">
                  {p.name}{isMe ? ' (Vous)' : ''}{p.isHost ? ' 👑' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <RoleBadge role={p.role} />
                {canToggle && (
                  <button
                    type="button"
                    onClick={() => onSetRole(p.id, targetRole)}
                    className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all"
                    title={targetRole === 'spectator' ? "Passer en spectateur" : "Redevenir joueur"}
                  >
                    → {targetRole === 'spectator' ? '👁' : '👑'}
                  </button>
                )}
                {isHost && !p.isHost && (
                  <button
                    type="button"
                    onClick={() => onLockSpectator(p.id, !locked)}
                    className={`text-[11px] px-2 py-1 rounded-lg border transition-all ${
                      locked
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                    }`}
                    title={
                      locked
                        ? "Déverrouiller (peut redevenir joueur)"
                        : "Forcer & verrouiller en spectateur"
                    }
                  >
                    {locked ? "🔒" : "🔓"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
