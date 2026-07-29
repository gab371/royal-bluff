import type { ActionType, GamePhase, GameState } from "../../core/types";
import { ExpandToggle } from "./ExpandToggle";

const PHASE_LABELS: Record<GamePhase, string> = {
  LOBBY: "Salon",
  ACTION_SELECTION: "Sélection d'action",
  CHALLENGE_WINDOW: "Contre (Challenge)",
  BLOCK_WINDOW: "Blocage",
  CHALLENGE_BLOCK_WINDOW: "Contre le blocage",
  CHOOSE_LOSS: "Perte d'influence",
  EXCHANGE_DECISION: "Échange",
  INQUISITION_DECISION: "Inquisition",
  GAME_OVER: "Partie Terminée",
};

const ACTION_LABELS: Partial<Record<ActionType, string>> = {
  REVENU: "Revenu",
  AIDE_EXTERIEURE: "Aide Extérieure",
  COUP: "Coup d'État",
  TAXE: "Taxe",
  ASSASSINAT: "Assassinat",
  VOL: "Vol",
  ECHANGE: "Échange",
  INQUISITION: "Inquisition",
};

function playerName(gameState: GameState, uid?: string | null) {
  if (!uid) return "inconnu";
  return gameState.players.find((p) => p.id === uid)?.name ?? "inconnu";
}

function phaseHeadline(gameState: GameState): string {
  const { phase, players, activePlayerIndex, pendingAction, pendingBlock, pendingLoss } = gameState;
  const active = players[activePlayerIndex];

  switch (phase) {
    case "ACTION_SELECTION":
      return `Tour de ${active?.name ?? "…"} — Choix d'action`;
    case "CHALLENGE_WINDOW": {
      const actor = playerName(gameState, pendingAction?.playerUid);
      const action = pendingAction ? ACTION_LABELS[pendingAction.action] ?? pendingAction.action : "action";
      return `${actor} annonce ${action} — Les autres peuvent contester`;
    }
    case "BLOCK_WINDOW": {
      const actor = playerName(gameState, pendingAction?.playerUid);
      const action = pendingAction ? ACTION_LABELS[pendingAction.action] ?? pendingAction.action : "action";
      return `${actor} tente ${action} — Blocage possible`;
    }
    case "CHALLENGE_BLOCK_WINDOW": {
      const blocker = playerName(gameState, pendingBlock?.playerUid);
      return `${blocker} bloque avec ${pendingBlock?.character ?? "…"} — Contestez le blocage ?`;
    }
    case "CHOOSE_LOSS":
      return `${playerName(gameState, pendingLoss?.playerUid)} doit sacrifier une influence`;
    case "EXCHANGE_DECISION":
      return `${active?.name ?? "…"} choisit ses influences à garder`;
    case "INQUISITION_DECISION":
      return `${active?.name ?? "…"} inspecte une influence`;
    case "GAME_OVER": {
      const winner = players.find((p) => p.id === gameState.winnerId);
      return winner ? `Victoire de ${winner.name} !` : "Partie terminée";
    }
    default:
      return PHASE_LABELS[phase] ?? phase;
  }
}

interface PhaseStatusBarProps {
  gameState: GameState;
  boardExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function PhaseStatusBar({
  gameState,
  boardExpanded = false,
  onToggleExpand,
}: PhaseStatusBarProps) {
  const alive = gameState.players.filter((p) => !p.isEliminated).length;

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl px-5 py-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
          Phase : {PHASE_LABELS[gameState.phase] ?? gameState.phase}
        </span>
        <h2 className="text-xl font-extrabold text-zinc-100 mt-1">{phaseHeadline(gameState)}</h2>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-800 font-mono text-xs text-amber-300/80">
          {alive} en lice
        </span>
        {onToggleExpand && (
          <ExpandToggle
            expanded={boardExpanded}
            onToggle={onToggleExpand}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950/90 text-zinc-200 hover:border-amber-400/60 transition-all"
          />
        )}
      </div>
    </div>
  );
}
