import type { GameLog } from "../../core/types";
import { JournalPanel } from "p2play-core/chat";

interface LogConsoleProps {
  logs: GameLog[];
}

export function LogConsole({ logs }: LogConsoleProps) {
  return (
    <JournalPanel
      entries={logs}
      title="Parchemin des Récits"
      emptyLabel="L'histoire reste à s'écrire..."
      className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col h-full text-zinc-100 text-xs"
      maxHeight="280px"
    />
  );
}
