"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UserMemoryItem,
  MemoryConsentData,
  LumenActionItem,
} from "../../lib/types";
import { AggarlyChatBridgeClient } from "../../lib/chatBridgeClient";
import { useChatContext } from "../../context/ChatContext";
import { FloatingInquiriesCard } from "./FloatingInquiriesCard";
import { NewDirectChatModal } from "./NewDirectChatModal";
import { LumenMemoryDrawer } from "./LumenMemoryDrawer";
import { ChatHeader } from "./ChatHeader";
import { EmptyChatWelcomeHero } from "./EmptyChatWelcomeHero";
import { ToolResultCarousel } from "./ToolResultCarousel";
import { ConfirmationCard } from "./ConfirmationCard";
import { MemoryConsentCard } from "./MemoryConsentCard";
import { PropertyDetailsShowcaseCard } from "./cards/PropertyDetailsShowcaseCard";
import { PropertyCompareCard } from "./cards/PropertyCompareCard";
import { AvailabilityCalendarStripCard } from "./cards/AvailabilityCalendarStripCard";
import { PaymentPromptCard } from "./cards/PaymentPromptCard";
import { PrivateChefExperienceCard } from "./cards/PrivateChefExperienceCard";
import { BookingStatusTimelineCard } from "./cards/BookingStatusTimelineCard";
import { CancellationPolicyCard } from "./cards/CancellationPolicyCard";
import { WeatherForecastWidgetCard } from "./cards/WeatherForecastWidgetCard";
import { SupportFaqCard } from "./cards/SupportFaqCard";
import { AgentThoughtProcessCard } from "./cards/AgentThoughtProcessCard";
import { LumenBlockRenderer } from "./LumenBlockRenderer";
import { ClaudeActivityDropdown } from "./ClaudeActivityDropdown";
import { ActionFormModal } from "./ActionFormModal";
import { MarkdownRenderer, highlightMentions } from "./MarkdownRenderer";
import { MentionAutocomplete, MentionItem } from "./MentionAutocomplete";
import { ChatNotificationToast } from "./ChatNotificationToast";
import { SendIcon, SparklesIcon, CameraIcon, CloseIcon } from "../common/Icons";

interface ChatPageProps {
  initialConversationId?: string;
}

