import { AuthClient } from "./authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface HelpArticleResponse {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  createdAt?: string;
}

export interface CreateHelpSignalRequest {
  residencyRef?: string;
  situationType: string;
  description: string;
  phone?: string;
}

export interface HelpSignalResponse {
  id: string;
  residencyRef?: string;
  situationType: string;
  description: string;
  phone?: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
}

export class HelpClient {
  private static async authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = AuthClient.getAccessToken();
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  }

  static async getArticles(q?: string, category?: string): Promise<HelpArticleResponse[]> {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category && category !== "all") params.set("category", category);
      const query = params.toString() ? `?${params.toString()}` : "";

      const res = await fetch(`${API_BASE_URL}/api/v1/help/articles${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : (data.data?.content || []);
    } catch {
      return [];
    }
  }

  static async transmitSignal(req: CreateHelpSignalRequest): Promise<HelpSignalResponse | null> {
    try {
      const res = await this.authFetch("/api/v1/help/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch {
      return null;
    }
  }

  static async getMyTickets(): Promise<HelpSignalResponse[]> {
    try {
      const res = await this.authFetch("/api/v1/help/tickets/me");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : [];
    } catch {
      return [];
    }
  }
}
