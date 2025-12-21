// src/components/games/MemoryCard.tsx
import React from "react";
import clsx from "clsx";

export interface MemoryCardProps {
  id: string | number;
  label: string;
  emoji?: string;
  flipped: boolean;
  matched: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const MemoryCard: React.FC<MemoryCardProps> = ({
  label,
  emoji,
  flipped,
  matched,
  onClick,
  disabled,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={flipped || matched || disabled}
      className={clsx(
        "relative w-24 h-32 sm:w-28 sm:h-36 rounded-xl perspective",
        "focus:outline-none"
      )}
      aria-pressed={flipped || matched}
    >
      <div
        className={clsx(
          "absolute inset-0 transition-transform duration-300 transform-style-preserve-3d",
          flipped || matched ? "rotate-y-180" : "rotate-y-0"
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* front (face-down) */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-700 shadow-md"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
          }}
        >
          <div className="text-sm text-gray-600 dark:text-gray-300">?</div>
        </div>

        {/* back (face-up) */}
        <div
          className={clsx(
            "absolute inset-0 rounded-xl flex flex-col items-center justify-center p-2 shadow-md",
            matched
              ? "bg-green-50 dark:bg-green-900/30"
              : "bg-white dark:bg-slate-800"
          )}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="text-2xl mb-1 select-none">{emoji ?? "🧠"}</div>
          <div className="text-xs text-center px-1 leading-tight">{label}</div>
        </div>
      </div>
    </button>
  );
};

export default MemoryCard;