export default function ChatPage({ initialConversationId = "new" }: ChatPageProps = {}) {
  const router = useRouter();
  const {
    messages,
    isThinking,
    thinkingCaption,
    liveActivities,
    isSubmitting,
    selectedConvId,
    conversations,
    currentConv,
    isFloatingInquiriesOpen,
    isMemoryDrawerOpen,
    isNewDirectModalOpen,
    incomingNotification,
    sendMessage,
    selectConversation,
    startNewInquiry,
    loadMessagesForConv,
    handleConfirmCardAction,
    setFloatingInquiries,
    setMemoryDrawer,
    setNewDirectModal,
    dismissChatNotification,
  } = useChatContext();

  const [memories, setMemories] = useState<UserMemoryItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [activeAction, setActiveAction] = useState<LumenActionItem | null>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Vision Search & Image Attachment State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  // Mention Autocomplete State
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  // Image Processing & Cleanup
  const handleProcessImageFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    setSelectedImage(file);
    setImagePreviewUrl(preview);
  };

  const handleClearSelectedImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleProcessImageFile(file);
          break;
        }
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleProcessImageFile(file);
    }
  };

  const prevConvRef = useRef(selectedConvId);
  const prevMessagesCountRef = useRef(messages.length);

  // Auto-scroll selectively on thread switch or when a new message/thinking state arrives
  useEffect(() => {
    const isConvSwitch = prevConvRef.current !== selectedConvId;
    const isNewMessage = messages.length > prevMessagesCountRef.current;

    prevConvRef.current = selectedConvId;
    prevMessagesCountRef.current = messages.length;

    if (isConvSwitch) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    } else if (isNewMessage || isThinking) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, isThinking, selectedConvId]);

  // Synchronize conversation selection on mount or route param change
  useEffect(() => {
    if (initialConversationId) {
      selectConversation(initialConversationId);
    }
  }, [initialConversationId, selectConversation]);

  // Load memories on mount
  useEffect(() => {
    async function loadMemories() {
      const memList = await AggarlyChatBridgeClient.listMemories();
      setMemories(memList);
    }
    loadMemories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart || val.length;
    const beforeCursor = val.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/(@[a-zA-Z0-9_:-]*|\/[a-zA-Z0-9_:-]*)$/);

    if (atMatch) {
      setIsMentionOpen(true);
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setIsMentionOpen(false);
    }
  };

  const handleSelectMention = (item: MentionItem) => {
    const cursorPos = composerInputRef.current?.selectionStart || inputText.length;
    const beforeCursor = inputText.slice(0, cursorPos);
    const afterCursor = inputText.slice(cursorPos);
    const atIdx = Math.max(beforeCursor.lastIndexOf("@"), beforeCursor.lastIndexOf("/"));

    if (atIdx !== -1) {
      const newText = beforeCursor.slice(0, atIdx) + item.tag + " " + afterCursor;
      setInputText(newText);
    } else {
      setInputText((prev) => prev + " " + item.tag + " ");
    }

    setIsMentionOpen(false);
    setTimeout(() => {
      composerInputRef.current?.focus();
    }, 50);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isMentionOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((prev) => prev + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      // Match against query items
      const queryTrimmed = mentionQuery.toLowerCase().replace(/^[@/]/, "");
      const candidates: MentionItem[] = [
        {
          id: "lumen-ai",
          tag: "@Lumen",
          name: "Lumen",
          subtitle: "Aggarly AI Concierge",
          isAi: true,
        },
        {
          id: "lumen-command-clear",
          tag: "@Lumen command:clear",
          name: "@Lumen command:clear",
          subtitle: "Clear all messages in AI conversation thread",
          isAi: true,
        },
      ];
      const matched = candidates.filter(
        (c) =>
          c.tag.toLowerCase().includes(queryTrimmed) ||
          c.name.toLowerCase().includes(queryTrimmed)
      );
      const chosen = matched[mentionIndex % Math.max(1, matched.length)] || candidates[0];
      handleSelectMention(chosen);
    } else if (e.key === "Escape") {
      setIsMentionOpen(false);
    }
  };

  // Send message submit handler
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText !== undefined ? customText : inputText;
    if ((!textToSend.trim() && !selectedImage) || isSubmitting || isThinking) return;

    const imgToSubmit = selectedImage;
    const previewToSubmit = imagePreviewUrl;

    setInputText("");
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    await sendMessage(textToSend, imgToSubmit || undefined, previewToSubmit || undefined);
  };

  const handleQuickPrompt = (prompt: string) => {
    let formattedPrompt = prompt.trim();
    if (!formattedPrompt) return;

    // If chatting in direct host/guest message channel (where isLumen is false),
    // automatically prepend "@Lumen " if not already present so Lumen joins and processes the form/action!
    if (
      currentConv &&
      !currentConv.isLumen &&
      !formattedPrompt.toLowerCase().startsWith("@lumen") &&
      !formattedPrompt.toLowerCase().startsWith("@ai")
    ) {
      formattedPrompt = `@Lumen ${formattedPrompt}`;
    }

    handleSendMessage(undefined, formattedPrompt);
  };

  // Confirm memory consent
  const handleConfirmMemory = async (data: MemoryConsentData) => {
    const newMem: UserMemoryItem = {
      id: `mem-${Date.now()}`,
      key: data.memoryKey,
      value: data.memoryValue,
      label: data.label,
      category: "Personal Preference",
      createdAt: "Just now",
    };
    await AggarlyChatBridgeClient.saveMemory(newMem);
    const updated = await AggarlyChatBridgeClient.listMemories();
    setMemories(updated);
  };

  // Forget memory
  const handleForgetMemory = async (key: string) => {
    await AggarlyChatBridgeClient.forgetMemory(key);
    const updated = await AggarlyChatBridgeClient.listMemories();
    setMemories(updated);
  };

  // Add memory manually
  const handleAddMemory = async (item: UserMemoryItem) => {
    await AggarlyChatBridgeClient.saveMemory(item);
    const updated = await AggarlyChatBridgeClient.listMemories();
    setMemories(updated);
  };

  // Open & refresh memory drawer
  const handleOpenMemoryDrawer = async () => {
    setMemoryDrawer(true);
    try {
      const updated = await AggarlyChatBridgeClient.listMemories();
      setMemories(updated);
    } catch (e) {
      console.warn("Could not refresh memories:", e);
    }
  };

  return (
    <div className="app-container">
      {/* =========================================================================
          MAIN FULL-WIDTH CHAT VIEWPORT WITH UNIFIED BRAND HEADER
          ========================================================================= */}
      <div
        className="chat-viewport"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ position: "relative" }}
      >
        {/* Full-Viewport Nocturnal Frosted Glass Drag & Drop Overlay */}
        {isDragging && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 9999,
              backdropFilter: "blur(16px)",
              background: "rgba(10, 10, 15, 0.88)",
              border: "2px dashed var(--accent-coral, #d97706)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              pointerEvents: "none",
            }}
            className="animate-fade-in"
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "24px",
                background: "linear-gradient(135deg, rgba(217, 119, 6, 0.3), rgba(239, 68, 68, 0.2))",
                border: "1px solid rgba(217, 119, 6, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-gold, #f59e0b)",
                boxShadow: "0 0 36px rgba(217, 119, 6, 0.4)",
              }}
            >
              <CameraIcon size={36} color="currentColor" />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.01em" }}>
                Drop Photo for Vision Search
              </h3>
              <p style={{ margin: "8px 0 0 0", fontSize: "13.5px", color: "rgba(255, 255, 255, 0.7)" }}>
                Lumen AI analyzes architectural aesthetics, pool geometry & panoramic surroundings
              </p>
            </div>
          </div>
        )}

        {/* CLEAN, BEAUTIFUL UNIFIED CHAT HEADER */}
        {currentConv && (
          <ChatHeader
            conversation={currentConv}
            onToggleInquiries={() => setFloatingInquiries(!isFloatingInquiriesOpen)}
            onNewInquiry={startNewInquiry}
            onNewDirectMessage={() => setNewDirectModal(true)}
            onOpenMemoryDrawer={handleOpenMemoryDrawer}
            onViewPropertyDetails={(propId) => {
              handleQuickPrompt(`Show ${currentConv.property?.title || "villa"} details`);
            }}
          />
        )}

        {/* CHAT MESSAGES STREAM */}
        <div className="chat-stream-scroll">
          {/* If 0 messages: Show clean Empty Welcome Hero */}
          {messages.length === 0 && currentConv && (
            <EmptyChatWelcomeHero
              conversation={currentConv}
              onSelectPrompt={(p) => handleQuickPrompt(p)}
            />
          )}

          {/* Render Active Message History */}
          {messages.map((msg) => {
            const isUser = msg.senderType === "USER";

            if (isUser) {
              return (
                <div key={msg.id} className="chat-row-user animate-fade-in">
                  <span className="chat-meta-user">
                    You • {msg.timestamp}
                  </span>
                  <div className="chat-bubble-user">
                    {msg.imageAttachmentUrl && (
                      <div
                        style={{
                          marginBottom: msg.content ? "8px" : "0",
                          borderRadius: "12px",
                          overflow: "hidden",
                          maxWidth: "280px",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
                        }}
                      >
                        <img
                          src={msg.imageAttachmentUrl}
                          alt="Uploaded reference"
                          style={{
                            width: "100%",
                            maxHeight: "220px",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </div>
                    )}
                    {msg.content && <p>{highlightMentions(msg.content)}</p>}
                  </div>
                </div>
              );
            }

            // Lumen AI / Host / Other member response
            let senderDisplayName = "Lumen";
            if (msg.senderType === "LUMEN") {
              senderDisplayName = "Lumen";
            } else {
              senderDisplayName =
                msg.senderName && msg.senderName !== "Host" && msg.senderName !== "string string"
                  ? msg.senderName
                  : currentConv && !currentConv.isLumen && currentConv.title && currentConv.title !== "string string"
                  ? currentConv.title
                  : "Member";
            }

            return (
              <div key={msg.id} className="chat-row-lumen animate-fade-in">
                <span className="chat-meta-lumen">
                  {senderDisplayName} • {msg.timestamp}
                </span>

                {/* Claude-Style Historical Thought & Tool Execution Accordion (only if not already rendered as block) */}
                {msg.activitySteps &&
                  msg.activitySteps.length > 0 &&
                  !msg.blocks?.some((b) => b.type === "execution_plan" || b.type === "execution") && (
                    <ClaudeActivityDropdown steps={msg.activitySteps} isStreaming={false} />
                  )}

                {/* If message has structured presentation blocks, render them in exact order */}
                {msg.blocks && msg.blocks.length > 0 ? (
                  <LumenBlockRenderer
                    blocks={msg.blocks}
                    onQuickPrompt={handleQuickPrompt}
                    onConfirmAction={handleConfirmCardAction}
                    onConfirmMemory={handleConfirmMemory}
                  />
                ) : (
                  <>
                    {/* Editorial Quote Header in Italic Serif */}
                    {msg.quoteHeader && (
                      <h3 className="lumen-editorial-quote">
                        "{msg.quoteHeader}"
                      </h3>
                    )}

                    {msg.content && (
                      <MarkdownRenderer
                        content={msg.content}
                        className="lumen-narrative-text"
                      />
                    )}

                    {/* 1. Price Breakdown Card */}
                    {msg.priceBreakdown && (
                      <div className="price-card animate-fade-in">
                        <div className="price-card-title">{msg.priceBreakdown.title}</div>
                        <div className="price-card-rows">
                          {msg.priceBreakdown.items.map((item, i) => (
                            <div key={i} className="price-card-row">
                              <span className="price-item-label">{item.label}</span>
                              <span className="price-item-amount">
                                {msg.priceBreakdown!.currency}{item.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="price-card-total">
                          <span>Total</span>
                          <span className="numeral-gold">
                            {msg.priceBreakdown.currency}{msg.priceBreakdown.total}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 2. Property Showcase Deep-Dive Card */}
                    {msg.propertyShowcase && (
                      <PropertyDetailsShowcaseCard
                        property={msg.propertyShowcase}
                        onReserve={(p) =>
                          handleQuickPrompt(`Reserve ${p.title}`)
                        }
                        onAskLumen={(q) => handleQuickPrompt(q)}
                      />
                    )}

                    {/* 3. Property Compare Card */}
                    {msg.propertyCompare && (
                      <PropertyCompareCard
                        data={msg.propertyCompare}
                        onSelectProperty={(id, title) =>
                          handleQuickPrompt(`Show ${title} details`)
                        }
                      />
                    )}

                    {/* 4. Availability Calendar Strip Card */}
                    {msg.availabilityCalendar && (
                      <AvailabilityCalendarStripCard
                        data={msg.availabilityCalendar}
                        onSelectDateRange={(start, end, total, dateSummary) =>
                          handleQuickPrompt(
                            dateSummary
                              ? `Lock in ${dateSummary} (€${total.toLocaleString()})`
                              : `Lock in dates ${start} to ${end} (€${total.toLocaleString()})`
                          )
                        }
                      />
                    )}

                    {/* 5. In-Chat Payment Prompt Card */}
                    {msg.paymentPrompt && (
                      <PaymentPromptCard
                        data={msg.paymentPrompt}
                        onPaySuccess={async (method, amount) => {
                          handleQuickPrompt(`What is the check-in timeline & lockbox code?`);
                        }}
                      />
                    )}

                    {/* 6. Private Chef Customization Card */}
                    {msg.privateChef && (
                      <PrivateChefExperienceCard
                        data={msg.privateChef}
                        onConfirmChef={(dietary) =>
                          handleQuickPrompt(
                            `Chef Marco confirmed with dietary preferences: ${dietary.join(", ") || "Standard Coastal"}`
                          )
                        }
                      />
                    )}

                    {/* 7. Booking Timeline & Lockbox Code Card */}
                    {msg.bookingTimeline && (
                      <BookingStatusTimelineCard
                        data={msg.bookingTimeline}
                        onMessageHost={() => {
                          selectConversation("conv-matteo-rossi");
                        }}
                      />
                    )}

                    {/* 8. Cancellation Policy Card */}
                    {msg.cancellationPolicy && (
                      <CancellationPolicyCard
                        data={msg.cancellationPolicy}
                        onAskRefund={() =>
                          handleQuickPrompt("Calculate refund if canceled 10 days before")
                        }
                      />
                    )}

                    {/* 9. Weather Forecast Card */}
                    {msg.weatherForecast && (
                      <WeatherForecastWidgetCard
                        data={msg.weatherForecast}
                      />
                    )}

                    {/* 10. Support FAQ Card */}
                    {msg.supportFaq && (
                      <SupportFaqCard
                        data={msg.supportFaq}
                      />
                    )}

                    {/* 11. Agent Thought Process & Audit Inspector */}
                    {msg.thoughtProcess && (
                      <AgentThoughtProcessCard
                        data={msg.thoughtProcess}
                      />
                    )}

                    {/* 12. Inline Tool Result Carousel */}
                    {msg.propertyResults && (
                      <ToolResultCarousel
                        properties={msg.propertyResults}
                        onQuickBook={(p) =>
                          handleQuickPrompt(`Show ${p.title} details`)
                        }
                      />
                    )}

                    {/* 13. Confirmation Gate Card */}
                    {msg.confirmationCard && (
                      <ConfirmationCard
                        data={msg.confirmationCard}
                        onConfirm={handleConfirmCardAction}
                      />
                    )}

                    {/* 14. Memory Consent Card */}
                    {msg.memoryConsent && (
                      <MemoryConsentCard
                        data={msg.memoryConsent}
                        onConfirm={handleConfirmMemory}
                      />
                    )}

                    {/* Quick Action chips */}
                    {msg.quickActions && msg.quickActions.length > 0 && (
                      <div className="quick-actions-wrap" style={{ marginTop: "14px" }}>
                        {msg.quickActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (action.parameters && Object.keys(action.parameters).length > 0) {
                                setActiveAction(action);
                              } else {
                                handleQuickPrompt(action.action || action.label);
                              }
                            }}
                            className={`quick-action-chip ${action.style || "primary"}`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Thinking State & Live Claude-Style Tool Execution Stream */}
          {isThinking && (
            <div className="chat-row-lumen animate-fade-in" style={{ width: "100%", maxWidth: "620px" }}>
              <ClaudeActivityDropdown steps={liveActivities} isStreaming={true} />
            </div>
          )}

          {/* Bottom auto-scroll anchor */}
          <div ref={messagesEndRef} style={{ height: "1px", width: "100%" }} />
        </div>

        {/* =========================================================================
            3. FLOATING INQUIRIES POPOVER
            ========================================================================= */}
        <FloatingInquiriesCard
          isOpen={isFloatingInquiriesOpen}
          onClose={() => setFloatingInquiries(false)}
          conversations={conversations}
          selectedConversationId={selectedConvId}
          onSelectConversation={(id) => selectConversation(id)}
          onNewInquiry={startNewInquiry}
          onNewDirectMessage={() => setNewDirectModal(true)}
        />

        {/* =========================================================================
            4. BOTTOM COMPOSER DOCK
            ========================================================================= */}
        <div className="bottom-dock-container" style={{ position: "relative" }}>
          {/* Mention Autocomplete Dropdown */}
          <MentionAutocomplete
            isOpen={isMentionOpen}
            query={mentionQuery}
            selectedIndex={mentionIndex}
            onSelect={handleSelectMention}
            onClose={() => setIsMentionOpen(false)}
            extraParticipants={
              currentConv && !currentConv.isLumen && currentConv.title
                ? [{ id: "host-participant", name: currentConv.title, role: "Participant" }]
                : []
            }
          />

          <button
            onClick={() => setFloatingInquiries(!isFloatingInquiriesOpen)}
            className={`btn-floating-inquiries-toggle ${
              isFloatingInquiriesOpen ? "active" : ""
            }`}
            title="Toggle Inquiries List"
          >
            <div className="chat-icon-bubble-shape" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/jpg"
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />

          {/* Staged Image Preview Chip for Vision Search */}
          {selectedImage && imagePreviewUrl && (
            <div
              className="staged-image-chip animate-fade-in"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 14px",
                marginBottom: "10px",
                borderRadius: "14px",
                background: "rgba(22, 22, 28, 0.95)",
                border: "1px solid rgba(217, 119, 6, 0.45)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.55), 0 0 16px rgba(217, 119, 6, 0.15)",
                backdropFilter: "blur(14px)",
                width: "fit-content",
                maxWidth: "100%",
              }}
            >
              <img
                src={imagePreviewUrl}
                alt="Selected reference"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "8px",
                  objectFit: "cover",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "6px",
                      background: "rgba(217, 119, 6, 0.22)",
                      color: "var(--accent-gold, #f59e0b)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    ✦ AI Vision Search
                  </span>
                  <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)" }}>
                    ({(selectedImage.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#FFFFFF",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "260px",
                  }}
                >
                  {selectedImage.name}
                </span>
              </div>

              <button
                type="button"
                onClick={handleClearSelectedImage}
                style={{
                  marginLeft: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Remove photo"
              >
                <CloseIcon size={12} color="currentColor" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} onPaste={handlePaste} className="composer-dock-pill">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-composer-camera"
              style={{
                background: selectedImage ? "rgba(217, 119, 6, 0.25)" : "transparent",
                border: "none",
                color: selectedImage ? "var(--accent-gold, #f59e0b)" : "rgba(255, 255, 255, 0.5)",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                marginLeft: "4px",
              }}
              title="Upload photo for Vision Search (or paste with Ctrl+V)"
            >
              <CameraIcon size={18} color="currentColor" />
            </button>

            <input
              ref={composerInputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onPaste={handlePaste}
              placeholder={
                selectedImage
                  ? "Describe desired location or details (e.g. 'under €500 in Greece') or press Enter to search..."
                  : currentConv?.isLumen
                  ? "Reply to Lumen or paste/upload a photo for Vision Search..."
                  : `Message ${currentConv?.title || "Host"} (type @Lumen to invite AI)...`
              }
              className="composer-dock-input"
              disabled={isSubmitting || isThinking}
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && !selectedImage) || isSubmitting || isThinking}
              className="btn-dock-send"
              title="Send Message"
            >
              <SendIcon size={16} color="#FFFFFF" />
            </button>
          </form>
        </div>
      </div>

      {/* =========================================================================
          5. LUMEN MEMORY DRAWER
          ========================================================================= */}
      <LumenMemoryDrawer
        isOpen={isMemoryDrawerOpen}
        onClose={() => setMemoryDrawer(false)}
        memories={memories}
        onForgetMemory={handleForgetMemory}
        onAddMemory={handleAddMemory}
      />

      <ActionFormModal
        isOpen={!!activeAction}
        onClose={() => setActiveAction(null)}
        action={activeAction}
        onSubmit={(finalText) => handleQuickPrompt(finalText)}
      />

      {/* =========================================================================
          6. DIRECT USER-TO-USER MESSAGE MODAL
          ========================================================================= */}
      <NewDirectChatModal
        isOpen={isNewDirectModalOpen}
        onClose={() => setNewDirectModal(false)}
        onConversationCreated={(newConv) => {
          selectConversation(newConv.id);
        }}
      />

      {/* =========================================================================
          7. INCOMING MESSAGE TOAST NOTIFICATION
          ========================================================================= */}
      <ChatNotificationToast
        notification={incomingNotification}
        onOpenConversation={(convId) => selectConversation(convId)}
        onDismiss={dismissChatNotification}
      />
    </div>
  );
}
