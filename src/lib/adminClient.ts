import { AuthClient } from "./authClient";
import { AggarlyChatBridgeClient } from "./chatBridgeClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface PaginationMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface AdminApiResult<T> {
  data: T | null;
  status: number;
  statusText: string;
  latencyMs: number;
  error: string | null;
  timestamp: string;
}

export interface EarningsSummaryResponse {
  totalEarnings: number;
  totalRefunds: number;
  netEarnings: number;
  currency: string;
}

export type AdminEarningsSummary = EarningsSummaryResponse;

export interface PaymentAttemptResponse {
  id: string;
  result: string;
  gatewayErrorCode?: string | null;
  createdAt?: string;
}

export interface RefundResponse {
  refundId: string;
  amount: number;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | string;
}

export interface PaymentResponse {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED" | string;
  totalRefundedAmount?: number;
  capturedAt?: string | null;
  createdAt?: string;
}

export interface PaymentDetailResponse {
  payment: PaymentResponse;
  attempts: PaymentAttemptResponse[];
  refunds: RefundResponse[];
}

export interface RefundPayload {
  amount?: number;
  reason?: string;
}

export interface AiUsageStatsResponse {
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalEstimatedCostUsd: number;
  averageDurationMs: number;
}

export type AdminAiUsageStats = AiUsageStatsResponse;

export interface ToolCallLogResponse {
  id: string;
  conversationId: string;
  toolName: string;
  parametersJson: string;
  resultSummaryJson: string;
  success: boolean;
  errorCode?: string | null;
  durationMs: number;
  executedAt: string;
}

export type VisionTaskStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "DEAD_LETTER";

export type VisionTaskSummary = Record<VisionTaskStatus, number>;
export type VisionTaskCounts = Record<string, number>;

export interface VisionTaskDto {
  taskId: string;
  propertyId: string;
  propertyImageId: string | null;
  taskType: string;
  status: VisionTaskStatus | string;
  currentStage: string | null;
  attemptCount: number;
  lastErrorMessage: string | null;
  scheduledAt: string;
  finishedAt: string | null;
}

export type VisionTaskItem = VisionTaskDto;

export interface VisionModelRegistryItem {
  id: string;
  modelName: string;
  modelVersion: string;
  taskType: string;
  embeddingDim?: number;
  provider: string;
  modality?: string;
  active: boolean;
  promptVersion?: string;
  preprocessingVersion?: string;
  modelRevision?: string;
  modelChecksum?: string;
  configurationJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OllamaStatusResponse {
  available: boolean;
  installedModels: string[];
  installedCount: number;
}

export interface ClipStatusResponse {
  available: boolean;
  model: string;
  pretrained: string;
  dimension: number;
  url: string;
}

export interface EvaluationReport {
  runId?: string;
  evaluatorVersion?: string;
  modelIdentifier?: string;
  timestamp?: string;
  queriesEvaluated?: number;
  mrr?: number;
  meanReciprocalRank?: number;
  recallAt1?: number;
  recallAt5?: number;
  recallAt10?: number;
  ndcgAt10?: number;
  meanAveragePrecision?: number;
  latencyP50Ms?: number;
  latencyP95Ms?: number;
  latencyP99Ms?: number;
  queryResults?: Array<{
    queryId: string;
    textQuery: string;
    reciprocalRank: number;
    recallAt5: number;
    recallAt10: number;
    latencyMs: number;
  }>;
}

export interface VisionEvaluationRun {
  id: string;
  evaluatedAt: string;
  modelName: string;
  mrr: number;
  recallAt1: number;
  recallAt5: number;
  recallAt10: number;
  ndcgAt10: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  totalQueries: number;
  configurationJson?: string;
}

export interface ABComparisonReport {
  baselineRunId: string;
  candidateRunId: string;
  baselineModel: string;
  candidateModel: string;
  changeDescription: string;
  baselineMrr: number;
  candidateMrr: number;
  mrrDelta: number;
  mrrPercentChange: number;
  baselineRecallAt5: number;
  candidateRecallAt5: number;
  recallAt5Delta: number;
  recallAt5PercentChange: number;
  baselineLatencyP95Ms: number;
  candidateLatencyP95Ms: number;
  latencyP95DeltaMs: number;
  verdict: string;
}

export interface UserProfileSummary {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  roles?: string[];
  role?: string;
  status?: string;
}

export interface PropertyImageResponse {
  id: string;
  objectKey: string;
  displayOrder: number;
  isCover: boolean;
}

export interface AmenityResponse {
  id: string;
  name: string;
  category?: string;
  icon?: string;
}

export interface AddressResponse {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface PropertyAdminResponse {
  id: string;
  hostId: string;
  title: string;
  description: string;
  propertyType: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  basePricePerNight: number;
  cancellationPolicy: string;
  latitude?: number;
  longitude?: number;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | string;
  avgRating: number;
  reviewCount: number;
  address?: AddressResponse;
  images: PropertyImageResponse[];
  amenities: AmenityResponse[];
}

export interface PropertyVisualProfileDto {
  propertyId: string;
  profileStatus: string;
  totalImages: number;
  processedImages: number;
  usableImages: number;
  coverageScore: number;
  roomCoverage: Record<string, number>;
  bestPerScene: Record<string, string>;
  missingRooms: string[];
  recommendedCoverImageId?: string | null;
  representativeImageIds: string[];
  romanticScore?: number;
  luxuryScore?: number;
  familyScore?: number;
  businessScore?: number;
  relaxationScore?: number;
  styles: string[];
  amenities: string[];
  visualSummary?: string;
}

export interface PropertyImageMetadataDto {
  imageId: string;
  propertyId: string;
  processingStatus: string;
  currentStage?: string;
  sceneType: string;
  sceneConfidence?: number;
  indoor?: boolean;
  viewType?: string;
  aiCaption?: string;
  altText?: string;
  qualityGrade?: string;
}

export interface HostCoverageReportDto {
  propertyId: string;
  coverageScore: number;
  coveredRooms: string[];
  missingRooms: string[];
  recommendations: string[];
}

export interface HostImprovementAdviceDto {
  propertyId: string;
  criticalIssues: string[];
  lightingSuggestions: string[];
  compositionSuggestions: string[];
  stagingSuggestions: string[];
}

export interface CombinedAdminTelemetry {
  earnings: AdminApiResult<EarningsSummaryResponse>;
  aiStats: AdminApiResult<AiUsageStatsResponse>;
  visionSummary: AdminApiResult<VisionTaskSummary>;
  ollamaStatus?: AdminApiResult<OllamaStatusResponse>;
  clipStatus?: AdminApiResult<ClipStatusResponse>;
  fetchedAt: Date;
}

export class AdminClient {
  private static getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
    const token = AuthClient.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    };
  }

