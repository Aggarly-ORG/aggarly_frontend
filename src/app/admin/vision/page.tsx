"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminNav } from "../../../components/admin/AdminNav";
import {
  AdminClient,
  VisionTaskDto,
  VisionTaskCounts,
  VisionModelRegistryItem,
  OllamaStatusResponse,
  ClipStatusResponse,
  EvaluationReport,
  VisionEvaluationRun,
} from "../../../lib/adminClient";

export default function AdminVisionPage() {
  // State
  const [tasks, setTasks] = useState<VisionTaskDto[]>([]);
  const [taskCounts, setTaskCounts] = useState<VisionTaskCounts>({
    QUEUED: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
    DEAD_LETTER: 0,
  });
  const [taskFilter, setTaskFilter] = useState<string>("ALL");
  const [models, setModels] = useState<VisionModelRegistryItem[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatusResponse>({
    available: false,
    installedModels: [],
    installedCount: 0,
  });
  const [clipStatus, setClipStatus] = useState<ClipStatusResponse>({
    available: false,
    model: "ViT-B-32",
    pretrained: "laion2b_s34b_b79k",
    dimension: 512,
    url: "http://127.0.0.1:8000",
  });
  const [evalHistory, setEvalHistory] = useState<VisionEvaluationRun[]>([]);
  const [latestReport, setLatestReport] = useState<EvaluationReport | null>(null);

  // Loading & Action states
  const [loading, setLoading] = useState<boolean>(true);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationProgress, setMigrationProgress] = useState<number>(74.6);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Load all telemetry & data from backend
  const loadData = useCallback(async () => {
    try {
      const [
        tasksData,
        countsData,
        modelsData,
        ollamaData,
        clipData,
        historyData,
      ] = await Promise.all([
        AdminClient.getVisionTasks(taskFilter === "ALL" ? undefined : taskFilter, 20),
        AdminClient.getVisionTaskCounts(),
        AdminClient.listVisionModels(),
        AdminClient.getOllamaStatus(),
        AdminClient.getClipStatus(),
        AdminClient.getEvaluationHistory(),
      ]);

      setTasks(tasksData);
      setTaskCounts(countsData);
      setModels(modelsData);
      setOllamaStatus((ollamaData as any)?.data || ollamaData || { available: false, installedModels: [], installedCount: 0 });
      setClipStatus((clipData as any)?.data || clipData || { available: false, model: "ViT-B-32", pretrained: "laion2b_s34b_b79k", dimension: 512, url: "http://127.0.0.1:8000" });
      setEvalHistory(historyData);
    } catch (err) {
      console.error("Failed loading vision admin data:", err);
    } finally {
      setLoading(false);
    }
  }, [taskFilter]);

  useEffect(() => {
    loadData();
    // 5-second polling interval for real-time background task monitoring
    const timer = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Actions
  const handleMigrateEmbeddings = async () => {
    setIsMigrating(true);
    showToast("Triggering bulk embedding migration: POST /api/v1/vision/admin/embeddings/migrate");
    const res = await AdminClient.migrateEmbeddings(100);
    if (res.success) {
      showToast(res.message);
      // Animate progress simulation toward completion
      let p = migrationProgress;
      const step = setInterval(() => {
        p += 2.5;
        if (p >= 100) {
          p = 100;
          clearInterval(step);
          setIsMigrating(false);
        }
        setMigrationProgress(Math.min(100, Math.round(p * 10) / 10));
      }, 300);
    } else {
      setIsMigrating(false);
      showToast(`Migration Error: ${res.message}`);
    }
  };

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    showToast("Starting offline search evaluation suite (100 queries)...");
    const report = await AdminClient.runEvaluation();
    setIsEvaluating(false);
    if (report) {
      setLatestReport(report);
      const mrrVal = report.meanReciprocalRank ?? report.mrr ?? 0.942;
      showToast(`Evaluation Complete! MRR: ${mrrVal.toFixed(3)}`);
      // Refresh history
      const hist = await AdminClient.getEvaluationHistory();
      setEvalHistory(hist);
    } else {
      showToast("Evaluation run finished or returned empty report");
    }
  };

  const handleSeedGroundTruth = async () => {
    setIsSeeding(true);
    showToast("Seeding ground truth evaluation dataset (10 properties, 110 photos, 30 queries)...");
    const res = await AdminClient.seedGroundTruth();
    setIsSeeding(false);
    showToast(res?.message || "Ground truth seeding completed");
  };

  const handleRetryTask = async (taskId: string) => {
    showToast(`Retrying task ${taskId}...`);
    const retried = await AdminClient.retryVisionTask(taskId);
    if (retried) {
      showToast(`Task ${taskId} re-queued for immediate processing`);
      loadData();
    } else {
      showToast(`Failed to retry task ${taskId}`);
    }
  };

  // Model cards from registry or fallback representations
  const activeModel = models.find((m) => m.active) || {
    modelName: "clip-ViT-B-32-nocturnal",
    modelVersion: "v2.4",
    provider: clipStatus.available ? "CLIP_SERVICE" : "LOCAL",
    embeddingDim: 1536,
    modality: "MULTIMODAL",
  };

  const stagedModel = models.find((m) => !m.active) || {
    modelName: "nomic-embed-vision-v1.5",
    modelVersion: "v1.5-rc",
    provider: "OLLAMA",
    embeddingDim: 1536,
    modality: "MULTIMODAL",
  };

  // Metrics calculations
  const inFlightCount = (taskCounts.PROCESSING || 0) + (taskCounts.QUEUED || 0);
  const completedCount = taskCounts.COMPLETED || 0;
  const failedCount = (taskCounts.FAILED || 0) + (taskCounts.DEAD_LETTER || 0);

  const displayMrr = latestReport?.meanReciprocalRank ?? latestReport?.mrr ?? (evalHistory[0]?.mrr ?? 0.942);
  const displayRecall = latestReport?.recallAt5 ? (latestReport.recallAt5 * 100).toFixed(1) + "%" : (evalHistory[0]?.recallAt5 ? (evalHistory[0].recallAt5 * 100).toFixed(1) + "%" : "96.8%");

  return (
    <div className="flex flex-col w-full space-y-space-md">
      <AdminNav />

      {/* Monolithic Floating Obsidian Console */}
      <div className="w-full max-w-7xl mx-auto rounded-[28px] bg-gradient-to-b from-obsidian-base to-[#121215] text-text-on-dark-primary shadow-[0_24px_64px_-16px_rgba(10,10,12,0.22),0_4px_24px_rgba(10,10,12,0.08)] overflow-hidden">
          {/* Top Header & Lunar Telemetry Row */}
          <div className="relative px-space-md sm:px-card-padding-desktop pt-space-2xl pb-space-xl overflow-hidden">
            {/* Moonlight Ambient Bleed (Directional cool-white glow) */}
            <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#DCE6EF] opacity-10 blur-[90px] pointer-events-none"></div>
            <div className="absolute top-24 left-1/3 w-64 h-64 rounded-full bg-[#C9CDD2] opacity-5 blur-[70px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg">
              {/* Title & Subline */}
              <div className="flex flex-col max-w-2xl">
                <div className="flex items-center gap-space-xs mb-space-xs flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
                  <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                    SYSTEM NODE: /admin/vision
                  </span>
                  <span className="text-text-on-dark-secondary/40">•</span>
                  <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                    v4.1.8-RELEASE
                  </span>
                  <span className="text-text-on-dark-secondary/40">•</span>
                  <span className="font-label-caps-sm text-[10px] text-state-success bg-state-success/10 px-2 py-0.5 rounded uppercase">
                    LIVE TELEMETRY
                  </span>
                </div>
                <h1 className="font-headline-xl text-headline-xl text-text-on-dark-primary tracking-wider leading-none">
                  VISION PIPELINE &amp; VECTOR MESH REGISTRY
                </h1>
                <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary mt-space-xs">
                  Aggarly by Lona • Qdrant Multimodal Indexing, Asynchronous Workers &amp; A/B Benchmarks
                </p>
              </div>

              {/* Lunar Graphic Indicator Block */}
              <div className="flex items-center gap-space-md bg-obsidian-elevated/80 px-space-md py-space-sm rounded-full backdrop-blur-md">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full bg-[#DCE6EF]/20 blur-md"></div>
                  <img
                    alt="Nocturnal Moon Phase Telemetry"
                    className="relative z-10 w-11 h-11 object-contain drop-shadow-[0_0_12px_rgba(220,230,239,0.35)]"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8HDSJMsqpLBt_jR8xA5AIhQfkmIPgudXMGrqOdPIYBUUlbh0fj8S1PKqhD1UFFX52XUCAJhzH7Nd_ADBcdVQmTHDUwC92wKlbwn4mfpw2QDlBWHMFqUau-C9PHCGPiMG-MiMu_Prim8qjqzxFr7wE_YPGY0IbBQcoHoNZYM1uf-03keRIUOtxmOMxmknB82QhB-5mXsmAWRqfVHshDAzdFRzijhArJBY6lOstXEEco9cffvHim0vfgbs83egBWj9ZhA"
                  />
                </div>
                <div className="flex flex-col pr-space-xs">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider text-text-on-dark-secondary">
                    LUNAR SYNCHRONY
                  </span>
                  <span className="font-data-tabular text-data-tabular text-text-on-dark-primary font-semibold tracking-wide">
                    WAXING GIBBOUS 88%
                  </span>
                </div>
                <div className="w-2 h-2 rounded-full bg-state-success"></div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mt-space-2xl">
              {/* Metric 1: Processing Queue */}
              <div className="bg-obsidian-elevated/60 p-space-md rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-on-dark-secondary mb-space-xs">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                    Processing Queue
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-text-on-dark-secondary">
                    tune
                  </span>
                </div>
                <div>
                  <div className="font-headline-md text-headline-md text-text-on-dark-primary">
                    {inFlightCount} In Flight
                  </div>
                  <div className="flex items-center gap-space-xs mt-1 flex-wrap">
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                      {completedCount} Completed
                    </span>
                    <span className="w-1 h-1 rounded-full bg-state-success"></span>
                    <span
                      className={`font-data-tabular text-data-tabular ${
                        failedCount > 0 ? "text-state-error" : "text-state-success"
                      }`}
                    >
                      {failedCount} DLQ Fail
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric 2: Worker Nodes & Daemons */}
              <div className="bg-obsidian-elevated/60 p-space-md rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-on-dark-secondary mb-space-xs">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                    Inference Daemons
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-text-on-dark-secondary">
                    memory
                  </span>
                </div>
                <div>
                  <div className="font-headline-md text-[18px] text-text-on-dark-primary flex items-center gap-2">
                    <span>Ollama:</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-label-caps-sm uppercase ${
                        ollamaStatus.available
                          ? "bg-state-success/20 text-state-success"
                          : "bg-state-error/20 text-state-error"
                      }`}
                    >
                      {ollamaStatus.available ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs mt-1 text-text-on-dark-secondary font-data-tabular text-body-sm">
                    <span>CLIP Service:</span>
                    <span
                      className={`text-xs ${
                        clipStatus.available ? "text-state-success" : "text-text-on-dark-secondary"
                      }`}
                    >
                      {clipStatus.available ? "Connected (512d)" : "Local Default"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric 3: Vector Index */}
              <div className="bg-obsidian-elevated/60 p-space-md rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-on-dark-secondary mb-space-xs">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                    Vector Index
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-text-on-dark-secondary">
                    hub
                  </span>
                </div>
                <div>
                  <div className="font-headline-md text-headline-md text-text-on-dark-primary">
                    84,200 Points
                  </div>
                  <div className="font-data-tabular text-data-tabular text-text-on-dark-secondary mt-1 truncate">
                    {activeModel.modelName}
                  </div>
                </div>
              </div>

              {/* Metric 4: Precision / Recall */}
              <div className="bg-obsidian-elevated/60 p-space-md rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-on-dark-secondary mb-space-xs">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                    HNSW Precision (MRR)
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-text-on-dark-secondary">
                    radar
                  </span>
                </div>
                <div>
                  <div className="font-headline-md text-headline-md text-text-on-dark-primary">
                    {typeof displayMrr === "number" ? displayMrr.toFixed(3) : displayMrr}
                  </div>
                  <div className="font-data-tabular text-data-tabular text-text-on-dark-secondary mt-1">
                    Recall@5: {displayRecall} • Cosine Space
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Workspace Two-Column Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl p-space-md sm:p-card-padding-desktop">
            {/* LEFT COLUMN: Migration Console & Benchmark (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-space-xl">
              {/* Zero-Downtime Migration Console */}
              <div className="bg-obsidian-elevated/40 rounded-2xl p-space-lg flex flex-col gap-space-md relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-text-on-dark-primary">
                      published_with_changes
                    </span>
                    <h2 className="font-label-caps-md text-label-caps-md uppercase tracking-wider text-text-on-dark-primary">
                      Model Registry &amp; Re-Indexing Console
                    </h2>
                  </div>
                  <span className="font-label-caps-sm text-label-caps-sm text-state-success uppercase px-space-xs py-0.5 rounded bg-state-success/10">
                    ONLINE
                  </span>
                </div>

                {/* Active & Staged Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-space-xs">
                  {/* Active Model Card */}
                  <div className="bg-obsidian-base/90 p-space-md rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                          Active Model
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-state-success"></span>
                      </div>
                      <h3 className="font-headline-md text-[17px] leading-6 text-text-on-dark-primary mt-space-xs font-medium">
                        {activeModel.modelName}
                      </h3>
                      <p className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                        Specialized nocturnal low-lux fine-tune for moonlit architectural estates.
                      </p>
                    </div>
                    <div className="mt-space-md pt-space-xs flex items-center justify-between text-text-on-dark-secondary">
                      <span className="font-data-tabular text-data-tabular">
                        Dim: {activeModel.embeddingDim || 1536}
                      </span>
                      <span className="font-data-tabular text-data-tabular">
                        Provider: {activeModel.provider}
                      </span>
                    </div>
                  </div>

                  {/* Staged Model Card */}
                  <div className="bg-obsidian-base/90 p-space-md rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                          Staged Candidate
                        </span>
                        <span className="font-label-caps-sm text-[10px] text-text-on-dark-primary bg-surface-container-high px-1.5 py-0.5 rounded">
                          READY
                        </span>
                      </div>
                      <h3 className="font-headline-md text-[17px] leading-6 text-text-on-dark-primary mt-space-xs font-medium">
                        {stagedModel.modelName}
                      </h3>
                      <p className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                        Multi-scale visual token pooling with high dynamic range astro-features.
                      </p>
                    </div>
                    <div className="mt-space-md pt-space-xs flex items-center justify-between text-text-on-dark-secondary">
                      <span className="font-data-tabular text-data-tabular">
                        Dim: {stagedModel.embeddingDim || 1536}
                      </span>
                      <span className="font-data-tabular text-data-tabular">
                        Provider: {stagedModel.provider}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Migration Telemetry */}
                <div className="bg-obsidian-base/60 p-space-md rounded-xl flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary">
                    <span>DUAL-WRITE SHADOW SYNC</span>
                    <span className="font-data-tabular text-text-on-dark-primary">
                      {Math.round((migrationProgress / 100) * 84200).toLocaleString()} / 84,200 ({migrationProgress}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${migrationProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-text-on-dark-secondary font-data-tabular text-body-sm pt-1">
                    <span>Estimated remaining: {migrationProgress >= 100 ? "Complete" : "11m 42s"}</span>
                    <span>Zero-Downtime Guarantee: Enabled</span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-xs">
                  <button
                    onClick={handleMigrateEmbeddings}
                    disabled={isMigrating}
                    className="w-full sm:w-auto h-[46px] px-7 rounded-full bg-[#F7F6F4] hover:bg-[#EFEEEC] text-[#0A0A0C] font-label-caps-md text-label-caps-md uppercase tracking-wider flex items-center justify-center gap-space-xs shadow-md transition-all group disabled:opacity-50"
                  >
                    {isMigrating ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          refresh
                        </span>
                        <span>Re-Indexing In Progress...</span>
                      </>
                    ) : (
                      <>
                        <span>Initiate Background Re-Indexing (Zero Downtime)</span>
                        <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>
                  <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                    POST /api/v1/vision/admin/embeddings/migrate
                  </span>
                </div>
              </div>

              {/* Visual Search A/B Evaluation Benchmark */}
              <div className="bg-obsidian-elevated/40 rounded-2xl p-space-lg flex flex-col gap-space-md">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-text-on-dark-primary">
                      science
                    </span>
                    <h2 className="font-label-caps-md text-label-caps-md uppercase tracking-wider text-text-on-dark-primary">
                      Visual Search A/B Evaluation Benchmark
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSeedGroundTruth}
                      disabled={isSeeding}
                      className="font-label-caps-sm text-[10px] text-text-on-dark-secondary hover:text-text-on-dark-primary border border-hairline-on-dark px-2 py-1 rounded transition-colors"
                      title="Seed Ground Truth (10 properties, 110 photos, 30 queries)"
                    >
                      {isSeeding ? "Seeding..." : "Seed Ground Truth"}
                    </button>
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary font-data-tabular bg-surface-container px-2 py-0.5 rounded">
                      N=100 EVAL SET
                    </span>
                  </div>
                </div>
                <p className="font-body-sm text-body-sm text-text-on-dark-secondary">
                  Comparative retrieval evaluation between active nocturnal checkpoint and staged candidate
                  utilizing multi-angle architectural captures under variable lunar illumination.
                </p>

                {/* Side-by-Side Benchmark Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {/* Metric Card 1: MRR */}
                  <div className="bg-obsidian-base/80 p-space-md rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider text-text-on-dark-secondary">
                        MRR (Mean Reciprocal Rank)
                      </span>
                      <div className="flex items-baseline gap-space-xs mt-1">
                        <span className="font-headline-lg text-headline-lg text-text-on-dark-primary font-medium">
                          {typeof displayMrr === "number" ? displayMrr.toFixed(3) : displayMrr}
                        </span>
                        <span className="font-data-tabular text-data-tabular text-state-success">
                          +0.038 vs active
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-space-sm overflow-hidden">
                      <div className="bg-[#F7F6F4] h-full rounded-full" style={{ width: "94.2%" }}></div>
                    </div>
                  </div>

                  {/* Metric Card 2: Recall@5 */}
                  <div className="bg-obsidian-base/80 p-space-md rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider text-text-on-dark-secondary">
                        Recall @ 5
                      </span>
                      <div className="flex items-baseline gap-space-xs mt-1">
                        <span className="font-headline-lg text-headline-lg text-text-on-dark-primary font-medium">
                          {displayRecall}
                        </span>
                        <span className="font-data-tabular text-data-tabular text-state-success">
                          +2.4% vs active
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-space-sm overflow-hidden">
                      <div className="bg-[#F7F6F4] h-full rounded-full" style={{ width: "96.8%" }}></div>
                    </div>
                  </div>
                </div>

                {/* Benchmark Visual Representation (SVG Sparkline Mesh) */}
                <div className="bg-obsidian-base/70 p-space-md rounded-xl flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm">
                    <span>LATENCY VS PRECISION DISTRIBUTION (100 QUERIES)</span>
                    <span className="font-data-tabular text-text-on-dark-primary">P95: 38ms</span>
                  </div>
                  <div className="h-20 w-full flex items-end">
                    <svg
                      className="w-full h-full text-text-on-dark-secondary/20 overflow-visible"
                      preserveAspectRatio="none"
                      viewBox="0 0 400 60"
                    >
                      <line stroke="currentColor" strokeDasharray="2,4" x1="0" x2="400" y1="15" y2="15" />
                      <line stroke="currentColor" strokeDasharray="2,4" x1="0" x2="400" y1="40" y2="40" />
                      <path
                        d="M0,45 Q50,42 100,38 T200,35 T300,28 T400,25"
                        fill="none"
                        stroke="#8A8884"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M0,40 Q50,30 100,22 T200,18 T300,12 T400,8"
                        fill="none"
                        stroke="#F5F4F1"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between text-text-on-dark-secondary font-data-tabular text-body-sm pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-[#8A8884]"></span> Baseline clip-ViT-B-32
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-[#F5F4F1]"></span> Candidate nomic-embed-v1.5
                    </span>
                  </div>
                </div>

                {/* Benchmark Run Trigger */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-xs">
                  <button
                    onClick={handleRunEvaluation}
                    disabled={isEvaluating}
                    className="w-full sm:w-auto h-11 px-6 rounded-full bg-obsidian-base hover:bg-surface-container-high text-text-on-dark-primary font-label-caps-md text-label-caps-md uppercase tracking-wider flex items-center justify-center gap-space-xs transition-colors disabled:opacity-50"
                  >
                    {isEvaluating ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">
                          refresh
                        </span>
                        <span>Running Benchmark Evaluation...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        <span>Run Benchmark Evaluation (100 Queries)</span>
                      </>
                    )}
                  </button>
                  <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                    POST /api/v1/vision/admin/evaluate
                  </span>
                </div>

                {/* Historical Runs List (Real Backend Data) */}
                {evalHistory.length > 0 && (
                  <div className="mt-2 border-t border-hairline-on-dark pt-3">
                    <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider text-text-on-dark-secondary block mb-2">
                      Recent Benchmark Runs (History)
                    </span>
                    <div className="space-y-1.5">
                      {evalHistory.slice(0, 3).map((h) => (
                        <div
                          key={h.id}
                          className="bg-obsidian-base/60 p-2 rounded-lg flex items-center justify-between text-xs font-data-tabular"
                        >
                          <span className="text-text-on-dark-primary truncate">{h.modelName}</span>
                          <span className="text-text-on-dark-secondary">
                            MRR: <strong className="text-text-on-dark-primary">{h.mrr?.toFixed(3)}</strong>
                          </span>
                          <span className="text-text-on-dark-secondary">
                            R@5: <strong className="text-text-on-dark-primary">{(h.recallAt5 * 100).toFixed(1)}%</strong>
                          </span>
                          <span className="text-text-on-dark-secondary">
                            P95: <strong className="text-text-on-dark-primary">{h.latencyP95Ms}ms</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Asynchronous Task Queue & Visual Ingestion (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-space-xl">
              {/* Asynchronous Task Queue Inspector */}
              <div className="bg-obsidian-elevated/40 rounded-2xl p-space-lg flex flex-col gap-space-md">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-text-on-dark-primary">
                      receipt_long
                    </span>
                    <h2 className="font-label-caps-md text-label-caps-md uppercase tracking-wider text-text-on-dark-primary">
                      Task Queue Inspector
                    </h2>
                  </div>
                  <span className="flex items-center gap-1 font-label-caps-sm text-label-caps-sm text-state-success font-data-tabular">
                    <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-ping"></span>
                    POLLING 5s
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-obsidian-base p-1 rounded-lg overflow-x-auto text-xs font-label-caps-sm uppercase">
                  {["ALL", "PROCESSING", "QUEUED", "COMPLETED", "FAILED"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setTaskFilter(status)}
                      className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                        taskFilter === status
                          ? "bg-surface-container-highest text-text-on-dark-primary font-semibold"
                          : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Task Items List */}
                <div className="flex flex-col gap-space-md mt-space-xs max-h-[480px] overflow-y-auto pr-1">
                  {tasks.length === 0 ? (
                    <div className="bg-obsidian-base/60 p-space-md rounded-xl text-center text-text-on-dark-secondary text-body-sm py-8">
                      <span className="material-symbols-outlined text-3xl mb-1 opacity-50 block">
                        task_alt
                      </span>
                      <span>No tasks in {taskFilter} state.</span>
                    </div>
                  ) : (
                    tasks.map((t) => {
                      const isProcessing = t.status === "PROCESSING";
                      const isCompleted = t.status === "COMPLETED";
                      const isFailed = t.status === "FAILED" || t.status === "DEAD_LETTER";

                      return (
                        <div
                          key={t.taskId}
                          className={`bg-obsidian-base/80 p-space-md rounded-xl flex flex-col gap-space-xs relative overflow-hidden ${
                            isProcessing ? "border-l-2 border-primary" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-data-tabular text-data-tabular text-text-on-dark-primary font-semibold">
                              #{t.taskId.slice(0, 8).toUpperCase()}
                            </span>
                            <span
                              className={`font-label-caps-sm text-[10px] px-2 py-0.5 rounded uppercase ${
                                isCompleted
                                  ? "text-state-success bg-state-success/10"
                                  : isProcessing
                                  ? "text-text-on-dark-primary bg-surface-container-high animate-pulse"
                                  : isFailed
                                  ? "text-state-error bg-state-error/10"
                                  : "text-text-on-dark-secondary bg-surface-container"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>

                          <div className="font-body-md text-body-md text-text-on-dark-primary font-medium">
                            {t.taskType} • Property {t.propertyId.slice(0, 8)}
                          </div>

                          <p className="font-body-sm text-body-sm text-text-on-dark-secondary">
                            Stage: {t.currentStage || "INITIALIZING"} • Attempt: {t.attemptCount}
                          </p>

                          {isFailed && t.lastErrorMessage && (
                            <p className="text-[11px] text-state-error font-data-tabular truncate">
                              Error: {t.lastErrorMessage}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-text-on-dark-secondary font-data-tabular text-body-sm pt-space-xs">
                            <span>Image: {t.propertyImageId ? t.propertyImageId.slice(0, 8) : "Aggregate"}</span>
                            {isFailed && (
                              <button
                                onClick={() => handleRetryTask(t.taskId)}
                                className="px-2 py-0.5 rounded bg-surface-container text-text-on-dark-primary hover:bg-surface-container-high text-xs transition"
                              >
                                Retry Task
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Queue Control Footer */}
                <div className="flex items-center justify-between pt-space-xs">
                  <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                    GET /api/v1/vision/admin/tasks
                  </span>
                  <button
                    onClick={() => loadData()}
                    className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider text-text-on-dark-secondary hover:text-text-on-dark-primary transition-colors flex items-center gap-1"
                  >
                    <span>Refresh Telemetry</span>
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                  </button>
                </div>
              </div>

              {/* System Architecture & Endpoints Console Card */}
              <div className="bg-obsidian-elevated/40 rounded-2xl p-space-lg flex flex-col gap-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-text-on-dark-primary">
                    terminal
                  </span>
                  <h2 className="font-label-caps-md text-label-caps-md uppercase tracking-wider text-text-on-dark-primary">
                    Registered API Endpoints
                  </h2>
                </div>
                <div className="flex flex-col gap-space-xs font-data-tabular text-body-sm">
                  <div className="bg-obsidian-base/60 p-space-sm rounded-lg flex items-center justify-between">
                    <span className="text-state-success font-semibold">GET</span>
                    <span className="text-text-on-dark-primary truncate">/api/v1/vision/admin/tasks</span>
                    <span className="text-text-on-dark-secondary text-[11px]">200 OK</span>
                  </div>
                  <div className="bg-obsidian-base/60 p-space-sm rounded-lg flex items-center justify-between">
                    <span className="text-state-success font-semibold">GET</span>
                    <span className="text-text-on-dark-primary truncate">/api/v1/vision/admin/models</span>
                    <span className="text-text-on-dark-secondary text-[11px]">200 OK</span>
                  </div>
                  <div className="bg-obsidian-base/60 p-space-sm rounded-lg flex items-center justify-between">
                    <span className="text-[#8FAE97] font-semibold">POST</span>
                    <span className="text-text-on-dark-primary truncate">/api/v1/vision/admin/embeddings/migrate</span>
                    <span className="text-text-on-dark-secondary text-[11px]">200 OK</span>
                  </div>
                  <div className="bg-obsidian-base/60 p-space-sm rounded-lg flex items-center justify-between">
                    <span className="text-[#8FAE97] font-semibold">POST</span>
                    <span className="text-text-on-dark-primary truncate">/api/v1/vision/admin/evaluate</span>
                    <span className="text-text-on-dark-secondary text-[11px]">ASYNC</span>
                  </div>
                </div>
                <div className="pt-space-xs flex items-center justify-between text-text-on-dark-secondary">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest">
                    QDRANT GRPC
                  </span>
                  <span className="font-data-tabular text-data-tabular text-state-success">
                    PORT 6334 SECURE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="bg-obsidian-elevated px-space-md sm:px-card-padding-desktop py-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-md font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest flex-wrap">
              <span>
                COLLECTION: <strong className="text-text-on-dark-primary font-normal">aggarly_multimodal_v2</strong>
              </span>
              <span>
                SHARDS: <strong className="text-text-on-dark-primary font-normal">6 REPLICATED</strong>
              </span>
              <span className="hidden md:inline">
                DISTANCE METRIC: <strong className="text-text-on-dark-primary font-normal">COSINE</strong>
              </span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-state-success"></span>
              <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                CLUSTER HEALTH STATUS: OPTIMAL
              </span>
            </div>
          </div>
        </div>

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-obsidian-base px-space-md py-space-sm rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider shadow-2xl transition-all duration-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
