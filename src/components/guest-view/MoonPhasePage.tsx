"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LonaHeader } from "../common/LonaHeader";
import { RealisticMoon } from "../auth/RealisticMoon";

/* ── Static data ─────────────────────────────────────────────────────────── */

/* All 30 photos live in /lunar_cycle_30_png/day_01.png … day_30.png.
   day_01 = new moon, day_15 = full moon, day_30 = new moon again. */
const dayPhoto = (day: number): string =>
  `/lunar_cycle_30_png/day_${String(day).padStart(2, "0")}.png`;

const LUNAR_CYCLE = [
  { day: 1, phase: "New Moon", illum: 0 },
  { day: 2, phase: "Waxing Crescent", illum: 3 },
  { day: 3, phase: "Waxing Crescent", illum: 6 },
  { day: 4, phase: "Waxing Crescent", illum: 10 },
  { day: 5, phase: "Waxing Crescent", illum: 15 },
  { day: 6, phase: "First Quarter", illum: 21 },
  { day: 7, phase: "First Quarter", illum: 28 },
  { day: 8, phase: "First Quarter", illum: 36 },
  { day: 9, phase: "Waxing Gibbous", illum: 45 },
  { day: 10, phase: "Waxing Gibbous", illum: 55 },
  { day: 11, phase: "Waxing Gibbous", illum: 65 },
  { day: 12, phase: "Waxing Gibbous", illum: 74 },
  { day: 13, phase: "Waxing Gibbous", illum: 82 },
  { day: 14, phase: "Waxing Gibbous", illum: 88 },
  { day: 15, phase: "Full Moon", illum: 100 },
  { day: 16, phase: "Waning Gibbous", illum: 94 },
  { day: 17, phase: "Waning Gibbous", illum: 88 },
  { day: 18, phase: "Waning Gibbous", illum: 82, today: true },
  { day: 19, phase: "Waning Gibbous", illum: 74 },
  { day: 20, phase: "Last Quarter", illum: 65 },
  { day: 21, phase: "Last Quarter", illum: 55 },
  { day: 22, phase: "Waning Crescent", illum: 45 },
  { day: 23, phase: "Crescent", illum: 36 },
  { day: 24, phase: "Crescent", illum: 28 },
  { day: 25, phase: "Crescent", illum: 21 },
  { day: 26, phase: "Crescent", illum: 15 },
  { day: 27, phase: "Crescent", illum: 10 },
  { day: 28, phase: "Old Moon", illum: 6 },
  { day: 29, phase: "Old Moon", illum: 3 },
  { day: 30, phase: "New Moon", illum: 0 },
];

const nightsUntilFull = (day: number): string => {
  if (day === 15) return "Full Moon Tonight";
  const n = day < 15 ? 15 - day : 45 - day;
  return `Next Full: ${n} Night${n === 1 ? "" : "s"}`;
};

const padDay = (day: number): string => String(day).padStart(2, "0");

