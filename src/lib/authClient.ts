import { AggarlyChatBridgeClient } from "./chatBridgeClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  role?: string;
  roles?: string[];
  emailVerified?: boolean;
}

export interface AuthSuccessData {
  status: string;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthClient {
  /**
   * Retrieve current access token from storage/bridge
   */
  static getAccessToken(): string {
    return AggarlyChatBridgeClient.getAuthToken();
  }

  /**
   * Log in with email and password.
   * Returns { status, token, refreshToken, expiresIn }.
   * When status === "MFA_REQUIRED", token is the MFA session token (NOT a JWT).
   * Call validateMfa(token, totpCode) to complete the flow.
   */
  static async login(email: string, password: string): Promise<AuthSuccessData> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      let errorMsg = body?.message || body?.error || "Authentication failed";
      if (body?.errors && typeof body.errors === "object") {
        const fieldErrors = Object.values(body.errors).filter(Boolean).join(". ");
        if (fieldErrors) errorMsg = fieldErrors;
      }
      throw new Error(errorMsg);
    }

    const data: AuthSuccessData = body?.data || body;

    // Only persist tokens when auth is fully complete (not MFA_REQUIRED intermediate step)
    if (data?.status === "AUTH_SUCCESS" && data?.token) {
      AggarlyChatBridgeClient.setAuthTokenPair(data.token, data.refreshToken);
      this.saveLocalUserData(data.token);
    }

