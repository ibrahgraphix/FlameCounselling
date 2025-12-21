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
  // inline styles for reliable 3D flip (no custom tailwind rotate classes required)
  const containerStyle: React.CSSProperties = {
    perspective: "1000px",
    width: "100%",
    height: "100%",
  };

  const innerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    transition: "transform 300ms ease",
    transformStyle: "preserve-3d",
    transform: flipped || matched ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  const faceStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden",
    borderRadius: "0.75rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const frontStyle: React.CSSProperties = {
    ...faceStyle,
    transform: "rotateY(0deg)",
  };

  const backStyle: React.CSSProperties = {
    ...faceStyle,
    transform: "rotateY(180deg)",
  };

  return (
    <button
      onClick={onClick}
      disabled={flipped || matched || disabled}
      aria-pressed={flipped || matched}
      className={clsx(
        "w-24 h-32 sm:w-28 sm:h-36 rounded-xl focus:outline-none",
        "shadow"
      )}
      style={containerStyle}
    >
      <div style={innerStyle}>
        {/* FRONT (face-down) */}
        <div
          style={frontStyle}
          className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-700"
        >
          <div className="text-lg sm:text-sm text-gray-600 dark:text-gray-300 select-none">
            ?
          </div>
        </div>

        {/* BACK (face-up) */}
        <div
          style={backStyle}
          className={clsx(
            "p-2",
            matched
              ? "bg-green-50 dark:bg-green-900/30"
              : "bg-white dark:bg-slate-800"
          )}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="text-2xl mb-1 select-none">{emoji ?? "🧠"}</div>
            <div className="text-xs text-center px-1 leading-tight">
              {label}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default MemoryCard;
