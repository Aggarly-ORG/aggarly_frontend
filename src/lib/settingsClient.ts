import { AuthClient } from "./authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface BackendUserProfile {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  roles: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  createdAt?: string;
}

export interface UserProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface NotificationPreferenceItem {
  id?: string;
  userId?: string;
  category: "BOOKING" | "PAYMENT" | "SECURITY" | "MESSAGES" | "CLEANING" | "REVIEWS" | "ALERTS";
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
}

export interface UpdateNotificationPreferencePayload {
  category: "BOOKING" | "PAYMENT" | "SECURITY" | "MESSAGES" | "CLEANING" | "REVIEWS" | "ALERTS";
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
}

export interface UserPaymentMethodItem {
  id: string;
  stripePaymentMethodId?: string;
  brand?: string;
  last4?: string;
  expiry?: string;
  expMonth?: number;
  expYear?: number;
  cardholderName?: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface SavePaymentMethodPayload {
  paymentMethodId: string;
  cardholderName?: string;
  setAsDefault?: boolean;
}

export interface BookingHistoryItem {
  id: string;
  propertyId: string;
  propertyName?: string;
  propertyTitle?: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency?: string;
  status: string;
  createdAt?: string;
}

export interface AiMemoryItem {
  key: string;
  value: string;
}

export interface UserSession {
  id: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface MfaSetupData {
  /** Confirmation token — must be sent back with confirmMfa */
  token: string;
  /** Base64-encoded PNG QR code (rendered as data:image/png;base64,...) */
  qrBase64: string;
  /** OTP auth URI (shown when QR generation fails) */
  manualKey: string;
}

export interface LocalUserPreferences {
  theme: "dark" | "light";
  metric: "metric" | "imperial";
  language: string;
  currency: string;
}

export const LOCAL_PREF_DEFAULTS: LocalUserPreferences = {
  theme: "dark",
  metric: "metric",
  language: "en_US",
  currency: "USD",
};

export class LocalPreferencesManager {
  static getPreferences(): LocalUserPreferences {
    if (typeof window === "undefined") return { ...LOCAL_PREF_DEFAULTS };
    try {
      const theme = (localStorage.getItem("aggarly_theme") as "dark" | "light") || LOCAL_PREF_DEFAULTS.theme;
      const metric = (localStorage.getItem("aggarly_metric") as "metric" | "imperial") || LOCAL_PREF_DEFAULTS.metric;
      const language = localStorage.getItem("aggarly_language") || LOCAL_PREF_DEFAULTS.language;
      const currency = localStorage.getItem("aggarly_currency") || LOCAL_PREF_DEFAULTS.currency;
      return { theme, metric, language, currency };
    } catch {
      return { ...LOCAL_PREF_DEFAULTS };
    }
  }

  static savePreferences(prefs: Partial<LocalUserPreferences>): LocalUserPreferences {
    if (typeof window === "undefined") return { ...LOCAL_PREF_DEFAULTS, ...prefs };
    try {
      if (prefs.theme) {
        localStorage.setItem("aggarly_theme", prefs.theme);
        if (prefs.theme === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
        }
      }
      if (prefs.metric) localStorage.setItem("aggarly_metric", prefs.metric);
      if (prefs.language) localStorage.setItem("aggarly_language", prefs.language);
      if (prefs.currency) localStorage.setItem("aggarly_currency", prefs.currency);
    } catch (e) {
      console.warn("Could not write preferences to localStorage:", e);
    }
    return this.getPreferences();
  }
}

export class SettingsClient {
  private static getHeaders(contentType: string | null = "application/json"): HeadersInit {
    const token = AuthClient.getToken();
    const headers: Record<string, string> = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     1. PROFILE & ACCOUNT APIS (/api/v1/users/me)
     ───────────────────────────────────────────────────────────────────────── */

  static async getProfile(): Promise<BackendUserProfile> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load profile: HTTP ${res.status}`);
    }

    const body = await res.json();
    const data = body?.data || body;
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      displayName: data.displayName || "",
      phone: data.phone || "",
      avatarUrl: data.avatarUrl || "",
      bio: data.bio || "",
      roles: Array.isArray(data.roles) ? data.roles : ["GUEST"],
      emailVerified: !!data.emailVerified,
      phoneVerified: !!data.phoneVerified,
      mfaEnabled: !!data.mfaEnabled,
      createdAt: data.createdAt,
    };
  }

  static async updateProfile(update: UserProfileUpdateRequest): Promise<BackendUserProfile> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(update),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || "Failed to update profile");
    }

    const data = body?.data || body;
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      displayName: data.displayName || "",
      phone: data.phone || "",
      avatarUrl: data.avatarUrl || "",
      bio: data.bio || "",
      roles: Array.isArray(data.roles) ? data.roles : ["GUEST"],
      emailVerified: !!data.emailVerified,
      phoneVerified: !!data.phoneVerified,
      mfaEnabled: !!data.mfaEnabled,
      createdAt: data.createdAt,
    };
  }

  static async changePassword(payload: ChangePasswordPayload): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/change-password`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || "Failed to change password");
    }
  }

