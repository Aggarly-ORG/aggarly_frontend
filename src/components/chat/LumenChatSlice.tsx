"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChatMessage } from "../../lib/types";
import { AggarlyChatBridgeClient } from "../../lib/chatBridgeClient";
import { useAuth } from "../../context/AuthContext";
import { LumenBlockRenderer } from "./LumenBlockRenderer";
import {
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  Maximize2,
  Minimize2,
  X,
  Share2,
  Download,
  Sparkles,
  ArrowRight,
  ArrowUp,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContextPreviewData {
  type: "property" | "tasting_menu" | "url" | "dossier";
  title: string;
  url?: string;
  data?: any;
}

interface LumenChatSliceProps {
  conversationId: string;
  title?: string;
  subtitle?: string;
  sliceIndex: number;
  totalSlices: number;
  singleChatMode?: boolean;
  onCloseSlice?: () => void;
  onOpenContext: (preview: ContextPreviewData) => void;
  onToggleLeft?: () => void;
  isLeftCollapsed?: boolean;
  onToggleRight?: () => void;
  isRightCollapsed?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const LumenChatSlice: React.FC<LumenChatSliceProps> = ({
  conversationId,
  title,
  subtitle,
  sliceIndex,
  totalSlices,
  singleChatMode = false,
  onCloseSlice,
  onOpenContext,
  onToggleLeft,
  isLeftCollapsed,
  onToggleRight,
  isRightCollapsed,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamingCaption, setStreamingCaption] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch real conversation messages from backend
  useEffect(() => {
    let isMounted = true;
    async function loadMessages() {
      if (!conversationId) {
        setMessages([]);
        return;
      }
      try {
        const msgs = await AggarlyChatBridgeClient.getMessages(conversationId);
        if (isMounted) {
          setMessages(msgs || []);
        }
      } catch (err) {
        console.warn("[LumenChatSlice] Messages load error:", err);
        if (isMounted) setMessages([]);
      }
    }
    loadMessages();
    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  // 2. Real-time WebSocket connection & per-conversation subscription (Error #1 & #2 fix)
  useEffect(() => {
    if (!conversationId) return;

    AggarlyChatBridgeClient.initWebSocket(conversationId);

    const unsubscribeMsg = AggarlyChatBridgeClient.subscribeToMessages((incomingMsg) => {
      if (incomingMsg.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) return prev;
          return [...prev, incomingMsg];
        });
        if (incomingMsg.senderType === "LUMEN") {
          setIsSending(false);
          setStreamingCaption("");
        }
      }
    });

    const unsubscribeAct = AggarlyChatBridgeClient.subscribeToActivity((activity) => {
      if (activity.conversationId === conversationId) {
        if (activity.activityType?.includes("INTENT")) {
          return;
        }
        if (activity.friendlyTitle) {
          setStreamingCaption(activity.friendlyTitle);
        }
      }
    });

    return () => {
      unsubscribeMsg();
      unsubscribeAct();
      AggarlyChatBridgeClient.unsubscribeConversation(conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingCaption]);

  // Quick prompt suggestions from user design template
  const quickPrompts = [
    { label: "Full Moon Stays", icon: "🌕", query: "What are the best dark-sky sanctuaries calibrated for the upcoming full moon?" },
    { label: "High-Aperture Optics", icon: "🔭", query: "Show me sanctuaries with rooftop motorized domes and 14-inch celestial optics." },
    { label: "Twilight Rituals", icon: "🍵", query: "Arrange a quiet outdoor tea ceremony under moonlight with private host arrangements." },
    { label: "Zero Cloud Predictions", icon: "✨", query: "Find sanctuaries with modeled 99.4% atmospheric transparency and zero light pollution." },
  ];

  // Send Message with strict direct message guard (Error #3 fix)
  const handleSendMessage = async (customText?: string) => {
    const text = (customText || inputText).trim();
    if (!text || isSending) return;

    setInputText("");

    const isLumenMode =
      subtitle !== "Direct chat" &&
      !title?.toLowerCase().includes("direct") &&
      (title?.toLowerCase().includes("lumen") ||
        title?.toLowerCase().includes("sanctuary") ||
        title?.toLowerCase().includes("consultation") ||
        !conversationId ||
        conversationId.startsWith("conv-"));

    const isMentioningLumen =
      text.toLowerCase().includes("@lumen") ||
      text.toLowerCase().includes("@ai");

    const shouldInvokeLumen = isLumenMode || isMentioningLumen;

    const userTimestamp =
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const tempUserMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      conversationId,
      senderType: "USER",
      senderName: user?.displayName || user?.firstName || "Resident Guest",
      type: "TEXT",
      content: text,
      timestamp: userTimestamp,
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    if (!shouldInvokeLumen) {
      // Human-to-human direct message without @lumen mention: Send directly without thinking
      try {
        await AggarlyChatBridgeClient.sendHostMessage(conversationId, text);
      } catch (err) {
        console.warn("[LumenChatSlice] Host message send error:", err);
      } finally {
        inputRef.current?.focus();
      }
      return;
    }

    // AI Concierge Turn: Show thinking caption strictly for this conversation
    setIsSending(true);
    setStreamingCaption("Lumen is unveiling celestial ephemeris data...");

    try {
      const response = await AggarlyChatBridgeClient.sendLumenMessage(
        text,
        (caption) => setStreamingCaption(caption),
        conversationId
      );

      const lumenTimestamp =
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const lumenMsg: ChatMessage = {
        id: `lumen-${Date.now()}`,
        conversationId,
        senderType: "LUMEN",
        senderName: "Lumen Ephemeris",
        type: "TEXT",
        content:
          typeof response === "string"
            ? response
            : (response as any)?.content ||
              "I have revealed sanctuaries calibrated to your nocturnal preferences.",
        timestamp: `${lumenTimestamp} · Lumen Ephemeris`,
        blocks: (response as any)?.blocks || [],
        confirmationCard: (response as any)?.confirmationCard,
      };

      setMessages((prev) => [...prev, lumenMsg]);
    } catch (err) {
      console.warn("[LumenChatSlice] Send error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          conversationId,
          senderType: "LUMEN",
          senderName: "Lumen Ephemeris",
          type: "TEXT",
          content: "I encountered a telemetry delay connecting to the celestial network. Please retry your inquiry.",
          timestamp: "Just now",
        },
      ]);
    } finally {
      setIsSending(false);
      setStreamingCaption("");
      inputRef.current?.focus();
    }
  };

  const handleConfirmReservation = async (token: string) => {
    try {
      setStreamingCaption("Confirming provisional reservation...");
      setIsSending(true);
      await AggarlyChatBridgeClient.confirmAction(token);
      setToastMessage("Reservation confirmed under celestial window");
      setTimeout(() => setToastMessage(null), 3000);
      const msgs = await AggarlyChatBridgeClient.getMessages(conversationId);
      if (msgs) setMessages(msgs);
    } catch (err) {
      console.warn("Failed to confirm action:", err);
      setToastMessage("Could not confirm reservation. Please retry.");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSending(false);
      setStreamingCaption("");
    }
  };

  const handleExecuteAction = (action: string, parameters?: Record<string, any>, label?: string) => {
    if (parameters && Object.keys(parameters).length > 0) {
      const paramStr = Object.entries(parameters)
        .map(([k, v]) => `${k}="${v}"`)
        .join(", ");
      handleSendMessage(`Execute ${label || action}: ${paramStr}`);
    } else {
      handleSendMessage(`Execute ${label || action}`);
    }
  };

  const handleConfirmMemory = async (data: any) => {
    try {
      await AggarlyChatBridgeClient.saveMemory({
        id: `mem-${Date.now()}`,
        key: data.memoryKey || data.key,
        value: data.memoryValue || data.value,
        label: data.label,
        category: data.category || "Personal Preference",
        createdAt: "Just now",
      });
      setToastMessage("Sanctuary memory saved to vault");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.warn("Failed to save memory:", err);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setToastMessage("Inquiry link copied to clipboard");
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleOpenDossier = () => {
    onOpenContext({
      type: "dossier",
      title: title ? `${title} — Summary Dossier` : "Sanctuary Inquiry Dossier",
      data: {
        retreat: title || "Aggarly Sanctuary",
        inquiryId: conversationId,
        timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      },
    });
  };

  return (
    <div className="flex-1 w-full max-w-full h-full flex flex-col justify-between bg-[#0A0A0C] border-r border-[#2A2A2E] last:border-r-0 min-w-0 relative overflow-hidden text-[#F5F4F1] selection:bg-[#2A2A2E] selection:text-[#F5F4F1]">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#F5F4F1] text-[#0A0A0C] text-xs font-mono tracking-wider shadow-2xl animate-in fade-in zoom-in-95">
          {toastMessage}
        </div>
      )}

      {/* 1. COMPANION HEADER (Exact match to User Template) */}
      <header className="relative z-10 w-full max-w-full px-4 sm:px-6 py-3.5 border-b border-[#2A2A2E]/70 flex items-center justify-between gap-4 bg-[#0A0A0C]/80 backdrop-blur-md shrink-0 overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 overflow-hidden">
          {/* If Single Chat Mode, render back button to all inquiries */}
          {singleChatMode ? (
            <Link
              href="/chat"
              title="Return to inquiries workspace"
              className="p-2 rounded-full bg-[#18181B] hover:bg-[#222226] border border-[#2A2A2E] text-[#9A9A9F] hover:text-[#F5F4F1] transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-sm group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            /* Otherwise, show Accordion Open Button if sidebar is collapsed */
            isLeftCollapsed && onToggleLeft && (
              <button
                type="button"
                onClick={onToggleLeft}
                title="Expand Inquiries Sidebar (Ctrl+B)"
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[#D4AF37] hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-sm shrink-0 group"
              >
                <PanelLeftOpen className="w-4 h-4 text-[#D4AF37] group-hover:scale-105 transition-transform" />
              </button>
            )
          )}

          {/* Lumen Avatar Badge with Cool Lunar Bloom */}
          <div className="relative flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#18181B] border border-[#2A2A2E] flex items-center justify-center shadow-[0_0_24px_rgba(220,230,239,0.2)]">
            <span className="text-[#F5F4F1] text-base select-none">☾</span>
            <span className="absolute inset-0 rounded-full ring-1 ring-[#DCE6EF]/30 animate-pulse" />
          </div>

          {/* Companion Title & Subline */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-lg sm:text-xl text-[#F5F4F1] font-normal tracking-wide leading-none truncate">
                {title || "Lumen"}
              </h1>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8FAE97] shrink-0" />
            </div>
            <p className="font-serif italic text-xs text-[#9A9A9F] truncate mt-0.5 max-w-xs sm:max-w-md">
              {subtitle || "“reflecting on your nocturnal preferences and tonight’s waxing gibbous”"}
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Ephemeris Orbit Capsule */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181B] border border-[#2A2A2E] text-[#9A9A9F] font-mono text-[11px]">
            <span className="text-[#F5F4F1]">Sanctuary Orbit</span>
            <span className="text-[#2A2A2E]">•</span>
            <span className="text-[#F5F4F1]">Illumination 88%</span>
          </div>

          {/* Dossier Download / View */}
          <button
            type="button"
            onClick={handleOpenDossier}
            className="px-3 py-1.5 rounded-full bg-[#18181B] hover:bg-[#222226] border border-[#2A2A2E] text-[#F5F4F1] text-[10px] sm:text-[11px] font-mono tracking-wider uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#8FAE97]" />
            <span className="hidden sm:inline">DOSSIER</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            title="Share Inquiry"
            className="p-2 rounded-full text-[#9A9A9F] hover:text-[#F5F4F1] hover:bg-[#18181B] border border-transparent hover:border-[#2A2A2E] transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Fullscreen Mode Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
              className={cn(
                "p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center",
                isFullscreen
                  ? "bg-[#18181B] border-[#F5F4F1]/40 text-[#F5F4F1]"
                  : "bg-[#18181B] border-[#2A2A2E] text-[#9A9A9F] hover:text-[#F5F4F1]"
              )}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Right Context Panel Open Icon (Only when context panel is collapsed) */}
          {isRightCollapsed && onToggleRight && (
            <button
              type="button"
              onClick={onToggleRight}
              title="Expand Context Panel"
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[#D4AF37] hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-sm shrink-0 group"
            >
              <PanelRightOpen className="w-4 h-4 text-[#D4AF37] group-hover:scale-105 transition-transform" />
            </button>
          )}

          {/* Close Vertical Slice (if multi-slice active) */}
          {!singleChatMode && totalSlices > 1 && onCloseSlice && (
            <button
              type="button"
              onClick={onCloseSlice}
              title="Close vertical slice"
              className="p-2 rounded-full text-[#9A9A9F] hover:text-[#F5F4F1] hover:bg-[#18181B] transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. RICH MESSAGE THREAD (Exact match to User Template) */}
      <div className="relative z-10 w-full max-w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Ambient Lunar Glows */}
        <div className="pointer-events-none absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#DCE6EF]/5 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-28 w-80 h-80 rounded-full bg-[#DCE6EF]/[0.03] blur-3xl" />

        {/* Thread Date Divider */}
        <div className="w-full flex items-center justify-center my-1 shrink-0">
          <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-[#18181B]/70 border border-[#2A2A2E]/60 font-mono text-[11px] uppercase tracking-widest text-[#9A9A9F]">
            <span>Celestial Ephemeris Log</span>
            <span>•</span>
            <span>Waxing Gibbous</span>
          </div>
        </div>

        {messages.length === 0 ? (
          /* Welcome State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto space-y-4 my-auto">
            <div className="w-14 h-14 rounded-full bg-[#18181B] border border-[#2A2A2E] flex items-center justify-center text-[#F5F4F1] shadow-[0_0_24px_rgba(220,230,239,0.15)]">
              <Sparkles className="w-6 h-6 text-[#8FAE97]" />
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#8FAE97]">
                LUMEN SANCTUARY INTELLIGENCE
              </span>
              <h3 className="font-serif text-xl sm:text-2xl text-[#F5F4F1] font-normal">
                Autonomous Sanctuary Concierge
              </h3>
              <p className="font-sans text-xs text-[#9A9A9F] leading-relaxed max-w-sm mx-auto">
                Calibrated for dark-sky observations, architectural property telemetry, and private retreat arrangements. How may I assist you tonight?
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 pt-3 text-left">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[#9A9A9F] px-1">
                Suggested Inquiries
              </span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(p.query)}
                  className="p-3 rounded-xl bg-[#18181B] hover:bg-[#222226] border border-[#2A2A2E] text-xs text-[#F5F4F1] transition-all text-left flex items-center justify-between group cursor-pointer shadow-sm"
                >
                  <span className="font-sans flex items-center gap-2">
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#9A9A9F] group-hover:text-[#F5F4F1] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser =
              msg.senderType === "USER" ||
              (msg as any).role === "USER" ||
              (msg as any).role === "user" ||
              (msg as any).senderRole === "USER" ||
              (msg as any).senderType === "GUEST";

            if (isUser) {
              /* Outgoing / User Message (Exact to User Template) */
              return (
                <div key={msg.id} className="flex flex-col items-end max-w-xl sm:max-w-2xl w-full self-end ml-auto gap-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#9A9A9F] px-1">
                    <span>{user?.displayName || user?.firstName || "Resident Guest"}</span>
                  </div>
                  <div className="rounded-2xl rounded-tr-sm p-4 sm:p-5 bg-[#222226] border border-[#2A2A2E]/80 text-[#F5F4F1] shadow-[0_4px_14px_rgba(0,0,0,0.25)] text-left">
                    <p className="font-sans text-[14px] leading-relaxed text-[#F5F4F1] whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-[#9A9A9F] px-1">
                    {msg.timestamp || "Recent"}
                  </span>
                </div>
              );
            }

            /* Incoming / Lumen AI Message (Exact to User Template) */
            const hasStructuredBlocks = Array.isArray(msg.blocks) && msg.blocks.length > 0;
            const hasTextBlock = hasStructuredBlocks && msg.blocks!.some((b) => b.type === "text");
            const isRawJson =
              typeof msg.content === "string" &&
              (msg.content.trim().startsWith("{") ||
                msg.content.includes('"blocks"') ||
                msg.content.includes('"version"'));

            const shouldShowContentBubble =
              !hasStructuredBlocks || (!hasTextBlock && msg.content && !isRawJson);

            return (
              <div key={msg.id} className="flex flex-col items-start max-w-2xl sm:max-w-3xl w-full gap-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#9A9A9F] px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5F4F1]/60" />
                  <span>{msg.senderName || "Lumen Ephemeris"}</span>
                </div>

                {shouldShowContentBubble && msg.content && (
                  <div className="rounded-2xl rounded-tl-sm p-4 sm:p-5 bg-[#18181B] border border-[#2A2A2E] text-[#F5F4F1] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                    <p className="font-sans text-[14px] leading-relaxed text-[#F5F4F1] whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                )}

                {/* Structured presentation blocks (Interactive HTML, Live Trace / Execution Plan, Properties, etc.) */}
                {hasStructuredBlocks && (
                  <div className="w-full my-1">
                    <LumenBlockRenderer
                      blocks={msg.blocks!}
                      onQuickPrompt={handleSendMessage}
                      onConfirmAction={handleConfirmReservation}
                      onConfirmMemory={handleConfirmMemory}
                      onExecuteAction={handleExecuteAction}
                      onOpenContext={onOpenContext}
                    />
                  </div>
                )}

                {/* Signature Distinct Confirmation Card (Fallback if not rendered inside blocks) */}
                {msg.confirmationCard &&
                  !msg.blocks?.some(
                    (b) =>
                      b.type === "confirmation" ||
                      b.type === "action_card" ||
                      b.type === "confirmation_required"
                  ) && (
                    <div className="w-full max-w-2xl rounded-2xl bg-gradient-to-br from-[#16161B] via-[#18181B] to-[#0A0A0C] border-2 border-[#F5F4F1]/70 shadow-[0_0_32px_rgba(220,230,239,0.16)] p-5 relative overflow-hidden my-2">
                      <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#DCE6EF]/10 blur-2xl" />
                      <div className="flex items-center gap-2 pb-3 border-b border-[#2A2A2E]/90">
                        <span className="text-[#F5F4F1] text-base animate-pulse">☾</span>
                        <span className="font-mono text-[11px] uppercase tracking-widest text-[#F5F4F1] font-semibold">
                          Celestial Itinerary Proposal · Confirmation
                        </span>
                      </div>
                      <div className="pt-4 pb-3 space-y-3">
                        <p className="font-serif text-lg text-[#F5F4F1] leading-snug">
                          {msg.confirmationCard.title ||
                            "Hold provisional reservation synchronized with the peak Full Moon window?"}
                        </p>
                        <div className="p-3 rounded-xl bg-[#0A0A0C]/60 border border-[#2A2A2E] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-mono text-xs text-[#F5F4F1] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97]" />
                            <span>
                              {msg.confirmationCard.totalPrice
                                ? `$${msg.confirmationCard.totalPrice} nocturnal credits`
                                : "$2,720 nocturnal credits"}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-[#9A9A9F]">
                            Zero-penalty cancellation until 72 hours before moonrise.
                          </span>
                        </div>
                      </div>
                      <div className="pt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          disabled={msg.confirmationCard.status === "CONFIRMED" || isSending}
                          onClick={() => handleConfirmReservation(msg.confirmationCard?.token || "")}
                          className="h-11 px-6 rounded-full bg-[#F5F4F1] hover:bg-[#EFEEEC] text-[#0A0A0C] font-mono text-xs uppercase tracking-wider font-semibold flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span>
                            {msg.confirmationCard.status === "CONFIRMED"
                              ? "Reservation Confirmed"
                              : "Confirm Reservation"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage("Adjust dates / parameters for this proposal")}
                          className="h-11 px-5 rounded-full bg-transparent hover:bg-[#0A0A0C] border border-[#2A2A2E] text-[#9A9A9F] hover:text-[#F5F4F1] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Adjust Dates / Not Now
                        </button>
                      </div>
                    </div>
                  )}

                <span className="font-mono text-[11px] text-[#9A9A9F] px-1">
                  {msg.timestamp || "21:08 · Lumen Companion"}
                </span>
              </div>
            );
          })
        )}

        {/* 3. Reflecting / Thinking State Indicator (Exact match to User Template) */}
        {isSending && (
          <div className="flex items-center gap-2.5 px-2 py-2 text-[#9A9A9F] animate-in fade-in">
            <div className="relative w-6 h-6 rounded-full bg-[#18181B] border border-[#2A2A2E] flex items-center justify-center shadow-[0_0_12px_rgba(220,230,239,0.3)] shrink-0">
              <Sparkles className="w-3 h-3 text-[#F5F4F1] animate-spin" />
            </div>
            <span className="font-serif italic text-xs text-[#9A9A9F] animate-pulse">
              {streamingCaption || "Lumen is unveiling celestial ephemeris data..."}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. BOTTOM FLOATING COMPOSER BAR (Exact match to User Template) */}
      <footer className="relative z-20 w-full max-w-full overflow-hidden p-4 sm:p-5 border-t border-[#2A2A2E]/80 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C] to-transparent space-y-3 shrink-0">
        {/* Suggested Prompt Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(p.query)}
              className="flex-shrink-0 px-3 py-1 rounded-full bg-[#18181B] hover:bg-[#2A2A2D] border border-[#2A2A2E] text-[#9A9A9F] hover:text-[#F5F4F1] text-[11px] font-sans transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Floating Input Pill */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative w-full rounded-full bg-[#18181B] border border-[#2A2A2E] focus-within:border-[#F5F4F1]/60 transition-colors p-1.5 flex items-center gap-2 shadow-inner"
        >
          <div className="pl-3 flex items-center text-[#9A9A9F] select-none text-sm">
            <span>☾</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            placeholder="Ask Lumen anything... (e.g., 'Find retreats with zero cloud cover this weekend')"
            className="w-full min-w-0 bg-transparent text-[#F5F4F1] placeholder:text-[#9A9A9F]/50 font-sans text-sm focus:outline-none px-2"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            aria-label="Send message to Lumen"
            className="flex-shrink-0 w-9 h-9 rounded-full bg-[#F5F4F1] text-[#0A0A0C] hover:bg-[#EFEEEC] flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 cursor-pointer shadow-md"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>

        {/* Micro Alignment Sub-bar */}
        <div className="flex items-center justify-between px-3 text-[10px] font-mono text-[#9A9A9F]/60 overflow-hidden gap-2">
          <span className="truncate">LUMEN CORE • V.4.2 CELESTIAL ENGINE</span>
          <span className="truncate shrink-0">EPHEMERIS REFRESHED: REALTIME</span>
        </div>
      </footer>
    </div>
  );
};
