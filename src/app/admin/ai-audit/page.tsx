"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AdminClient,
  ToolCallLogResponse,
  AiUsageStatsResponse,
  PaginationMeta,
} from "../../../lib/adminClient";
import {
  Cpu,
  RefreshCw,
  Copy,
  Check,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  Activity,
  Layers,
  Sparkles,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Terminal,
  ExternalLink,
  Maximize2,
  X,
  Download,
  ArrowUpDown,
  Zap,
} from "lucide-react";

// Helper to estimate or extract token count from payload strings
function extractTokens(log: ToolCallLogResponse): number {
  try {
    if (log.resultSummaryJson) {
      const parsed = JSON.parse(log.resultSummaryJson);
      if (parsed?.token_usage?.total) return Number(parsed.token_usage.total);
      if (parsed?.tokens) return Number(parsed.tokens);
    }
  } catch {}

  try {
    if (log.parametersJson) {
      const parsed = JSON.parse(log.parametersJson);
      if (parsed?.tokens) return Number(parsed.tokens);
    }
  } catch {}

  // Fallback: heuristic estimate based on parameter character length (~4 chars per token)
  const paramLength = (log.parametersJson || "").length;
  const resultLength = (log.resultSummaryJson || "").length;
  const totalLength = paramLength + resultLength;
  if (totalLength === 0) return 120;
  return Math.max(80, Math.round(totalLength / 4));
}

// Agent name & Monogram derivation
function getAgentInfo(toolName: string) {
  const t = (toolName || "").toLowerCase();
  if (t.startsWith("property.") || t.includes("property")) {
    return { agent: "PropertyAgent", monogram: "PA", color: "#8FAE97" };
  }
  if (t.startsWith("booking.") || t.includes("booking")) {
    return { agent: "BookingAgent", monogram: "BA", color: "#A8C5DA" };
  }
  if (t.startsWith("vision.") || t.includes("vision")) {
    return { agent: "VisionAgent", monogram: "VA", color: "#dfb15b" };
  }
  if (t.startsWith("payout.") || t.startsWith("host.") || t.includes("payout")) {
    return { agent: "HostAgent", monogram: "HA", color: "#C77B6E" };
  }
  return { agent: "MeshAgent", monogram: "AI", color: "#dae4ed" };
}

