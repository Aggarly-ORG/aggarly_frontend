"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { HostClient, TurnoverTaskDetailDto } from "@/lib/hostClient";

export default function HostTurnoverPage() {
  const [tasks, setTasks] = useState<TurnoverTaskDetailDto[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "completed" | "maintenance">("today");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dispatch modal form state
  const [selectedSanctuaryId, setSelectedSanctuaryId] = useState("");
  const [selectedTaskType, setSelectedTaskType] = useState("DEEP_CLEAN");
  const [dispatchPriority, setDispatchPriority] = useState("HIGH");
  const [dispatchNotes, setDispatchNotes] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [remoteTasks, propsRes] = await Promise.all([
          HostClient.getAllTurnoverTasks(),
          HostClient.getMyProperties(0, 50),
        ]);
        if (remoteTasks) {
          setTasks(remoteTasks);
        }
        const propItems = propsRes?.items || [];
        setProperties(propItems);
        if (propItems.length > 0 && !selectedSanctuaryId) {
          setSelectedSanctuaryId(propItems[0].id);
        }
      } catch (err) {
        console.error("Turnover tasks fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateStatus = (taskId: string, nextStatus: "COMPLETED" | "IN_PROGRESS") => {
    startTransition(async () => {
      await HostClient.updateTurnoverTaskStatus(taskId, nextStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
      showToast(`Workorder status updated to ${nextStatus}`);
    });
  };

  const handleDispatchInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const propId = selectedSanctuaryId || properties[0]?.id;
    if (!propId) {
      showToast("Please select a valid sanctuary");
      return;
    }
    const propTitle = properties.find((p) => p.id === propId)?.title || "Sanctuary";

    startTransition(async () => {
      const res = await HostClient.dispatchTurnoverInspection({
        sanctuaryId: propId,
        taskType: selectedTaskType,
        notes: dispatchNotes,
        priority: dispatchPriority,
      });

      if (res) {
        setTasks((prev) => [res, ...prev]);
      }
      setIsModalOpen(false);
      setDispatchNotes("");
      showToast(`Dispatched ${selectedTaskType} for ${propTitle}`);
    });
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "today") return t.status === "IN_PROGRESS" || t.status === "SCHEDULED";
    if (activeTab === "completed") return t.status === "COMPLETED";
    if (activeTab === "maintenance") return t.status === "FLAGGED" || t.taskType === "MAINTENANCE";
    return true;
  });

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
          {/* Monolithic Obsidian Container */}
          <div className="relative w-full max-w-7xl rounded-[28px] bg-gradient-to-b from-[#0A0A0C] via-[#0E0E12] to-[#121215] text-text-on-dark-primary shadow-2xl border border-hairline-on-dark overflow-hidden p-6 sm:p-10 lg:p-card-padding-desktop">
            {/* Lunar Ambient Glow */}
            <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[#DCE6EF]/10 blur-[90px] pointer-events-none" />
            <div className="absolute top-1/4 right-0 w-[480px] h-[480px] rounded-full bg-[#78AAEB]/5 blur-[120px] pointer-events-none" />

            {/* Hub Header */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10">
              <div className="flex items-start gap-6">
                <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0e0e12] border border-hairline-on-dark flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#1A1A1F] via-[#353438] to-[#E3E2E0] opacity-90 shadow-[0_0_24px_rgba(220,230,239,0.35)]" />
                  <span className="material-symbols-outlined text-text-on-dark-primary text-[28px] z-10">
                    cleaning_services
                  </span>
                  <div className="absolute -bottom-1 px-2 py-0.5 rounded-full bg-[#18181B] text-[9px] font-data-tabular tracking-widest text-[#C9CDD2] uppercase">
                    91.4%
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse" />
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                      REAL-TIME SANCTUARY TELEMETRY
                    </span>
                    <span className="text-text-on-dark-secondary/40 text-xs">/</span>
                    <span className="font-data-tabular text-xs text-text-on-dark-secondary">
                      ZONE BALEARICS (UTC+2)
                    </span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-text-on-dark-primary uppercase tracking-[0.14em]">
                    TURNOVER &amp; SANCTUARY OPERATIONS
                  </h1>
                  <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary mt-1">
                    Aggarly by Lona • Automated Turnovers, Acoustic Inspections &amp; Staff Logistics
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="relative group inline-flex items-center gap-3 px-7 h-[46px] rounded-full bg-[#F7F6F4] hover:bg-[#EFEEEC] text-obsidian-base transition-all duration-200 font-semibold shadow-md"
                >
                  <span className="material-symbols-outlined text-lg leading-none">add_circle</span>
                  <span className="font-label-caps-md text-label-caps-md uppercase tracking-[0.14em]">
                    DISPATCH CUSTOM INSPECTION
                  </span>
                  <span className="text-base transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </button>
              </div>
            </div>

            {/* Atmospheric Separator */}
            <div className="w-full h-px bg-[#2A2A2E] mb-10" />

            {/* Top KPI Telemetry Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="p-5 rounded-2xl bg-[#141418] border border-hairline-on-dark relative group">
                <div className="flex items-center justify-between text-text-on-dark-secondary mb-3">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                    Today&apos;s Turnovers
                  </span>
                  <span className="material-symbols-outlined text-base">hotel_class</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-text-on-dark-primary">
                    {tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "SCHEDULED").length}
                  </span>
                  <span className="font-label-caps-sm text-text-on-dark-secondary uppercase">
                    Scheduled Units
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-data-tabular text-state-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-state-success" />
                  <span>1 In Progress • 1 Upcoming</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#141418] border border-hairline-on-dark relative group">
                <div className="flex items-center justify-between text-text-on-dark-secondary mb-3">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                    Avg Turnover Duration
                  </span>
                  <span className="material-symbols-outlined text-base">timelapse</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-text-on-dark-primary">3h 15m</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-data-tabular text-text-on-dark-secondary">
                  <span>−18m vs. seasonal benchmark</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#141418] border border-hairline-on-dark relative group">
                <div className="flex items-center justify-between text-text-on-dark-secondary mb-3">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                    Acoustic Silence Certified
                  </span>
                  <span className="material-symbols-outlined text-base">graphic_eq</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-text-on-dark-primary">100%</span>
                  <span className="font-label-caps-sm text-state-success uppercase font-semibold">
                    Passed
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-data-tabular text-text-on-dark-secondary">
                  <span>Threshold ≤ 18.2 dB(A) nocturnal ambient</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#141418] border border-hairline-on-dark relative group">
                <div className="flex items-center justify-between text-text-on-dark-secondary mb-3">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                    Assigned Crew Members
                  </span>
                  <span className="material-symbols-outlined text-base">groups</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-text-on-dark-primary">6</span>
                  <span className="font-label-caps-sm text-text-on-dark-secondary uppercase">
                    Active Specialists
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-data-tabular text-text-on-dark-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-state-success" />
                  <span>2 squads deployed on site</span>
                </div>
              </div>
            </div>

            {/* Navigation & Segmented Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-hairline-on-dark">
              <div className="inline-flex p-1.5 rounded-full bg-[#18181B] border border-hairline-on-dark self-start">
                <button
                  onClick={() => setActiveTab("today")}
                  className={`px-5 py-2 rounded-full font-label-caps-md text-label-caps-md uppercase tracking-wider transition-all duration-200 ${
                    activeTab === "today"
                      ? "bg-[#F7F6F4] text-obsidian-base font-semibold"
                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                  }`}
                >
                  TODAY (2)
                </button>
                <button
                  onClick={() => setActiveTab("upcoming")}
                  className={`px-5 py-2 rounded-full font-label-caps-md text-label-caps-md uppercase tracking-wider transition-all duration-200 ${
                    activeTab === "upcoming"
                      ? "bg-[#F7F6F4] text-obsidian-base font-semibold"
                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                  }`}
                >
                  UPCOMING 7 DAYS
                </button>
                <button
                  onClick={() => setActiveTab("completed")}
                  className={`px-5 py-2 rounded-full font-label-caps-md text-label-caps-md uppercase tracking-wider transition-all duration-200 ${
                    activeTab === "completed"
                      ? "bg-[#F7F6F4] text-obsidian-base font-semibold"
                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                  }`}
                >
                  COMPLETED LOGS
                </button>
                <button
                  onClick={() => setActiveTab("maintenance")}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-full font-label-caps-md text-label-caps-md uppercase tracking-wider transition-all duration-200 ${
                    activeTab === "maintenance"
                      ? "bg-[#F7F6F4] text-obsidian-base font-semibold"
                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                  }`}
                >
                  <span>MAINTENANCE FLAGS</span>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-state-error/20 text-state-error">
                    1
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-data-tabular text-text-on-dark-secondary">
                <span>Displaying {filteredTasks.length} Operations</span>
              </div>
            </div>

            {/* Tasks Workorders Feed */}
            <div className="space-y-6 pt-6">
              {loading ? (
                <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest text-xs">
                    Loading turnover operations and workorders...
                  </span>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-obsidian-elevated/40 border border-hairline-on-dark">
                  <span className="material-symbols-outlined text-[40px] text-text-on-dark-secondary">
                    cleaning_services
                  </span>
                  <p className="font-headline-md text-base text-text-on-dark-primary uppercase tracking-wider mt-3">
                    No Turnover Operations Scheduled
                  </p>
                  <p className="font-body-sm text-xs text-text-on-dark-secondary max-w-md mx-auto mt-1">
                    Post-checkout cleanings, linen sterilizations, and silence acoustic calibrations will be dispatched automatically upon resident departure.
                  </p>
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-6 rounded-2xl bg-[#141418] border border-hairline-on-dark flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-[#18181E] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-obsidian-base border border-hairline-on-dark flex items-center justify-center shrink-0 mt-0.5">
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            t.status === "IN_PROGRESS"
                              ? "text-primary animate-pulse"
                              : t.status === "FLAGGED"
                              ? "text-state-error"
                              : "text-state-success"
                          }`}
                        >
                          {t.status === "FLAGGED"
                            ? "warning"
                            : t.taskType === "ACOUSTIC_INSPECTION"
                            ? "graphic_eq"
                            : "sanitizer"}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                          <h3 className="font-headline-md text-lg text-text-on-dark-primary">
                            {t.sanctuaryTitle}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full font-label-caps-sm text-[10px] uppercase tracking-widest ${
                              t.status === "IN_PROGRESS"
                                ? "bg-primary/20 text-primary"
                                : t.status === "FLAGGED"
                                ? "bg-state-error/20 text-state-error"
                                : "bg-state-success/20 text-state-success"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <span className="font-label-caps-sm text-xs text-text-on-dark-secondary uppercase tracking-wider mt-0.5">
                          {t.unitCode} • {t.scheduledTime}
                        </span>
                        {t.notes && (
                          <p className="font-body-sm text-xs text-[#C9CDD2] mt-2 italic">
                            &ldquo;{t.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 lg:gap-8 justify-between lg:justify-end">
                      <div className="flex flex-col sm:text-right text-xs font-data-tabular text-text-on-dark-secondary space-y-1">
                        <span>Crew: {t.assignedSpecialists.join(", ")}</span>
                        {t.acousticDbReading && (
                          <span className="text-state-success font-medium">
                            Acoustic Seal: {t.acousticDbReading} dB(A) Certified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {t.status !== "COMPLETED" ? (
                          <button
                            onClick={() => handleUpdateStatus(t.id, "COMPLETED")}
                            disabled={isPending}
                            className="px-5 h-9 rounded-full bg-primary text-obsidian-base font-label-caps-sm uppercase tracking-wider font-semibold hover:bg-canvas-outer transition-colors"
                          >
                            Complete Stage
                          </button>
                        ) : (
                          <span className="font-label-caps-sm text-xs text-state-success uppercase flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                            Certified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Dispatch Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark p-6 text-text-on-dark-primary space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-hairline-on-dark pb-4">
                <div className="flex flex-col">
                  <span className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                    Operational Dispatch
                  </span>
                  <h3 className="font-headline-md text-xl text-text-on-dark-primary mt-1">
                    Custom Inspection Order
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full text-text-on-dark-secondary hover:text-text-on-dark-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleDispatchInspection} className="space-y-4">
                <div className="flex flex-col">
                  <label className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider mb-1">
                    Target Sanctuary
                  </label>
                  <select
                    value={selectedSanctuaryId}
                    onChange={(e) => setSelectedSanctuaryId(e.target.value)}
                    className="w-full h-11 bg-obsidian-base border border-hairline-on-dark rounded-lg px-3 text-body-sm text-text-on-dark-primary focus:outline-none"
                  >
                    {properties.length > 0 ? (
                      properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))
                    ) : (
                      <option value="">No registered sanctuaries found</option>
                    )}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider mb-1">
                    Task Classification
                  </label>
                  <select
                    value={selectedTaskType}
                    onChange={(e) => setSelectedTaskType(e.target.value)}
                    className="w-full h-11 bg-obsidian-base border border-hairline-on-dark rounded-lg px-3 text-body-sm text-text-on-dark-primary focus:outline-none"
                  >
                    <option value="DEEP_CLEAN">Turnover Deep Clean &amp; Linen Sterilization</option>
                    <option value="ACOUSTIC_INSPECTION">Acoustic Silence Calibration (&lt; 18 dB)</option>
                    <option value="MAINTENANCE">Astronomical Dome &amp; Shutter Calibration</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider mb-1">
                    Special Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    placeholder="Specify gate code, technician notes, or priority window..."
                    className="w-full bg-obsidian-base border border-hairline-on-dark rounded-lg p-3 text-body-sm text-text-on-dark-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 h-10 rounded-full bg-obsidian-base border border-hairline-on-dark text-text-on-dark-secondary font-label-caps-sm uppercase tracking-wider hover:text-text-on-dark-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 h-10 rounded-full bg-primary text-obsidian-base font-label-caps-sm uppercase tracking-wider font-semibold hover:bg-canvas-outer transition-colors"
                  >
                    Confirm &amp; Dispatch
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <LonaFooter />
    </div>
  );
}
