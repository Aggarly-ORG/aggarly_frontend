import {
  ChatMessage,
  ActivityStep,
  ConfirmationCardData,
  MemoryConsentData,
  PropertySnippet,
  PropertyCompareData,
  AvailabilityCalendarData,
  BlockedDateRange,
  PaymentPromptData,
  PrivateChefExperienceData,
  BookingTimelineData,
  CancellationPolicyData,
  WeatherForecastData,
  SupportFaqData,
  AgentThoughtProcessData,
  LumenResponseBlock,
  LumenAgentResponse,
} from "../types";

export interface BackendAiMessageResponse {
  id?: string | number;
  conversationId?: string;
  senderId?: string;
  senderType?: string;
  content?: string;
  text?: string;
  toolCalls?: string[];
  requiresConfirmation?: boolean;
  confirmationToken?: string;
  pendingToolName?: string;
  metadataJson?: string;
  messageType?: string;
  createdAt?: string;
  actionCard?: ConfirmationCardData;
}

export class AiComponentParser {
  /**
   * Main entry point: Parses any response from the AI Agent (port 8081) or Chat module
   * into a fully typed ChatMessage with structured presentation blocks attached.
   */
  static parse(
    raw: BackendAiMessageResponse,
    currentUserIdOrDefaultSender?: string | "LUMEN" | "HOST" | "USER" | null,
    defaultSenderName?: string
  ): ChatMessage {
    const rawContent = raw.content || raw.text || "";
    const toolCalls = raw.toolCalls || [];

    const currentUserIdStr = (currentUserIdOrDefaultSender || "").toLowerCase();
    const msgSenderId = (raw.senderId || "").toLowerCase();
    const rawSenderType = ((raw.senderType || (raw as any).sender_type || "") as string).toUpperCase();
    const rawMsgType = ((raw.messageType || (raw as any).message_type || "") as string).toUpperCase();

    // 1. Auto-detect if message is from LUMEN / AI
    const isLumen =
      raw.senderId === "aaac7011-3626-460c-a47e-c94535d34c65" ||
      raw.senderId === "00000000-0000-0000-0000-000000000001" ||
      raw.senderId === "00000000-0000-0000-0000-000000000000" ||
      rawSenderType === "LUMEN" ||
      rawSenderType === "AI" ||
      rawSenderType === "BOT" ||
      rawMsgType === "ACTION_CARD" ||
      (rawMsgType === "SYSTEM" && rawContent.includes("Lumen")) ||
      rawContent.includes('"blocks"') ||
      rawContent.includes("LlmToolCallResponse");

    // 2. Auto-detect if message is from the CURRENT LOGGED-IN USER
    const isCurrentUser =
      !isLumen &&
      ((currentUserIdStr && msgSenderId && msgSenderId === currentUserIdStr) ||
        rawSenderType === "USER" ||
        rawSenderType === "GUEST" ||
        currentUserIdOrDefaultSender === "USER");

    let effectiveSenderType: "LUMEN" | "HOST" | "USER" = "HOST";
    let effectiveSenderName = "Host";

    if (isLumen) {
      effectiveSenderType = "LUMEN";
      effectiveSenderName = "Lumen";
    } else if (isCurrentUser) {
      effectiveSenderType = "USER";
      effectiveSenderName = "You";
    } else {
      // 3. Other human participant (User 2 / Host, e.g. "Hossam Elaraby")
      effectiveSenderType = "HOST";
      const rawName =
        (raw as any).senderName ||
        (raw as any).senderDisplayName ||
        (raw as any).senderFullName ||
        (raw as any).sender?.displayName ||
        (raw as any).sender?.name ||
        ((raw as any).senderFirstName
          ? `${(raw as any).senderFirstName} ${(raw as any).senderLastName || ""}`.trim()
          : "") ||
        defaultSenderName ||
        "";

      effectiveSenderName =
        rawName && rawName !== "string string"
          ? rawName
          : defaultSenderName && defaultSenderName !== "string string"
          ? defaultSenderName
          : "Host";
    }

    // 2. Check if raw, rawContent, or raw.metadataJson is a structured LumenAgentResponse (version: "1", blocks: [...])
    let structuredResponse: LumenAgentResponse | null = null;
    if ((raw as any).blocks && Array.isArray((raw as any).blocks)) {
      structuredResponse = {
        version: (raw as any).version || "1",
        blocks: (raw as any).blocks,
      };
    } else if ((raw as any).data && Array.isArray((raw as any).data.blocks)) {
      structuredResponse = {
        version: (raw as any).data.version || "1",
        blocks: (raw as any).data.blocks,
      };
    } else {
      structuredResponse =
        this.extractStructuredBlocks(rawContent) ||
        this.extractStructuredBlocks(raw.metadataJson) ||
        this.extractStructuredBlocks(raw.text) ||
        (typeof (raw as any).data === "string" ? this.extractStructuredBlocks((raw as any).data) : null);
    }

    if (structuredResponse && structuredResponse.blocks && Array.isArray(structuredResponse.blocks)) {
      return this.parseBlockBasedResponse(structuredResponse, raw, effectiveSenderType, effectiveSenderName);
    }

    // 3. Fallback: Parse non-block responses
    return this.parseLegacyResponse(raw, effectiveSenderType, effectiveSenderName);
  }

