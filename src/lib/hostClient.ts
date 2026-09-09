import { AuthClient } from "./authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface HostPropertyImage {
  id: string;
  objectKey?: string;
  imageUrl?: string;
  url?: string;
  isCover: boolean;
  displayOrder?: number;
}

export interface HostPropertyItem {
  id: string;
  hostId: string;
  title: string;
  description: string;
  propertyType: "APARTMENT" | "HOUSE" | "VILLA" | "CABIN" | "LOFT" | "BOUTIQUE_HOTEL";
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  basePricePerNight: number;
  cancellationPolicy: "FLEXIBLE" | "MODERATE" | "STRICT";
  latitude?: number;
  longitude?: number;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  avgRating?: number;
  reviewCount?: number;
  address?: {
    street?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  images?: HostPropertyImage[];
  amenities?: Array<{
    id: string;
    name: string;
    icon?: string;
    category?: string;
  }>;
}

export interface HostPropertiesPageResponse {
  items: HostPropertyItem[];
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  page: number;
  size: number;
}

export interface HostBookingItem {
  id: string;
  propertyId: string;
  guestId?: string;
  hostId?: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  totalAmount: number;
  currency: string;
  couponCode?: string;
  createdAt?: string;
}

export interface AmenityItem {
  id: string;
  name: string;
  icon?: string;
  category?: string;
}

export interface AvailabilitySlot {
  date: string;
  available: boolean;
  price?: number;
  reason?: string;
}

export interface AvailabilityCalendarData {
  propertyId: string;
  from: string;
  to: string;
  slots: AvailabilitySlot[];
}

export interface PricingRuleItem {
  id: string;
  propertyId: string;
  type?: string;
  ruleType?: string;
  multiplier?: number;
  fixedPrice?: number;
  adjustmentType?: string;
  adjustmentValue?: number;
  startDate?: string;
  endDate?: string;
  thresholdValue?: number;
  priority?: number;
  active?: boolean;
  daysOfWeek?: string[];
  description?: string;
}

export interface CleaningTaskItem {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  scheduledDate: string;
  scheduledStartTime?: string;
  estimatedDurationMinutes?: number;
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  cleanerName?: string;
  taskType?: string;
  priority?: string;
  notes?: string;
}

export interface HostCoverageReport {
  propertyId: string;
  coverageScore: number;
  roomCoverage: Record<string, number>;
  missingKeyRooms: string[];
  recommendations: string[];
}

export class HostClient {
  private static async authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = AuthClient.getAccessToken();
    const headers = new Headers(options.headers || {});
    
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    if (response.status === 401) {
      // Attempt token refresh
      const refreshed = await AuthClient.refreshSession();
      if (refreshed) {
        const newToken = AuthClient.getAccessToken();
        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`);
        }
        return fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    return response;
  }

  static resolveImageUrl(rawKeyOrUrl?: string | null): string {
    if (!rawKeyOrUrl) return "";
    const trimmed = String(rawKeyOrUrl).trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }
    if (trimmed.startsWith("/")) {
      return `${API_BASE_URL}${trimmed}`;
    }
    return `${API_BASE_URL}/api/v1/storage/files/view?key=${encodeURIComponent(trimmed)}`;
  }

  static getImageUrl(img?: HostPropertyImage | { objectKey?: string; imageUrl?: string; url?: string } | null): string {
    if (!img) return "";
    return this.resolveImageUrl(img.objectKey || img.imageUrl || img.url);
  }

  // Properties owned by current host (paginated / sliced)
  static async getMyProperties(page: number = 0, size: number = 10): Promise<HostPropertiesPageResponse> {
    try {
      const res = await this.authFetch(`/api/v1/properties/me?page=${page}&size=${size}`);
      if (!res.ok) {
        console.error("Failed to fetch host properties:", res.status);
        return { items: [], totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false, page, size };
      }
      const data = await res.json();
      const items: HostPropertyItem[] = Array.isArray(data.data) ? data.data : [];
      const meta = data.meta || {};
      return {
        items,
        totalElements: meta.totalElements ?? items.length,
        totalPages: meta.totalPages ?? (items.length > 0 ? 1 : 0),
        hasNext: meta.hasNext ?? false,
        hasPrevious: meta.hasPrevious ?? (page > 0),
        page: meta.page ?? page,
        size: meta.size ?? size,
      };
    } catch (e) {
      console.error("Error fetching host properties:", e);
      return { items: [], totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false, page, size };
    }
  }

  // Single property details
  static async getPropertyById(id: string): Promise<HostPropertyItem | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/properties/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch (e) {
      console.error("Error fetching property:", e);
      return null;
    }
  }

  // Create new property
  static async createProperty(payload: {
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
    address: {
      street?: string;
      city: string;
      state?: string;
      postalCode?: string;
      zipCode?: string;
      country: string;
    };
    amenityIds?: string[];
    imageKeys?: string[];
  }): Promise<{ success: boolean; property?: HostPropertyItem; error?: string }> {
    try {
      const formattedAddress = {
        street: payload.address.street || "",
        city: payload.address.city || "",
        state: payload.address.state || "",
        country: payload.address.country || "",
        zipCode: payload.address.zipCode || payload.address.postalCode || "",
      };

      const requestBody = {
        ...payload,
        address: formattedAddress,
      };

      const res = await this.authFetch("/api/v1/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || "Failed to create property listing" };
      }
      return { success: true, property: data.data };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error while creating property" };
    }
  }

  // Update existing property
  static async updateProperty(id: string, payload: {
    title?: string;
    description?: string;
    propertyType?: string;
    maxGuests?: number;
    bedrooms?: number;
    bathrooms?: number;
    basePricePerNight?: number;
    cancellationPolicy?: string;
    status?: "DRAFT" | "ACTIVE" | "INACTIVE";
    latitude?: number;
    longitude?: number;
    address?: {
      street?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    amenityIds?: string[];
  }): Promise<{ success: boolean; property?: HostPropertyItem; error?: string }> {
    try {
      const res = await this.authFetch(`/api/v1/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || "Failed to update property" };
      }
      return { success: true, property: data.data };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error while updating property" };
    }
  }

  // Delete / Archive property
  static async deleteProperty(id: string): Promise<boolean> {
    try {
      const res = await this.authFetch(`/api/v1/properties/${id}`, { method: "DELETE" });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // Host Bookings
  static async getHostBookings(): Promise<HostBookingItem[]> {
    try {
      const res = await this.authFetch("/api/v1/bookings/host");
      if (!res.ok) {
        // Fallback: If not yet logged or endpoint returned empty, check user's bookings
        return [];
      }
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.error("Error fetching host bookings:", e);
      return [];
    }
  }

  // Cancel / Decline Booking
  static async cancelBooking(bookingId: string, reason: string = "Declined by host"): Promise<boolean> {
    try {
      const res = await this.authFetch(`/api/v1/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      return res.ok;
    } catch (e) {
      console.error("Error cancelling booking:", e);
      return false;
    }
  }

  // Accept Booking
  static async acceptBooking(bookingId: string): Promise<boolean> {
    try {
      // Attempt confirmation through payment/booking confirmation endpoint
      const res = await this.authFetch(`/api/v1/payments/${bookingId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: "host_approved" }),
      });
      return res.ok;
    } catch (e) {
      console.error("Error accepting booking:", e);
      return false;
    }
  }

  // Calendar & Availability
  static async getAvailability(propertyId: string, from: string, to: string): Promise<AvailabilityCalendarData | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/properties/${propertyId}/availability?from=${from}&to=${to}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch (e) {
      return null;
    }
  }

  // Block dates on calendar
  static async blockDates(propertyId: string, payload: {
    startDate: string;
    endDate: string;
    reason?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      let checkIn = payload.startDate;
      let checkOut = payload.endDate;
      if (checkIn && checkOut && checkIn === checkOut) {
        const d = new Date(checkIn);
        d.setDate(d.getDate() + 1);
        checkOut = d.toISOString().split("T")[0];
      }

      const rawReason = (payload.reason || "HOST_BLOCKED").trim().toUpperCase();
      let normalizedReason = "HOST_BLOCKED";
      if (rawReason.includes("MAINTEN") || rawReason.includes("RENOVAT") || rawReason.includes("REPAIR")) {
        normalizedReason = "MAINTENANCE";
      } else if (rawReason.includes("BOOK")) {
        normalizedReason = "BOOKED";
      }

      const res = await this.authFetch(`/api/v1/properties/${propertyId}/availability/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn,
          checkOut,
          startDate: checkIn,
          endDate: checkOut,
          reason: normalizedReason,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errMsg = errorData?.message || `Server returned ${res.status}: Failed to block dates`;
        return { success: false, error: errMsg };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error while blocking dates" };
    }
  }

  // Pricing rules
  static async getPricingRules(propertyId: string): Promise<PricingRuleItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/properties/${propertyId}/pricing-rules`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  static async createPricingRule(propertyId: string, payload: {
    type?: string;
    ruleType?: string;
    startDate?: string;
    endDate?: string;
    adjustmentType?: string;
    adjustmentValue?: number;
    fixedPrice?: number;
    multiplier?: number;
    thresholdValue?: number;
    priority?: number;
  }): Promise<boolean> {
    try {
      const formattedType = (payload.type || payload.ruleType || "SEASONAL").toUpperCase();
      const res = await this.authFetch(`/api/v1/properties/${propertyId}/pricing-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formattedType,
          startDate: payload.startDate,
          endDate: payload.endDate,
          adjustmentType: payload.adjustmentType || "FIXED_AMOUNT",
          adjustmentValue: payload.adjustmentValue ?? payload.fixedPrice ?? payload.multiplier ?? 0,
          thresholdValue: payload.thresholdValue ?? 0,
          priority: payload.priority ?? 1,
        }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  static async deletePricingRule(propertyId: string, ruleId: string): Promise<boolean> {
    try {
      const res = await this.authFetch(`/api/v1/properties/${propertyId}/pricing-rules/${ruleId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // Cleaning tasks for property
  static async getPropertyCleaningHistory(propertyId: string): Promise<CleaningTaskItem[]> {
    try {
      const res = await this.authFetch(`/api/v1/cleaning/tasks/property/${propertyId}`);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.data) ? data.data : (data.data?.content || []);
      }
      // Fallback to /api/v1/cleaning/tasks/host?propertyId=...
      const fallbackRes = await this.authFetch(`/api/v1/cleaning/tasks/host?propertyId=${propertyId}`);
      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        return Array.isArray(fbData.data) ? fbData.data : (fbData.data?.content || []);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Amenities
  static async getAllAmenities(): Promise<AmenityItem[]> {
    try {
      const res = await this.authFetch(`/api/v1/amenities`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  // File Upload
  static async uploadFile(file: File): Promise<{ success: boolean; key?: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await this.authFetch("/api/v1/storage/files", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || "Failed to upload image" };
      }
      return { success: true, key: data.data?.objectKey || data.data?.key };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error uploading file" };
    }
  }

  // Add Image to property
  static async addPropertyImage(propertyId: string, payload: {
    imageUrl?: string;
    objectKey?: string;
    isCover?: boolean;
    displayOrder?: number;
  }): Promise<boolean> {
    try {
      const key = payload.objectKey || payload.imageUrl || "";
      const res = await this.authFetch(`/api/v1/properties/${propertyId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: key,
          isCover: !!payload.isCover,
        }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // Set Cover Image
  static async setCoverImage(propertyId: string, imageId: string): Promise<boolean> {
    try {
      const res = await this.authFetch(`/api/v1/properties/${propertyId}/images/${imageId}/cover`, {
        method: "PUT",
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // Delete Image
  static async deletePropertyImage(propertyId: string, imageId: string): Promise<boolean> {
    try {
      const res = await this.authFetch(`/api/v1/properties/${propertyId}/images/${imageId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // Vision coverage report
  static async getVisionCoverage(propertyId: string): Promise<HostCoverageReport | null> {
    try {
      const res = await this.authFetch(`/api/v1/vision/host/property/${propertyId}/coverage`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch (e) {
      return null;
    }
  }

  static async getHostFinancialsSummary(): Promise<HostFinancialsSummaryDto | null> {
    try {
      const res = await this.authFetch("/api/v1/host/financials/summary");
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error("[HostClient.getHostFinancialsSummary] Error:", err);
      return null;
    }
  }

  static async getHostSettlementLedger(status?: string): Promise<SettlementLedgerItemDto[]> {
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await this.authFetch(`/api/v1/host/financials/ledger${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : (data.data?.content || []);
    } catch (err) {
      console.error("[HostClient.getHostSettlementLedger] Error:", err);
      return [];
    }
  }

  static async getAllTurnoverTasks(timeframe?: string): Promise<TurnoverTaskDetailDto[]> {
    try {
      const query = timeframe ? `?timeframe=${encodeURIComponent(timeframe)}` : "";
      const res = await this.authFetch(`/api/v1/host/turnover/tasks${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : (data.data?.content || []);
    } catch (err) {
      console.error("[HostClient.getAllTurnoverTasks] Error:", err);
      return [];
    }
  }

  static async dispatchTurnoverInspection(payload: {
    sanctuaryId: string;
    taskType: string;
    notes?: string;
    priority?: string;
  }): Promise<TurnoverTaskDetailDto | null> {
    try {
      const res = await this.authFetch("/api/v1/host/turnover/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error("[HostClient.dispatchTurnoverInspection] Error:", err);
      return null;
    }
  }

  static async updateTurnoverTaskStatus(
    taskId: string,
    status: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const res = await this.authFetch(`/api/v1/host/turnover/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      return res.ok;
    } catch (err) {
      console.error("[HostClient.updateTurnoverTaskStatus] Error:", err);
      return false;
    }
  }

  static async getTaxStatements(): Promise<TaxStatementDto[]> {
    try {
      const res = await this.authFetch("/api/v1/host/financials/tax-statements");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : [];
    } catch (err) {
      console.error("[HostClient.getTaxStatements] Error:", err);
      return [];
    }
  }

  static async getMultiSanctuaryCalendar(
    propertyIds: string[],
    from?: string,
    to?: string
  ): Promise<MultiSanctuaryCalendarResponse | null> {
    try {
      if (propertyIds.length === 0) return null;
      const params = new URLSearchParams();
      params.set("propertyIds", propertyIds.join(","));
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`${API_BASE_URL}/api/v1/properties/multi-calendar?${params.toString()}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error("[HostClient.getMultiSanctuaryCalendar] Error:", err);
      return null;
    }
  }

  static async toggleLumenYield(payload: {
    enabled?: boolean;
    multiplier?: number;
  }): Promise<{ enabled: boolean; multiplier: number } | null> {
    try {
      const res = await this.authFetch("/api/v1/pricing/lumen-yield-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      console.error("[HostClient.toggleLumenYield] Error:", err);
      return null;
    }
  }

  static async sendBookingMessage(bookingId: string, message: string): Promise<boolean> {
    try {
      const res = await this.authFetch(`/api/v1/bookings/${bookingId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      return res.ok;
    } catch (err) {
      console.error("[HostClient.sendBookingMessage] Error:", err);
      return false;
    }
  }
}

export interface TaxStatementDto {
  id: string;
  taxYear: number;
  statementType: string;
  issuedDate: string;
  totalGrossVolume: number;
  taxableEarnings: number;
  vatWithheld: number;
  certificateRef: string;
  downloadUrl?: string;
}

export interface DailyCalendarCell {
  date: string;
  available: boolean;
  price: number;
  moonIlluminationPercentage: number;
  moonPhaseName: string;
  lumenYieldActive: boolean;
}

export interface SanctuaryCalendarGrid {
  propertyId: string;
  title: string;
  days: DailyCalendarCell[];
}

export interface MultiSanctuaryCalendarResponse {
  from: string;
  to: string;
  properties: SanctuaryCalendarGrid[];
}

export interface HostFinancialsSummaryDto {
  grossBookingVolume: number;
  netHostEarnings: number;
  pendingEscrow: number;
  disbursedYtd: number;
  currency: string;
  takeRatePercentage: number;
  bankAccountMasked?: string;
  nextScheduledPayoutDate?: string;
  nextScheduledPayoutAmount?: number;
}

export interface SettlementLedgerItemDto {
  id: string;
  sanctuaryId: string;
  sanctuaryTitle: string;
  sanctuaryLocation?: string;
  guestName: string;
  bookingRef: string;
  stayDates: string;
  nightsCount: number;
  grossAmount: number;
  takeRateAmount: number;
  netPayout: number;
  currency: string;
  status: "DISBURSED" | "IN_ESCROW" | "ESCROW_SECURED" | "PENDING";
  releaseDate?: string;
  paymentMethodMasked?: string;
}

export interface TurnoverTaskDetailDto {
  id: string;
  sanctuaryId: string;
  sanctuaryTitle: string;
  unitCode: string;
  taskType: "DEEP_CLEAN" | "LINEN_STERILIZATION" | "ACOUSTIC_INSPECTION" | "MAINTENANCE" | string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "FLAGGED";
  scheduledTime: string;
  estimatedDuration: string;
  assignedSpecialists: string[];
  acousticDbReading?: number;
  silenceCertified?: boolean;
  notes?: string;
}