/* ── Component ───────────────────────────────────────────────────────────── */
export const MoonPhasePage: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(
    LUNAR_CYCLE.find((n) => n.today)?.day ?? LUNAR_CYCLE[0].day
  );
  const stripRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const selected = LUNAR_CYCLE.find((n) => n.day === selectedDay) ?? LUNAR_CYCLE[0];

  const selectDay = (n: (typeof LUNAR_CYCLE)[number]) => {
    setSelectedDay(n.day);
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollStrip = (dir: number) => {
    stripRef.current?.scrollBy({ left: dir * 272, behavior: "smooth" });
  };

  /* Center today's card in the strip on first load */
  useEffect(() => {
    const scroller = stripRef.current;
    const card = scroller?.querySelector<HTMLElement>(".mph-night-card.today");
    if (scroller && card) {
      scroller.scrollLeft = card.offsetLeft - scroller.clientWidth / 2 + card.clientWidth / 2;
    }
  }, []);

  return (
    <div className="mph-root">
      {/* Unified Header */}
      <LonaHeader />

      {/* ════════════════ MAIN OBSIDIAN MONOLITH ═════════════════════════════ */}
      <main className="mph-wrap">
        <div className="mph-monolith">
          {/* Ambient light bleed */}
          <div className="mph-ambient mph-ambient-top" aria-hidden="true" />
          <div className="mph-ambient mph-ambient-side" aria-hidden="true" />

          {/* 1. HERO CELESTIAL SECTION */}
          <section className="mph-hero" ref={heroRef}>
            <div className="mph-status-pill">
              <span className="mph-status-dot" />
              <span>
                {selected.today
                  ? "Tonight\u2019s Lunar Cycle"
                  : `Day ${padDay(selected.day)} · ${selected.phase}`}
              </span>
            </div>

            {/* Moon visualization with multi-tier bloom */}
            <div className="mph-moon-stage">
              <div className="mph-moon-bloom mph-bloom-outer" aria-hidden="true" />
              <div className="mph-moon-bloom mph-bloom-inner" aria-hidden="true" />
              <RealisticMoon size={192} imageSrc={dayPhoto(selected.day)} />
            </div>

            {/* Typography */}
            <div className="mph-hero-title-block">
              <h1 className="mph-hero-title">{selected.phase}</h1>
              <p className="mph-hero-sub">
                Celestial Ephemeris{selected.today ? " · Tonight" : ` · Day ${padDay(selected.day)}`}
              </p>
            </div>

            {/* Lunar stats row */}
            <div className="mph-stats">
              <div className="mph-stat-cell">
                <span className="mph-stat-label">Illumination</span>
                <span className="mph-stat-value">{selected.illum}% Luminous</span>
              </div>
              <div className="mph-stat-cell">
                <span className="mph-stat-label">Moonrise</span>
                <span className="mph-stat-value">20:42 PM</span>
              </div>
              <div className="mph-stat-cell">
                <span className="mph-stat-label">Moonset</span>
                <span className="mph-stat-value">07:18 AM</span>
              </div>
              <div className="mph-stat-cell">
                <span className="mph-stat-label">Zenith Apex</span>
                <span className="mph-stat-value">02:15 AM (54°)</span>
              </div>
              <div className="mph-stat-cell">
                <span className="mph-stat-label">Full Cycle</span>
                <span className="mph-stat-value">{nightsUntilFull(selected.day)}</span>
              </div>
            </div>
          </section>

          {/* 2. 14-NIGHT LUNAR MONTH PHASE STRIP */}
          <section className="mph-horizon">
            <div className="mph-section-head">
              <div>
                <span className="mph-eyebrow">Observation Schedule</span>
                <h2 className="mph-h2">The Lunar Horizon</h2>
              </div>
              <p className="mph-section-desc">
                Select any night to preview its lunar phase and illumination across the
                30-day cycle.
              </p>
            </div>

            <div className="mph-strip-wrap">
              <button
                type="button"
                className="mph-strip-arrow mph-strip-prev"
                aria-label="Scroll back"
                onClick={() => scrollStrip(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                className="mph-strip-arrow mph-strip-next"
                aria-label="Scroll forward"
                onClick={() => scrollStrip(1)}
              >
                ›
              </button>

              <div className="mph-strip-frame">
                <div className="mph-strip-scroll" ref={stripRef}>
                  <div className="mph-strip">
                    {LUNAR_CYCLE.map((n) => (
                      <button
                        key={n.day}
                        type="button"
                        aria-pressed={n.day === selectedDay}
                        className={`mph-night-card${n.today ? " today" : ""}${n.day === selectedDay ? " selected" : ""}`}
                        onClick={() => selectDay(n)}
                      >
                        {n.today && <span className="mph-today-dot" aria-hidden="true" />}
                        <span className="mph-night-day">Day</span>
                        <span className="mph-night-date">{padDay(n.day)}</span>
                        <div className="mph-night-icon">
                          <img src={dayPhoto(n.day)} alt={`${n.phase} ${n.illum}%`} />
                        </div>
                        <span className="mph-night-phase">{n.phase}</span>
                        <span className="mph-night-illum">{n.illum}%</span>
                        {n.today && <span className="mph-night-tag">Today</span>}
                        {n.day === selectedDay && !n.today && (
                          <span className="mph-night-tag">Viewing</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mph-strip-fade mph-strip-fade-left" aria-hidden="true" />
                <div className="mph-strip-fade mph-strip-fade-right" aria-hidden="true" />
              </div>
            </div>
          </section>

          {/* 3. CELESTIAL NOTIFICATIONS & ALMANAC CONTROLS */}
          <section className="mph-almanac">
            <div className="mph-almanac-inner">
              <div className="mph-toggles">
                <label className="mph-toggle">
                  <input type="checkbox" defaultChecked className="mph-toggle-input" />
                  <span className="mph-toggle-track">
                    <span className="mph-toggle-knob" />
                  </span>
                  <span className="mph-toggle-text">
                    <span className="mph-toggle-title">Full Moon 48h Warning</span>
                    <span className="mph-toggle-desc">Prompt dispatch for peak luminescence</span>
                  </span>
                </label>
                <label className="mph-toggle">
                  <input type="checkbox" defaultChecked className="mph-toggle-input" />
                  <span className="mph-toggle-track">
                    <span className="mph-toggle-knob" />
                  </span>
                  <span className="mph-toggle-text">
                    <span className="mph-toggle-title">Deep Sky Conditions Alert</span>
                    <span className="mph-toggle-desc">Dispatched at 0% cloud cover &amp; low zenith light</span>
                  </span>
                </label>
              </div>
              <div className="mph-almanac-side">
                <span className="mph-coords">
                  <span className="mph-coords-icon">◎</span>
                  35.6762° N · Kyoto Station
                </span>
                <button type="button" className="mph-almanac-btn">
                  <span>Celestial Almanac (PDF)</span>
                  <span className="mph-almanac-icon">↓</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ════════════════ FOOTER ════════════════════════════════════════════ */}
      <footer className="mph-footer">
        <span className="mph-footer-copy">
          © 2025 Aggarly by Lona. All rights reserved. &nbsp;·&nbsp; Celestial Architectural Solitude
        </span>
        <div className="mph-footer-links">
          <Link href="/privacy" className="mph-footer-link">Privacy</Link>
          <Link href="/terms" className="mph-footer-link">Terms</Link>
          <Link href="/support" className="mph-footer-link">Support</Link>
          <Link href="/auth" className="mph-footer-link">Astrological Almanac</Link>
        </div>
      </footer>
    </div>
  );
};