  /**
   * Parses structured block-based contract: { "version": "1", "blocks": [...] }
   */
  private static parseBlockBasedResponse(
    response: LumenAgentResponse,
    raw: BackendAiMessageResponse,
    senderType: "LUMEN" | "HOST" | "USER",
    senderName: string
  ): ChatMessage {
    const rawContent = raw.content || raw.text || "";
    let combinedText = "";
    let extractedQuote: string | undefined;
    let propertyShowcase: PropertySnippet | undefined;
    let propertyResults: PropertySnippet[] | undefined;
    let visionSearchResults: any[] | undefined;
    let imageAttachmentUrl: string | undefined;
    let imageAttachmentName: string | undefined;
    let imageAttachmentSize: number | undefined;
    let availabilityCalendar: AvailabilityCalendarData | undefined;
    let bookingTimeline: BookingTimelineData | undefined;
    let priceBreakdown: any | undefined;
    let paymentPrompt: PaymentPromptData | undefined;
    let confirmationCard: ConfirmationCardData | undefined;
    let quickActions: any[] = [];

    // Process blocks in order
    for (const block of response.blocks) {
      switch (block.type) {
        case "text": {
          if (block.content) {
            const { quoteHeader, cleanContent } = this.extractEditorialQuote(block.content);
            if (quoteHeader && !extractedQuote) {
              extractedQuote = quoteHeader;
            }
            combinedText += (combinedText ? "\n\n" : "") + cleanContent;
          }
          break;
        }

        case "property": {
          if (block.data) {
            propertyShowcase = this.mapBackendProperty(block.data);
          }
          break;
        }

        case "property_list": {
          const list = block.data?.properties || block.items || [];
          if (Array.isArray(list)) {
            propertyResults = list.map((p) => this.mapBackendProperty(p));
          }
          break;
        }

        case "availability": {
          if (block.data) {
            const rawBlocked = block.data.blockedDates || block.data.slots || [];
            const blockedRanges: BlockedDateRange[] = Array.isArray(rawBlocked)
              ? rawBlocked.map((b: any) => ({
                  start: b.start || b.startDate,
                  end: b.end || b.endDate,
                  reason: b.reason || b.blockReason || "BOOKED",
                }))
              : [];

            let startYear = block.data.year || new Date().getFullYear();
            let startMonthIndex = new Date().getMonth();
            let monthName = block.data.monthName;

            // Extract month & year from first blocked date or summary (e.g. "from 2026-08-15 to 2026-11-15")
            if (blockedRanges.length > 0 && blockedRanges[0].start) {
              const d = new Date(blockedRanges[0].start);
              if (!isNaN(d.getTime())) {
                startYear = d.getFullYear();
                startMonthIndex = d.getMonth();
              }
            } else if (block.data.summary) {
              const match = block.data.summary.match(/(\d{4})-(\d{2})-\d{2}/);
              if (match) {
                startYear = parseInt(match[1], 10);
                startMonthIndex = parseInt(match[2], 10) - 1;
              }
            }

            const monthNames = [
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ];
            monthName = monthName || monthNames[startMonthIndex];

            // Extract day numbers for the active month
            const bookedDaysSet = new Set<number>();
            blockedRanges.forEach((range) => {
              const startStr = range.start;
              const endStr = range.end || range.start;
              if (startStr) {
                const sParts = startStr.split("-").map(Number);
                const eParts = endStr.split("-").map(Number);
                if (sParts.length >= 3 && eParts.length >= 3) {
                  const startD = new Date(sParts[0], sParts[1] - 1, sParts[2], 12, 0, 0);
                  const endD = new Date(eParts[0], eParts[1] - 1, eParts[2], 12, 0, 0);

                  const cur = new Date(startD);
                  while (cur <= endD) {
                    if (cur.getFullYear() === startYear && cur.getMonth() === startMonthIndex) {
                      bookedDaysSet.add(cur.getDate());
                    }
                    cur.setDate(cur.getDate() + 1);
                  }
                }
              }
            });

            availabilityCalendar = {
              propertyId: block.data.propertyId || "prop",
              propertyTitle: block.data.propertyTitle || "Property Availability",
              summary: block.data.summary,
              monthName,
              year: startYear,
              nightlyRate: block.data.nightlyRate || block.data.basePricePerNight || 0,
              blockedDates: blockedRanges,
              bookedDates: block.data.bookedDates || Array.from(bookedDaysSet).sort((a, b) => a - b),
              selectedDates: block.data.selectedDates || [1, 5],
              minimumStayNights: block.data.minimumStayNights || 1,
            };
          }
          break;
        }

        case "booking":
        case "booking_status": {
          if (block.data) {
            bookingTimeline = {
              bookingId: block.data.bookingId || block.data.id || "RES",
              propertyTitle: block.data.propertyTitle || block.data.title || "Reservation",
              location: block.data.location || block.data.address || "",
              thumbnailUrl: block.data.thumbnailUrl || block.data.imageUrl || "",
              checkInDate: block.data.checkInDate || "Check-in",
              checkOutDate: block.data.checkOutDate || "Check-out",
              checkInTime: block.data.checkInTime || "3:00 PM",
              guestCount: block.data.guestCount ? `${block.data.guestCount} Guests` : "Guests",
              accessCode: block.data.accessCode || block.data.lockboxPin || block.data.pin || "",
              hostName: block.data.hostName || "Host",
              hostPhone: block.data.hostPhone || "",
              currentStep: block.data.currentStep || "CHECKIN_READY",
            };
          }
          break;
        }

        case "price_breakdown": {
          if (block.data) {
            priceBreakdown = {
              title: block.data.title || "Price Breakdown",
              items: block.data.items || [],
              total: block.data.total || 0,
              currency: block.data.currency || "€",
            };
          }
          break;
        }

        case "payment":
        case "payment_prompt":
        case "payment_status": {
          if (block.data) {
            const bId = block.data.bookingId || block.data.id || "";
            const isPaid =
              block.data.status === "PAID" ||
              block.data.status === "COMPLETED" ||
              block.data.status === "SUCCEEDED";

            paymentPrompt = {
              id: block.data.id || `pay-${Date.now()}`,
              bookingRef: block.data.bookingRef || block.data.bookingId || "AGG-PAY",
              bookingId: bId,
              propertyTitle: block.data.propertyTitle || "Aggarly Reservation",
              datesSummary: block.data.datesSummary || "",
              guestSummary: block.data.guestSummary || "",
              totalAmount: block.data.totalAmount || block.data.amount || block.data.total || 0,
              currency: block.data.currency || "€",
              clientSecret: block.data.clientSecret || block.data.client_secret,
              paymentIntentId: block.data.paymentIntentId || block.data.payment_intent_id,
              savedCards: block.data.savedCards || [],
              status: isPaid ? "PAID" : (block.data.status || "PENDING"),
            };
          }
          break;
        }

        case "actions": {
          if (block.items && Array.isArray(block.items)) {
            quickActions = block.items.map((it: any) => ({
              label: it.label || it.title || it.id || "Action",
              action: it.tool || it.action || it.id,
              parameters: it.parameters || {},
              style: it.style || "primary"
            }));
          }
          break;
        }

        case "confirmation": {
          if (block.data) {
            const tok = block.data.confirmationToken || block.data.token || raw.confirmationToken || `tok_${Date.now()}`;
            const isConfirmed = block.data.status === "CONFIRMED";

            confirmationCard = {
              id: `conf-${Date.now()}`,
              token: tok,
              actionType: block.data.actionType || "BOOKING",
              title: block.data.title || raw.pendingToolName || "Confirmation Required",
              propertyTitle: block.data.propertyTitle || "Aggarly Stay",
              dateRange: block.data.dateRange || "",
              guestSummary: block.data.guestSummary || "",
              totalPrice: block.data.totalPrice || block.data.total || 0,
              currency: block.data.currency || "€",
              status: isConfirmed ? "CONFIRMED" : (block.data.status || "PENDING"),
              details: block.data.details,
            };
          }
          break;
        }

        case "vision_search_results":
        case "vision_results": {
          if (block.data) {
            visionSearchResults = block.data.results || block.data;
          }
          break;
        }

        default:
          break;
      }
    }

    // Direct confirmation from raw fields
    if (!confirmationCard && (raw.requiresConfirmation || raw.confirmationToken || raw.pendingToolName)) {
      let tok = raw.confirmationToken || "";
      if (!tok && raw.metadataJson) {
        try {
          const m = typeof raw.metadataJson === "string" ? JSON.parse(raw.metadataJson) : raw.metadataJson;
          tok = m.confirmationToken || m.token || "";
        } catch {}
      }

      confirmationCard = {
        id: `conf-${Date.now()}`,
        token: tok,
        actionType: "BOOKING",
        title: raw.pendingToolName || "Confirmation Required",
        propertyTitle: "Aggarly Service",
        dateRange: "Authorization Required",
        guestSummary: "Guest Action",
        totalPrice: 0,
        currency: "€",
        status: "PENDING",
      };
    }

    const formattedTime = raw.createdAt
      ? new Date(raw.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const msgId = raw.id ? String(raw.id) : `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Extract executed activity steps ONLY from official raw.toolCalls
    const activitySteps: ActivityStep[] = [];

    if (raw.toolCalls && Array.isArray(raw.toolCalls) && raw.toolCalls.length > 0) {
      raw.toolCalls.forEach((tc, idx) => {
        const isStr = typeof tc === "string";
        const toolName = isStr ? tc : (tc as any).toolName || (tc as any).name || `tool-${idx}`;
        const cleanTitle = `✓ ${toolName.replace(/Tool$/, "").replace(/([a-z])([A-Z])/g, "$1 $2")}`;

        activitySteps.push({
          id: `step-${idx}-${Date.now()}`,
          toolName,
          friendlyTitle: cleanTitle,
          status: "COMPLETED",
          durationMs: (tc as any).durationMs || 140,
          inputSummary: isStr ? null : JSON.stringify((tc as any).arguments || tc, null, 2),
          resultSummary: (tc as any).resultSummary || null,
          timestamp: formattedTime,
        });
      });
    }

    // Extract metadata attachments if present
    if (raw.metadataJson) {
      try {
        const meta = typeof raw.metadataJson === "string" ? JSON.parse(raw.metadataJson) : raw.metadataJson;
        if (meta.imageAttachmentUrl || meta.imageUrl || meta.attachmentUrl) {
          imageAttachmentUrl = meta.imageAttachmentUrl || meta.imageUrl || meta.attachmentUrl;
          imageAttachmentName = meta.imageAttachmentName || meta.imageName || meta.fileName;
          imageAttachmentSize = meta.imageAttachmentSize || meta.fileSize;
        }
        if (!visionSearchResults && (meta.visionSearchResults || meta.results)) {
          visionSearchResults = meta.visionSearchResults || meta.results;
        }
      } catch (e) {}
    }

    return {
      id: msgId,
      conversationId: raw.conversationId || "conv-lumen",
      senderType,
      senderName,
      content: combinedText || rawContent,
      quoteHeader: extractedQuote,
      timestamp: formattedTime,
      type: confirmationCard ? "ACTION_CARD" : propertyShowcase || propertyResults || visionSearchResults ? "TOOL_RESULT" : "TEXT",
      imageAttachmentUrl,
      imageAttachmentName,
      imageAttachmentSize,
      visionSearchResults,
      blocks: response.blocks,
      activitySteps: activitySteps.length > 0 ? activitySteps : undefined,
      propertyShowcase,
      propertyResults,
      availabilityCalendar,
      bookingTimeline,
      priceBreakdown,
      paymentPrompt,
      confirmationCard,
      quickActions: quickActions.length > 0 ? quickActions : undefined,
    };
  }

  /**
   * Fallback for standard or unstructured responses
   */
  private static parseLegacyResponse(
    raw: BackendAiMessageResponse,
    senderType: "LUMEN" | "HOST" | "USER",
    senderName: string
  ): ChatMessage {
    const rawContent = raw.content || raw.text || "";
    let metadata: Record<string, any> = {};

    if (raw.metadataJson) {
      try {
        metadata = JSON.parse(raw.metadataJson);
      } catch (e) {
        // ignore
      }
    }

    const formattedTime = raw.createdAt
      ? new Date(raw.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const msgId = raw.id ? String(raw.id) : `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const { quoteHeader, cleanContent } = this.extractEditorialQuote(rawContent);

    const parsedMessage: ChatMessage = {
      id: msgId,
      conversationId: raw.conversationId || "conv-lumen",
      senderType,
      senderName,
      content: cleanContent,
      quoteHeader,
      timestamp: formattedTime,
      type: (raw.messageType as any) || (raw.requiresConfirmation ? "ACTION_CARD" : "TEXT"),
    };

    if (raw.requiresConfirmation || raw.actionCard || metadata.cardType === "AI_CONFIRMATION_REQUIRED") {
      parsedMessage.type = "ACTION_CARD";
      parsedMessage.confirmationCard = {
        id: `conf-${Date.now()}`,
        token: raw.confirmationToken || metadata.confirmationToken || `tok_${Date.now()}`,
        actionType: metadata.actionType || "BOOKING",
        title: metadata.title || raw.pendingToolName || "Confirmation Required",
        propertyTitle: metadata.propertyTitle || "Aggarly Reservation",
        dateRange: metadata.dateRange || "Pending Guest Authorization",
        guestSummary: metadata.guestSummary || "Requested by Guest",
        totalPrice: metadata.totalPrice || 0,
        currency: metadata.currency || "€",
        status: "PENDING",
        details: metadata.details,
      };
    }

    if (metadata.properties && Array.isArray(metadata.properties)) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.propertyResults = metadata.properties.map((p: any) => this.mapBackendProperty(p));
    }

    if (metadata.property) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.propertyShowcase = this.mapBackendProperty(metadata.property);
    }

