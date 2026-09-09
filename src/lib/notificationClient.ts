import { AuthClient } from "./authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface NotificationItem {
  id: string;
  category: "bookings" | "messages" | "price-alerts" | "system";
  badgeText: string;
  badgeIcon: string;
  timeAgo: string;
  title: string;
  body: string;
  unread: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metaInfo?: string;
}

export class NotificationClient {
  private static getHeaders(): HeadersInit {
    const token = AuthClient.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Fetch current user's dispatches & notifications
   * GET /api/v1/notifications
   */
  static async getNotifications(category?: string,readonly:boolean=false): Promise<NotificationItem[]> {
    const token = AuthClient.getToken();
    if (!token) return [];

    try {
      const url = new URL(`${API_BASE_URL}/api/v1/notifications`);
      url.searchParams.set("unreadOnly", readonly ? "true" : "false");
      if (category && category !== "all") {
        url.searchParams.set("category", category);
      }

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return [];
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      return list.map((item: any) => ({
        id: item.id || `notif-${Math.random()}`,
        category: item.category || "system",
        badgeText: item.badgeText || "SYSTEM DISPATCH",
        badgeIcon: item.badgeIcon || "info",
        timeAgo: item.timeAgo || "Recently",
        title: item.title,
        body: item.body || item.message,
        unread: Boolean(item.unread ?? true),
        actionUrl: item.actionUrl,
        actionLabel: item.actionLabel,
        metaInfo: item.metaInfo,
      }));
    } catch (e) {
      console.warn("[NotificationClient] getNotifications error:", e);
      return [];
    }
  }

  /**
   * Mark single notification as read
   * POST /api/v1/notifications/{id}/read
   */
  static async markAsRead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/read`, {
        method: "POST",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (e) {
      console.warn("[NotificationClient] markAsRead error:", e);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   * POST /api/v1/notifications/read-all
   */
  static async markAllAsRead(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
        method: "POST",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (e) {
      console.warn("[NotificationClient] markAllAsRead error:", e);
      return false;
    }
  }

  /**
   * Delete single notification
   * DELETE /api/v1/notifications/{id}
   */
  static async deleteNotification(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/notifications/${id}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (e) {
      console.warn("[NotificationClient] deleteNotification error:", e);
      return false;
    }
  }
}