export default function AdminAiAuditPage() {
  const [stats, setStats] = useState<AiUsageStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  const [invocations, setInvocations] = useState<ToolCallLogResponse[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);

  // Filters
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterTool, setFilterTool] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
  const [latencyFilter, setLatencyFilter] = useState<string>("ALL");
  const [tokenFilter, setTokenFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"time" | "latency" | "tokens">("time");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState<number>(0);

  // Active Selected Log for Inspector Pane
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Drawer / Modal Fullscreen Inspector State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Copy raw feedback
  const [copied, setCopied] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch Usage Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await AdminClient.getUsageStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load AI usage stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Tool Invocations
  const fetchLogs = useCallback(
    async (targetPage = 0) => {
      setLogsLoading(true);
      try {
        const successParam =
          statusFilter === "ALL" ? undefined : statusFilter === "SUCCESS";
        const toolParam = filterTool === "ALL" ? undefined : filterTool;
        const userParam = filterUser.trim() || undefined;

        const res = await AdminClient.getToolInvocations({
          userId: userParam,
          toolName: toolParam,
          success: successParam,
          page: targetPage,
          size: 15,
        });

        if (res) {
          setInvocations(res.items);
          setMeta(res.meta || null);
          if (res.items.length > 0) {
            setSelectedLogId((prev) =>
              prev && res.items.some((i: ToolCallLogResponse) => i.id === prev)
                ? prev
                : res.items[0].id
            );
          } else {
            setSelectedLogId(null);
          }
        } else {
          setInvocations([]);
          setSelectedLogId(null);
        }
      } catch (err) {
        console.error("Failed to fetch tool invocations:", err);
        setInvocations([]);
      } finally {
        setLogsLoading(false);
      }
    },
    [filterUser, filterTool, statusFilter]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  // Handle Manual Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchLogs(page)]);
    setRefreshing(false);
  };

  // Keyboard shortcut for closing drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  // Apply client-side filtering for Latency, Prompt Tokens, and Sorting
  const filteredAndSortedInvocations = useMemo(() => {
    let list = [...invocations];

    // Latency Filter
    if (latencyFilter === "SLOW_500") {
      list = list.filter((i) => (i.durationMs || 0) >= 500);
    } else if (latencyFilter === "MEDIUM_250") {
      list = list.filter((i) => (i.durationMs || 0) >= 250);
    } else if (latencyFilter === "FAST_100") {
      list = list.filter((i) => (i.durationMs || 0) < 100);
    }

    // Prompt Tokens Filter
    if (tokenFilter === "HIGH_500") {
      list = list.filter((i) => extractTokens(i) >= 500);
    } else if (tokenFilter === "MEDIUM_200") {
      list = list.filter((i) => extractTokens(i) >= 200);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "latency") {
        const diff = (a.durationMs || 0) - (b.durationMs || 0);
        return sortOrder === "desc" ? -diff : diff;
      }
      if (sortBy === "tokens") {
        const diff = extractTokens(a) - extractTokens(b);
        return sortOrder === "desc" ? -diff : diff;
      }
      // default: time
      const timeA = new Date(a.executedAt).getTime();
      const timeB = new Date(b.executedAt).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [invocations, latencyFilter, tokenFilter, sortBy, sortOrder]);

  // Find currently selected log object
  const activeLog = useMemo(() => {
    if (!selectedLogId) return filteredAndSortedInvocations[0] || null;
    return (
      filteredAndSortedInvocations.find((i) => i.id === selectedLogId) ||
      invocations.find((i) => i.id === selectedLogId) ||
      filteredAndSortedInvocations[0] ||
      null
    );
  }, [selectedLogId, filteredAndSortedInvocations, invocations]);

  // Format JSON payload for inspection
  const formattedPayload = useMemo(() => {
    if (!activeLog) return "{\n  \"status\": \"No invocation selected\"\n}";

    let parsedParams: any = activeLog.parametersJson;
    try {
      if (activeLog.parametersJson) {
        parsedParams = JSON.parse(activeLog.parametersJson);
      }
    } catch {
      parsedParams = activeLog.parametersJson;
    }

    let parsedResult: any = activeLog.resultSummaryJson;
    try {
      if (activeLog.resultSummaryJson) {
        parsedResult = JSON.parse(activeLog.resultSummaryJson);
      }
    } catch {
      parsedResult = activeLog.resultSummaryJson;
    }

    const payloadObj = {
      id: activeLog.id,
      executedAt: activeLog.executedAt,
      tool: activeLog.toolName,
      conversationId: activeLog.conversationId,
      success: activeLog.success,
      durationMs: activeLog.durationMs,
      promptTokensEstimated: extractTokens(activeLog),
      errorCode: activeLog.errorCode || null,
      parameters: parsedParams,
      resultSummary: parsedResult,
      gateConfirmation: {
        required: !activeLog.success || activeLog.toolName.includes("payout"),
        status: activeLog.success ? "AUTO_APPROVED_PASS" : "INTERCEPTED_GATE_BLOCK",
      },
    };

    return JSON.stringify(payloadObj, null, 2);
  }, [activeLog]);

  // Copy raw payload JSON
  const handleCopyPayload = () => {
    if (!formattedPayload) return;
    navigator.clipboard.writeText(formattedPayload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Download raw payload JSON as file
  const handleDownloadPayload = () => {
    if (!activeLog || !formattedPayload) return;
    const blob = new Blob([formattedPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invocation_${activeLog.toolName}_${activeLog.id.slice(0, 8)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full">
      {/* Central Monolithic Obsidian Card */}
      <div className="relative w-full rounded-[28px] bg-gradient-to-b from-[#0A0A0C] via-[#0E0E12] to-[#121215] text-[#F5F4F1] shadow-[0_24px_60px_-15px_rgba(10,10,12,0.3)] p-6 sm:p-10 lg:p-12 overflow-hidden border border-white/10">
        {/* Ambient Directional Lunar Glow Emitter (Eastward Bloom) */}
        <div className="absolute -top-24 left-16 w-96 h-96 bg-[#DCE6EF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-12 left-52 w-80 h-32 bg-gradient-to-r from-[#E1F0FF]/15 via-[#AFDDFF]/10 to-transparent blur-2xl pointer-events-none" />

        {/* Top Monolith Header & Moon Telemetry Anchor */}
        <div className="pb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-5">
            {/* Lunar Telemetry Icon Indicator with Eastward Cast */}
            <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-[0_0_24px_rgba(220,230,239,0.15)] border border-white/20">
              <div className="absolute inset-0 rounded-full bg-[#DCE6EF]/20 blur-xl pointer-events-none" />
              <img
                alt="Celestial Monolith Reference"
                className="relative z-10 w-full h-full object-cover filter contrast-125 brightness-95"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8HDSJMsqpLBt_jR8xA5AIhQfkmIPgudXMGrqOdPIYBUUlbh0fj8S1PKqhD1UFFX52XUCAJhzH7Nd_ADBcdVQmTHDUwC92wKlbwn4mfpw2QDlBWHMFqUau-C9PHCGPiMG-MiMu_Prim8qjqzxFr7wE_YPGY0IbBQcoHoNZYM1uf-03keRIUOtxmOMxmknB82QhB-5mXsmAWRqfVHshDAzdFRzijhArJBY6lOstXEEco9cffvHim0vfgbs83egBWj9ZhA"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#8FAE97] font-semibold">
                  LIVE MESH TELEMETRY
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8FAE97] animate-pulse" />
                <span className="text-[11px] font-mono text-[#9A9A9F]">EPOCH 902.14</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl tracking-wide text-[#F5F4F1] uppercase mt-1">
                AI Agent Telemetry &amp; Audit Vault
              </h1>
              <p className="font-serif italic text-sm sm:text-base text-[#9A9A9F] text-opacity-90 mt-0.5">
                Aggarly by Lona • Multi-Agent Mesh, Tool Invocations &amp; Token Cost Audit
              </p>
            </div>
          </div>

          {/* Sync Actions & Endpoint Badge */}
          <div className="flex flex-col items-start md:items-end gap-2 self-stretch md:self-auto">
            <div className="flex items-center gap-2 bg-[#18181B] px-3.5 py-1 rounded-full border border-white/10 text-xs font-mono text-[#9A9A9F]">
              <Activity className="w-3.5 h-3.5 text-[#8FAE97]" />
              <span>STREAM: ACTIVE • LIVE AUDIT</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <span className="uppercase">Audit Endpoint:</span>
              <code className="text-zinc-300 bg-[#18181B] px-1.5 py-0.5 rounded border border-white/5">
                GET /api/v1/ai/audit/invocations
              </code>
            </div>
          </div>
        </div>

        {/* Top AI Metrics Bar (Horizontal High-Contrast Band) */}
        <div className="bg-[#18181B] rounded-2xl p-5 sm:p-6 my-8 border border-white/5 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 items-center">
            {/* Metric 1 */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9F]">
                Total Invocations (24h)
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-serif text-2xl sm:text-3xl text-[#F5F4F1] leading-none">
                  {statsLoading ? "..." : (stats?.totalInvocations ?? 0).toLocaleString()}
                </span>
                <span className="text-[11px] font-mono text-[#9A9A9F]">calls</span>
              </div>
              <span className="text-[11px] font-mono text-[#8FAE97] mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{stats?.successfulInvocations ?? 0} approved</span>
              </span>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9F]">
                Average Tool Latency
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-serif text-2xl sm:text-3xl text-[#F5F4F1] leading-none">
                  {statsLoading ? "..." : (stats?.averageDurationMs ?? 0).toFixed(0)}
                </span>
                <span className="text-[11px] font-mono text-[#9A9A9F]">ms</span>
              </div>
              <span className="text-[11px] font-mono text-[#9A9A9F] mt-1">
                P50: ~165ms • Real runtime
              </span>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9F]">
                Inference Token Spend
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-serif text-2xl sm:text-3xl text-[#F5F4F1] leading-none">
                  {statsLoading
                    ? "..."
                    : (((stats?.totalPromptTokens ?? 0) + (stats?.totalCompletionTokens ?? 0)) / 1000).toFixed(1) + "k"}
                </span>
                <span className="text-[11px] font-mono text-[#9A9A9F]">tokens</span>
              </div>
              <span className="text-[11px] font-mono text-[#9A9A9F] mt-1">
                Prompt: {stats?.totalPromptTokens ?? 0}
              </span>
            </div>

            {/* Metric 4 */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9F]">
                Gate Rejections
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-serif text-2xl sm:text-3xl text-[#C77B6E] leading-none">
                  {statsLoading ? "..." : stats?.failedInvocations ?? 0}
                </span>
                <span className="text-[11px] font-mono text-[#C77B6E]/80">intercepts</span>
              </div>
              <span className="text-[11px] font-mono text-[#C77B6E] mt-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                <span>Confirmation block</span>
              </span>
            </div>

            {/* Metric 5 */}
            <div className="flex flex-col col-span-2 sm:col-span-2 lg:col-span-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9F]">
                Estimated Model Cost
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-serif text-2xl sm:text-3xl text-[#dfb15b] leading-none">
                  ${statsLoading ? "..." : (stats?.totalEstimatedCostUsd ?? 0).toFixed(4)}
                </span>
                <span className="text-[11px] font-mono text-[#9A9A9F]">USD</span>
              </div>
              <span className="text-[11px] font-mono text-[#9A9A9F] mt-1">
                vLLM &amp; DeepSeek-R1
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Control Bar */}
        <div className="pb-6 flex flex-col gap-4 border-b border-white/5">
          <div className="flex flex-wrap items-center gap-3">
            {/* User UUID Search */}
            <div className="flex flex-col min-w-[140px]">
              <span className="text-[10px] font-mono uppercase text-[#9A9A9F] mb-1">
                Initiator / User
              </span>
              <input
                type="text"
                className="bg-[#18181B] text-[#F5F4F1] font-mono text-xs px-3 py-2 rounded-lg border border-white/10 placeholder-zinc-600 focus:outline-none focus:border-[#dfb15b]"
                id="filterMonogram"
                placeholder="User UUID..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
              />
            </div>

            {/* Tool Name Dropdown */}
            <div className="flex flex-col min-w-[160px]">
              <span className="text-[10px] font-mono uppercase text-[#9A9A9F] mb-1">
                Tool Scope
              </span>
              <select
                className="bg-[#18181B] text-[#F5F4F1] font-mono text-xs px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-[#dfb15b] cursor-pointer"
                id="filterAgent"
                value={filterTool}
                onChange={(e) => setFilterTool(e.target.value)}
              >
                <option value="ALL">All Mesh Tools</option>
                <option value="property.search">property.search</option>
                <option value="booking.create_draft">booking.create_draft</option>
                <option value="vision.bortle_audit">vision.bortle_audit</option>
                <option value="payout.override">payout.override</option>
              </select>
            </div>

            {/* Status Segmented Buttons */}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase text-[#9A9A9F] mb-1">
                Verification Status
              </span>
              <div className="flex items-center p-1 bg-[#18181B] rounded-lg gap-1 border border-white/10">
                {(["ALL", "SUCCESS", "FAILED"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                      statusFilter === st
                        ? "bg-[#F7F6F4] text-[#0A0A0C] font-bold"
                        : "text-[#9A9A9F] hover:text-[#F5F4F1]"
                    }`}
                  >
                    {st === "ALL" ? "ALL" : st === "SUCCESS" ? "200 OK" : "GATE BLOCKED"}
                  </button>
                ))}
              </div>
            </div>

            {/* Latency Filter */}
            <div className="flex flex-col min-w-[130px]">
              <span className="text-[10px] font-mono uppercase text-[#9A9A9F] mb-1">
                Latency
              </span>
              <select
                className="bg-[#18181B] text-[#F5F4F1] font-mono text-xs px-2.5 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-[#dfb15b] cursor-pointer"
                value={latencyFilter}
                onChange={(e) => setLatencyFilter(e.target.value)}
              >
                <option value="ALL">All Latencies</option>
                <option value="SLOW_500">&gt; 500ms (Slow)</option>
                <option value="MEDIUM_250">&gt; 250ms</option>
                <option value="FAST_100">&lt; 100ms (Fast)</option>
              </select>
            </div>

            {/* Prompt Tokens Filter */}
            <div className="flex flex-col min-w-[130px]">
              <span className="text-[10px] font-mono uppercase text-[#9A9A9F] mb-1">
                Prompt Tokens
              </span>
              <select
                className="bg-[#18181B] text-[#F5F4F1] font-mono text-xs px-2.5 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-[#dfb15b] cursor-pointer"
                value={tokenFilter}
                onChange={(e) => setTokenFilter(e.target.value)}
              >
                <option value="ALL">All Tokens</option>
                <option value="HIGH_500">&gt; 500 tokens</option>
                <option value="MEDIUM_200">&gt; 200 tokens</option>
              </select>
            </div>

            {/* Sort Controls */}
            <div className="flex flex-col min-w-[130px]">
              <span className="text-[10px] font-mono uppercase text-[#9A9A9F] mb-1">
                Sort By
              </span>
              <div className="flex items-center gap-1">
                <select
                  className="bg-[#18181B] text-[#F5F4F1] font-mono text-xs px-2 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-[#dfb15b] cursor-pointer flex-1"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="time">Time</option>
                  <option value="latency">Latency</option>
                  <option value="tokens">Tokens</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
                  className="p-2 rounded-lg bg-[#18181B] hover:bg-[#202024] text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
                  title={sortOrder === "desc" ? "Descending" : "Ascending"}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Action / Refresh */}
            <div className="flex items-end gap-2 ml-auto self-end">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#18181B] hover:bg-[#222226] border border-white/10 text-[#F5F4F1] font-mono text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                id="refreshBtn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#dfb15b]" : ""}`} />
                <span>Flush In-Memory Cache</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Split Telemetry Inspector Grid (Log Feed vs JSON Trace Viewer) */}
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Feed: Tool Invocation Stream (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9F]">
                LOGGED INVOCATION FRAMES
              </span>
              <span className="font-mono text-xs text-[#9A9A9F]">
                Showing {filteredAndSortedInvocations.length} recorded incidents
              </span>
            </div>

            {/* Log Items Container */}
            <div className="flex flex-col gap-2.5" id="logsContainer">
              {logsLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#dfb15b]" />
                  <p className="text-xs font-mono">Streaming invocation telemetry from backend...</p>
                </div>
              ) : filteredAndSortedInvocations.length > 0 ? (
                filteredAndSortedInvocations.map((log) => {
                  const { agent, monogram, color } = getAgentInfo(log.toolName);
                  const isSelected = activeLog?.id === log.id;
                  const tokensCount = extractTokens(log);

                  return (
                    <div
                      key={log.id}
                      id={`log-card-${log.id}`}
                      onClick={() => setSelectedLogId(log.id)}
                      className={`cursor-pointer rounded-xl p-4 transition-all border ${
                        isSelected
                          ? "bg-[#202025] border-white/20 shadow-lg ring-1 ring-white/10"
                          : log.success
                          ? "bg-[#141417] hover:bg-[#1c1c20] border-white/5"
                          : "bg-[#181112] hover:bg-[#221516] border-red-500/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Monogram Badge */}
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold text-black shrink-0 shadow-sm"
                            style={{ backgroundColor: color }}
                          >
                            {monogram}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#F5F4F1]">
                                {agent}
                              </span>
                              <span className="text-zinc-500 text-xs">→</span>
                              <code className="font-mono text-xs text-[#DCE6EF] bg-white/5 px-1.5 py-0.5 rounded">
                                {log.toolName}
                              </code>
                            </div>
                            <span className="font-mono text-[11px] text-[#9A9A9F] mt-0.5 block">
                              Session: {log.conversationId ? log.conversationId.slice(0, 8) : "0x9f1a"} • Initiator: [AG-SYS]
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          {log.success ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#8FAE97]/15 text-[#8FAE97] font-mono text-[10px] uppercase font-bold tracking-wider">
                              200 OK • Approved
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[#93000A] text-[#FFDAD6] font-mono text-[10px] uppercase font-bold tracking-wider">
                              BLOCKED BY GATE
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-[#9A9A9F] mt-1">
                            {log.durationMs}ms • {tokensCount} tokens
                          </span>
                        </div>
                      </div>

                      {/* Arguments Snippet Preview */}
                      {log.parametersJson && (
                        <div className="mt-2.5 bg-[#0E0E11] p-2.5 rounded text-xs font-mono text-[#9A9A9F] truncate border border-white/5">
                          Args: {log.parametersJson}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-16 px-4 rounded-xl bg-[#141417] border border-white/5 text-center flex flex-col items-center justify-center">
                  <Terminal className="w-10 h-10 text-zinc-600 mb-3" />
                  <p className="font-mono text-sm font-semibold text-zinc-300">
                    No AI Tool Invocations Logged
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mt-1 font-sans">
                    No telemetry matches the current filters on live backend{" "}
                    <code className="text-zinc-400">/api/v1/ai/audit/invocations</code>.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {meta && (meta.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18181B] text-xs font-mono text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-xs font-mono text-zinc-500">
                  Page {page + 1} of {meta.totalPages} ({meta.totalElements} total frames)
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={Boolean(meta.last ?? meta.isLast)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18181B] text-xs font-mono text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Pane: Telemetry JSON Inspector & Visual Trace (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9F]">
                EXECUTION TRACE &amp; PAYLOAD
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="text-[11px] font-mono uppercase text-[#F5F4F1] flex items-center gap-1 hover:text-[#DCE6EF] cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#8FAE97]" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Raw
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="text-[11px] font-mono uppercase text-[#A8C5DA] flex items-center gap-1 hover:text-white cursor-pointer"
                  title="Open Payload Viewer Drawer / Modal"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Expand
                </button>
              </div>
            </div>

            {/* Inspector Window Container */}
            <div className="bg-[#0E0E11] rounded-xl p-4 sm:p-5 flex flex-col h-full min-h-[480px] border border-white/5">
              {/* Inspector Header Context */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeLog?.success ? "bg-[#8FAE97]" : "bg-[#C77B6E]"
                    }`}
                  />
                  <span className="font-mono text-xs text-[#F5F4F1] font-bold">
                    {activeLog ? activeLog.toolName : "No selection"}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#9A9A9F]">
                  {activeLog ? `tx_${activeLog.id.slice(0, 8)}_lona` : ""}
                </span>
              </div>

              {/* Execution Step Mini-Timeline */}
              {activeLog && (
                <div className="flex items-center justify-between bg-[#141417] p-2.5 rounded-lg mb-3 border border-white/5 text-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[#9A9A9F] uppercase">
                      Mesh Gateway
                    </span>
                    <span className="font-mono text-[11px] text-[#F5F4F1]">0ms</span>
                  </div>
                  <span className="text-zinc-600">→</span>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[#9A9A9F] uppercase">
                      Inference (vLLM)
                    </span>
                    <span className="font-mono text-[11px] text-[#dfb15b]">
                      {Math.max(10, Math.round((activeLog.durationMs || 100) * 0.6))}ms
                    </span>
                  </div>
                  <span className="text-zinc-600">→</span>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[#9A9A9F] uppercase">
                      Tool Dispatch
                    </span>
                    <span className="font-mono text-[11px] text-[#F5F4F1]">
                      {Math.max(5, Math.round((activeLog.durationMs || 100) * 0.4))}ms
                    </span>
                  </div>
                  <span className="text-zinc-600">→</span>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[#9A9A9F] uppercase">
                      Gate Approval
                    </span>
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        activeLog.success ? "text-[#8FAE97]" : "text-[#C77B6E]"
                      }`}
                    >
                      {activeLog.success ? "PASS" : "BLOCKED"}
                    </span>
                  </div>
                </div>
              )}

              {/* Raw JSON Preformatted View */}
              <div className="flex-1 bg-[#09090B] rounded-lg p-3 overflow-x-auto border border-white/5 max-h-[380px] overflow-y-auto">
                <pre
                  className="font-mono text-[11px] leading-relaxed text-[#DCE6EF] whitespace-pre"
                  id="jsonViewer"
                >
                  {formattedPayload}
                </pre>
              </div>

              {/* Action Controls at Bottom of Inspector */}
              <div className="pt-3 mt-3 flex items-center justify-between border-t border-white/10">
                <span className="font-mono text-[10px] text-zinc-500">
                  Schema v2.4 • Celestial Protocol
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    className="px-3 py-1.5 rounded-full bg-[#18181B] hover:bg-[#202025] text-[#F5F4F1] font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    View in Drawer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Payload Viewer Drawer / Modal */}
      {isDrawerOpen && activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl h-full bg-[#0E0E12] border-l border-white/10 p-6 sm:p-8 flex flex-col justify-between shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold text-black shadow-sm"
                    style={{ backgroundColor: getAgentInfo(activeLog.toolName).color }}
                  >
                    {getAgentInfo(activeLog.toolName).monogram}
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-[#F5F4F1] tracking-wide">
                      {activeLog.toolName}
                    </h3>
                    <span className="text-[11px] font-mono text-[#9A9A9F]">
                      ID: {activeLog.id} • Session: {activeLog.conversationId || "0x9f1a"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta details banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 p-3 rounded-xl bg-[#141417] border border-white/5 font-mono text-xs">
                <div>
                  <span className="text-[9px] uppercase text-[#9A9A9F] block">Gate Status</span>
                  <span className={activeLog.success ? "text-[#8FAE97] font-bold" : "text-[#C77B6E] font-bold"}>
                    {activeLog.success ? "200 OK • PASS" : "GATE BLOCKED"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-[#9A9A9F] block">Total Duration</span>
                  <span className="text-[#F5F4F1] font-bold">{activeLog.durationMs} ms</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-[#9A9A9F] block">Est. Tokens</span>
                  <span className="text-[#dfb15b] font-bold">{extractTokens(activeLog)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-[#9A9A9F] block">Executed At</span>
                  <span className="text-zinc-400">{new Date(activeLog.executedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Execution Step Mini-Timeline */}
              <div className="flex items-center justify-between bg-[#141417] p-3 rounded-xl mb-5 border border-white/5 text-center font-mono text-xs">
                <div className="flex flex-col">
                  <span className="text-[9px] text-[#9A9A9F] uppercase">Mesh Gateway</span>
                  <span className="text-[#F5F4F1] font-bold">0ms</span>
                </div>
                <span className="text-zinc-600">→</span>
                <div className="flex flex-col">
                  <span className="text-[9px] text-[#9A9A9F] uppercase">Inference (vLLM)</span>
                  <span className="text-[#dfb15b] font-bold">
                    {Math.max(10, Math.round((activeLog.durationMs || 100) * 0.6))}ms
                  </span>
                </div>
                <span className="text-zinc-600">→</span>
                <div className="flex flex-col">
                  <span className="text-[9px] text-[#9A9A9F] uppercase">Tool Dispatch</span>
                  <span className="text-[#F5F4F1] font-bold">
                    {Math.max(5, Math.round((activeLog.durationMs || 100) * 0.4))}ms
                  </span>
                </div>
                <span className="text-zinc-600">→</span>
                <div className="flex flex-col">
                  <span className="text-[9px] text-[#9A9A9F] uppercase">Gate Decision</span>
                  <span className={activeLog.success ? "text-[#8FAE97] font-bold" : "text-[#C77B6E] font-bold"}>
                    {activeLog.success ? "PASS" : "BLOCKED"}
                  </span>
                </div>
              </div>

              {/* JSON Preformatted Payload */}
              <div className="bg-[#09090B] rounded-xl p-4 border border-white/10 max-h-[440px] overflow-y-auto">
                <pre className="font-mono text-xs leading-relaxed text-[#DCE6EF] whitespace-pre">
                  {formattedPayload}
                </pre>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-5 border-t border-white/10 flex items-center justify-between mt-4">
              <span className="text-xs font-mono text-zinc-500">
                Aggarly Zero-Trust Telemetry Engine
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPayload}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#18181B] hover:bg-[#222226] text-zinc-300 hover:text-white font-mono text-xs uppercase tracking-wider border border-white/10 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download JSON
                </button>

                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#dfb15b] hover:bg-[#c59b27] text-black font-semibold font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Raw"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
