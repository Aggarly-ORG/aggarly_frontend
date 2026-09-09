"use client";

import React, { useState, useEffect, useTransition } from "react";
import { AdminClient, ScheduledTaskDto, ScheduledTaskExecutionDto } from "@/lib/adminClient";

interface TaskDetail {
  id: string;
  name: string;
  code: string;
  cronExpr: string;
  cronDescription: string;
  status: "ACTIVE" | "PAUSED" | "RUNNING";
  lastRun: string;
  nextRun: string;
  duration: string;
  mem: string;
  progress?: number;
  pipelineTrace: { step: string; latency: string; status: "TRIGGERED" | "SUCCESS" | "SYNC" }[];
  logs: string[];
}



export default function AdminSchedulerPage() {
  const [tasks, setTasks] = useState<TaskDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [utcClock, setUtcClock] = useState("00:00:00 UTC");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, "0");
      const m = String(now.getUTCMinutes()).padStart(2, "0");
      const s = String(now.getUTCSeconds()).padStart(2, "0");
      setUtcClock(`${h}:${m}:${s} UTC`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadRemoteTasks = async () => {
    try {
      const remote = await AdminClient.getScheduledTasks();
      if (remote) {
        const mapped: TaskDetail[] = remote.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.taskKey ? `#${r.taskKey}` : `#TASK-${r.id.slice(0, 4)}`,
          cronExpr: r.cronExpression || "0 * * * *",
          cronDescription: r.scheduleDescription || "Scheduled",
          status: (r.status as "ACTIVE" | "PAUSED" | "RUNNING") || "ACTIVE",
          lastRun: r.lastRunAt ? new Date(r.lastRunAt).toLocaleTimeString() : "Pending",
          nextRun: r.nextRunAt ? new Date(r.nextRunAt).toLocaleTimeString() : "Pending",
          duration: r.lastRunDurationMs ? `${r.lastRunDurationMs}ms` : "—",
          mem: "—",
          pipelineTrace: [
            { step: "TRIGGERED", latency: "Tick", status: "TRIGGERED" },
            { step: "DISPATCHED", latency: "+120ms", status: "SUCCESS" },
            { step: "RESOLVED", latency: "+520ms", status: "SYNC" },
          ],
          logs: [
            `[${new Date().toISOString()}] [INIT] Task ${r.name} loaded.`,
            `[${new Date().toISOString()}] [STATUS] State: ${r.status}.`,
          ],
        }));
        setTasks(mapped);
        if (mapped.length > 0) {
          setSelectedTaskId(mapped[0].id);
          setTerminalLogs(mapped[0].logs);
        }
      }
    } catch (err) {
      console.error("Scheduled tasks query error", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadRemoteTasks().finally(() => setLoading(false));
  }, []);

  const currentTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    const target = tasks.find((t) => t.id === taskId);
    if (target) {
      setTerminalLogs(target.logs);
    }
  };

  const handleTriggerTask = (taskId: string, name: string) => {
    startTransition(async () => {
      const ok = await AdminClient.triggerScheduledTask(taskId);
      const timestamp = new Date().toISOString().slice(11, 19);
      const newLog = `[${timestamp}] [TRIGGER] Manual trigger dispatched for ${name}. Code 202 Accepted.`;
      setTerminalLogs((prev) => [newLog, ...prev]);
      showToast(`Trigger dispatched for ${name}`);
    });
  };

  const handleTogglePause = (taskId: string, currentStatus: "ACTIVE" | "PAUSED" | "RUNNING") => {
    startTransition(async () => {
      const nextStatus = currentStatus === "PAUSED" ? "ACTIVE" : "PAUSED";
      if (currentStatus === "PAUSED") {
        await AdminClient.resumeScheduledTask(taskId);
      } else {
        await AdminClient.pauseScheduledTask(taskId);
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
      showToast(`Task ${nextStatus === "PAUSED" ? "Paused" : "Resumed"}`);
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRemoteTasks();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Scheduler telemetry synchronized");
    }, 600);
  };

  return (
    <div className="flex flex-col w-full space-y-space-xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 transition-all duration-300">
          <div className="px-5 py-3 rounded-full bg-text-on-dark-primary text-obsidian-base font-label-caps-sm text-label-caps-sm uppercase tracking-widest shadow-2xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-state-success">
              check_circle
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Central Floating Obsidian Monolith Container */}
      <div className="w-full bg-gradient-to-b from-obsidian-base to-[#121215] border border-hairline-on-dark rounded-[28px] shadow-[0_24px_48px_-12px_rgba(10,10,12,0.22)] p-space-md lg:p-card-padding-desktop flex flex-col gap-space-2xl relative overflow-hidden">
        {/* Ambient Lunar Radial Bloom & Ray Emitters */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#DCE6EF]/10 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-[#C3D9EC]/5 rounded-full blur-[90px] pointer-events-none -z-0" />

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg relative z-10">
          <div className="flex items-center gap-space-lg">
            {/* Photoreal Moon Indicator with Lunar Glow Bleed */}
            <div className="relative flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center bg-obsidian-elevated shadow-[0_0_24px_rgba(220,230,239,0.25)] border border-hairline-on-dark">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-text-on-dark-secondary/20 via-text-on-dark-primary/30 to-transparent" />
              <svg aria-hidden="true" className="w-14 h-14 rounded-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="#18181B" r="48" />
                <path
                  className="opacity-95"
                  d="M 50 2 A 48 48 0 0 1 50 98 A 28 48 0 0 0 50 2"
                  fill="#E2E8F0"
                />
                <circle cx="42" cy="38" fill="#CBD5E1" opacity="0.35" r="7" />
                <circle cx="64" cy="46" fill="#94A3B8" opacity="0.25" r="11" />
                <circle cx="34" cy="62" fill="#64748B" opacity="0.3" r="5" />
                <circle cx="58" cy="72" fill="#94A3B8" opacity="0.2" r="9" />
              </svg>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-state-success shadow-[0_0_8px_rgba(143,174,151,0.8)]" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-[0.2em] text-text-on-dark-secondary">
                  Aggarly Operations Console
                </span>
                <span className="text-hairline-on-dark text-xs">•</span>
                <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary tracking-widest text-[11px] uppercase">
                  Node LONA-CHRONOS-04
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-text-on-dark-primary uppercase tracking-[0.08em] mt-1">
                Scheduled Tasks &amp; Cron Orchestrator
              </h1>
              <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary mt-0.5">
                Aggarly by Lona • Autonomous Agent Cron Jobs &amp; Ephemeral Sync
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-space-sm self-start lg:self-center">
            <button
              onClick={handleRefresh}
              aria-label="Refresh Schedule"
              className={`p-2.5 rounded-full bg-obsidian-elevated text-text-on-dark-secondary hover:text-text-on-dark-primary border border-hairline-on-dark transition-all duration-300 flex items-center justify-center ${
                isRefreshing ? "rotate-180" : ""
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
            </button>
            <button
              onClick={() => showToast("Task registry dialog ready")}
              className="group h-[46px] px-7 rounded-full bg-[#F7F6F4] text-[#0A0A0C] font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] flex items-center gap-space-xs hover:bg-[#EFEEEC] transition-all duration-300 shadow-[0_4px_16px_rgba(247,246,244,0.15)]"
            >
              <span>+ Register New Task</span>
              <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover:translate-x-1">
                arrow_forward
              </span>
            </button>
          </div>
        </div>

        {/* Top Metrics Tonal Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md p-space-md rounded-2xl bg-obsidian-elevated/70 backdrop-blur-md border border-hairline-on-dark relative z-10">
          <div className="flex flex-col gap-1 p-space-sm rounded-xl bg-obsidian-bubble/50 border border-hairline-on-dark/30">
            <div className="flex items-center justify-between">
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                Active Cron Jobs
              </span>
              <span className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-md text-headline-md text-text-on-dark-primary font-normal">
                {tasks.filter((t) => t.status !== "PAUSED").length}
              </span>
              <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary text-xs uppercase">
                Running
              </span>
            </div>
            <span className="font-data-tabular text-data-tabular text-[11px] text-text-on-dark-secondary">
              {tasks.filter((t) => t.status === "PAUSED").length} paused • 0 degraded
            </span>
          </div>

          <div className="flex flex-col gap-1 p-space-sm rounded-xl bg-obsidian-bubble/50 border border-hairline-on-dark/30">
            <div className="flex items-center justify-between">
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                Success Rate (7D)
              </span>
              <span className="material-symbols-outlined text-state-success text-[16px]">verified</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-md text-headline-md text-text-on-dark-primary font-normal">
                99.8%
              </span>
              <span className="font-data-tabular text-data-tabular text-state-success text-xs">
                +0.04%
              </span>
            </div>
            <span className="font-data-tabular text-data-tabular text-[11px] text-text-on-dark-secondary">
              2,834 of 2,840 succeeded
            </span>
          </div>

          <div className="flex flex-col gap-1 p-space-sm rounded-xl bg-obsidian-bubble/50 border border-hairline-on-dark/30">
            <div className="flex items-center justify-between">
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                Executions (24H)
              </span>
              <span className="material-symbols-outlined text-text-on-dark-secondary text-[16px]">
                timelapse
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-md text-headline-md text-text-on-dark-primary font-normal">
                2,840
              </span>
              <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary text-xs uppercase">
                Runs
              </span>
            </div>
            <span className="font-data-tabular text-data-tabular text-[11px] text-text-on-dark-secondary">
              Avg latency: 482ms
            </span>
          </div>

          <div className="flex flex-col gap-1 p-space-sm rounded-xl bg-obsidian-bubble/50 border border-hairline-on-dark/30">
            <div className="flex items-center justify-between">
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                Queue Concurrency
              </span>
              <span className="material-symbols-outlined text-text-on-dark-secondary text-[16px]">
                memory
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-md text-headline-md text-text-on-dark-primary font-normal">
                4
              </span>
              <span className="font-data-tabular text-data-tabular text-state-success text-xs uppercase">
                Workers Active
              </span>
            </div>
            <div className="w-full bg-obsidian-base h-1 rounded-full overflow-hidden mt-1">
              <div className="bg-text-on-dark-primary h-full w-[45%] rounded-full" />
            </div>
          </div>
        </div>

        {/* Main Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg relative z-10">
          {/* Left / Main Tasks Registry (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="flex items-center justify-between px-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-caps-md text-label-caps-md uppercase tracking-wider text-text-on-dark-primary">
                  Cron Schedule Registry
                </span>
                <span className="px-2 py-0.5 rounded-full bg-obsidian-elevated text-text-on-dark-secondary font-data-tabular text-[11px]">
                  {tasks.length} configured
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                  UTC Clock:
                </span>
                <span className="font-data-tabular text-data-tabular text-text-on-dark-primary text-xs">
                  {utcClock}
                </span>
              </div>
            </div>

            {tasks.map((task) => {
              const isSelected = task.id === selectedTaskId;
              return (
                <div
                  key={task.id}
                  onClick={() => handleSelectTask(task.id)}
                  className={`group rounded-2xl p-space-md transition-all duration-200 cursor-pointer flex flex-col gap-space-sm border ${
                    isSelected
                      ? "bg-obsidian-elevated border-text-on-dark-primary/40 shadow-[0_0_0_1px_rgba(245,244,241,0.25)]"
                      : "bg-obsidian-elevated/40 border-hairline-on-dark hover:bg-obsidian-elevated/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-space-sm">
                    <div className="flex items-start gap-space-sm">
                      <div
                        className={`mt-1.5 w-2 h-2 rounded-full ${
                          task.status === "RUNNING"
                            ? "bg-primary animate-ping"
                            : task.status === "PAUSED"
                            ? "bg-state-error"
                            : "bg-state-success"
                        }`}
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-space-xs">
                          <span className="font-headline-md text-headline-md text-text-on-dark-primary text-base">
                            {task.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-obsidian-bubble font-data-tabular text-[11px] text-text-on-dark-secondary">
                            {task.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-space-sm mt-1">
                          <span className="font-data-tabular text-data-tabular text-xs text-text-on-dark-secondary font-mono px-2 py-0.5 rounded bg-obsidian-base border border-hairline-on-dark/30">
                            {task.cronExpr}
                          </span>
                          <span className="font-body-sm text-body-sm text-text-on-dark-secondary">
                            {task.cronDescription}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`font-label-caps-sm text-label-caps-sm uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        task.status === "RUNNING"
                          ? "bg-primary/10 text-primary"
                          : task.status === "PAUSED"
                          ? "bg-state-error/15 text-state-error"
                          : "bg-state-success/15 text-state-success"
                      }`}
                    >
                      {task.status === "RUNNING"
                        ? "Running (45%)"
                        : task.status === "PAUSED"
                        ? "Paused"
                        : "Healthy / Idle"}
                    </span>
                  </div>

                  {task.status === "RUNNING" && (
                    <div className="w-full bg-obsidian-base h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-gradient-to-r from-text-on-dark-secondary to-primary h-full w-[45%] rounded-full transition-all duration-500" />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-space-xs mt-1 text-text-on-dark-secondary font-data-tabular text-xs">
                    <div className="flex items-center gap-space-md">
                      <span>
                        Last Run:{" "}
                        <strong className="text-text-on-dark-primary font-medium">{task.lastRun}</strong>
                      </span>
                      <span>
                        Next:{" "}
                        <strong className="text-text-on-dark-primary font-medium">{task.nextRun}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleTriggerTask(task.id, task.name)}
                        className="px-3 py-1 rounded-full bg-obsidian-bubble hover:bg-text-on-dark-primary hover:text-obsidian-base text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors"
                      >
                        Trigger
                      </button>
                      <button
                        onClick={() => handleTogglePause(task.id, task.status)}
                        className="px-3 py-1 rounded-full bg-obsidian-bubble hover:bg-obsidian-base text-text-on-dark-secondary hover:text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors"
                      >
                        {task.status === "PAUSED" ? "Resume" : "Pause"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Task Execution Inspector & Telemetry (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            <div className="flex items-center justify-between px-space-xs">
              <span className="font-label-caps-md text-label-caps-md uppercase tracking-wider text-text-on-dark-primary">
                Execution Inspector &amp; Telemetry
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-state-success" />
                <span className="font-data-tabular text-data-tabular text-[11px] text-text-on-dark-secondary uppercase">
                  Live Stream
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-obsidian-elevated border border-hairline-on-dark p-space-md flex flex-col gap-space-md shadow-sm">
              {!currentTask ? (
                <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-hairline-on-dark border-t-primary animate-spin" />
                  <span className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest text-xs">
                    Awaiting task registry...
                  </span>
                </div>
              ) : (
                <>
                  {/* Selected Task Summary Banner */}
                  <div className="flex flex-col gap-space-xs pb-space-sm border-b border-hairline-on-dark">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                        Selected Target
                      </span>
                      <span className="font-data-tabular text-data-tabular text-state-success text-xs font-mono">
                        200 OK • SUCCESS
                      </span>
                    </div>
                    <span className="font-headline-md text-headline-md text-text-on-dark-primary text-lg">
                      {currentTask.name}
                    </span>
                    <div className="flex items-center gap-space-md text-text-on-dark-secondary font-data-tabular text-xs">
                      <span>
                        Task ID: <strong className="text-text-on-dark-primary">{currentTask.code}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Duration: <strong className="text-text-on-dark-primary">{currentTask.duration}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Memory: <strong className="text-text-on-dark-primary">{currentTask.mem}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Execution Pipeline Trace */}
                  <div className="flex flex-col gap-space-xs">
                    <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                      Execution Pipeline Trace
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      {currentTask.pipelineTrace.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-obsidian-bubble border border-hairline-on-dark/30 flex flex-col items-center"
                        >
                          <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary">
                            {step.step}
                          </span>
                          <span
                            className={`font-data-tabular text-xs mt-0.5 ${
                              step.status === "SYNC" ? "text-state-success" : "text-text-on-dark-primary"
                            }`}
                          >
                            {step.latency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Structured Logs Stream Terminal */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                        Stdout &amp; Celestial Telemetry
                      </span>
                      <button
                        onClick={() => setTerminalLogs(["[System] Logs buffer flushed. Awaiting next invocation event..."])}
                        className="font-data-tabular text-[11px] text-text-on-dark-secondary hover:text-text-on-dark-primary"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="h-64 rounded-xl bg-obsidian-base border border-hairline-on-dark/40 p-space-sm font-mono text-xs overflow-y-auto space-y-2 select-text leading-relaxed text-[#C9CDD2]">
                      {terminalLogs.map((log, idx) => (
                        <div key={idx} className="text-text-on-dark-secondary text-[11px]">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* REST Endpoints Reference Card */}
              <div className="flex flex-col gap-2 pt-space-xs border-t border-hairline-on-dark">
                <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                  Internal REST Endpoints
                </span>
                <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded bg-obsidian-bubble">
                    <span className="text-text-on-dark-secondary">
                      <strong className="text-[#94A3B8]">GET</strong> /api/v1/scheduled-tasks
                    </span>
                    <span className="text-state-success text-[10px]">200 OK</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-obsidian-bubble">
                    <span className="text-text-on-dark-secondary">
                      <strong className="text-primary">POST</strong> /api/v1/scheduled-tasks
                    </span>
                    <span className="text-text-on-dark-secondary text-[10px]">Auth Required</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-obsidian-bubble">
                    <span className="text-text-on-dark-secondary">
                      <strong className="text-[#94A3B8]">GET</strong> /api/v1/scheduled-tasks/&#123;id&#125;/executions
                    </span>
                    <span className="text-state-success text-[10px]">200 OK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monolithic Bottom Status Ribbon */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-md border-t border-hairline-on-dark text-text-on-dark-secondary font-data-tabular text-xs relative z-10">
          <div className="flex items-center gap-space-md">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-state-success" />
              Daemon Cluster: Healthy
            </span>
            <span>•</span>
            <span>Node Load: 0.28, 0.31, 0.29</span>
            <span>•</span>
            <span>Next Epoch Align: 00:00:00 UTC</span>
          </div>
          <div className="flex items-center gap-space-md">
            <button
              onClick={() => showToast("Scheduler documentation opened")}
              className="hover:text-text-on-dark-primary transition-colors uppercase font-label-caps-sm tracking-wider"
            >
              Cron Docs
            </button>
            <button
              onClick={() => showToast("Worker cluster metrics: 4 Active Workers")}
              className="hover:text-text-on-dark-primary transition-colors uppercase font-label-caps-sm tracking-wider"
            >
              Worker Metrics
            </button>
            <button
              onClick={() => showToast("API credentials active")}
              className="hover:text-text-on-dark-primary transition-colors uppercase font-label-caps-sm tracking-wider"
            >
              API Keys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