  private static async executeFetch<T>(
    endpointPath: string,
    options: RequestInit = {}
  ): Promise<AdminApiResult<T>> {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const url = `${API_BASE_URL}${endpointPath}`;

    try {
      const response = await AggarlyChatBridgeClient.authFetch(url, options);

      const latencyMs = Math.max(
        1,
        Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime)
      );

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const body = await response.json();
          errorMessage = body?.message || body?.error || errorMessage;
        } catch {
          // Keep default message
        }

        return {
          data: null,
          status: response.status,
          statusText: response.statusText,
          latencyMs,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        };
      }

      const rawJson = await response.json();
      const payload = rawJson?.data !== undefined ? rawJson.data : rawJson;

      return {
        data: payload as T,
        status: response.status,
        statusText: response.statusText,
        latencyMs,
        error: null,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const latencyMs = Math.max(
        1,
        Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime)
      );

      return {
        data: null,
        status: 0,
        statusText: "Network Failure",
        latencyMs,
        error: err?.message || "Failed to establish connection to backend service",
        timestamp: new Date().toISOString(),
      };
    }
  }

  // --------------------------------------------------------------------------
  // Financial Endpoints
  // --------------------------------------------------------------------------

  /**
   * Get platform earnings summary
   * GET /api/v1/admin/payments/earnings/summary
   */
  static async getEarningsSummary(currency: string = "EUR"): Promise<EarningsSummaryResponse | null> {
    const query = encodeURIComponent(currency);
    const result = await this.executeFetch<EarningsSummaryResponse>(
      `/api/v1/admin/payments/earnings/summary?currency=${query}`,
      { method: "GET" }
    );
    if (!result.data) return null;
    return {
      totalEarnings: Number(result.data.totalEarnings || 0),
      totalRefunds: Number(result.data.totalRefunds || 0),
      netEarnings: Number(result.data.netEarnings || 0),
      currency: String(result.data.currency || currency),
    };
  }

  /**
   * Telemetry-wrapped earnings summary for live dashboard metrics
   */
  static async getEarningsSummaryTelemetry(currency: string = "EUR"): Promise<AdminApiResult<EarningsSummaryResponse>> {
    const query = encodeURIComponent(currency);
    const result = await this.executeFetch<EarningsSummaryResponse>(
      `/api/v1/admin/payments/earnings/summary?currency=${query}`,
      { method: "GET" }
    );
    if (result.data) {
      result.data = {
        totalEarnings: Number(result.data.totalEarnings || 0),
        totalRefunds: Number(result.data.totalRefunds || 0),
        netEarnings: Number(result.data.netEarnings || 0),
        currency: String(result.data.currency || currency),
      };
    }
    return result;
  }

  /**
   * Get detailed payment audit log for a booking
   * GET /api/v1/admin/payments/{bookingId}/details
   */
  static async getPaymentDetails(bookingId: string): Promise<PaymentDetailResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/admin/payments/${encodeURIComponent(bookingId)}/details`
      );
      if (!res.ok) return null;
      const json = await res.json();
      const raw = json.data || json;
      if (!raw) return null;

      return {
        payment: raw.payment || raw,
        attempts: Array.isArray(raw.attempts) ? raw.attempts : [],
        refunds: Array.isArray(raw.refunds) ? raw.refunds : [],
      };
    } catch (err) {
      console.error("[AdminClient.getPaymentDetails] Network error:", err);
      return null;
    }
  }

  /**
   * Get all payments associated with a specific user
   * GET /api/v1/admin/payments/users/{userId}
   */
  static async getUserPayments(
    userId: string,
    page: number = 0,
    size: number = 20
  ): Promise<{ items: PaymentResponse[]; meta?: PaginationMeta } | null> {
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
      });
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/admin/payments/users/${encodeURIComponent(userId)}?${params.toString()}`
      );
      if (!res.ok) return null;
      const json = await res.json();
      const items = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.content)
        ? json.data.content
        : Array.isArray(json)
        ? json
        : [];

      const rawMeta = json.meta || json.pagination;
      const meta: PaginationMeta | undefined = rawMeta
        ? {
            page: rawMeta.page ?? rawMeta.pageNumber ?? page,
            size: rawMeta.size ?? rawMeta.pageSize ?? size,
            totalElements: Number(rawMeta.totalElements ?? items.length),
            totalPages: Number(rawMeta.totalPages ?? 1),
            first: Boolean(rawMeta.isFirst ?? rawMeta.first ?? (page === 0)),
            last: Boolean(rawMeta.isLast ?? rawMeta.last ?? true),
            hasNext: Boolean(rawMeta.hasNext),
            hasPrevious: Boolean(rawMeta.hasPrevious),
          }
        : undefined;

      return { items, meta };
    } catch (err) {
      console.error("[AdminClient.getUserPayments] Network error:", err);
      return null;
    }
  }

  /**
   * Process refund for a booking payment
   * POST /api/v1/payments/{bookingId}/refund
   */
  static async refundPayment(
    bookingId: string,
    payload: RefundPayload
  ): Promise<RefundResponse | null> {
    try {
      const idempotencyKey = `ref_${bookingId.slice(0, 8)}_${Date.now()}`;
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/payments/${encodeURIComponent(bookingId)}/refund?idempotencyKey=${encodeURIComponent(idempotencyKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: payload.amount,
            reason: payload.reason || "Administrative refund",
          }),
        }
      );
      if (!res.ok) {
        let errMessage = `Refund request failed with HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          errMessage = errBody?.message || errBody?.error || errMessage;
        } catch {
          // fallback
        }
        throw new Error(errMessage);
      }
      const json = await res.json();
      return (json.data || json) as RefundResponse;
    } catch (err: any) {
      console.error("[AdminClient.refundPayment] Network error:", err);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // AI Agent Audit Endpoints
  // --------------------------------------------------------------------------

  /**
   * Get aggregated LLM usage and token statistics
   * GET /api/v1/ai/audit/stats
   */
  static async getUsageStats(userId?: string): Promise<AiUsageStatsResponse | null> {
    const url = userId
      ? `/api/v1/ai/audit/stats?userId=${encodeURIComponent(userId)}`
      : `/api/v1/ai/audit/stats`;

    const result = await this.executeFetch<AiUsageStatsResponse>(url, { method: "GET" });
    if (!result.data) return null;
    return {
      totalInvocations: Number(result.data.totalInvocations || 0),
      successfulInvocations: Number(result.data.successfulInvocations || 0),
      failedInvocations: Number(result.data.failedInvocations || 0),
      totalPromptTokens: Number(result.data.totalPromptTokens || 0),
      totalCompletionTokens: Number(result.data.totalCompletionTokens || 0),
      totalEstimatedCostUsd: Number(result.data.totalEstimatedCostUsd || 0),
      averageDurationMs: Number(result.data.averageDurationMs || 0),
    };
  }

  /**
   * Telemetry-wrapped AI usage stats for live dashboard metrics
   */
  static async getAiUsageStatsTelemetry(userId?: string): Promise<AdminApiResult<AiUsageStatsResponse>> {
    const url = userId
      ? `/api/v1/ai/audit/stats?userId=${encodeURIComponent(userId)}`
      : `/api/v1/ai/audit/stats`;

    const result = await this.executeFetch<AiUsageStatsResponse>(url, { method: "GET" });
    if (result.data) {
      result.data = {
        totalInvocations: Number(result.data.totalInvocations || 0),
        successfulInvocations: Number(result.data.successfulInvocations || 0),
        failedInvocations: Number(result.data.failedInvocations || 0),
        totalPromptTokens: Number(result.data.totalPromptTokens || 0),
        totalCompletionTokens: Number(result.data.totalCompletionTokens || 0),
        totalEstimatedCostUsd: Number(result.data.totalEstimatedCostUsd || 0),
        averageDurationMs: Number(result.data.averageDurationMs || 0),
      };
    }
    return result;
  }

  /**
   * Query agent tool call execution audit logs
   * GET /api/v1/ai/audit/invocations
   */
  static async getToolInvocations(params: {
    userId?: string;
    toolName?: string;
    success?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  } = {}): Promise<{ items: ToolCallLogResponse[]; meta?: PaginationMeta } | null> {
    try {
      const q = new URLSearchParams();
      if (params.userId) q.set("userId", params.userId);
      if (params.toolName) q.set("toolName", params.toolName);
      if (params.success !== undefined) q.set("success", String(params.success));
      if (params.page !== undefined) q.set("page", String(params.page));
      if (params.size !== undefined) q.set("size", String(params.size));
      if (params.sort) q.set("sort", params.sort);

      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/ai/audit/invocations?${q.toString()}`
      );
      if (!res.ok) return null;
      const json = await res.json();
      const items: ToolCallLogResponse[] = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.content)
        ? json.data.content
        : Array.isArray(json)
        ? json
        : [];

      const rawMeta = json.meta || json.pagination;
      const meta: PaginationMeta | undefined = rawMeta
        ? {
            page: rawMeta.page ?? rawMeta.pageNumber ?? (params.page || 0),
            size: rawMeta.size ?? rawMeta.pageSize ?? (params.size || 15),
            totalElements: Number(rawMeta.totalElements ?? items.length),
            totalPages: Number(rawMeta.totalPages ?? 1),
            first: Boolean(rawMeta.isFirst ?? rawMeta.first ?? ((params.page || 0) === 0)),
            last: Boolean(rawMeta.isLast ?? rawMeta.last ?? true),
            hasNext: Boolean(rawMeta.hasNext),
            hasPrevious: Boolean(rawMeta.hasPrevious),
          }
        : undefined;

      return { items, meta };
    } catch (err) {
      console.error("[AdminClient.getToolInvocations] Network error:", err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Vision & Pipeline Endpoints
  // --------------------------------------------------------------------------

  /**
   * Background vision processing task breakdown by status
   * GET /api/v1/vision/admin/tasks/summary
   */
  static async getTaskCounts(): Promise<VisionTaskCounts> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/tasks/summary`
      );
      if (!res.ok) return {};
      const json = await res.json();
      return (json.data || json) as VisionTaskCounts;
    } catch (err) {
      console.error("[AdminClient.getTaskCounts] Network error:", err);
      return {};
    }
  }

  /**
   * Telemetry-wrapped Vision Task breakdown
   */
  static async getVisionTaskSummary(): Promise<AdminApiResult<VisionTaskSummary>> {
    const result = await this.executeFetch<Record<string, any>>(`/api/v1/vision/admin/tasks/summary`, {
      method: "GET",
    });

    if (!result.data) {
      return result as AdminApiResult<VisionTaskSummary>;
    }

    const normalized: VisionTaskSummary = {
      QUEUED: Number(result.data.QUEUED || 0),
      PROCESSING: Number(result.data.PROCESSING || 0),
      COMPLETED: Number(result.data.COMPLETED || 0),
      FAILED: Number(result.data.FAILED || 0),
      DEAD_LETTER: Number(result.data.DEAD_LETTER || 0),
    };

    return {
      ...result,
      data: normalized,
    };
  }

  /**
   * Query background vision processing queue tasks
   * GET /api/v1/vision/admin/tasks
   */
  static async getTasks(status?: string, limit: number = 20): Promise<VisionTaskDto[]> {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (status && status !== "ALL") params.set("status", status);

      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/tasks?${params.toString()}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      const list = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.content)
        ? json.data.content
        : Array.isArray(json)
        ? json
        : [];
      return list as VisionTaskDto[];
    } catch (err) {
      console.error("[AdminClient.getTasks] Network error:", err);
      return [];
    }
  }

  /**
   * Retry failed or dead-letter vision task
   * POST /api/v1/vision/admin/tasks/{taskId}/retry
   */
  static async retryTask(taskId: string): Promise<VisionTaskDto | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/tasks/${taskId}/retry`,
        { method: "POST" }
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as VisionTaskDto;
    } catch (err) {
      console.error("[AdminClient.retryTask] Network error:", err);
      return null;
    }
  }

  /**
   * Reprocess all images of a property
   * POST /api/v1/vision/admin/property/{propertyId}/reprocess
   */
  static async reprocessProperty(propertyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/property/${propertyId}/reprocess`,
        { method: "POST" }
      );
      if (!res.ok) return { success: false, message: `Failed with status ${res.status}` };
      const json = await res.json();
      return { success: true, message: json.data || "Reprocessing enqueued" };
    } catch (err: any) {
      return { success: false, message: err?.message || "Network error" };
    }
  }

  /**
   * Bulk embedding migration
   * POST /api/v1/vision/admin/embeddings/migrate
   */
  static async migrateEmbeddings(batchSize: number = 100): Promise<{ success: boolean; message: string; data?: string; error?: string }> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/embeddings/migrate?batchSize=${batchSize}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const errorMsg = `Failed with status ${res.status}`;
        return { success: false, message: errorMsg, error: errorMsg };
      }
      const json = await res.json();
      const msg = json.data || "Bulk migration started";
      return { success: true, message: msg, data: msg };
    } catch (err: any) {
      const errorMsg = err?.message || "Network error";
      return { success: false, message: errorMsg, error: errorMsg };
    }
  }

  /**
   * List registered vision models
   * GET /api/v1/vision/admin/models
   */
  static async listModels(): Promise<VisionModelRegistryItem[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/models`
      );
      if (!res.ok) return [];
      const json = await res.json();
      const list = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.content)
        ? json.data.content
        : Array.isArray(json)
        ? json
        : [];
      return list as VisionModelRegistryItem[];
    } catch (err) {
      console.error("[AdminClient.listModels] Network error:", err);
      return [];
    }
  }

  /**
   * Check Ollama inference daemon availability
   * GET /api/v1/vision/admin/ollama/status
   */
  static async getOllamaStatus(): Promise<AdminApiResult<OllamaStatusResponse>> {
    return this.executeFetch<OllamaStatusResponse>(`/api/v1/vision/admin/ollama/status`, {
      method: "GET",
    });
  }

  static async getOllamaStatusTelemetry(): Promise<AdminApiResult<OllamaStatusResponse>> {
    return this.getOllamaStatus();
  }

  /**
   * Check OpenCLIP Microservice Health Status
   * GET /api/v1/vision/admin/clip/status
   */
  static async getClipStatus(): Promise<AdminApiResult<ClipStatusResponse>> {
    return this.executeFetch<ClipStatusResponse>(`/api/v1/vision/admin/clip/status`, {
      method: "GET",
    });
  }

  static async getClipStatusTelemetry(): Promise<AdminApiResult<ClipStatusResponse>> {
    return this.getClipStatus();
  }

  /**
   * List installed local Ollama models
   * GET /api/v1/vision/admin/ollama/models
   */
  static async listOllamaModels(): Promise<string[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/ollama/models`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || json) as string[];
    } catch (err) {
      console.error("[AdminClient.listOllamaModels] Network error:", err);
      return [];
    }
  }

  /**
   * Seed ground truth evaluation dataset
   * POST /api/v1/vision/admin/seed-ground-truth
   */
  static async seedGroundTruth(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/seed-ground-truth`,
        { method: "POST" }
      );
      if (!res.ok) {
        return {
          success: false,
          message: `Ground truth endpoint returned status ${res.status}. Pending backend controller mapping.`,
        };
      }
      const json = await res.json();
      const msg = json.data || json.message || "Ground truth dataset seeded successfully.";
      return { success: true, message: String(msg) };
    } catch (err: any) {
      console.error("[AdminClient.seedGroundTruth] Network error:", err);
      return {
        success: false,
        message: err?.message || "Failed to reach ground truth seeding endpoint",
      };
    }
  }

  /**
   * Run offline search evaluation suite
   * POST /api/v1/vision/admin/evaluate
   */
  static async runEvaluation(config?: any): Promise<EvaluationReport | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/evaluate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: config ? JSON.stringify(config) : undefined,
        }
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as EvaluationReport;
    } catch (err) {
      console.error("[AdminClient.runEvaluation] Network error:", err);
      return null;
    }
  }

  /**
   * Get historical evaluation benchmark runs
   * GET /api/v1/vision/admin/evaluation/history
   */
  static async getEvaluationHistory(): Promise<VisionEvaluationRun[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/evaluation/history`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || json) as VisionEvaluationRun[];
    } catch (err) {
      console.error("[AdminClient.getEvaluationHistory] Network error:", err);
      return [];
    }
  }

  /**
   * Compare two evaluation runs A/B
   * POST /api/v1/vision/admin/evaluate/compare
   */
  static async compareEvaluations(
    baselineRunId: string,
    candidateRunId: string,
    changeDescription: string = "A/B comparison"
  ): Promise<ABComparisonReport | null> {
    try {
      const params = new URLSearchParams({
        baselineRunId,
        candidateRunId,
        changeDescription,
      });
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/admin/evaluate/compare?${params.toString()}`,
        { method: "POST" }
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as ABComparisonReport;
    } catch (err) {
      console.error("[AdminClient.compareEvaluations] Network error:", err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Unified Dashboard Telemetry Aggregator
  // --------------------------------------------------------------------------

  /**
   * Parallel execution of all primary admin telemetry metrics for zero-mock live dashboard updates.
   */
  static async fetchAllTelemetry(currency: string = "EUR"): Promise<CombinedAdminTelemetry> {
    const [earningsRes, aiStatsRes, visionSummaryRes, ollamaRes, clipRes] = await Promise.all([
      this.getEarningsSummaryTelemetry(currency),
      this.getAiUsageStatsTelemetry(),
      this.getVisionTaskSummary(),
      this.getOllamaStatusTelemetry(),
      this.getClipStatusTelemetry(),
    ]);

    return {
      earnings: earningsRes,
      aiStats: aiStatsRes,
      visionSummary: visionSummaryRes,
      ollamaStatus: ollamaRes,
      clipStatus: clipRes,
      fetchedAt: new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // Property & Sanctuary Management
  // --------------------------------------------------------------------------

  /**
   * List all properties/sanctuaries for admin management
   * GET /api/v1/properties
   */
  static async listProperties(
    options?: { page?: number; size?: number; search?: string } | number
  ): Promise<PropertyAdminResponse[]> {
    try {
      const page = typeof options === "object" && options.page !== undefined ? options.page : 0;
      const size =
        typeof options === "object" && options.size !== undefined
          ? options.size
          : typeof options === "number"
          ? options
          : 50;
      const search = typeof options === "object" ? options.search : undefined;

      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
      });
      if (search) params.set("search", search);

      let res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/properties?${params.toString()}`
      );
      if (!res.ok) {
        // Fallback to /properties/search which is active in PropertyController
        res = await AggarlyChatBridgeClient.authFetch(
          `${API_BASE_URL}/api/v1/properties/search?${params.toString()}`
        );
      }
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json.data?.content)
        ? json.data.content
        : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      return items as PropertyAdminResponse[];
    } catch (err) {
      console.error("[AdminClient.listProperties] Network error:", err);
      return [];
    }
  }

  /**
   * Get single property by ID
   * GET /api/v1/properties/{propertyId}
   */
  static async getPropertyById(propertyId: string): Promise<PropertyAdminResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}`
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as PropertyAdminResponse;
    } catch (err) {
      console.error("[AdminClient.getPropertyById] Network error:", err);
      return null;
    }
  }

  /**
   * Update an existing property
   * PUT /api/v1/properties/{propertyId}
   */
  static async updateProperty(propertyId: string, updateData: any): Promise<PropertyAdminResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as PropertyAdminResponse;
    } catch (err) {
      console.error("[AdminClient.updateProperty] Network error:", err);
      return null;
    }
  }

  /**
   * Delete / Delist property
   * DELETE /api/v1/properties/{propertyId}
   */
  static async deleteProperty(propertyId: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}`,
        { method: "DELETE" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.deleteProperty] Network error:", err);
      return false;
    }
  }

  /**
   * Reprocess property images (alias for reprocessProperty)
   */
  static async reprocessPropertyImages(propertyId: string): Promise<{ success: boolean; message: string }> {
    return this.reprocessProperty(propertyId);
  }

  /**
   * Get aggregated visual intelligence profile for a property
   * GET /api/v1/vision/host/property/{propertyId}/profile
   */
  static async getPropertyVisualProfile(propertyId: string): Promise<PropertyVisualProfileDto | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/host/property/${propertyId}/profile`
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as PropertyVisualProfileDto;
    } catch (err) {
      console.error("[AdminClient.getPropertyVisualProfile] Network error:", err);
      return null;
    }
  }

  /**
   * Get room coverage analysis and missing scene recommendations
   * GET /api/v1/vision/host/property/{propertyId}/coverage
   */
  static async getPropertyCoverageReport(propertyId: string): Promise<HostCoverageReportDto | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/host/property/${propertyId}/coverage`
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as HostCoverageReportDto;
    } catch (err) {
      console.error("[AdminClient.getPropertyCoverageReport] Network error:", err);
      return null;
    }
  }

  /**
   * Get actionable photography and visual quality advice
   * GET /api/v1/vision/host/property/{propertyId}/advice
   */
  static async getPropertyImprovementAdvice(propertyId: string): Promise<HostImprovementAdviceDto | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/host/property/${propertyId}/advice`
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as HostImprovementAdviceDto;
    } catch (err) {
      console.error("[AdminClient.getPropertyImprovementAdvice] Network error:", err);
      return null;
    }
  }

  /**
   * Trigger immediate re-aggregation of property visual intelligence
   * POST /api/v1/vision/host/property/{propertyId}/reaggregate
   */
  static async reaggregatePropertyProfile(propertyId: string): Promise<PropertyVisualProfileDto | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/host/property/${propertyId}/reaggregate`,
        { method: "POST" }
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as PropertyVisualProfileDto;
    } catch (err) {
      console.error("[AdminClient.reaggregatePropertyProfile] Network error:", err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // User Management
  // --------------------------------------------------------------------------

  /**
   * Users Directory search
   * GET /api/v1/users/search
   */
  static async getUsers(query: string = "", limit: number = 50): Promise<UserProfileSummary[]> {
    try {
      const q = new URLSearchParams();
      if (query && query.trim()) q.set("query", query.trim());
      q.set("limit", String(limit));

      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/users/search?${q.toString()}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      const list = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.content)
        ? json.data.content
        : Array.isArray(json)
        ? json
        : [];
      return list.map((u: any) => {
        const rawRoles: string[] = Array.isArray(u.roles)
          ? u.roles.map((r: any) => (typeof r === "string" ? r : r.name || r.role || "USER"))
          : Array.isArray(u.authorities)
          ? u.authorities.map((a: any) => (typeof a === "string" ? a : a.authority || "USER"))
          : u.role
          ? [String(u.role)]
          : [];

        // If backend UserProfileSummaryResponse omitted roles, infer role if username/email indicates admin/host
        if (rawRoles.length === 0) {
          const emailLower = (u.email || "").toLowerCase();
          const userLower = (u.username || "").toLowerCase();
          if (emailLower.includes("admin") || userLower.includes("admin")) {
            rawRoles.push("ROLE_ADMIN", "ADMIN");
          } else if (emailLower.includes("host") || userLower.includes("host") || emailLower.includes("curator")) {
            rawRoles.push("ROLE_HOST", "HOST");
          } else {
            rawRoles.push("USER");
          }
        }

        return {
          id: String(u.id || ""),
          email: u.email || "",
          firstName: u.firstName,
          lastName: u.lastName,
          displayName: u.displayName,
          username: u.username || (u.email ? u.email.split("@")[0] : "user"),
          avatarUrl: u.avatarUrl,
          bio: u.bio,
          roles: rawRoles,
          role: rawRoles[0] || "USER",
        };
      });
    } catch (err) {
      console.error("[AdminClient.getUsers] Network error:", err);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Vision Aliases
  // --------------------------------------------------------------------------

  static async getVisionTasks(status?: string, limit: number = 20): Promise<VisionTaskDto[]> {
    return this.getTasks(status, limit);
  }

  static async getVisionTaskCounts(): Promise<VisionTaskCounts> {
    return this.getTaskCounts();
  }

  static async listVisionModels(): Promise<VisionModelRegistryItem[]> {
    return this.listModels();
  }

  static async retryVisionTask(taskId: string): Promise<VisionTaskDto | null> {
    return this.retryTask(taskId);
  }

  static async getImageMetadata(imageId: string): Promise<PropertyImageMetadataDto | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/vision/image/${imageId}/metadata`
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as PropertyImageMetadataDto;
    } catch (err) {
      console.error("[AdminClient.getImageMetadata] Network error:", err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Coupons & Promotions
  // --------------------------------------------------------------------------

  static async getCoupons(page: number = 0, size: number = 20): Promise<CouponResponseDto[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/coupons?page=${page}&size=${size}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.content || json.data || []) as CouponResponseDto[];
    } catch (err) {
      console.error("[AdminClient.getCoupons] Network error:", err);
      return [];
    }
  }

  static async createCoupon(payload: CreateCouponPayload): Promise<CouponResponseDto | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as CouponResponseDto;
    } catch (err) {
      console.error("[AdminClient.createCoupon] Network error:", err);
      return null;
    }
  }

  static async deactivateCoupon(couponId: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/coupons/${couponId}/deactivate`,
        { method: "POST" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.deactivateCoupon] Network error:", err);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Scheduled Tasks & Cron Scheduler
  // --------------------------------------------------------------------------

  static async getScheduledTasks(page: number = 0, size: number = 20): Promise<ScheduledTaskDto[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/scheduled-tasks?page=${page}&size=${size}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.content || json.data || []) as ScheduledTaskDto[];
    } catch (err) {
      console.error("[AdminClient.getScheduledTasks] Network error:", err);
      return [];
    }
  }

  static async createScheduledTask(payload: Record<string, unknown>): Promise<ScheduledTaskDto | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/scheduled-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data || json) as ScheduledTaskDto;
    } catch (err) {
      console.error("[AdminClient.createScheduledTask] Network error:", err);
      return null;
    }
  }

  static async triggerScheduledTask(taskId: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/scheduled-tasks/${taskId}/run-now`,
        { method: "POST" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.triggerScheduledTask] Network error:", err);
      return false;
    }
  }

  static async pauseScheduledTask(taskId: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/scheduled-tasks/${taskId}/pause`,
        { method: "POST" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.pauseScheduledTask] Network error:", err);
      return false;
    }
  }

  static async resumeScheduledTask(taskId: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/scheduled-tasks/${taskId}/resume`,
        { method: "POST" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.resumeScheduledTask] Network error:", err);
      return false;
    }
  }

  static async getScheduledTaskExecutions(taskId: string): Promise<ScheduledTaskExecutionDto[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/scheduled-tasks/${taskId}/executions`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.content || json.data || []) as ScheduledTaskExecutionDto[];
    } catch (err) {
      console.error("[AdminClient.getScheduledTaskExecutions] Network error:", err);
      return [];
    }
  }

  static async getVectorMeshHealth(): Promise<VectorMeshHealthResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/admin/vector/health`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("[AdminClient.getVectorMeshHealth] Error:", err);
      return null;
    }
  }

  static async getActionLedger(limit: number = 10): Promise<ActionLedgerItemResponse[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/admin/action-ledger?limit=${limit}`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    } catch (err) {
      console.error("[AdminClient.getActionLedger] Error:", err);
      return [];
    }
  }

  static async getSystemTelemetry(): Promise<SystemTelemetryResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/admin/system/telemetry`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("[AdminClient.getSystemTelemetry] Error:", err);
      return null;
    }
  }

  static async publishProperty(id: string): Promise<PropertyAdminResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/admin/properties/${id}/publish`, {
        method: "POST",
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("[AdminClient.publishProperty] Error:", err);
      return null;
    }
  }

  static async toggleFeaturedProperty(id: string, featured: boolean): Promise<PropertyAdminResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/admin/properties/${id}/feature?featured=${featured}`,
        { method: "POST" }
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("[AdminClient.toggleFeaturedProperty] Error:", err);
      return null;
    }
  }

  static async requestPropertyRevision(id: string, notes: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/admin/properties/${id}/request-revision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.requestPropertyRevision] Error:", err);
      return false;
    }
  }

  static async getSanctuaryAuditSummary(): Promise<SanctuaryAuditSummaryResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/admin/sanctuaries/audit-summary`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("[AdminClient.getSanctuaryAuditSummary] Error:", err);
      return null;
    }
  }

  static async getLiveGuestResidents(): Promise<LiveGuestResidentsResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/admin/occupancy/live-residents`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("[AdminClient.getLiveGuestResidents] Error:", err);
      return null;
    }
  }

  static async updateUserStatus(id: string, status: string, reason?: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/admin/users/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.updateUserStatus] Error:", err);
      return false;
    }
  }

  static async getUserSessions(userId: string): Promise<UserSessionResponse[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/sessions`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    } catch (err) {
      console.error("[AdminClient.getUserSessions] Error:", err);
      return [];
    }
  }

  static async revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/admin/users/${userId}/sessions/${sessionId}`,
        { method: "DELETE" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.revokeUserSession] Error:", err);
      return false;
    }
  }

  static async revokeAllUserSessions(userId: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/admin/users/${userId}/sessions`,
        { method: "DELETE" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.revokeAllUserSessions] Error:", err);
      return false;
    }
  }

  static async forcePasswordReset(userId: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/admin/users/${userId}/force-reset-password`,
        { method: "POST" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.forcePasswordReset] Error:", err);
      return false;
    }
  }

  static async overrideHold(bookingId: string): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/admin/payments/${bookingId}/override-hold`,
        { method: "POST" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.overrideHold] Error:", err);
      return false;
    }
  }

  static async getCouponMetrics(): Promise<CouponMetricsResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/coupons/metrics`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("[AdminClient.getCouponMetrics] Error:", err);
      return null;
    }
  }

  static async getSchedulerMetrics(): Promise<ScheduledTaskMetricsResponse | null> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/scheduled-tasks/metrics`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error("[AdminClient.getSchedulerMetrics] Error:", err);
      return null;
    }
  }

  static async flushAiWeights(): Promise<boolean> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(
        `${API_BASE_URL}/api/v1/ai/admin/flush-weights`,
        { method: "POST" }
      );
      return res.ok;
    } catch (err) {
      console.error("[AdminClient.flushAiWeights] Error:", err);
      return false;
    }
  }
}

export interface VectorMeshHealthResponse {
  status: string;
  totalVectors: number;
  healthPercentage: number;
  throughput: number;
  memoryAllocatedMb: number;
  clusterState: string;
  latencyMs: number;
}

export interface ActionLedgerItemResponse {
  id: string;
  type: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  title: string;
  description: string;
  referenceId: string;
  status: string;
  createdAt: string;
}

export interface SystemTelemetryResponse {
  activeConnections: number;
  idleConnections: number;
  maxConnections: number;
  cacheHitRatio: number;
  clockSkewSeconds: number;
  uptimeSeconds: number;
}

export interface SanctuaryAuditSummaryResponse {
  totalAudited: number;
  compliantCount: number;
  pendingCalibrationCount: number;
  flaggedCount: number;
  overallComplianceRate: number;
}

export interface LiveGuestResidentsResponse {
  totalLiveResidents: number;
  activeSanctuariesCount: number;
  residents: Array<{
    bookingId: string;
    propertyId: string;
    sanctuaryTitle: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    guestCount: number;
  }>;
}

export interface UserSessionResponse {
  sessionId: string;
  device: string;
  browser?: string;
  ipAddress: string;
  lastActive: string;
  current: boolean;
}

export interface CouponMetricsResponse {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountVolume: number;
  currency: string;
}

export interface ScheduledTaskMetricsResponse {
  totalTasks: number;
  activeTasks: number;
  pausedTasks: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  uptimePercentage: number;
}

export interface CouponResponseDto {
  id: string;
  code: string;
  adjustmentType: "PERCENTAGE" | "FIXED" | string;
  adjustmentValue: number;
  expiresAt: string | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
  active: boolean;
}

export interface CreateCouponPayload {
  code: string;
  adjustmentType: "PERCENTAGE" | "FIXED";
  adjustmentValue: number;
  expiresAt?: string;
  maxRedemptions?: number;
  minSubtotal?: number;
}

export interface ScheduledTaskDto {
  id: string;
  taskKey?: string;
  name: string;
  cronExpression?: string;
  scheduleDescription?: string;
  status: "ACTIVE" | "PAUSED" | "RUNNING" | "COMPLETED" | "FAILED" | string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastRunDurationMs?: number;
  lastRunResult?: string;
  successRate?: number;
  executionCount?: number;
}

export interface ScheduledTaskExecutionDto {
  id: string;
  taskId: string;
  startedAt: string;
  finishedAt?: string;
  status: "SUCCESS" | "FAILED" | "RUNNING" | string;
  durationMs?: number;
  logs?: string[];
  errorMessage?: string;
}