  static async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const token = AuthClient.getToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/avatar`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || "Failed to upload avatar");
    }
    return body?.data?.avatarUrl || body?.avatarUrl || "";
  }

  static async removeAvatar(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/avatar`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to remove avatar");
    }
  }

  static async sendPhoneOtp(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/phone/send-otp`, {
      method: "POST",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to send verification SMS");
    }
  }

  static async verifyPhoneOtp(otpCode: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/phone/verify`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ otpCode: otpCode.trim() }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to verify phone OTP");
    }
  }

  static async deactivateAccount(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to deactivate account");
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     1B. TWO-FACTOR AUTHENTICATION (TOTP)
     Backend response from POST /api/v1/auth/enable-mfa:
       { token: string, qr: string (base64 PNG), uri: string (OTP auth URI) }
     POST /api/v1/auth/confirm-mfa expects:
       { token: string, totpCode: string }
     Note: By security design, once MFA is enabled, it cannot be disabled.
     ───────────────────────────────────────────────────────────────────────── */

  static async enableMfa(): Promise<MfaSetupData> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/enable-mfa`, {
      method: "POST",
      headers: this.getHeaders(),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || body?.error || "Failed to initialize two-factor authentication");
    }

    // Backend wraps in ApiResponse<RequestMfaResponse>: { success, data: { token, qr, uri } }
    const data = body?.data || body;
    return {
      token: data?.token || "",
      qrBase64: data?.qr || "",
      manualKey: data?.uri || "",
    };
  }

  static async confirmMfa(totpCode: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/confirm-mfa`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        token,       // confirmation token from enable-mfa step
        totpCode: totpCode.trim(),
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || body?.error || "Invalid or expired verification code");
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     1C. ACTIVE SESSIONS & DEVICE MANAGEMENT (/api/v1/users/me/sessions)
     ───────────────────────────────────────────────────────────────────────── */

  static async getActiveSessions(): Promise<UserSession[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/sessions`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load active sessions: HTTP ${res.status}`);
    }

    const body = await res.json();
    const list = body?.data || body;
    return Array.isArray(list) ? list : [];
  }

  static async revokeSession(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || "Failed to revoke session");
    }
  }

  static async revokeAllOtherSessions(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/sessions`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || "Failed to sign out other sessions");
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     2. NOTIFICATION PREFERENCES APIS (/api/v1/notifications/preferences)
     ───────────────────────────────────────────────────────────────────────── */

  static async getNotificationPreferences(): Promise<NotificationPreferenceItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/preferences`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load notification preferences: HTTP ${res.status}`);
    }

    const body = await res.json();
    const list = body?.data || body;
    return Array.isArray(list) ? list : [];
  }

  static async updateNotificationPreference(payload: UpdateNotificationPreferencePayload): Promise<NotificationPreferenceItem> {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/preferences`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || "Failed to update notification preference");
    }

    return body?.data || body;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     3. PAYMENT METHODS APIS (/api/v1/user/payment-methods)
     ───────────────────────────────────────────────────────────────────────── */

  static async getPaymentMethods(): Promise<UserPaymentMethodItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/user/payment-methods`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load payment methods: HTTP ${res.status}`);
    }

    const body = await res.json();
    const list = body?.data || body;
    return Array.isArray(list) ? list : [];
  }

  static async savePaymentMethod(payload: SavePaymentMethodPayload): Promise<UserPaymentMethodItem> {
    const res = await fetch(`${API_BASE_URL}/api/v1/user/payment-methods`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || "Failed to save payment method");
    }

    return body?.data || body;
  }

  static async deletePaymentMethod(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/user/payment-methods/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to remove payment method");
    }
  }

  static async setDefaultPaymentMethod(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/user/payment-methods/${encodeURIComponent(id)}/default`, {
      method: "PATCH",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to set default payment method");
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     4. BOOKING HISTORY / BILLING INVOICES (/api/v1/bookings)
     ───────────────────────────────────────────────────────────────────────── */

  static async getMyBookings(): Promise<BookingHistoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/bookings`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      return [];
    }

    const body = await res.json();
    const list = body?.data || body;
    return Array.isArray(list) ? list : [];
  }

  /* ─────────────────────────────────────────────────────────────────────────
     5. LUMEN AI CONCIERGE MEMORIES (/api/v1/ai/memory)
     ───────────────────────────────────────────────────────────────────────── */

  static async getMemories(): Promise<AiMemoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/memory`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      return [];
    }

    const body = await res.json();
    const raw = body?.data || body;
    if (!Array.isArray(raw)) return [];

    return raw.map((item: any) => ({
      key: item.memoryKey || item.key || "",
      value: item.memoryValue || item.value || "",
    })).filter((m) => m.key);
  }

  static async saveMemory(key: string, value: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/memory`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        memoryKey: key.trim(),
        memoryValue: value.trim(),
        key: key.trim(),
        value: value.trim(),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to save AI memory preference");
    }
  }

  static async deleteMemory(key: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/memory/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || "Failed to delete AI memory preference");
    }
  }
}
