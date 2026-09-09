"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  MousePointerClick,
  Edit3,
  ArrowDownUp,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { PointerPhase, ElementHighlightBox } from "@/store/slices/uiSlice";

export interface AiCursorBeaconProps {
  isActive?: boolean;
  x?: number;
  y?: number;
  label?: string;
  isClicking?: boolean;
  phase?: PointerPhase;
  highlightBox?: ElementHighlightBox | null;
}

/**
 * Animated golden AI cursor beacon and target highlight overlay that visually simulates Lumen
 * navigating, scrolling, typing, and clicking elements in real time.
 */
export const AiCursorBeacon: React.FC<AiCursorBeaconProps> = (props) => {
  const reduxBeacon = useAppSelector((state) => state.ui.cursorBeacon);

  const isActive = props.isActive ?? reduxBeacon?.isActive ?? false;
  const x = props.x ?? reduxBeacon?.x ?? 0;
  const y = props.y ?? reduxBeacon?.y ?? 0;
  const label = props.label ?? reduxBeacon?.label;
  const isClicking = props.isClicking ?? reduxBeacon?.isClicking ?? false;
  const phase = props.phase ?? reduxBeacon?.phase ?? "idle";
  const highlightBox = props.highlightBox ?? reduxBeacon?.highlightBox;

  const [coords, setCoords] = useState({ x, y });

  useEffect(() => {
    setCoords({ x, y });
  }, [x, y]);

  if (!isActive) return null;

  const renderPhaseIcon = () => {
    switch (phase) {
      case "clicking":
        return <MousePointerClick className="w-4 h-4 text-amber-200 animate-bounce" />;
      case "typing":
        return <Edit3 className="w-3.5 h-3.5 text-amber-300 animate-pulse" />;
      case "scrolling":
        return <ArrowDownUp className="w-3.5 h-3.5 text-amber-300 animate-bounce" />;
      case "verifying":
        return <Eye className="w-3.5 h-3.5 text-amber-200 animate-spin-slow" />;
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "error":
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />;
    }
  };

  return (
    <>
      {/* 1. Target Element Highlight Box Overlay */}
      {highlightBox && highlightBox.width > 0 && highlightBox.height > 0 && (
        <div
          className="fixed pointer-events-none z-[99998] rounded-xl border border-amber-400/60 bg-amber-400/[0.04] shadow-[0_0_24px_rgba(245,158,11,0.2)] transition-all duration-200 ease-out"
          style={{
            left: `${highlightBox.x - 4}px`,
            top: `${highlightBox.y - 4}px`,
            width: `${highlightBox.width + 8}px`,
            height: `${highlightBox.height + 8}px`,
          }}
          aria-hidden="true"
        >
          {/* Subtle Corner Accents */}
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400 rounded-tl" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400 rounded-tr" />
          <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400 rounded-bl" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400 rounded-br" />
        </div>
      )}

      {/* 2. Radiant Golden Cursor Beacon */}
      <div
        id="lumen-cursor-beacon"
        className="fixed pointer-events-none z-[99999] transition-all duration-200 ease-out"
        style={{
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          transform: "translate(-12px, -12px)",
        }}
        aria-hidden="true"
      >
        <div className="relative flex items-center">
          <div className="relative">
            {/* Outer glowing pulsing halo */}
            <div
              className={`absolute -inset-2.5 rounded-full bg-amber-400/30 blur-md transition-all duration-300 ${
                isClicking || phase === "clicking"
                  ? "scale-150 bg-amber-300/70"
                  : "animate-pulse"
              }`}
            />

            {/* Core Cursor Icon / Orb */}
            <div
              className={`relative flex items-center justify-center w-8 h-8 rounded-full border border-amber-300/90 bg-stone-950/95 shadow-[0_0_24px_rgba(245,158,11,0.6)] transition-all duration-200 ${
                isClicking || phase === "clicking"
                  ? "scale-90 ring-4 ring-amber-400/50 bg-amber-950/90"
                  : phase === "success"
                  ? "border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.5)]"
                  : phase === "error"
                  ? "border-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.5)]"
                  : "scale-100"
              }`}
            >
              {renderPhaseIcon()}
            </div>

            {/* Click Ripple Wave */}
            {(isClicking || phase === "clicking") && (
              <div className="absolute -inset-1 rounded-full border-2 border-amber-300 animate-ping opacity-80" />
            )}
          </div>

          {/* Floating Live Status Badge */}
          {label && (
            <div className="ml-3 px-3 py-1.5 rounded-full bg-stone-900/95 border border-amber-400/50 shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
              <span
                className={`w-2 h-2 rounded-full ${
                  phase === "success"
                    ? "bg-emerald-400"
                    : phase === "error"
                    ? "bg-rose-400"
                    : "bg-amber-400 animate-pulse"
                }`}
              />
              <span className="text-xs font-medium tracking-wide text-amber-100">
                {label}
              </span>
              {phase && phase !== "idle" && (
                <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-400/70 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {phase}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