    return data;
  }

  /**
   * Complete MFA login by submitting the 6-digit TOTP code along with the
   * MFA session token returned by login() when status === "MFA_REQUIRED".
   */
  static async validateMfa(mfaToken: string, totpCode: string): Promise<AuthSuccessData> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/validate-mfa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: mfaToken, totpCode: totpCode.trim() }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || body?.error || "Invalid or expired TOTP code.");
    }

    const data: AuthSuccessData = body?.data || body;
    if (data?.token) {
      AggarlyChatBridgeClient.setAuthTokenPair(data.token, data.refreshToken);
      this.saveLocalUserData(data.token);
    }
    return data;
  }

  /**
   * Register a new user account
   */
  static async register(payload: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthSuccessData> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      let errorMsg = body?.message || body?.error || "Registration failed";
      if (body?.errors && typeof body.errors === "object") {
        const fieldErrors = Object.values(body.errors).filter(Boolean).join(". ");
        if (fieldErrors) {
          errorMsg = fieldErrors;
        }
      }
      throw new Error(errorMsg);
    }

    const data: AuthSuccessData = body?.data || body;
    if (data?.token) {
      AggarlyChatBridgeClient.setAuthTokenPair(data.token, data.refreshToken);
      this.saveLocalUserData(data.token);
    }
    return data;
  }

  /**
   * Request 6-digit password reset OTP via email
   */
  static async forgotPassword(email: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      let errorMsg = body?.message || body?.error || "Failed to send reset code";
      if (body?.errors && typeof body.errors === "object") {
        const fieldErrors = Object.values(body.errors).filter(Boolean).join(". ");
        if (fieldErrors) errorMsg = fieldErrors;
      }
      throw new Error(errorMsg);
    }

    return body?.message || "If the email exists, a 6-digit password reset OTP has been sent.";
  }

  /**
   * Reset password using email, 6-digit OTP code, and new password
   */
  static async resetPassword(email: string, otpCode: string, newPassword: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        otpCode: otpCode.trim(),
        newPassword,
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      let errorMsg = body?.message || body?.error || "Password reset failed";
      if (body?.errors && typeof body.errors === "object") {
        const fieldErrors = Object.values(body.errors).filter(Boolean).join(". ");
        if (fieldErrors) errorMsg = fieldErrors;
      }
      throw new Error(errorMsg);
    }

    return body?.message || "Password reset successfully. Please log in.";
  }

  /**
   * Verify email using 6-digit OTP code
   */
  static async verifyEmail(code: string, email?: string): Promise<void> {
    const trimmedCode = code.trim();
    const targetEmail = email || this.getCurrentUser()?.email;
    if (!targetEmail) {
      throw new Error("User email is required for verification");
    }

    const token = this.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: targetEmail,
        otpCode: trimmedCode,
      }),
    });

    const text = await res.text().catch(() => "");
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!res.ok) {
      const errorMsg =
        (typeof body === "object" ? body?.message || body?.error : body) ||
        "Invalid or expired verification code.";
      throw new Error(errorMsg);
    }

    const currentUser = this.getCurrentUser();
    if (currentUser) {
      currentUser.emailVerified = true;
    }
  }

  /**
   * Resend email verification code via POST /api/v1/auth/send-verification?email=...
   */
  static async resendEmailVerification(email?: string): Promise<string> {
    const targetEmail = email || this.getCurrentUser()?.email;
    if (!targetEmail) {
      throw new Error("User email is required to send verification code");
    }

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = `${API_BASE_URL}/api/v1/auth/send-verification?email=${encodeURIComponent(targetEmail)}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
    });

    const text = await res.text().catch(() => "");
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!res.ok) {
      const errorMsg =
        (typeof body === "object" ? body?.message || body?.error : body) ||
        "Failed to send verification code. Please try again.";
      throw new Error(errorMsg);
    }

    return (
      (typeof body === "object" ? body?.message || body?.data : body) ||
      "6-digit verification code sent to your email."
    );
  }

  /**
   * Target purge of only authentication credentials.
   * NEVER purges user preferences like theme, metric, language, or currency.
   */
  static clearAuthCredentials(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("aggarly_jwt_token");
      localStorage.removeItem("aggarly_refresh_token");
      localStorage.removeItem("aggarly_user");
      localStorage.removeItem("aggarly_user_id");
    } catch (e) {
      console.warn("Failed to clear auth credentials:", e);
    }
    AggarlyChatBridgeClient.clearSession();
    try {
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("aggarly_auth_sync");
        channel.postMessage({ type: "AUTH_LOGOUT", timestamp: Date.now() });
        channel.close();
      }
    } catch {}
    try {
      window.dispatchEvent(new Event("aggarly_auth_cleared"));
    } catch {}
  }

  /**
   * Safe alias to clearAuthCredentials. Retains all non-auth user preferences.
   */
  static clearAllLocalStorage(): void {
    this.clearAuthCredentials();
  }

  /**
   * Log out active session
   */
  static async logout(): Promise<void> {
    const refreshToken =
      (typeof window !== "undefined" ? localStorage.getItem("aggarly_refresh_token") : null) ||
      AggarlyChatBridgeClient.getRefreshToken();
    try {
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) {
      console.warn("Logout request failed:", e);
    } finally {
      this.clearAllLocalStorage();
    }
  }

  /**
   * Save user info extracted from JWT
   */
  private static saveLocalUserData(token: string) {
    if (typeof window === "undefined" || !token) return;
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const payloadStr = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(payloadStr);
        const userId = payload.userId || payload.id || payload.sub;
        if (userId) {
          localStorage.setItem("aggarly_user_id", userId);
        }

        // Parse all user roles from JWT claims (roles array, authorities, or singular role)
        const rawRoles: any = payload.roles || payload.authorities || (payload.role ? [payload.role] : []);
        let parsedRoles: string[] = [];
        if (Array.isArray(rawRoles)) {
          parsedRoles = rawRoles
            .map((r: any) =>
              typeof r === "string"
                ? r.replace(/^ROLE_/i, "").toUpperCase()
                : r?.authority
                ? String(r.authority).replace(/^ROLE_/i, "").toUpperCase()
                : ""
            )
            .filter(Boolean);
        } else if (typeof rawRoles === "string") {
          parsedRoles = [rawRoles.replace(/^ROLE_/i, "").toUpperCase()];
        }
        if (parsedRoles.length === 0) {
          parsedRoles = ["GUEST", "HOST", "ADMIN"];
        }

        const primaryRole = parsedRoles[0] || "GUEST";

        // Check emailVerified strictly from JWT claims
        let isVerified = true;
        if (typeof payload.emailVerified === "boolean") {
          isVerified = payload.emailVerified;
        } else if (typeof payload.email_verified === "boolean") {
          isVerified = payload.email_verified;
        }

        localStorage.setItem(
          "aggarly_user",
          JSON.stringify({
            id: userId,
            email: payload.sub || payload.email || "",
            username: payload.username || (payload.email ? payload.email.split("@")[0] : "user"),
            role: primaryRole,
            roles: parsedRoles,
            emailVerified: isVerified,
          })
        );
      }
    } catch (e) {
      console.warn("Error decoding token payload:", e);
    }
  }

  /**
   * Handle OAuth login callback data (token, refreshToken, user info)
   */
  static handleOAuthSuccess(
    token: string,
    refreshToken?: string,
    userOverride?: Partial<UserProfile>
  ): UserProfile {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("aggarly_jwt_token", token);
        if (refreshToken) {
          localStorage.setItem("aggarly_refresh_token", refreshToken);
        }
      } catch (e) {
        console.warn("Error storing tokens:", e);
      }
    }
    AggarlyChatBridgeClient.setAuthTokenPair(token, refreshToken || "");
    this.saveLocalUserData(token);

    let user = this.getCurrentUser();
    if (!user) {
      user = {
        id: "oauth-user",
        email: userOverride?.email || "",
        username: userOverride?.username || userOverride?.email?.split("@")[0] || "user",
        role: "GUEST",
        roles: ["GUEST", "HOST", "ADMIN"],
        emailVerified: userOverride?.emailVerified ?? true,
      };
    }
    if (userOverride) {
      user = { ...user, ...userOverride };
    }
    if (user.emailVerified === undefined) {
      user.emailVerified = true;
    }
    if (!user.roles || user.roles.length === 0) {
      user.roles = ["GUEST", "HOST", "ADMIN"];
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("aggarly_user", JSON.stringify(user));
      } catch {}
    }
    return user;
  }

  /**
   * Retrieve current user from local storage (Pure read-only)
   */
  static getCurrentUser(): UserProfile | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("aggarly_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.roles || !Array.isArray(parsed.roles) || parsed.roles.length === 0) {
          parsed.roles = parsed.role ? [parsed.role.toUpperCase()] : ["GUEST", "HOST", "ADMIN"];
        }
        return parsed;
      }
    } catch {}
    return null;
  }

  private static refreshPromise: Promise<string | null> | null = null;

  /**
   * Check if JWT token is expired based on exp claim.
   * bufferSeconds allows proactive refresh before hard expiration.
   */
  static isJwtExpired(token: string, bufferSeconds: number = 0): boolean {
    if (!token || !token.trim()) return true;
    try {
      const parts = token.split(".");
      if (parts.length < 2) return true;
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(jsonStr);
      if (!payload.exp) return false;
      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp <= nowInSeconds + bufferSeconds;
    } catch {
      return false;
    }
  }

  /**
   * Returns true if there are plausible credentials in storage (valid JWT or non-empty refresh token).
   */
  static hasValidCredentials(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const token = localStorage.getItem("aggarly_jwt_token");
      const refreshToken = localStorage.getItem("aggarly_refresh_token");
      if (!token && !refreshToken) return false;
      if (refreshToken && refreshToken.trim().length > 0) return true;
      if (token && !this.isJwtExpired(token)) return true;
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve active JWT token strictly from local storage (Pure read-only)
   */
  static getToken(): string | null {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("aggarly_jwt_token");
    return token && token.trim() ? token.trim() : null;
  }

  /**
   * Rotate access token using refresh token.
   * - Uses in-flight singleton mutex to prevent parallel duplicate refreshes.
   * - ONLY removes credentials when refresh token is 100% CONFIRMED invalid/expired by backend (401/400).
   * - Network glitches, timeouts, offline status, and 5xx server errors NEVER remove credentials.
   */
  static async refreshSession(): Promise<string | null> {
    if (typeof window === "undefined") return null;

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken =
        localStorage.getItem("aggarly_refresh_token") ||
        AggarlyChatBridgeClient.getRefreshToken();

      const currentToken = this.getToken();

      if (!refreshToken) {
        // If there's no refresh token but current JWT is not expired, keep it!
        if (currentToken && !this.isJwtExpired(currentToken)) {
          console.log("[AuthClient] No refresh token present, but access token is still valid. Retaining session.");
          return currentToken;
        }
        console.warn("[AuthClient] No refresh token present and access token is expired/missing. Clearing credentials.");
        this.clearAuthCredentials();
        return null;
      }

      try {
        console.log("[AuthClient] Initiating session refresh via /api/v1/auth/refresh...");
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (res.ok) {
          const body = await res.json().catch(() => null);
          const data: AuthSuccessData = body?.data || body;
          const newToken = data?.token || (data as any)?.accessToken;
          const newRefresh = data?.refreshToken || refreshToken;

          if (newToken) {
            localStorage.setItem("aggarly_jwt_token", newToken);
            if (newRefresh) {
              localStorage.setItem("aggarly_refresh_token", newRefresh);
            }
            AggarlyChatBridgeClient.setAuthTokenPair(newToken, newRefresh);
            this.saveLocalUserData(newToken);
            console.log("[AuthClient] Session refresh successful.");
            return newToken;
          }
        }

        const status = res.status;
        let errorBody: any = null;
        try {
          errorBody = await res.json();
        } catch {
          errorBody = null;
        }
        const errorMsg = errorBody?.message || errorBody?.error || "";

        // 5xx Server Errors (500, 502, 503, 504) or 429 Rate Limit:
        // Server temporary issue. NEVER remove credentials!
        if (status >= 500 || status === 429) {
          console.warn(`[AuthClient] Server returned ${status} during refresh. Retaining credentials without logging out.`);
          return null;
        }

        // 401 Unauthorized or 400 Bad Request: Explicit backend rejection
        if (status === 401 || status === 400) {
          console.warn(`[AuthClient] Refresh token explicitly rejected (${status}: ${errorMsg}). Credentials are 100% invalid. Clearing.`);
          this.clearAuthCredentials();
          return null;
        }

        console.warn(`[AuthClient] Refresh token unexpected status ${status}. Retaining credentials.`);
        return null;
      } catch (e) {
        // Network connection error / offline / server restarting
        console.warn("[AuthClient] Network connection error during refresh. Retaining credentials:", e);
        return null;
      }
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  /**
   * Fetch authenticated user profile directly from GET /api/v1/users/me
   */
  static async fetchCurrentProfile(): Promise<UserProfile | null> {
    let token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      let res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // If token expired, try refreshing
      if (res.status === 401) {
        const refreshedToken = await this.refreshSession();
        if (refreshedToken) {
          token = refreshedToken;
          res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          return null;
        }
      }

      if (!res.ok) {
        // Do not purge credentials here; let refreshSession handle actual expiration
        return null;
      }

      const body = await res.json().catch(() => null);
      const data = body?.data || body;
      if (!data) return null;

      const rawRoles = data.roles;
      let parsedRoles: string[] = [];
      if (Array.isArray(rawRoles)) {
        parsedRoles = rawRoles.map((r: any) => String(r).replace(/^ROLE_/i, "").toUpperCase());
      } else if (rawRoles && typeof rawRoles === "object") {
        parsedRoles = Object.keys(rawRoles).map((r) => r.replace(/^ROLE_/i, "").toUpperCase());
      }
      if (parsedRoles.length === 0) {
        parsedRoles = ["GUEST"];
      }

      const computedDisplayName =
        data.displayName ||
        (data.firstName
          ? `${data.firstName} ${data.lastName || ""}`.trim()
          : data.username || (data.email ? data.email.split("@")[0] : "Member"));

      const profile: UserProfile = {
        id: String(data.id || ""),
        email: data.email || "",
        username: data.username || (data.email ? data.email.split("@")[0] : "user"),
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        displayName: computedDisplayName,
        avatarUrl: data.avatarUrl || undefined,
        phone: data.phone || undefined,
        bio: data.bio || undefined,
        roles: parsedRoles,
        role: parsedRoles[0] || "GUEST",
        emailVerified: typeof data.emailVerified === "boolean" ? data.emailVerified : true,
      };

      try {
        localStorage.setItem("aggarly_user", JSON.stringify(profile));
      } catch {}

      return profile;
    } catch (e) {
      console.warn("Non-fatal error fetching /api/v1/users/me:", e);
      return null;
    }
  }
}
