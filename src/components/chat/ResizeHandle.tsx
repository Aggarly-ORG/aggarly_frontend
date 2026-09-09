"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  onDrag: (deltaX: number) => void;
  onDoubleClick?: () => void;
  className?: string;
  title?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  onDrag,
  onDoubleClick,
  className = "",
  title = "Drag to resize • Double-click to reset",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const lastXRef = useRef<number>(0);
  const onDragRef = useRef(onDrag);

  // Keep ref up to date to prevent stale closures in window event listeners
  useEffect(() => {
    onDragRef.current = onDrag;
  }, [onDrag]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    lastXRef.current = e.clientX;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const deltaX = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      if (deltaX !== 0 && onDragRef.current) {
        onDragRef.current(deltaX);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title={title}
      onPointerDown={handlePointerDown}
      onDoubleClick={onDoubleClick}
      className={cn(
        "relative shrink-0 w-3 -mx-1.5 z-30 cursor-col-resize select-none self-stretch h-full min-h-full flex items-center justify-center group transition-colors",
        isDragging && "cursor-col-resize",
        className
      )}
    >
      {/* 1px Center Hairline Indicator */}
      <div
        className={cn(
          "w-[1px] h-full self-stretch transition-colors duration-200",
          isDragging
            ? "bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]"
            : "bg-white/[0.12] group-hover:bg-[#D4AF37]/80"
        )}
      />

      {/* Tactile Micro-Grip Notch */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full transition-all duration-200 pointer-events-none",
          isDragging
            ? "bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] scale-110"
            : "bg-white/30 group-hover:bg-[#D4AF37] group-hover:shadow-[0_0_6px_#D4AF37]"
        )}
      />
    </div>
  );
};
