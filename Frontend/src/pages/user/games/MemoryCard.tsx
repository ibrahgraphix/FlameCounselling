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
  // container provides perspective
  const containerStyle: React.CSSProperties = {
    perspective: "1000px",
    width: "120px",
    height: "160px",
  };
  // inner rotates
  const innerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    transition: "transform 320ms cubic-bezier(.2,.9,.2,1)",
    transformStyle: "preserve-3d",
    transform: flipped || matched ? "rotateY(180deg)" : "rotateY(0deg)",
  };
  const faceCommon: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const frontStyle: React.CSSProperties = {
    ...faceCommon,
    transform: "rotateY(0deg)",
  };
  const backStyle: React.CSSProperties = {
    ...faceCommon,
    transform: "rotateY(180deg)",
    padding: 12,
    boxSizing: "border-box",
  };
  return (
    <button
      onClick={onClick}
      disabled={flipped || matched || disabled}
      aria-pressed={flipped || matched}
      className={clsx(
        "rounded-xl focus:outline-none",
        "shadow-lg",
        "hover:scale-[1.02] active:scale-[0.99] transition-transform"
      )}
      style={containerStyle}
    >
      <div style={innerStyle}>
        {/* FRONT (face-down) - styled like a real card back with theme gradient */}
        <div
          style={frontStyle}
          className="bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900 border-2 border-sky-200 dark:border-slate-600 shadow-md"
        >
          <div className="flex flex-col items-center justify-center select-none p-3">
            <div className="text-5xl mb-2 text-sky-400 dark:text-sky-300">
              ?
            </div>
            <div className="text-xs font-semibold text-sky-600 dark:text-sky-300 tracking-wide">
              Flip Me
            </div>
          </div>
        </div>
        {/* BACK (face-up) - full card content */}
        <div
          style={backStyle}
          className={clsx(
            "border-2",
            matched
              ? "border-green-300 dark:border-green-700"
              : "border-sky-200 dark:border-slate-600",
            matched
              ? "bg-green-50 dark:bg-green-900/20"
              : "bg-white dark:bg-slate-800"
          )}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-3xl mb-2 select-none">{emoji ?? "🧠"}</div>
            <div className="text-sm text-center px-1 font-medium leading-tight">
              {label}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default MemoryCard;
