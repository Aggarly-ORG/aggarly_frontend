"use client";

import React, { useState, useEffect } from "react";

const stages = [
  { pct: 24, label: "Aligning astronomical coordinates..." },
  { pct: 48, label: "Reflecting Lumen AI neural memory..." },
  { pct: 72, label: "Synchronizing telescope telemetry..." },
  { pct: 91, label: "Unveiling nocturnal sanctuary..." },
  { pct: 100, label: "Sanctuary ready. Stepping into moonlight." },
];

export const CalibratingSanctuaryLoading: React.FC = () => {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((prev) => (prev + 1 < stages.length ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const currentStage = stages[stageIndex];

  return (
    <div className="fixed inset-0 z-[99998] flex flex-col justify-between bg-[#EFEEEC] text-[#151415] overflow-x-hidden select-none animate-in fade-in duration-300">
      <style jsx>{`
        @keyframes moonAuraPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.55;
          }
        }
        @keyframes moonHaloSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseSoft {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.95; }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .moon-aura {
          animation: moonAuraPulse 6s ease-in-out infinite;
        }
        .orbit-ring {
          animation: moonHaloSpin 45s linear infinite;
        }
        .text-pulse {
          animation: pulseSoft 3s ease-in-out infinite;
        }
        .shimmer-bar::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent);
          animation: shimmerSweep 2.2s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Top Minimal Brand Navigation Bar */}
      <header className="w-full px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between border-b border-[#DEDCD8] bg-[#EFEEEC]/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#131316] flex items-center justify-center shadow-sm">
            <div className="w-3 h-3 rounded-full border-r-2 border-t-2 border-[#F7F6F4] rotate-45" />
          </div>
          <div>
            <span className="font-serif tracking-[0.2em] text-[13px] font-semibold text-[#151415] uppercase">
              Aggarly
            </span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#8A8884] block -mt-1 font-medium">
              By Lona
            </span>
          </div>
        </div>

        {/* Sync Status in Nav */}
        <div className="flex items-center gap-6 text-[11px] font-medium tracking-[0.14em] uppercase text-[#8A8884]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#39393c] animate-ping" />
            <span className="text-[#151415]">Sanctuary Sync: In Progress</span>
          </div>
          <span className="hidden md:inline-block text-[#DEDCD8]">/</span>
          <span className="hidden md:inline-block text-[#8A8884]">Waxing Gibbous 88%</span>
        </div>

        {/* Right Status */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full bg-[#E5E3DF] text-[#63615D] border border-[#D5D3CF]">
            Encrypted Portal
          </span>
        </div>
      </header>

      {/* Main Central Obsidian Floating Card */}
      <main className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12 flex-1 flex items-center justify-center">
        <div className="w-full rounded-[28px] bg-gradient-to-b from-[#0e0e11] via-[#131316] to-[#0A0A0C] border border-[#2A2A2E] shadow-2xl p-8 md:p-14 relative overflow-hidden text-center text-[#F5F4F1]">
          {/* Subtle Ambient Starfield / Celestial Grid Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />

          {/* Radial Lunar Spotlight Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(220,230,239,0.12)_0%,_rgba(145,190,240,0.04)_40%,_transparent_70%)] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto">
            {/* Large Glowing Central Moon Asset with Celestial Rings */}
            <div className="relative w-44 h-44 md:w-56 md:h-56 flex items-center justify-center mb-8 sm:mb-10">
              {/* Outer Pulsing Lunar Aura Bloom */}
              <div className="moon-aura absolute w-64 h-64 md:w-80 md:h-80 rounded-full bg-[radial-gradient(circle,_rgba(220,235,255,0.32)_0%,_rgba(145,190,240,0.14)_45%,_transparent_70%)] filter blur-2xl pointer-events-none" />

              {/* Fine Orbital Rings */}
              <div className="orbit-ring absolute inset-[-14px] rounded-full border border-dashed border-[#DCE6EF]/25 pointer-events-none" />
              <div className="absolute inset-[-4px] rounded-full border border-[#DCE6EF]/15 pointer-events-none" />

              {/* Orbiting celestial satellite dot */}
              <div className="orbit-ring absolute inset-[-14px] rounded-full pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-[#F7F6F4] shadow-[0_0_8px_#ffffff] -top-1 left-1/2 -translate-x-1/2 absolute" />
              </div>

              {/* Photoreal Moon Image */}
              <img
                src="/moon_isolated.png"
                alt="Aggarly Nocturnal Moon"
                className="w-36 h-36 md:w-48 md:h-48 object-contain rounded-full relative z-10 select-none pointer-events-none shadow-[0_0_45px_rgba(220,230,239,0.35)] brightness-[1.08] contrast-[1.05]"
              />
            </div>

            {/* Typography: Signature High-Contrast Serif ALL CAPS + Italic Subtitle */}
            <div className="space-y-2 mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181B] border border-[#2A2A2E] text-[10px] uppercase tracking-[0.25em] text-[#9A9A9F]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DCE6EF] animate-pulse" />
                INITIALIZING CELESTIAL EPHEMERIS
              </div>

              <h1 className="font-serif text-3xl md:text-4xl tracking-[0.16em] uppercase text-[#F5F4F1] font-normal pt-2">
                ALIGNING WITH THE NIGHT
              </h1>

              <p className="font-serif italic text-[#9A9A9F] text-lg font-light tracking-wide">
                Aggarly by Lona — Nocturnal Sanctuary
              </p>
            </div>

            {/* Progress Bar & Stage Indicator */}
            <div className="w-full max-w-md mb-8">
              <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[#8A8884] mb-2">
                <span>{currentStage.label}</span>
                <span>{currentStage.pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-slate-400 to-[#F5F4F1] rounded-full transition-all duration-700 ease-out shimmer-bar relative"
                  style={{ width: `${currentStage.pct}%` }}
                />
              </div>
            </div>

            {/* Quiet Luxury Prompt Note */}
            <p className="text-[11px] text-[#8A8884] tracking-wide leading-relaxed">
              &ldquo;The night does not rush to reveal its quiet secrets.&rdquo; <br />
              <span className="text-[10px] text-[#63615D] tracking-[0.14em] uppercase">
                — Lumen Ephemeris Concierge
              </span>
            </p>
          </div>
        </div>
      </main>

      {/* Clean Warm-Canvas Global Footer */}
      <footer className="w-full px-6 sm:px-8 py-5 border-t border-[#DEDCD8] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8A8884] tracking-[0.08em] gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded-full bg-[#131316] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F7F6F4]" />
          </div>
          <span>Aggarly by Lona — Nocturnal Hospitality &amp; Astrotourism</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-[#8A8884]">Privacy Policy</span>
          <span className="text-[#DEDCD8]">•</span>
          <span className="text-[#8A8884]">Terms of Sanctuary</span>
          <span className="text-[#DEDCD8]">•</span>
          <span className="text-[#8A8884]">Emergency Telemetry</span>
        </div>
      </footer>
    </div>
  );
};