    if (metadata.compareData) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.propertyCompare = metadata.compareData;
    }

    if (metadata.calendarData) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.availabilityCalendar = metadata.calendarData;
    }

    if (metadata.paymentData) {
      parsedMessage.type = "ACTION_CARD";
      parsedMessage.paymentPrompt = metadata.paymentData;
    }

    if (metadata.chefData) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.privateChef = metadata.chefData;
    }

    if (metadata.timelineData) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.bookingTimeline = metadata.timelineData;
    }

    if (metadata.policyData) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.cancellationPolicy = metadata.policyData;
    }

    if (metadata.weatherData) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.weatherForecast = metadata.weatherData;
    }

    if (metadata.faqData) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.supportFaq = metadata.faqData;
    }

    if (metadata.quickActions && Array.isArray(metadata.quickActions)) {
      parsedMessage.quickActions = metadata.quickActions.map((it: any) => 
        typeof it === 'string' ? { label: it, action: it } : {
          label: it.label || it.title || it.id || "Action",
          action: it.tool || it.action || it.id,
          parameters: it.parameters || {},
          style: it.style || "primary"
        }
      );
    }

    if (metadata.imageAttachmentUrl || metadata.imageUrl || metadata.attachmentUrl) {
      parsedMessage.imageAttachmentUrl = metadata.imageAttachmentUrl || metadata.imageUrl || metadata.attachmentUrl;
      parsedMessage.imageAttachmentName = metadata.imageAttachmentName || metadata.imageName || metadata.fileName;
      parsedMessage.imageAttachmentSize = metadata.imageAttachmentSize || metadata.fileSize;
    }

    if (metadata.visionSearchResults || metadata.results) {
      parsedMessage.type = "TOOL_RESULT";
      parsedMessage.visionSearchResults = metadata.visionSearchResults || metadata.results;
    }

    // Auto-detect HTML code blocks or full HTML markup in legacy responses
    if (parsedMessage.senderType === "LUMEN" && !parsedMessage.blocks) {
      const htmlFenceMatch = rawContent.match(/```html\s*([\s\S]*?)\s*```/i);
      if (htmlFenceMatch && htmlFenceMatch[1]) {
        parsedMessage.blocks = [
          {
            type: "html",
            data: {
              title: "Interactive HTML View",
              html: htmlFenceMatch[1],
              height: 380,
            },
          },
        ];
      } else if (rawContent.trim().startsWith("<") && (rawContent.includes("</div>") || rawContent.includes("</html>") || rawContent.includes("</section>"))) {
        parsedMessage.blocks = [
          {
            type: "html",
            data: {
              title: "Interactive HTML View",
              html: rawContent,
              height: 380,
            },
          },
        ];
      }
    }

    return parsedMessage;
  }

  /**
   * Maps real backend property records into the typed PropertySnippet
   */
  private static mapBackendProperty(raw: any): PropertySnippet {
    const loc = raw.city && raw.country
      ? `${raw.city}, ${raw.country}`
      : raw.location || raw.address || "Mediterranean Coast";

    const img = Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images[0]
      : raw.imageUrl || raw.thumbnailUrl || "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80";

    return {
      id: raw.id || `prop-${Math.random().toString(36).substr(2, 6)}`,
      title: raw.title || raw.name || "Luxury Property",
      location: loc,
      nightlyPrice: raw.nightlyPrice ?? raw.basePricePerNight ?? raw.price ?? 0,
      rating: raw.rating ?? raw.avgRating ?? 5.0,
      reviewCount: raw.reviewCount ?? raw.reviewsCount ?? 0,
      imageUrl: img,
      features: raw.features || raw.amenities || [],
      bedrooms: raw.bedrooms ?? raw.bedroomCount ?? 1,
      bathrooms: raw.bathrooms ?? raw.bathroomCount ?? 1,
      maxGuests: raw.maxGuests ?? raw.guestCapacity ?? 2,
      description: raw.description || "",
      hostName: raw.hostName || raw.host?.name || "Host",
      hostAvatar: raw.hostAvatar || raw.host?.avatarUrl || "",
      isSuperhost: raw.isSuperhost ?? raw.host?.isSuperhost ?? false,
    };
  }

  /**
   * Checks and extracts JSON if payload contains { version: "1", blocks: [...] } or embedded JSON.
   */
  private static extractStructuredBlocks(text?: string): LumenAgentResponse | null {
    if (!text || typeof text !== "string") return null;

    let trimmed = text.trim();
    if (trimmed.startsWith("```json")) {
      trimmed = trimmed.substring(7);
    }
    if (trimmed.startsWith("```")) {
      trimmed = trimmed.substring(3);
    }
    if (trimmed.endsWith("```")) {
      trimmed = trimmed.substring(0, trimmed.length - 3);
    }
    trimmed = trimmed.trim();

    // 1. Direct JSON parse
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && (parsed.version === "1" || Array.isArray(parsed.blocks))) {
        return {
          version: "1",
          blocks: parsed.blocks || [],
        };
      }
    } catch (e) {
      // not direct JSON
    }

    // 2. Embedded JSON search (handles LlmToolCallResponse[textResponse={...}] or preamble text)
    const blocksIdx = trimmed.indexOf('"blocks"');
    if (blocksIdx !== -1) {
      const firstBrace = trimmed.lastIndexOf("{", blocksIdx);
      const lastBrace = trimmed.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const candidate = trimmed.substring(firstBrace, lastBrace + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && Array.isArray(parsed.blocks)) {
            return {
              version: "1",
              blocks: parsed.blocks,
            };
          }
        } catch (e) {
          // not valid candidate
        }
      }
    }

    return null;
  }

  /**
   * Extracts luxury editorial quotes from formatted text responses.
   */
  private static extractEditorialQuote(text: string): { quoteHeader?: string; cleanContent: string } {
    let quoteHeader: string | undefined;
    let cleanContent = text;

    const quoteMatch = text.match(/^"([^"]+)"\s*\n\n([\s\S]*)$/);
    if (quoteMatch) {
      quoteHeader = quoteMatch[1];
      cleanContent = quoteMatch[2];
    } else if (text.startsWith("> ")) {
      const lines = text.split("\n\n");
      quoteHeader = lines[0].replace(/^>\s*/, "").replace(/^"|"$/g, "");
      cleanContent = lines.slice(1).join("\n\n");
    }

    return { quoteHeader, cleanContent };
  }
}
