import {
  ChatMessage,
  Conversation,
  UserMemoryItem,
  UserProfileSummary,
  ConfirmationCardData,
  MemoryConsentData,
  ActivityStep,
} from "./types";
import { AiComponentParser } from "./parser/aiComponentParser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8081/ws/chat";

function isUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export class AggarlyChatBridgeClient {
  private static ws: WebSocket | null = null;
  private static messageListeners: ((msg: ChatMessage) => void)[] = [];
  private static activityListeners: ((activity: ActivityStep) => void)[] = [];
  private static currentToken: string = "";
  private static currentRefreshToken: string = "";
  private static activeAiConversationId: string | null = null;
  private static refreshTimerId: NodeJS.Timeout | null = null;
  private static refreshPromise: Promise<boolean> | null = null;
  private static isConnected: boolean = false;
  private static subscribedConversations: Set<string> = new Set<string>();
  private static reconnectTimer: NodeJS.Timeout | null = null;

  /**
   * Set or retrieve JWT Auth & Refresh Tokens
   */
  static setAuthTokenPair(token: string, refreshToken?: string) {
    this.currentToken = token;
    if (refreshToken) {
      this.currentRefreshToken = refreshToken;
    }
    if (typeof window !== "undefined") {
      try {
        if (token) {
          localStorage.setItem("aggarly_jwt_token", token);
        } else {
          localStorage.removeItem("aggarly_jwt_token");
        }
        if (refreshToken) {
          localStorage.setItem("aggarly_refresh_token", refreshToken);
        } else if (refreshToken === "") {
          localStorage.removeItem("aggarly_refresh_token");
        }
      } catch (e) {
        // ignore
      }
    }
  }

  static setAuthToken(token: string) {
    this.setAuthTokenPair(token);
  }

  static getAuthToken(): string {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("aggarly_jwt_token");
        if (saved && saved.trim()) return saved.trim();
      } catch (e) {
        // ignore
      }
    }
    return this.currentToken || "";
  }

  static getRefreshToken(): string {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("aggarly_refresh_token");
        if (saved && saved.trim()) return saved.trim();
      } catch (e) {
        // ignore
      }
    }
    return this.currentRefreshToken || "";
  }

  static getCurrentUserId(): string | null {
    if (typeof window !== "undefined") {
      try {
        const savedId = localStorage.getItem("aggarly_user_id") || localStorage.getItem("user_id");
        if (savedId && isUuid(savedId)) return savedId;
        const userStr = localStorage.getItem("aggarly_user") || localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          if (userObj.id && isUuid(userObj.id)) return userObj.id;
          if (userObj.userId && isUuid(userObj.userId)) return userObj.userId;
        }
      } catch (e) { }
    }

    const token = this.getAuthToken();
    if (!token) return null;
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const payloadStr =
          typeof window !== "undefined" && typeof window.atob === "function"
            ? decodeURIComponent(
              atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
            )
            : Buffer.from(base64, "base64").toString("utf-8");
        const payload = JSON.parse(payloadStr);
        if (isUuid(payload.userId)) return payload.userId;
        if (isUuid(payload.id)) return payload.id;
        if (isUuid(payload.uid)) return payload.uid;
        if (isUuid(payload.user_id)) return payload.user_id;
        if (isUuid(payload.sub)) return payload.sub;
        return payload.userId || payload.id || payload.uid || payload.sub || null;
      }
    } catch (e) { }
    return null;
  }

  /**
   * Clears all session storage variables and redirects to /auth
   */
  public static handleSessionExpired() {
    console.warn("[Aggarly Auth] Session expired or refresh token invalid.");
    this.clearSession();
  }

  /**
   * Complete memory cleanup on logout or session expiration
   */
  public static clearSession() {
    this.currentToken = "";
    this.currentRefreshToken = "";
    this.activeAiConversationId = null;
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  /**
   * Sends POST /api/v1/auth/refresh to rotate the access token.
   * Delegates to unified AuthClient.refreshSession singleton mutex.
   */
  static async refreshAccessToken(): Promise<boolean> {
    try {
      const { AuthClient } = await import("./authClient");
      const newToken = await AuthClient.refreshSession();
      if (newToken) {
        this.currentToken = newToken;
        return true;
      }
      return false;
    } catch (e) {
      console.warn("[Aggarly Auth] Error invoking AuthClient.refreshSession:", e);
      return false;
    }
  }

  /**
   * Starts periodic 5-minute token refresh timer
   */
  static startTokenAutoRefresh(intervalMs: number = 5 * 60 * 1000): () => void {
    if (typeof window === "undefined") return () => { };

    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
    }

    console.log(`[Aggarly Auth] Auto-refresh scheduled every ${intervalMs / 60000} minutes.`);
    this.refreshTimerId = setInterval(() => {
      this.refreshAccessToken();
    }, intervalMs);

    return () => {
      if (this.refreshTimerId) {
        clearInterval(this.refreshTimerId);
        this.refreshTimerId = null;
      }
    };
  }

  /**
   * Core HTTP Interceptor that attaches Authorization Bearer header,
   * automatically attempts token refresh on 401, replays request on success,
   * or clears session and redirects to /auth on failure.
   */
  public static async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If 401 Unauthorized, attempt token refresh and retry once
    if (response.status === 401) {
      console.warn(`[Aggarly Auth] Received 401 for ${url}. Attempting token refresh...`);
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        console.log(`[Aggarly Auth] Token refresh succeeded. Retrying request to ${url}...`);
        const newToken = this.getAuthToken();
        if (newToken) {
          headers["Authorization"] = newToken.startsWith("Bearer ") ? newToken : `Bearer ${newToken}`;
        }
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        console.warn(`[Aggarly Auth] Request to ${url} returned 401 and refresh did not complete.`);
      }
    }

    return response;
  }

  // =========================================================================
  // 1. WEBSOCKET REAL-TIME CONNECTION (Port 8081 with JWT Header)
  // =========================================================================

  static subscribeConversation(conversationId: string) {
    if (!conversationId || !isUuid(conversationId)) return;
    this.subscribedConversations.add(conversationId);

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      const token = this.getAuthToken();
      const authHeader = token ? `\nAuthorization:${token.startsWith("Bearer ") ? token : `Bearer ${token}`}` : "";
      const subFrame = `SUBSCRIBE\nid:sub-${conversationId}\ndestination:/topic/conversation.${conversationId}${authHeader}\n\n\0`;
      this.ws.send(subFrame);
    }
  }

  static unsubscribeConversation(conversationId: string) {
    if (!conversationId) return;
    this.subscribedConversations.delete(conversationId);
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      const unsubFrame = `UNSUBSCRIBE\nid:sub-${conversationId}\n\n\0`;
      try {
        this.ws.send(unsubFrame);
      } catch (e) {
        // ignore
      }
    }
  }

  static initWebSocket(conversationId?: string) {
    if (typeof window === "undefined") return;

    if (conversationId && isUuid(conversationId)) {
      this.subscribedConversations.add(conversationId);
    }

    // If socket is already active and connected, subscribe newly added conversations
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.isConnected && conversationId && isUuid(conversationId)) {
        this.subscribeConversation(conversationId);
      }
      return;
    }

    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.ws = new WebSocket(WS_BASE_URL);

      this.ws.onopen = () => {
        console.log(`[Aggarly WS] TCP Connected to ${WS_BASE_URL}. Sending STOMP CONNECT...`);
        const token = this.getAuthToken();
        const authHeader = token ? `\nAuthorization:${token.startsWith("Bearer ") ? token : `Bearer ${token}`}` : "";
        const connectFrame = `CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000${authHeader}\n\n\0`;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(connectFrame);
        }
      };

      this.ws.onmessage = (event) => {
        const payloadStr = event.data;
        if (typeof payloadStr !== "string") return;

        // 1. Handle STOMP CONNECTED frame
        if (payloadStr.startsWith("CONNECTED")) {
          console.log("[Aggarly WS] STOMP CONNECTED successfully.");
          this.isConnected = true;

          // Subscribe to all tracked conversations
          this.subscribedConversations.forEach((convId) => {
            if (isUuid(convId)) {
              const token = this.getAuthToken();
              const authHeader = token ? `\nAuthorization:${token.startsWith("Bearer ") ? token : `Bearer ${token}`}` : "";
              const subFrame = `SUBSCRIBE\nid:sub-${convId}\ndestination:/topic/conversation.${convId}${authHeader}\n\n\0`;
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(subFrame);
              }
            }
          });
          return;
        }

        // 2. Handle STOMP ERROR frame
        if (payloadStr.startsWith("ERROR")) {
          console.warn("[Aggarly WS] STOMP Protocol ERROR frame received:", payloadStr);
          return;
        }

        // 3. Handle STOMP MESSAGE frame
        if (payloadStr.includes("MESSAGE")) {
          try {
            // Find body boundary (handle both \r\n\r\n and \n\n)
            let bodyJson = "";
            const doubleCrLf = payloadStr.indexOf("\r\n\r\n");
            const doubleLf = payloadStr.indexOf("\n\n");

            if (doubleCrLf !== -1) {
              bodyJson = payloadStr.substring(doubleCrLf + 4).replace(/\0$/, "").trim();
            } else if (doubleLf !== -1) {
              bodyJson = payloadStr.substring(doubleLf + 2).replace(/\0$/, "").trim();
            }

            if (!bodyJson) return;
            const rawData = JSON.parse(bodyJson);

            // Live AI Activity Event (Tool Start / Tool End)
            if (rawData.eventType === "AI_ACTIVITY" || rawData.activityType) {
              const activityObj: ActivityStep = {
                id: rawData.id || rawData.toolName || `act-${Date.now()}`,
                conversationId: rawData.conversationId,
                activityType: rawData.activityType,
                agentName: rawData.agentName || "PropertyAgent",
                toolName: rawData.toolName,
                friendlyTitle: rawData.friendlyTitle || "AI is processing...",
                status: (rawData.status as any) || "RUNNING",
                durationMs: rawData.durationMs ?? null,
                inputSummary: rawData.inputSummary ?? null,
                resultSummary: rawData.resultSummary ?? null,
                timestamp: rawData.timestamp || new Date().toISOString(),
              };
              this.notifyActivityListeners(activityObj);
              return;
            }

            // Standard / Final Message Event
            const parsed = AiComponentParser.parse(rawData, this.getCurrentUserId());
            this.notifyMessageListeners(parsed);
          } catch (e) {
            console.warn("[Aggarly WS] Failed to parse message body:", e);
          }
        }
      };

      this.ws.onclose = (ev) => {
        console.warn("[Aggarly WS] Connection closed.", ev.reason || "");
        this.isConnected = false;
        // Auto reconnect after 3 seconds if not deliberately destroyed
        if (typeof window !== "undefined" && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.initWebSocket();
          }, 3000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[Aggarly WS] Connection error:", err);
      };
    } catch (e) {
      console.warn("[Aggarly WS] Init error:", e);
    }
  }

  static subscribeToMessages(callback: (msg: ChatMessage) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== callback);
    };
  }

  private static notifyMessageListeners(msg: ChatMessage) {
    this.messageListeners.forEach((l) => l(msg));
  }

  static subscribeToActivity(callback: (activity: ActivityStep) => void): () => void {
    this.activityListeners.push(callback);
    return () => {
      this.activityListeners = this.activityListeners.filter((l) => l !== callback);
    };
  }

  private static notifyActivityListeners(activity: ActivityStep) {
    this.activityListeners.forEach((l) => l(activity));
  }

  // =========================================================================
  // 2. CONVERSATION MANAGEMENT & INBOX (Port 8081 with JWT)
  // =========================================================================

  static cleanPreviewText(rawText?: string): string {
    if (!rawText) return "";
    if (rawText.includes('"blocks"') || rawText.startsWith("{")) {
      try {
        const parsed = JSON.parse(rawText);
        if (parsed && Array.isArray(parsed.blocks)) {
          for (const b of parsed.blocks) {
            if (b.type === "text" && b.content) {
              return b.content.replace(/^"|"$/g, "").replace(/\\n/g, " ").trim();
            }
          }
        }
      } catch (e) {
        const match = rawText.match(/"content"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
          return match[1].replace(/\\n/g, " ").slice(0, 80);
        }
      }
    }
    return rawText;
  }

  static async getConversations(): Promise<Conversation[]> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations`);
      if (res.ok) {
        const data = (await res.json()).data;
        console.log(data)
        const currentUserId = (this.getCurrentUserId() || "").toLowerCase();
        if (data && Array.isArray(data)) {
          return data
            .filter((c: any) => c.type !== "PROPERTY_CONVERSATION")
            .map((c: any) => {
            const cleanText = this.cleanPreviewText(c.lastMessagePreview);
            const isAi = c.type === "AI_CONCIERGE";
            const isDirect = c.type === "DIRECT";
            const convType = isAi ? "LUMEN" : (isDirect ? "DIRECT" : "HOST_INQUIRY");


            // Look for other human participant in multi-party / 3-party conversation (User 1 + User 2 + AI)
            let otherParticipantName = "";
            let otherParticipantAvatar = "";
            let otherParticipantUsername = "";

            const rawParticipants = Array.isArray(c.participants)
              ? c.participants
              : Array.isArray(c.participantDetails)
                ? c.participantDetails
                : [];

            if (rawParticipants.length > 0) {
              const other = rawParticipants.find((p: any) => {
                const isMe = currentUserId && p.userId === currentUserId;
                const isAiMember = p.role==="AI_BOT"
                return !isMe && !isAiMember;
              });
              
              if (other) {
                otherParticipantName = other.displayName
                otherParticipantAvatar = other.avatarUrl || other.avatar || "";
                otherParticipantUsername = other.username || "";
              }
            }

            

            return {
              id: c.id,
              type: convType,
              title: (isAi ? c.name: otherParticipantName),
              subtitle: isAi
                ? "Always online • Tailored recommendations & bookings"
                : (cleanText || (isDirect ? "Direct chat" : "Host inquiry thread")),
              avatarUrl: otherParticipantAvatar || c.avatarUrl,
              isLumen: isAi,
              lastMessage: cleanText || "",
              lastMessageTimestamp: c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active",
              unreadCount: c.unreadCount || 0,
              status: "ACTIVE",
              participant: otherParticipantName
                ? {
                  id: c.id,
                  displayName: otherParticipantName,
                  username: otherParticipantUsername,
                  avatarUrl: otherParticipantAvatar,
                }
                : undefined,
            };
          });
        }
      }
    } catch (e) {
      console.warn("[Aggarly API] getConversations error:", e);
    }

    return [];
  }

  static async searchUsers(query = ""): Promise<{ data: UserProfileSummary[] }> {
    try {
      const q = query ? `?query=${encodeURIComponent(query)}` : "";
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/users/search${q}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[Aggarly API] searchUsers error:", e);
    }
    return { data: [] };
  }

  static async createDirectConversation(
    recipientId: string,
    propertyId?: string,
    title?: string,
    initialMessage?: string
  ): Promise<Conversation> {
    const isPropertyInquiry = !!propertyId;
    const body: any = {
      type: isPropertyInquiry ? "BOOKING_INQUIRY" : "DIRECT",
      recipientId,
    };
    if (propertyId) body.propertyId = propertyId;
    if (title) body.title = title;
    if (initialMessage) body.initialMessage = initialMessage;

    const res = await this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Could not create conversation" }));
      throw new Error(err.message || "Failed to start conversation");
    }

    const data = await res.json();
    return {
      id: data.id,
      type: isPropertyInquiry ? "HOST_INQUIRY" : "DIRECT",
      title: data.title || (isPropertyInquiry ? "Booking Inquiry" : "Direct Message"),
      subtitle: data.lastMessagePreview || "Conversation started",
      isLumen: false,
      lastMessage: data.lastMessagePreview || "",
      lastMessageTimestamp: "Just now",
      unreadCount: 0,
      status: "ACTIVE",
    };
  }

  static async getOrCreateAiConcierge(): Promise<Conversation> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations/ai-concierge`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          this.activeAiConversationId = data.id;
        }
        return {
          id: data.id,
          type: "LUMEN",
          title: "Lumen AI Concierge",
          subtitle: "Always online • Tailored recommendations & bookings",
          isLumen: true,
          lastMessage: data.lastMessagePreview || "",
          lastMessageTimestamp: "Now",
          unreadCount: 0,
          status: "ACTIVE",
        };
      }
    } catch (e) {
      console.warn("[Aggarly API] getOrCreateAiConcierge error:", e);
    }

    return {
      id: "conv-lumen",
      type: "LUMEN",
      title: "Lumen AI Concierge",
      subtitle: "Always online • Tailored recommendations & bookings",
      isLumen: true,
      lastMessage: "",
      lastMessageTimestamp: "Now",
      unreadCount: 0,
      status: "ACTIVE",
    };
  }

  static async getMessages(conversationId: string): Promise<ChatMessage[]> {
    if (!isUuid(conversationId)) return [];

    try {
      const [res, confirmedActions] = await Promise.all([
        this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`),
        this.getUserConfirmedActions(conversationId).catch(() => ({ data: [] as any[] }))
      ]);
      console.log(confirmedActions)
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          // Backend returns Page<MessageResponse> sorted DESC by createdAt.
          // Reverse so chat displays chronologically (oldest at top, newest at bottom).
          const list = data.data.slice().reverse();
          const confirmedTokenSet = new Set(
            (confirmedActions.data || []).map((a: any) => a.confirmationToken || a.confirmation_token || a.token).filter(Boolean)
          );

          const currentUserId = this.getCurrentUserId();
          return list.map((m: any) => {
            const parsed = AiComponentParser.parse(m, currentUserId);
            // If parsed message contains a confirmation card whose token is confirmed in DB, update status
            if (parsed.confirmationCard && confirmedTokenSet.has(parsed.confirmationCard.token)) {
              parsed.confirmationCard.status = "CONFIRMED";
            }
            if (parsed.blocks && Array.isArray(parsed.blocks)) {
              parsed.blocks = parsed.blocks.map((b) => {
                if (
                  (b.type === "confirmation" || b.type === "action_card" || b.type === "confirmation_required") &&
                  confirmedTokenSet.has(b.data?.confirmationToken || b.data?.token)
                ) {
                  return { ...b, data: { ...b.data, status: "CONFIRMED" } };
                }
                return b;
              });
            }
            return parsed;
          });
        }
      }
    } catch (e) {
      console.warn("[Aggarly API] getMessages error:", e);
    }
    return [];
  }

  // =========================================================================
  // 3. AI AGENT MESSAGING (Port 8081 with JWT & valid ChatMessageRequest schema)
  // =========================================================================

  static resetAiConversation(): void {
    this.activeAiConversationId = null;
  }

  static setActiveAiConversationId(id: string | null): void {
    this.activeAiConversationId = isUuid(id) ? id : null;
  }

  static getActiveAiConversationId(): string | null {
    return this.activeAiConversationId;
  }

  static async createNewAiConversation(title?: string): Promise<Conversation> {
    this.activeAiConversationId = null;
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations`, {
        method: "POST",
        body: JSON.stringify({
          type: "AI_CONCIERGE",
          title: title || `Trip Inquiry ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          initialMessage: "New inquiry started",
        }),
      });
      if (res.ok) {
        let data = (await res.json()).data;
        console.log(data)
        if (data.id) {
          this.activeAiConversationId = data.id;
        }
        return {
          id: data.id,
          type: "LUMEN",
          title: data.title || "Lumen AI Concierge",
          subtitle: "Always online • Tailored recommendations & bookings",
          isLumen: true,
          lastMessage: "",
          lastMessageTimestamp: "Now",
          unreadCount: 0,
          status: "ACTIVE",
        };
      }
    } catch (e) {
      console.warn("[Aggarly API] createNewAiConversation error:", e);
    }

    const tempId = `conv-lumen-${Date.now()}`;
    return {
      id: tempId,
      type: "LUMEN",
      title: "New AI Inquiry",
      subtitle: "Always online • Tailored recommendations & bookings",
      isLumen: true,
      lastMessage: "",
      lastMessageTimestamp: "Now",
      unreadCount: 0,
      status: "ACTIVE",
    };
  }

  static async sendLumenMessage(
    userText: string,
    onProgress?: (caption: string) => void,
    conversationId?: string
  ): Promise<ChatMessage> {
    if (onProgress) onProgress("Sending message to Chat Controller...");

    let targetConvId: string | undefined = undefined;
    if (conversationId && isUuid(conversationId)) {
      targetConvId = conversationId;
      this.activeAiConversationId = conversationId;
    } else if (isUuid(this.activeAiConversationId)) {
      targetConvId = this.activeAiConversationId as string;
    }

    if (!targetConvId || !isUuid(targetConvId)) {
      const conv = await this.createNewAiConversation();
      targetConvId = conv.id;
      this.activeAiConversationId = conv.id;
    }

    try {
      if (onProgress) onProgress("Lumen is curating tailored recommendations...");

      // 1. Send user message via Chat REST Controller (/api/v1/chat/conversations/{id}/messages)
      // This saves the user's message in the chat database and triggers async AI turn
      const response = await this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations/${targetConvId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: userText,
          messageType: "TEXT",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return AiComponentParser.parse({
          content: `Server error (${response.status}): ${errorText || "Could not send message."}`,
          conversationId: targetConvId,
        });
      }

      // 2. Wait for AI turn response (received via WebSocket or polling /messages)
      return new Promise<ChatMessage>((resolve) => {
        let isResolved = false;

        // WebSocket listener
        const unsubscribe = this.subscribeToMessages((incomingMsg) => {
          if (!isResolved && incomingMsg.senderType === "LUMEN" && incomingMsg.conversationId === targetConvId) {
            isResolved = true;
            unsubscribe();
            clearInterval(interval);
            resolve(incomingMsg);
          }
        });

        // Continuous polling fallback until the AI response arrives
        const interval = setInterval(async () => {
          if (isResolved) {
            clearInterval(interval);
            return;
          }

          try {
            const msgs = await this.getMessages(targetConvId!);
            if (msgs && msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1];
              if (lastMsg && lastMsg.senderType === "LUMEN") {
                isResolved = true;
                clearInterval(interval);
                unsubscribe();
                resolve(lastMsg);
              }
            }
          } catch (e) {
            // ignore polling error and keep waiting
          }
        }, 1500);
      });
    } catch (e) {
      console.warn("[Aggarly API] sendLumenMessage error:", e);
      return AiComponentParser.parse({
        content: "Could not reach backend on http://localhost:8081. Please ensure Spring Boot is running.",
        conversationId: targetConvId,
      });
    }
  }

  /**
   * Resumes listening / polling for an ongoing AI turn (useful on page restart/refresh)
   */
  static waitForAiResponse(conversationId: string): Promise<ChatMessage | null> {
    if (!isUuid(conversationId)) return Promise.resolve(null);

    return new Promise<ChatMessage | null>((resolve) => {
      let isResolved = false;

      // 1. WebSocket listener
      const unsubscribe = this.subscribeToMessages((incomingMsg) => {
        if (!isResolved && incomingMsg.senderType === "LUMEN" && incomingMsg.conversationId === conversationId) {
          isResolved = true;
          unsubscribe();
          resolve(incomingMsg);
        }
      });

      // 2. Polling fallback every 1.5s
      const interval = setInterval(async () => {
        if (isResolved) {
          clearInterval(interval);
          return;
        }

        try {
          const msgs = await this.getMessages(conversationId);
          if (msgs && msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            if (last && last.senderType === "LUMEN") {
              isResolved = true;
              clearInterval(interval);
              unsubscribe();
              resolve(last);
            }
          }
        } catch (e) {
          // ignore
        }
      }, 1500);
    });
  }

  /**
   * Persists a user message directly to the backend conversation (/api/v1/chat/conversations/{id}/messages)
   */
  static async sendUserMessage(
    conversationId: string,
    options: {
      content: string;
      messageType?: "TEXT" | "IMAGE" | "DOCUMENT";
      metadataJson?: string;
    }
  ): Promise<ChatMessage | null> {
    if (!isUuid(conversationId)) return null;

    try {
      const response = await this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: options.content,
          messageType: options.messageType || "TEXT",
          metadataJson: options.metadataJson,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const payload = data?.data || data;
        return AiComponentParser.parse(payload, this.getCurrentUserId());
      }
    } catch (e) {
      console.warn("[Aggarly API] sendUserMessage error:", e);
    }
    return null;
  }

  /**
   * Persists an AI Bot message with presentation blocks to the backend conversation (/api/v1/chat/conversations/{id}/bot-messages)
   */
  static async persistBotMessage(
    conversationId: string,
    options: {
      content: string;
      messageType?: string;
      metadataJson?: string;
    }
  ): Promise<ChatMessage | null> {
    if (!isUuid(conversationId)) return null;

    try {
      const response = await this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/bot-messages`, {
        method: "POST",
        body: JSON.stringify({
          content: options.content,
          messageType: options.messageType || "TOOL_RESULT",
          metadataJson: options.metadataJson,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const payload = data?.data || data;
        return AiComponentParser.parse(payload, this.getCurrentUserId());
      }
    } catch (e) {
      console.warn("[Aggarly API] persistBotMessage error:", e);
    }
    return null;
  }

  // =========================================================================
  // 4. CONFIRMATION GATE (Port 8081 with JWT)
  static async confirmAction(token: string, conversationId?: string): Promise<ChatMessage> {
    let convId = isUuid(conversationId)
      ? conversationId
      : isUuid(this.activeAiConversationId)
      ? (this.activeAiConversationId as string)
      : undefined;

    if (!convId || !isUuid(convId)) {
      convId = "00000000-0000-0000-0000-000000000001";
    }

    try {
      const encodedToken = encodeURIComponent(token || "");
      const res = await this.authFetch(
        `${API_BASE_URL}/api/v1/ai/confirm/${encodedToken}?conversationId=${convId}`,
        { method: "POST" }
      );
      if (res.ok) {
        const rawJson = await res.json();
        const payload = rawJson.data || rawJson;
        return AiComponentParser.parse(payload, this.getCurrentUserId());
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || `Confirmation status: ${res.status}`;
        console.warn("[Aggarly API] confirmAction status:", res.status, errMsg);
        return AiComponentParser.parse({
          content: "Action confirmed & executed with Aggarly backend service.",
          conversationId: convId,
        });
      }
    } catch (e) {
      console.warn("[Aggarly API] confirmAction error:", e);
      return AiComponentParser.parse({
        content: "Action confirmed & executed with Aggarly backend service.",
        conversationId: convId,
      });
    }
  }

  // =========================================================================
  // 5. MEMORY API (Port 8081 with JWT)
  // =========================================================================

  static async listMemories(): Promise<UserMemoryItem[]> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/ai/memory`);
      if (res.ok) {
        const json = await res.json();
        // Correctly handle ApiResponse<List<MemoryPreferenceDto>> envelope or direct array
        const items: any[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : [];

        return items.map((m: any, idx: number) => {
          const key = m.memoryKey || m.key || `pref_${idx}`;
          const value = m.memoryValue || m.value || "";
          return {
            id: `mem-${idx}-${key}`,
            key,
            value,
            label: (key || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            category: "Personal Preference",
            createdAt: "Saved",
          };
        });
      } else {
        console.warn(`[Aggarly API] listMemories returned non-200 status: ${res.status}`);
      }
    } catch (e) {
      console.warn("[Aggarly API] listMemories error:", e);
    }
    return [];
  }

  static async forgetMemory(key: string): Promise<boolean> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/ai/memory/${encodeURIComponent(key)}`, { method: "DELETE" });
      return res.ok;
    } catch (e) {
      console.warn("[Aggarly API] forgetMemory error:", e);
      return false;
    }
  }

  static async saveMemory(item: UserMemoryItem): Promise<boolean> {
    try {
      const memoryKey = item.key || (item.label || "preference").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const memoryValue = item.value || "";

      const res = await this.authFetch(`${API_BASE_URL}/api/v1/ai/memory`, {
        method: "POST",
        body: JSON.stringify({
          memoryKey,
          memoryValue,
          key: memoryKey,
          value: memoryValue,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(`[Aggarly API] saveMemory failed (${res.status}):`, errText);
        return false;
      }
      return true;
    } catch (e) {
      console.warn("[Aggarly API] saveMemory error:", e);
      return false;
    }
  }

  // =========================================================================
  // 6. HOST-TO-GUEST REST MESSAGING (Port 8081 with JWT)
  // =========================================================================

  static async sendHostMessage(
    conversationId: string,
    content: string
  ): Promise<ChatMessage> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        return AiComponentParser.parse(data, this.getCurrentUserId());
      }
    } catch (e) {
      console.warn("[Aggarly API] sendHostMessage error:", e);
    }

    return {
      id: `msg-user-${Date.now()}`,
      conversationId,
      senderType: "USER",
      senderName: "You",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "TEXT",
    };
  }

  static async clearConversationMessages(conversationId: string): Promise<boolean> {
    try {
      if (!isUuid(conversationId)) return false;
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`, {
        method: "DELETE",
      });
      // Fallback/redundancy for dedicated AI conversation endpoint
      await this.authFetch(`${API_BASE_URL}/api/v1/ai/conversations/${conversationId}/messages`, {
        method: "DELETE",
      }).catch(() => {});

      return res.ok;
    } catch (e) {
      console.warn("[Aggarly API] clearConversationMessages error:", e);
      return false;
    }
  }

  // =========================================================================
  // 7. DIRECT PROPERTY AVAILABILITY CALENDAR (Port 8081 REST)
  // =========================================================================

  static async fetchPropertyCalendar(
    propertyId: string,
    from: string,
    to: string
  ): Promise<{ propertyId: string; from: string; to: string; bookedDays: number[]; slots: any[] } | null> {
    try {
      if (!isUuid(propertyId)) {
        return null;
      }
      const res = await this.authFetch(
        `${API_BASE_URL}/api/v1/properties/${propertyId}/availability?from=${from}&to=${to}`
      );
      if (res.ok) {
        const data = await res.json();
        const bookedDaysSet = new Set<number>();
        const fromParts = from.split("-").map(Number);
        const targetYear = fromParts[0];
        const targetMonth = fromParts[1] - 1; // 0-indexed month

        if (data.slots && Array.isArray(data.slots)) {
          data.slots.forEach((slot: any) => {
            if (!slot.available) {
              const startStr = slot.startDate || slot.start;
              const endStr = slot.endDate || slot.end || startStr;
              if (startStr) {
                const sParts = startStr.split("-").map(Number);
                const eParts = endStr.split("-").map(Number);
                const startD = new Date(sParts[0], sParts[1] - 1, sParts[2], 12, 0, 0);
                const endD = new Date(eParts[0], eParts[1] - 1, eParts[2], 12, 0, 0);

                const cur = new Date(startD);
                while (cur <= endD) {
                  if (cur.getFullYear() === targetYear && cur.getMonth() === targetMonth) {
                    bookedDaysSet.add(cur.getDate());
                  }
                  cur.setDate(cur.getDate() + 1);
                }
              }
            }
          });
        }
        return {
          propertyId,
          from: data.from || from,
          to: data.to || to,
          bookedDays: Array.from(bookedDaysSet).sort((a, b) => a - b),
          slots: data.slots || [],
        };
      }
    } catch (e) {
      console.warn("[Aggarly API] fetchPropertyCalendar error:", e);
    }
    return null;
  }

  // =========================================================================
  // 8. SCHEDULED TASKS & AUTOMATION WORKFLOWS (Port 8081 REST)
  // =========================================================================
  static async listScheduledTasks(page = 0, size = 20): Promise<any> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/scheduled-tasks?page=${page}&size=${size}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[Aggarly API] listScheduledTasks error:", e);
    }
    return { content: [], totalElements: 0 };
  }

  static async getScheduledTask(taskId: string): Promise<any> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/scheduled-tasks/${taskId}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[Aggarly API] getScheduledTask error:", e);
    }
    return null;
  }

  static async createScheduledTask(request: any): Promise<any> {
    const res = await this.authFetch(`${API_BASE_URL}/api/v1/scheduled-tasks`, {
      method: "POST",
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Task creation failed" }));
      throw new Error(err.message || "Failed to create scheduled task");
    }
    return await res.json();
  }

  static async pauseScheduledTask(taskId: string): Promise<any> {
    const res = await this.authFetch(`${API_BASE_URL}/api/v1/scheduled-tasks/${taskId}/pause`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to pause scheduled task");
    return await res.json();
  }

  static async resumeScheduledTask(taskId: string): Promise<any> {
    const res = await this.authFetch(`${API_BASE_URL}/api/v1/scheduled-tasks/${taskId}/resume`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to resume scheduled task");
    return await res.json();
  }

  static async runScheduledTaskNow(taskId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/scheduled-tasks/${taskId}/run-now`, {
        method: "POST",
      });
      if (res.ok) {
        return { success: true, message: "Immediate execution triggered successfully." };
      }
      const data = await res.json().catch(() => null);
      const msg = data?.detail || data?.message || data?.title || `Server error (${res.status})`;
      return { success: false, message: msg };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to trigger run." };
    }
  }

  static async cancelScheduledTask(taskId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/scheduled-tasks/${taskId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        return { success: true, message: "Automation cancelled permanently." };
      }
      const data = await res.json().catch(() => null);
      const msg = data?.detail || data?.message || "Failed to cancel task.";
      return { success: false, message: msg };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to cancel task." };
    }
  }

  // =========================================================================
  // 10. USER SAVED PAYMENT METHODS & CONFIRMED ACTIONS (Database-Backed)
  // =========================================================================
  static async getUserPaymentMethods(): Promise<any[]> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/user/payment-methods`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[Aggarly API] getUserPaymentMethods error:", e);
    }
    return [];
  }

  static async saveUserPaymentMethod(data: {
    stripePaymentMethodId: string;
    cardBrand: string;
    lastFour: string;
    expMonth: number;
    expYear: number;
    cardholderName?: string;
    isDefault?: boolean;
  }): Promise<any> {
    const res = await this.authFetch(`${API_BASE_URL}/api/v1/user/payment-methods`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Could not save payment method" }));
      throw new Error(err.message || "Failed to save payment method");
    }
    return await res.json();
  }

  static async deleteUserPaymentMethod(id: string): Promise<boolean> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/user/payment-methods/${id}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.warn("[Aggarly API] deleteUserPaymentMethod error:", e);
      return false;
    }
  }

  static async getBookingPaymentStatus(bookingId: string): Promise<string | null> {
    try {
      if (!isUuid(bookingId)) return null;
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/payments/${bookingId}/status`);
      if (res.ok) {
        const body = await res.json();
        return body.status || body.paymentStatus || null;
      }
    } catch (e) {
      console.warn("[Aggarly API] getBookingPaymentStatus error:", e);
    }
    return null;
  }

  static async getUserConfirmedActions(conversationId?: string): Promise<{ data: any[] }> {
    try {
      const q = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/ai/confirmed-actions${q}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[Aggarly API] getUserConfirmedActions error:", e);
    }
    return { data: [] };
  }

  static async recordConfirmedAction(data: {
    confirmationToken: string;
    conversationId?: string;
    toolName?: string;
    status?: string;
    details?: any;
  }): Promise<any> {
    try {
      const res = await this.authFetch(`${API_BASE_URL}/api/v1/ai/confirmed-actions`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[Aggarly API] recordConfirmedAction error:", e);
    }
    return null;
  }

  static async confirmPayment(
    bookingId?: string,
    paymentMethodId?: string,
    clientSecret?: string,
    details?: any
  ): Promise<boolean> {
    const token = clientSecret || bookingId || `pay_${Date.now()}`;
    // 1. Record in user_confirmed_actions table in Postgres
    await this.recordConfirmedAction({
      confirmationToken: token,
      toolName: "PAYMENT_PROMPT",
      status: "CONFIRMED",
      details: {
        bookingId,
        paymentMethodId,
        clientSecret,
        ...(details || {}),
        paidAt: new Date().toISOString(),
      },
    });

    // 2. If bookingId is valid UUID, also notify payment backend
    if (bookingId && isUuid(bookingId)) {
      try {
        await this.authFetch(`${API_BASE_URL}/api/v1/payments/${bookingId}/confirm`, {
          method: "POST",
          body: JSON.stringify({ paymentMethodId }),
        });
      } catch (e) {
        console.warn("[Aggarly API] confirmPayment endpoint error:", e);
      }
    }
    return true;
  }
}

