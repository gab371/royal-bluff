import type { Character } from "../../core/types";

const CHAR_ICON: Record<Character, string> = {
  Duchesse: "👑",
  Assassin: "🗡️",
  Capitaine: "🛡️",
  Comtesse: "⚜️",
  Ambassadeur: "🏰",
  Inquisiteur: "🔮",
};

export type RoleCardVariant = "secret" | "self" | "revealed" | "blockable" | "loss" | "exchange";

interface RoleCardFaceProps {
  character: Character | "🔒" | string;
  variant: RoleCardVariant;
  selected?: boolean;
  disabled?: boolean;
  showInfoBadge?: boolean;
  subtitle?: string;
  footer?: string;
  onClick?: () => void;
  className?: string;
}

function material(variant: RoleCardVariant, selected: boolean): string {
  if (selected) {
    return "bg-gradient-to-b from-[#f4e4bc] to-[#dfcb9b] border-2 border-[#e5a93b] text-[#2c1e14] ring-4 ring-[#e5a93b]/70 scale-105 -translate-y-1 shadow-lg shadow-amber-500/25";
  }
  switch (variant) {
    case "revealed":
      return "bg-gradient-to-b from-[#3a110a] to-[#250a06] border-2 border-rose-700/70 text-rose-200/80 opacity-70";
    case "blockable":
      return "bg-gradient-to-b from-[#0f2e1c] to-[#0a1a12] border-2 border-emerald-500 text-emerald-100 shadow-md shadow-emerald-500/25 animate-pulse";
    case "loss":
      return "bg-gradient-to-b from-[#3a110a] to-[#250a06] border-2 border-rose-500 text-rose-100 shadow-lg shadow-rose-500/20 animate-pulse cursor-pointer hover:scale-105";
    case "exchange":
      return "bg-gradient-to-b from-[#2a2110] to-[#1a1408] border-2 border-zinc-600 text-zinc-300 hover:border-amber-500/60 hover:text-amber-100";
    case "self":
      return "bg-gradient-to-b from-[#f4e4bc] to-[#dfcb9b] border-2 border-[#b59b65] text-[#2c1e14] shadow-md shadow-amber-900/30";
    case "secret":
    default:
      return "bg-gradient-to-b from-[#1c1520] to-[#0f0b14] border-2 border-amber-700/40 text-amber-50/90 shadow-md shadow-black/40";
  }
}

export function RoleCardFace({
  character,
  variant,
  selected = false,
  disabled = false,
  showInfoBadge = false,
  subtitle,
  footer,
  onClick,
  className = "",
}: RoleCardFaceProps) {
  const isMasked = character === "🔒";
  const icon =
    !isMasked && character in CHAR_ICON
      ? CHAR_ICON[character as Character]
      : isMasked
        ? "🔒"
        : "❔";
  const label = isMasked ? "Secret" : String(character);
  const header =
    subtitle ??
    (variant === "revealed"
      ? "Éliminé"
      : variant === "blockable"
        ? "Blocage"
        : variant === "secret" && isMasked
          ? "Influence"
          : "Influence");
  const foot =
    footer ??
    (variant === "revealed" ? "Révélé" : isMasked ? "Caché" : "Cour");

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative w-24 h-32 sm:w-28 sm:h-36 rounded-xl flex flex-col justify-between p-2.5 sm:p-3 transition-all duration-200 select-none font-sans ${material(
        variant,
        selected,
      )} ${disabled && !onClick ? "cursor-default" : ""} ${className}`}
    >
      {showInfoBadge && (
        <span
          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-zinc-800/80 text-amber-100 text-[9px] font-bold flex items-center justify-center"
          aria-hidden
        >
          ⓘ
        </span>
      )}
      <div
        className={`flex flex-col gap-0.5 text-[9px] font-bold uppercase tracking-wider border-b pb-1 ${
          variant === "self" || selected
            ? "border-[#523628]/15 text-[#7d5635]"
            : "border-white/10 text-amber-200/50"
        }`}
      >
        <span>{header}</span>
      </div>
      <div className="flex flex-col items-center justify-center my-auto gap-1">
        <span className="text-3xl sm:text-4xl drop-shadow-md leading-none">{icon}</span>
        <span
          className={`text-xs sm:text-sm font-serif font-bold tracking-tight text-center leading-tight ${
            variant === "self" || selected ? "text-[#2c1e14]" : ""
          }`}
        >
          {label}
        </span>
      </div>
      <div
        className={`text-[9px] font-bold border-t pt-1 text-center ${
          variant === "self" || selected
            ? "border-[#523628]/15 text-[#7d5635]"
            : "border-white/10 text-amber-200/40"
        }`}
      >
        {foot}
      </div>
    </button>
  );
}
