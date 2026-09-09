import { AuthClient } from "./authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface WatchdogAlert {
  id: string;
  sanctuaryTitle: string;
  sanctuaryLocation: string;
  bortleRating: string;
  targetDates: string;
  originalPrice: number;
  targetPrice: number;
  currentPrice: number;
  status: "ACTIVE" | "TRIGGERED" | "PAUSED";
  createdAt: string;
  imageUrl: string;
  solsticeTrigger?: boolean;
  notificationsChannel: string;
}

export class WatchdogClient {
  private static getHeaders(): HeadersInit {
    const token = AuthClient.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Fetch configured price & availability watchdogs
   * GET /api/v1/watchdogs
   */
  static async getWatchdogs(): Promise<WatchdogAlert[]> {
    const token = AuthClient.getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/watchdogs`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return [];
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      return list.map((w: any) => ({
        id: w.id,
        sanctuaryTitle: w.sanctuaryTitle || w.propertyName || "Sanctuary",
        sanctuaryLocation: w.sanctuaryLocation || "Dark-Sky Preserve",
        bortleRating: w.bortleRating || "BORTLE 2",
        targetDates: w.targetDates || "New Moon Phase",
        originalPrice: Number(w.originalPrice || 0),
        targetPrice: Number(w.targetPrice || 0),
        currentPrice: Number(w.currentPrice || 0),
        status: w.status || "ACTIVE",
        createdAt: w.createdAt || "Active",
        imageUrl: w.imageUrl || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
        solsticeTrigger: Boolean(w.solsticeTrigger),
        notificationsChannel: w.notificationsChannel || "SMS & Push",
      }));
    } catch (e) {
      console.warn("[WatchdogClient] getWatchdogs error:", e);
      return [];
    }
  }

  /**
   * Create new watchdog monitor
   * POST /api/v1/watchdogs
   */
  static async createWatchdog(data: Partial<WatchdogAlert>): Promise<WatchdogAlert | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/watchdogs`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json;
    } catch (e) {
      console.warn("[WatchdogClient] createWatchdog error:", e);
      return null;
    }
  }

  /**
   * Toggle watchdog status
   * PUT /api/v1/watchdogs/{id}/toggle
   */
  static async toggleWatchdog(id: string, active: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/watchdogs/${id}/toggle`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({ active }),
      });
      return res.ok;
    } catch (e) {
      console.warn("[WatchdogClient] toggleWatchdog error:", e);
      return false;
    }
  }

  /**
   * Delete watchdog alert
   * DELETE /api/v1/watchdogs/{id}
   */
  static async deleteWatchdog(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/watchdogs/${id}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (e) {
      console.warn("[WatchdogClient] deleteWatchdog error:", e);
      return false;
    }
  }
}
