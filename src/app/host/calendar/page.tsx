"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { HostClient } from "@/lib/hostClient";

interface SanctuaryCalendarRow {
  id: string;
  title: string;
  code: string;
  baseRate: number;
  slots: {
    period: string;
    phase: string;
    rate: number;
    status: "AVAILABLE" | "BOOKED" | "TURNOVER" | "BLOCKED" | "SELECTED";
    guestOrReason?: string;
    refCode?: string;
  }[];
}

export default function HostCalendarPage() {
  const [calendarRows, setCalendarRows] = useState<SanctuaryCalendarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [lumenYieldActive, setLumenYieldActive] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedSpan, setSelectedSpan] = useState<{
    propertyId: string;
    title: string;
    sanctuary: string;
    rate: number;
    phase: string;
    surgeMultiplier: number;
    startDate?: string;
    endDate?: string;
  } | null>(null);
  const [customRate, setCustomRate] = useState(790);
  const [minNights, setMinNights] = useState(3);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getMonthRange = (offset: number) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + offset;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { from: fmt(start), to: fmt(end), label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  };

  const loadCalendar = async (ids: string[], offset: number) => {
    const { from, to } = getMonthRange(offset);
    const multiCal = await HostClient.getMultiSanctuaryCalendar(ids, from, to);
    if (multiCal && multiCal.properties && multiCal.properties.length > 0) {
      const mappedRows: SanctuaryCalendarRow[] = multiCal.properties.map((grid) => {
        const matchingProp = ids ? properties.find((p) => p.id === grid.propertyId) : null;
        const baseRate = matchingProp?.basePricePerNight || 500;
        const title = grid.title || matchingProp?.title || "Sanctuary";
        const code = title.slice(0, 3).toUpperCase();
        const slots = (grid.days || []).slice(0, 6).map((day: any, idx: number) => {
          const dateObj = new Date(day.date);
          const period = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const phase = day.moonPhaseName || (day.moonIlluminationPercentage > 80 ? "SUPERMOON" : day.moonIlluminationPercentage < 20 ? "NEW MOON" : "CRESCENT");
          const rate = Number(day.price) || baseRate;
          const status = day.available ? (idx === 0 ? "SELECTED" : "AVAILABLE") : "BOOKED";
          return {
            period, phase, rate,
            status: status as any,
            guestOrReason: day.available ? undefined : "Confirmed Resident",
            refCode: day.available ? undefined : `#AG-${grid.propertyId.slice(0, 4).toUpperCase()}`,
            date: day.date,
          };
        });
        return { id: grid.propertyId, title, code, baseRate, slots };
      });
      setCalendarRows(mappedRows);
      if (mappedRows[0]?.slots[0]) {
        setSelectedSpan({
          propertyId: mappedRows[0].id,
          title: mappedRows[0].slots[0].period,
          sanctuary: mappedRows[0].title,
          rate: mappedRows[0].slots[0].rate,
          phase: mappedRows[0].slots[0].phase,
          surgeMultiplier: 1.18,
          startDate: (mappedRows[0].slots[0] as any).date,
        });
        setCustomRate(mappedRows[0].slots[0].rate);
      }
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const propsRes = await HostClient.getMyProperties(0, 50);
        const propItems = propsRes?.items || [];
        setProperties(propItems);
        if (propItems.length > 0) {
          const ids = propItems.map((p) => p.id);
          await loadCalendar(ids, 0);
        }
      } catch (err) {
        console.error("Failed to load host calendar", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (properties.length === 0) return;
    const ids = properties.map((p) => p.id);
    startTransition(async () => {
      await loadCalendar(ids, monthOffset);
    });
  }, [monthOffset]);

  const handleToggleLumenYield = () => {
    const nextState = !lumenYieldActive;
    setLumenYieldActive(nextState);
    startTransition(async () => {
      await HostClient.toggleLumenYield({ enabled: nextState });
      showToast(nextState ? "Lumen celestial surge (+18%) activated" : "Lumen celestial surge deactivated");
    });
  };

  const handleApplySurge = () => {
    const targetPropId = selectedSpan?.propertyId || properties[0]?.id;
    if (!targetPropId) return;
    startTransition(async () => {
      await HostClient.createPricingRule(targetPropId, {
        type: "SURGE",
        adjustmentValue: customRate,
        thresholdValue: minNights,
      });
      showToast(`Dynamic celestial rate of €${customRate}/night saved`);
    });
  };

  const handleBlockSelectedSpan = () => {
    const targetPropId = selectedSpan?.propertyId || properties[0]?.id;
    if (!targetPropId) return;
    startTransition(async () => {
      const start = selectedSpan?.startDate || new Date().toISOString().slice(0, 10);
      const end = selectedSpan?.endDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      await HostClient.blockDates(targetPropId, {
        startDate: start,
        endDate: end,
        reason: "HOST_BLOCKED",
      });
      setCalendarRows((prev) =>
        prev.map((row) =>
          row.id === targetPropId
            ? {
                ...row,
                slots: row.slots.map((s) =>
                  s.period === selectedSpan?.title
                    ? { ...s, status: "BLOCKED", guestOrReason: "Host Blocked" }
                    : s
                ),
              }
            : row
        )
      );
      showToast("Selected calendar dates blocked from public booking");
    });
  };

  return (
    <div className="bg-canvas-outer min-h-screen flex flex-col justify-between text-text-on-light-primary selection:bg-surface-container selection:text-text-on-dark-primary">
      <LonaHeader />

      <main className="w-full pt-20 bg-canvas-outer min-h-[calc(100vh-80px)] flex flex-col justify-center">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-8 right-8 z-50 transition-all duration-300">
            <div className="px-5 py-3 rounded-full bg-text-on-dark-primary text-obsidian-base font-label-caps-sm uppercase tracking-widest shadow-2xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-state-success">check_circle</span>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col w-full py-space-xl px-card-margin-mobile lg:px-card-margin-desktop items-center">
          {/* Main Obsidian Frame */}
          <div className="relative w-full max-w-7xl rounded-[28px] bg-gradient-to-b from-obsidian-base via-[#0E0E12] to-[#121215] text-text-on-dark-primary shadow-2xl border border-hairline-on-dark p-card-padding-mobile lg:p-card-padding-desktop overflow-hidden">
            {/* Atmospheric Lunar Glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[260px] bg-[#DCE6EF]/10 rounded-full blur-3xl" />

            {/* Header Section */}
            <div className="relative flex flex-col md:flex-row md:items-end justify-between pb-space-xl gap-space-lg">
              <div className="flex items-start gap-space-md">
                {/* Photoreal Moon Phase Indicator */}
                <div className="relative flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-tr from-obsidian-base via-surface-container-high to-surface-bright shadow-[14px_4px_24px_rgba(225,240,255,0.25)] border border-hairline-on-dark flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_35%,#F5F4F1_0%,#A3A8B0_45%,#1E1F24_78%,#0A0A0C_100%)] opacity-95" />
                  <span className="material-symbols-outlined text-[#F5F4F1] text-[20px] z-10 opacity-90">
                    nightlight
                  </span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse" />
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                      Astrological Sync Engine • Live Telemetry
                    </span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg tracking-[0.12em] text-text-on-dark-primary font-normal uppercase leading-tight">
                    Multi-Sanctuary Calendar &amp; Celestial Pricing
                  </h1>
                  <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary text-sm sm:text-base mt-1">
                    Aggarly by Lona • Unified Timeline, Availability Blocks &amp; Dynamic Yield Engine
                  </p>
                </div>
              </div>

              {/* Lumen Dynamic Yield Toggle */}
              <div className="flex items-center gap-space-sm bg-obsidian-elevated border border-hairline-on-dark px-space-md py-2.5 rounded-full self-start md:self-auto shadow-inner">
                <div className="flex flex-col text-right">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider text-text-on-dark-primary">
                    Lumen Yield Automation
                  </span>
                  <span className="font-data-tabular text-[11px] text-state-success uppercase tracking-wider">
                    {lumenYieldActive ? "Lunar Surge (+18%) Active" : "Dynamic Override Paused"}
                  </span>
                </div>
                <button
                  onClick={handleToggleLumenYield}
                  aria-label="Toggle Lumen Yield Automation"
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
                    lumenYieldActive ? "bg-state-success" : "bg-obsidian-bubble"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-obsidian-base rounded-full shadow-sm transition-transform duration-300 ${
                      lumenYieldActive ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Command & Control Bar */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md my-space-lg p-space-md bg-surface-container-lowest/80 border border-hairline-on-dark backdrop-blur-sm rounded-xl">
              <div className="flex flex-wrap items-center gap-space-xs sm:gap-space-sm">
                <div className="flex items-center bg-obsidian-elevated border border-hairline-on-dark rounded-full p-0.5">
                  <button
                    onClick={() => showToast("Navigated to preceding astronomical cycle")}
                    className="p-2 text-text-on-dark-secondary hover:text-text-on-dark-primary transition-colors flex items-center justify-center rounded-full hover:bg-surface-container-high"
                    title="Previous Lunar Span"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="px-space-md font-label-caps-md text-label-caps-md uppercase tracking-wider text-text-on-dark-primary select-none whitespace-nowrap">
                    September – October 2026
                  </span>
                  <button
                    onClick={() => showToast("Navigated to next astronomical cycle")}
                    className="p-2 text-text-on-dark-secondary hover:text-text-on-dark-primary transition-colors flex items-center justify-center rounded-full hover:bg-surface-container-high"
                    title="Next Lunar Span"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
                <button
                  onClick={() => showToast("Centered calendar on current moon date")}
                  className="px-space-md py-2 bg-obsidian-elevated hover:bg-surface-container-high border border-hairline-on-dark rounded-full font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary hover:text-text-on-dark-primary uppercase tracking-widest transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-space-xs sm:gap-space-sm">
                <button
                  onClick={() => showToast("Filtering by portfolio")}
                  className="flex items-center gap-space-xs px-space-md py-2 bg-obsidian-elevated hover:bg-surface-container-high border border-hairline-on-dark rounded-full font-label-caps-sm text-label-caps-sm text-text-on-dark-primary uppercase tracking-widest transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-secondary-fixed" />
                  <span>All Sanctuaries ({properties.length})</span>
                  <span className="material-symbols-outlined text-[16px] text-text-on-dark-secondary">
                    expand_more
                  </span>
                </button>
                <div className="h-6 w-px bg-hairline-on-dark hidden sm:block" />
                <button
                  onClick={handleBlockSelectedSpan}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-space-md py-2 bg-obsidian-elevated hover:bg-surface-container-high border border-hairline-on-dark rounded-full font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary hover:text-text-on-dark-primary uppercase tracking-widest transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span>Block Dates</span>
                </button>
                <button
                  onClick={() => {
                    setCustomRate(Math.round(customRate * 1.15));
                    showToast("Adjusted surge rate threshold (+15%)");
                  }}
                  className="flex items-center gap-1.5 px-space-md py-2 bg-obsidian-elevated hover:bg-surface-container-high border border-hairline-on-dark rounded-full font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary hover:text-text-on-dark-primary uppercase tracking-widest transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  <span>Set Surge Rate</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
              <div className="xl:col-span-8 flex flex-col gap-space-md bg-surface-container-lowest/60 border border-hairline-on-dark rounded-2xl p-space-md sm:p-space-lg overflow-x-auto">
                <div className="min-w-[820px] grid grid-cols-12 gap-2 text-text-on-dark-secondary pb-space-sm border-b border-hairline-on-dark/40">
                  <div className="col-span-3 font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                    Sanctuary Portfolio
                  </div>
                  <div className="col-span-9 grid grid-cols-6 gap-2 text-center">
                    <div className="flex flex-col items-center bg-obsidian-elevated/40 border border-hairline-on-dark/30 py-1.5 rounded-lg">
                      <span className="font-data-tabular text-[11px] text-text-on-dark-secondary">CYCLE I</span>
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary/70">NEW MOON</span>
                    </div>
                    <div className="flex flex-col items-center bg-obsidian-elevated/40 border border-hairline-on-dark/30 py-1.5 rounded-lg">
                      <span className="font-data-tabular text-[11px] text-text-on-dark-secondary">CYCLE II</span>
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary/70">CRESCENT</span>
                    </div>
                    <div className="flex flex-col items-center bg-obsidian-elevated/40 border border-hairline-on-dark/30 py-1.5 rounded-lg">
                      <span className="font-data-tabular text-[11px] text-text-on-dark-secondary">CYCLE III</span>
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary/70">EQUINOX</span>
                    </div>
                    <div className="flex flex-col items-center bg-obsidian-elevated/90 border border-text-on-dark-primary/40 py-1.5 rounded-lg shadow-sm">
                      <span className="font-data-tabular text-[11px] text-primary font-semibold">CYCLE IV</span>
                      <span className="font-label-caps-sm text-[10px] text-[#C9CDD2]">GIBBOUS</span>
                    </div>
                    <div className="flex flex-col items-center bg-obsidian-elevated/40 border border-hairline-on-dark/30 py-1.5 rounded-lg">
                      <span className="font-data-tabular text-[11px] text-text-on-dark-secondary">CYCLE V</span>
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary/70">SUPERMOON</span>
                    </div>
                    <div className="flex flex-col items-center bg-obsidian-elevated/40 border border-hairline-on-dark/30 py-1.5 rounded-lg">
                      <span className="font-data-tabular text-[11px] text-text-on-dark-secondary">CYCLE VI</span>
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary/70">WANING</span>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest text-xs">
                      Loading portfolio availability...
                    </span>
                  </div>
                ) : calendarRows.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center p-8 border border-hairline-on-dark/40 rounded-xl bg-obsidian-elevated/40">
                    <span className="material-symbols-outlined text-[40px] text-text-on-dark-secondary mb-3">calendar_today</span>
                    <h3 className="font-headline-md text-text-on-dark-primary uppercase tracking-wider mb-2">
                      No Sanctuaries Available
                    </h3>
                    <p className="font-body-md text-text-on-dark-secondary max-w-md mb-5 text-sm">
                      You have not registered any sanctuaries yet. Add a sanctuary listing to begin managing calendar timelines and celestial rates.
                    </p>
                    <Link
                      href="/host/properties/new"
                      className="px-5 py-2 rounded-full bg-primary text-obsidian-base font-label-caps-sm uppercase tracking-widest font-semibold hover:bg-canvas-outer transition-colors text-xs"
                    >
                      Register New Sanctuary
                    </Link>
                  </div>
                ) : (
                  calendarRows.map((row) => (
                    <div
                      key={row.id}
                      className="min-w-[820px] bg-obsidian-elevated/80 border border-hairline-on-dark rounded-xl p-space-md flex flex-col gap-space-sm hover:bg-obsidian-elevated transition-colors"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3 flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-label-caps-md text-label-caps-md text-text-on-dark-primary tracking-wider">
                              {row.title}
                            </span>
                            <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary px-1.5 py-0.5 rounded bg-surface-container">
                              {row.code}
                            </span>
                          </div>
                          <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary mt-0.5">
                            Base: €{row.baseRate} / night
                          </span>
                        </div>

                        <div className="col-span-9 grid grid-cols-6 gap-2 items-stretch h-14">
                          {row.slots.map((slot, sIdx) => {
                            if (slot.status === "BOOKED") {
                              return (
                                <div
                                  key={sIdx}
                                  className="bg-surface-container-high/90 border border-state-success/30 flex flex-col justify-center px-2 py-1 rounded-lg relative overflow-hidden shadow-sm"
                                  title={`Booked by ${slot.guestOrReason}`}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px] text-state-success">
                                      stars
                                    </span>
                                    <span className="font-label-caps-sm text-[10px] text-text-on-dark-primary font-semibold tracking-wider truncate">
                                      BOOKED
                                    </span>
                                  </div>
                                  <span className="font-data-tabular text-[11px] text-text-on-dark-secondary truncate">
                                    {slot.guestOrReason}
                                  </span>
                                  <span className="font-label-caps-sm text-[9px] text-[#A3A8B0] uppercase tracking-tighter">
                                    {slot.refCode}
                                  </span>
                                </div>
                              );
                            }

                            if (slot.status === "TURNOVER") {
                              return (
                                <div
                                  key={sIdx}
                                  className="relative flex flex-col justify-center items-center rounded-lg overflow-hidden bg-surface-container-highest/60 border border-hairline-on-dark text-center p-1"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-text-on-dark-secondary z-10">
                                    cleaning_services
                                  </span>
                                  <span className="font-label-caps-sm text-[9px] text-text-on-dark-secondary uppercase tracking-widest z-10 leading-tight">
                                    Turnover
                                  </span>
                                </div>
                              );
                            }

                            if (slot.status === "BLOCKED") {
                              return (
                                <div
                                  key={sIdx}
                                  className="bg-obsidian-base/90 border border-hairline-on-dark flex flex-col justify-center items-center rounded-lg p-1 text-center"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-state-error">lock</span>
                                  <span className="font-label-caps-sm text-[9px] text-text-on-dark-secondary uppercase truncate">
                                    Blocked
                                  </span>
                                </div>
                              );
                            }

                            if (slot.status === "SELECTED") {
                              return (
                                <div
                                  key={sIdx}
                                  onClick={() => {
                                    setSelectedSpan({
                                      propertyId: row.id,
                                      title: slot.period,
                                      sanctuary: row.title,
                                      rate: slot.rate,
                                      phase: slot.phase,
                                      surgeMultiplier: 1.18,
                                      startDate: (slot as any).date,
                                    });
                                    setCustomRate(slot.rate);
                                  }}
                                  className="bg-surface-container-high border-2 border-text-on-dark-primary flex flex-col justify-center items-center rounded-lg p-1 transition-all cursor-pointer relative shadow-[0_0_16px_rgba(255,255,255,0.06)]"
                                >
                                  <span className="font-data-tabular text-data-tabular text-primary font-semibold">
                                    €{slot.rate}
                                  </span>
                                  <span className="font-label-caps-sm text-[10px] text-secondary-fixed uppercase tracking-widest font-medium">
                                    Selected
                                  </span>
                                  <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-primary text-obsidian-base rounded-full flex items-center justify-center text-[10px] font-bold">
                                    ✓
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={sIdx}
                                onClick={() => {
                                  setSelectedSpan({
                                    propertyId: row.id,
                                    title: slot.period,
                                    sanctuary: row.title,
                                    rate: slot.rate,
                                    phase: slot.phase,
                                    surgeMultiplier: 1.1,
                                    startDate: (slot as any).date,
                                  });
                                  setCustomRate(slot.rate);
                                }}
                                className="bg-surface-container-low hover:bg-surface-container border border-hairline-on-dark/30 flex flex-col justify-center items-center rounded-lg p-1 transition-all cursor-pointer group"
                              >
                                <span className="font-data-tabular text-data-tabular text-state-success font-medium">
                                  €{slot.rate}
                                </span>
                                <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase tracking-widest group-hover:text-text-on-dark-primary">
                                  Available
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Inspector & Pricing Workbench (4 cols) */}
              <div className="xl:col-span-4 flex flex-col gap-space-md">
                <div className="rounded-2xl bg-obsidian-elevated border border-hairline-on-dark p-space-lg flex flex-col gap-space-md shadow-xl">
                  <div className="flex items-center justify-between pb-space-sm border-b border-hairline-on-dark">
                    <div className="flex flex-col">
                      <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                        Timeline Inspector
                      </span>
                      <h3 className="font-headline-md text-headline-md text-text-on-dark-primary mt-0.5">
                        Celestial Yield Workbench
                      </h3>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
                  </div>

                  {/* Selected Window Summary */}
                  <div className="space-y-3 bg-obsidian-base/60 border border-hairline-on-dark/40 p-4 rounded-xl">
                    <div className="flex justify-between items-baseline">
                      <span className="font-label-caps-sm text-text-on-dark-secondary uppercase">
                        Active Selection
                      </span>
                      <span className="font-data-tabular text-primary font-medium">
                        {selectedSpan?.title ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="font-label-caps-sm text-text-on-dark-secondary uppercase">
                        Sanctuary
                      </span>
                      <span className="font-data-tabular text-text-on-dark-primary">
                        {selectedSpan?.sanctuary ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="font-label-caps-sm text-text-on-dark-secondary uppercase">
                        Astrological State
                      </span>
                      <span className="font-data-tabular text-secondary text-xs">
                        {selectedSpan?.phase ?? "—"}
                      </span>
                    </div>
                  </div>

                  {/* Rate Tuning Form */}
                  <div className="space-y-4 pt-1">
                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary mb-1">
                        Nightly Rate Allocation (€)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          value={customRate}
                          onChange={(e) => setCustomRate(Number(e.target.value))}
                          className="w-full h-11 bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular focus:outline-none border-b border-hairline-on-dark focus:border-text-on-dark-primary"
                        />
                        <span className="absolute right-0 font-data-tabular text-text-on-dark-secondary text-xs">
                          EUR / NIGHT
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary mb-1">
                        Minimum Stay Constraint
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          value={minNights}
                          onChange={(e) => setMinNights(Number(e.target.value))}
                          className="w-full h-11 bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular focus:outline-none border-b border-hairline-on-dark focus:border-text-on-dark-primary"
                        />
                        <span className="absolute right-0 font-data-tabular text-text-on-dark-secondary text-xs">
                          MOONS COMMITMENT
                        </span>
                      </div>
                    </div>

                    {/* Lumen Yield Recommendation Pill */}
                    <div className="p-3.5 rounded-xl bg-obsidian-bubble/90 border border-hairline-on-dark/70 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-label-caps-sm text-text-on-dark-secondary uppercase">
                          Lumen AI Guidance
                        </span>
                        <span className="font-data-tabular text-state-success font-semibold">+18% Recommended</span>
                      </div>
                      <p className="font-body-sm text-xs text-text-on-dark-secondary leading-relaxed">
                        High celestial demand detected during the Supermoon window. Occupancy velocity supports elevating rate to €820.
                      </p>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={handleApplySurge}
                        disabled={isPending}
                        className="w-full h-[46px] rounded-full bg-primary text-obsidian-base font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] hover:bg-canvas-outer transition-colors font-semibold shadow-md"
                      >
                        Apply Celestial Rate
                      </button>
                      <button
                        onClick={handleBlockSelectedSpan}
                        disabled={isPending}
                        className="w-full h-10 rounded-full bg-obsidian-base hover:bg-state-error/10 hover:text-state-error border border-hairline-on-dark font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary transition-colors"
                      >
                        Block This Span
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LonaFooter />
    </div>
  );
}
