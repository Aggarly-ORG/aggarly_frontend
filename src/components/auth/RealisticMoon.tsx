"use client";

import React, { useEffect, useRef, useState } from "react";

interface RealisticMoonProps {
  size?: number;
  className?: string;
  imageSrc?: string;
}

export const RealisticMoon: React.FC<RealisticMoonProps> = ({
  size = 230,
  className = "",
  imageSrc,
}) => {
  const moonRef = useRef<HTMLDivElement>(null);
  const [proximity, setProximity] = useState<number>(0.15); // 0 (far) to 1 (near)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!moonRef.current) return;
      const rect = moonRef.current.getBoundingClientRect();
      const moonCenterX = rect.left + rect.width / 2;
      const moonCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - moonCenterX;
      const dy = e.clientY - moonCenterY;
      const distance = Math.hypot(dx, dy);

      // Max interaction radius
      const maxDistance = 600;
      const minDistance = rect.width / 2;

      if (distance <= minDistance) {
        setProximity(1.0);
      } else if (distance >= maxDistance) {
        setProximity(0.0);
      } else {
        const factor = 1 - (distance - minDistance) / (maxDistance - minDistance);
        setProximity(Math.pow(factor, 1.35));
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Dynamic illumination parameters (casting light eastward / rightward across the card)
  const coreBrightness = (0.92 + proximity * 0.42).toFixed(3);
  const coreContrast = (1.04 + proximity * 0.14).toFixed(3);
  const drop1Blur = (14 + proximity * 36).toFixed(1);
  const drop1Opacity = (0.35 + proximity * 0.55).toFixed(3);
  const drop2Blur = (35 + proximity * 70).toFixed(1);
  const drop2Opacity = (0.22 + proximity * 0.45).toFixed(3);
  const drop3Blur = (70 + proximity * 110).toFixed(1);
  const drop3Opacity = (0.14 + proximity * 0.32).toFixed(3);

  const ambientScale = 1.0 + proximity * 0.35;
  const ambientOpacity = 0.24 + proximity * 0.52;

  return (
    <div
      ref={moonRef}
      className={`lona-moon-root ${className}`}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Dynamic Ambient Celestial Aura: Expansive beam spreading rightwards across the card */}
      <div
        className="lona-moon-ambient"
        style={{
          position: "absolute",
          width: size * 3.4,
          height: size * 2.3,
          left: `calc(50% - ${size * 0.95}px)`,
          top: `calc(50% - ${size * 1.15}px)`,
          borderRadius: "50%",
          pointerEvents: "none",
          background: `radial-gradient(ellipse 70% 55% at 30% 50%, rgba(215, 235, 255, ${ambientOpacity}) 0%, rgba(145, 190, 240, ${ambientOpacity * 0.5}) 32%, rgba(95, 145, 210, ${ambientOpacity * 0.2}) 58%, rgba(5, 7, 12, 0) 80%)`,
          transform: `scale(${ambientScale})`,
          filter: "blur(32px)",
          transition: "transform 0.18s ease-out, opacity 0.18s ease-out",
          zIndex: 1,
        }}
      />

      {/* Realistic Moon Body: Shifted directional drop-shadows lighting rightward */}
      <div
        className="lona-moon-sphere"
        style={{
          position: "relative",
          width: size,
          height: size,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={imageSrc || "/moon_isolated.png"}
          alt="AGGARLY Nocturnal Moon"
          className="lona-moon-img"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
            filter: `brightness(${coreBrightness}) contrast(${coreContrast}) drop-shadow(14px 4px ${drop1Blur}px rgba(225, 240, 255, ${drop1Opacity})) drop-shadow(32px 8px ${drop2Blur}px rgba(175, 215, 255, ${drop2Opacity})) drop-shadow(70px 16px ${drop3Blur}px rgba(120, 170, 235, ${drop3Opacity}))`,
            transition: "filter 0.15s ease-out",
          }}
        />

        {/* Soft interactive celestial light sheen that sweeps over the surface on proximity */}
        <div
          className="lona-moon-sheen"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 45% 40%, rgba(235, 245, 255, 0.3) 0%, rgba(190, 215, 245, 0.08) 55%, transparent 75%)",
            opacity: 0.2 + proximity * 0.8,
            mixBlendMode: "screen",
            transition: "opacity 0.15s ease-out",
          }}
        />
      </div>
    </div>
  );
};
