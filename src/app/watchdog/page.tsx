"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { WatchdogClient, WatchdogAlert } from "@/lib/watchdogClient";




export default function WatchdogPage() {
  const [watchdogs, setWatchdogs] = useState<WatchdogAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [formSanctuary, setFormSanctuary] = useState("Casa Cala Salada (Ibiza)");
  const [formWindow, setFormWindow] = useState("Next New Moon Apex (Oct 2026)");
  const [formTargetPrice, setFormTargetPrice] = useState("650");
  const [formSolsticeTrigger, setFormSolsticeTrigger] = useState(true);
  const [formChannel, setFormChannel] = useState("SMS & Push");

  useEffect(() => {
    setLoading(true);
    WatchdogClient.getWatchdogs()
      .then((items) => {
        if (items) setWatchdogs(items);
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    startTransition(async () => {
      await WatchdogClient.toggleWatchdog(id, nextStatus === "ACTIVE");
      setWatchdogs((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: nextStatus as any } : w))
      );
      showToast(`Watchdog monitor ${nextStatus === "ACTIVE" ? "resumed" : "paused"}.`);
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      await WatchdogClient.deleteWatchdog(id);
      setWatchdogs((prev) => prev.filter((w) => w.id !== id));
      showToast("Watchdog telemetry sensor decommissioned.");
    });
  };

  const handleCreateWatchdog = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload: Partial<WatchdogAlert> = {
        sanctuaryTitle: formSanctuary.split(" (")[0],
        targetDates: formWindow,
        targetPrice: Number(formTargetPrice),
        solsticeTrigger: formSolsticeTrigger,
        notificationsChannel: formChannel,
        status: "ACTIVE",
      };
      const created = await WatchdogClient.createWatchdog(payload as WatchdogAlert);
      if (created) {
        showToast(`Autonomous radar deployed for ${payload.sanctuaryTitle}.`);
        const items = await WatchdogClient.getWatchdogs();
        if (items) setWatchdogs(items);
      }
    });
  };

  const activeCount = watchdogs.filter((w) => w.status === "ACTIVE").length;
  const triggeredCount = watchdogs.filter((w) => w.status === "TRIGGERED").length;

  return (
    <div className="bg-[#EFEEEC] min-h-screen text-[#151415] selection:bg-[#1f1f22] selection:text-[#F5F4F1] flex flex-col justify-between">
      <LonaHeader />

      <main className="w-full pt-20 pb-16 flex flex-col justify-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-14 py-8 md:py-12">
          {/* Floating Obsidian Monolith Shell */}
          <div className="relative bg-gradient-to-b from-[#0A0A0C] to-[#121215] rounded-[28px] shadow-[0_24px_48px_-12px_rgba(10,10,12,0.14),0_4px_16px_rgba(10,10,12,0.06)] p-6 sm:p-10 lg:p-12 overflow-hidden text-[#F5F4F1] border border-[#2A2A2E]/50">
            {/* Ambient Moonlight Directional Cast & Radial Bleed */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-[#DCE6EF]/10 rounded-full blur-[72px] pointer-events-none" />
            <div className="absolute top-24 left-1/4 w-[280px] h-[280px] bg-white/5 rounded-full blur-[90px] pointer-events-none" />

            {/* Top Header Area */}
            <div className="relative z-10 flex flex-col items-center text-center mb-8">
              <div className="relative mb-4 group">
                <div className="absolute inset-0 rounded-full bg-white/20 blur-xl scale-95 transition-transform duration-700 group-hover:scale-105" />
                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-[#1E293B] via-[#475569] to-[#F1F5F9] shadow-[14px_4px_22px_rgba(225,240,255,0.35)] flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined text-5xl md:text-6xl text-white">
                    radar
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9A9A9F] mb-1">
                AUTONOMOUS CELESTIAL TELEMETRY
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-wider text-[#F5F4F1] mb-2 uppercase">
                Watchdog Celestial Alerts
              </h1>
              <p className="font-serif text-sm sm:text-base italic text-[#9A9A9F] max-w-2xl font-light">
                Aggarly by Lona • Automated Price Drops, Starlight Windows &amp; Availability Monitors
              </p>
            </div>

            {/* Summary KPI Banner */}
            <div className="relative z-10 bg-[#18181B]/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border border-[#2A2A2E]">
              <div className="grid grid-cols-3 divide-x divide-[#2A2A2E] gap-4 flex-1">
                <div className="flex flex-col px-2 sm:px-4">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                    Active Watchdogs
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-xl sm:text-2xl font-semibold text-[#F5F4F1]">
                      {activeCount}
                    </span>
                    <span className="text-[10px] uppercase text-[#8FAE97] flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97] animate-pulse" /> Running
                    </span>
                  </div>
                </div>

                <div className="flex flex-col px-2 sm:px-4">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                    Price Drop Triggers
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-xl sm:text-2xl font-semibold text-white">
                      {triggeredCount}
                    </span>
                    <span className="text-[10px] uppercase text-[#9A9A9F]">Fired Alert</span>
                  </div>
                </div>

                <div className="flex flex-col px-2 sm:px-4">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                    Monitored Nights
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-xl sm:text-2xl font-semibold text-[#F5F4F1]">
                      28
                    </span>
                    <span className="text-[10px] uppercase text-[#9A9A9F]">Nocturnal Dates</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => document.getElementById("radar-form")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full md:w-auto h-[46px] px-7 rounded-full bg-[#F7F6F4] text-[#0A0A0C] hover:bg-[#EFEEEC] transition-all duration-300 flex items-center justify-center gap-2 group shadow-sm text-xs font-semibold uppercase tracking-[0.12em]"
                >
                  <span>+ CONFIGURE NEW WATCHDOG</span>
                  <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:translate-x-1">
                    north_east
                  </span>
                </button>
              </div>
            </div>

            {/* Main Dual-Column Composition (8 cols / 4 cols) */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Column 1: ACTIVE MONITORS (8 of 12 cols) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2E]/50">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#F5F4F1]">
                    Deployed Watchdog Radars ({watchdogs.length})
                  </span>
                  <span className="font-mono text-[11px] text-[#9A9A9F]">
                    AUTONOMOUS SCAN CYCLE: EVERY 15 MIN
                  </span>
                </div>

                <div className="space-y-4">
                  {watchdogs.map((w) => {
                    const isTriggered = w.status === "TRIGGERED";
                    const isPaused = w.status === "PAUSED";
                    return (
                      <div
                        key={w.id}
                        className={`rounded-2xl p-5 sm:p-6 transition-all duration-300 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 ${
                          isTriggered
                            ? "bg-[#18181B] border-[#8FAE97]/50 shadow-lg shadow-[#8FAE97]/5"
                            : isPaused
                            ? "bg-[#161619]/60 border-[#2A2A2E]/40 opacity-70"
                            : "bg-[#1b1b1e] border-[#2A2A2E]/60 hover:border-[#353438]"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={w.imageUrl}
                            alt={w.sanctuaryTitle}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover grayscale flex-shrink-0 border border-[#2A2A2E]"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                                {w.sanctuaryLocation}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f1f22] text-[#c3c7cc] border border-[#2A2A2E]">
                                {w.bortleRating}
                              </span>
                              {isTriggered && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8FAE97]/15 text-[#8FAE97] font-semibold uppercase flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97] animate-pulse" />
                                  Target Hit
                                </span>
                              )}
                            </div>

                            <h3 className="font-serif text-lg text-[#F5F4F1]">{w.sanctuaryTitle}</h3>
                            <p className="font-mono text-xs text-[#9A9A9F]">{w.targetDates}</p>

                            <div className="flex items-center gap-3 pt-2 text-xs font-mono">
                              <span className="text-[#9A9A9F] line-through">€{w.originalPrice}/n</span>
                              <span className="text-[#8FAE97] font-semibold">Target: €{w.targetPrice}/n</span>
                              <span className="text-white font-semibold">Current: €{w.currentPrice}/n</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Controls */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[#2A2A2E]/40">
                          {isTriggered ? (
                            <Link
                              href="/stays"
                              className="px-5 py-2 rounded-full bg-[#8FAE97] text-[#0A0A0C] hover:bg-[#a0beaa] text-xs font-semibold uppercase tracking-widest transition-all font-mono"
                            >
                              Lock Rate (€{w.currentPrice})
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(w.id, w.status)}
                              className={`px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition-colors ${
                                isPaused
                                  ? "bg-[#2a2a2d] text-[#F5F4F1] border-white/20"
                                  : "bg-[#18181B] text-[#9A9A9F] border-[#2A2A2E] hover:text-white"
                              }`}
                            >
                              {isPaused ? "Resume Watch" : "Pause Radar"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(w.id)}
                            className="text-[11px] text-[#9A9A9F] hover:text-[#ffb4ab] uppercase tracking-wider transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: CONFIGURE AUTONOMOUS RADAR (4 of 12 cols) */}
              <div
                id="radar-form"
                className="lg:col-span-4 rounded-2xl bg-[#18181B] border border-[#2A2A2E] p-6 space-y-6"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F] block">
                    TELEMETRY SETUP
                  </span>
                  <h3 className="font-serif text-xl uppercase tracking-wider text-[#F5F4F1] mt-0.5">
                    Deploy Watchdog
                  </h3>
                  <p className="text-xs text-[#9A9A9F] mt-1">
                    Set continuous price scanning for dark-sky dates and solstice windows.
                  </p>
                </div>

                <form onSubmit={handleCreateWatchdog} className="space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F] block mb-1">
                      Sanctuary Selection
                    </label>
                    <select
                      value={formSanctuary}
                      onChange={(e) => setFormSanctuary(e.target.value)}
                      className="w-full bg-[#1b1b1e] border border-[#2A2A2E] rounded-xl px-3 py-2.5 text-[#F5F4F1] focus:outline-none focus:border-white/40"
                    >
                      <option value="Casa Cala Salada (Ibiza)">Casa Cala Salada (Ibiza)</option>
                      <option value="Torre del Silenci (Formentera)">Torre del Silenci (Formentera)</option>
                      <option value="Finca Sa Rota (Mallorca)">Finca Sa Rota (Mallorca)</option>
                      <option value="Quinta da Lua Nova (Sintra)">Quinta da Lua Nova (Sintra)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F] block mb-1">
                      Target Celestial Window
                    </label>
                    <select
                      value={formWindow}
                      onChange={(e) => setFormWindow(e.target.value)}
                      className="w-full bg-[#1b1b1e] border border-[#2A2A2E] rounded-xl px-3 py-2.5 text-[#F5F4F1] focus:outline-none focus:border-white/40"
                    >
                      <option value="Next New Moon Apex (Oct 2026)">Next New Moon Apex (Oct 2026)</option>
                      <option value="Perseid Meteor Corridor (Nov 2026)">Perseid Meteor Corridor (Nov 2026)</option>
                      <option value="Winter Solstice Zenith (Dec 2026)">Winter Solstice Zenith (Dec 2026)</option>
                      <option value="Any Solitary Weekend (<Bortle 2.0)">Any Solitary Weekend (&lt;Bortle 2.0)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                        Target Nightly Ceiling (€)
                      </label>
                      <span className="font-mono text-white font-semibold">€{formTargetPrice}/night</span>
                    </div>
                    <input
                      type="range"
                      min="350"
                      max="1200"
                      step="25"
                      value={formTargetPrice}
                      onChange={(e) => setFormTargetPrice(e.target.value)}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F] block mb-1">
                      Dispatch Notification Channel
                    </label>
                    <select
                      value={formChannel}
                      onChange={(e) => setFormChannel(e.target.value)}
                      className="w-full bg-[#1b1b1e] border border-[#2A2A2E] rounded-xl px-3 py-2.5 text-[#F5F4F1] focus:outline-none focus:border-white/40"
                    >
                      <option value="SMS & Push">SMS Critical & Push Alert</option>
                      <option value="Email & SMS">Email Dossier & SMS</option>
                      <option value="Push Alert">Silent In-App Push Only</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-[#1b1b1e] border border-[#2A2A2E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formSolsticeTrigger}
                      onChange={(e) => setFormSolsticeTrigger(e.target.checked)}
                      className="rounded bg-[#2a2a2d] border-[#353438] text-white focus:ring-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-[#F5F4F1]">Dark-Sky Solstice Override</span>
                      <span className="text-[10px] text-[#9A9A9F]">Auto-alert if Bortle rating drops below 1.9</span>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-3 rounded-full bg-[#F7F6F4] text-[#0A0A0C] hover:bg-[#EFEEEC] font-semibold uppercase tracking-widest transition-all font-mono text-xs shadow-md mt-2"
                  >
                    Deploy Radar Sensor
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-[#18181B] border border-[#2A2A2E] text-white shadow-2xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <LonaFooter />
    </div>
  );
}
