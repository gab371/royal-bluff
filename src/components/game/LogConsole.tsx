import type { GameLog } from "../../core/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogConsoleProps {
  logs: GameLog[];
}

export function LogConsole({ logs }: LogConsoleProps) {
  const getLogStyles = (type: GameLog['type']) => {
    switch (type) {
      case 'system':
        return 'text-zinc-400 italic';
      case 'action':
        return 'text-amber-400 font-semibold';
      case 'challenge':
        return 'text-purple-400 font-bold';
      case 'block':
        return 'text-blue-400 font-semibold';
      case 'loss':
        return 'text-rose-400';
      case 'victory':
        return 'text-yellow-400 font-extrabold text-sm bg-yellow-950/30 border-2 border-yellow-500/30 p-2.5 rounded-2xl text-center block w-full shadow-lg';
      case 'warning':
        return 'text-orange-400 italic';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col h-full">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Parchemin des Récits</h3>
      
      <ScrollArea className="flex-1 pr-1.5">
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div key={log.id} className="text-xs flex flex-col gap-0.5 leading-relaxed">
              <span className="text-[10px] text-zinc-650 font-mono self-start">{log.timestamp}</span>
              <div className={`px-1.5 ${getLogStyles(log.type)}`}>
                {log.message}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-zinc-650 text-center py-8">L'histoire reste à s'écrire...</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
