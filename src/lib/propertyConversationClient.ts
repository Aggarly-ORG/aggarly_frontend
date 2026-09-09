import { AuthClient } from "./authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface UiCommand {
  type: "CLICK_AMENITY" | "UPDATE_FIELD" | "SCROLL_TO" | "SUGGEST_CONTENT";
  target: string; // Amenity ID, field name, or scroll anchor
  value: any;
  description: string;
}

export interface FastVisionAnalysisResult {
  imageId: string;
  imageKey: string;
  imageUrl?: string;
  sceneType: string;
  sceneConfidence: number;
  isIndoor?: boolean;
  viewType?: string;
  aiCaption?: string;
  detectedAmenities: string[];
  detectedAmenityIds: string[];
  styleTags: string[];
  dominantColors?: string[];
  architecturalSummary?: string;
  uiCommands: UiCommand[];
}

export interface PropertyConversationResponse {
  id: string;
  type: string;
  propertyId?: string;
  title: string;
  name?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  participants?: any[];
  recentMessages?: any[];
}

export class PropertyConversationClient {
  private static async authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = AuthClient.getAccessToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
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

  /**
   * Retrieves or initializes a dedicated host property conversation thread.
   * This conversation is strictly isolated from guest-facing chat inboxes.
   */
  static async getOrCreatePropertyConversation(params: {
    propertyId?: string;
    draftId?: string;
    title?: string;
  }): Promise<PropertyConversationResponse> {
    const res = await this.authFetch(`/api/v1/chat/conversations/property`, {
      method: "POST",
      body: JSON.stringify({
        propertyId: params.propertyId || null,
        draftId: params.draftId || null,
        title: params.title || "Sanctuary Vision Co-pilot",
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to initialize property conversation: ${res.status} - ${errorText}`);
    }

    const json = await res.json();
    return json.data || json;
  }

  /**
   * Executes rapid visual perception on an uploaded photo and triggers UI agent commands.
   */
  static async fastAnalyzeImage(payload: {
    conversationId: string;
    imageKey: string;
    imageUrl?: string;
    propertyId?: string;
    draftId?: string;
    fileName?: string;
    displayOrder?: number;
  }): Promise<FastVisionAnalysisResult> {
    const res = await this.authFetch(`/api/v1/vision/fast-analyze`, {
      method: "POST",
      body: JSON.stringify({
        conversationId: payload.conversationId,
        imageKey: payload.imageKey,
        imageUrl: payload.imageUrl,
        propertyId: payload.propertyId || null,
        draftId: payload.draftId || null,
        fileName: payload.fileName,
        displayOrder: payload.displayOrder,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Fast vision analysis failed: ${res.status} - ${errorText}`);
    }

    const json = await res.json();
    return json.data || json;
  }

  /**
   * Retrieves messages for the property conversation thread.
   */
  static async getMessages(conversationId: string, page = 0, size = 50): Promise<any[]> {
    try {
      const res = await this.authFetch(
        `/api/v1/chat/conversations/${conversationId}/messages?page=${page}&size=${size}&sort=createdAt,asc`
      );

      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.content || json.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Sends a message from the host to Lumen within this property's context.
   */
  static async sendMessage(conversationId: string, content: string, screenshotUrl?: string | null): Promise<any> {
    const body: Record<string, any> = {
      content,
      messageType: "TEXT",
    };
    if (screenshotUrl) {
      body.metadataJson = JSON.stringify({ screenshotUrl });
    }

    const res = await this.authFetch(`/api/v1/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Failed to send co-pilot message: ${res.status}`);
    }

    const json = await res.json();
    return json.data || json;
  }
}

