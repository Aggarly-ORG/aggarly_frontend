import React, { useState, useRef, useEffect } from "react";
import {
  ChatMessage,
  Conversation,
  MemoryConsentData,
  LumenActionItem,
} from "../../lib/types";
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
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  SparklesIcon,
  SendIcon,
  BrainIcon,
  CameraIcon,
  CloseIcon,
} from "../common/Icons";

interface LumenChatThreadProps {
  conversation: Conversation;
  messages: ChatMessage[];
  onSendMessage: (text: string, imageFile?: File, imagePreviewUrl?: string) => Promise<void>;
  onConfirmAction: (token: string) => Promise<void>;
  onConfirmMemory: (data: MemoryConsentData) => Promise<void>;
  onOpenMemoryDrawer: () => void;
  isThinking?: boolean;
  thinkingCaption?: string;
}

export const LumenChatThread: React.FC<LumenChatThreadProps> = ({
  conversation,
  messages,
  onSendMessage,
  onConfirmAction,
  onConfirmMemory,
  onOpenMemoryDrawer,
  isThinking = false,
  thinkingCaption = "Lumen is curating your itinerary...",
}) => {
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Vision Search State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || isSubmitting || isThinking) return;

    const query = inputText;
    const imgToSubmit = selectedImage;
    const previewToSubmit = imagePreviewUrl;

    setInputText("");
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setIsSubmitting(true);
    try {
      await onSendMessage(query, imgToSubmit || undefined, previewToSubmit || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = async (action: string | LumenActionItem) => {
    if (isSubmitting || isThinking) return;
    const actionText = typeof action === "string" ? action : (action.label || action.action || "");
    if (!actionText) return;
    setIsSubmitting(true);
    try {
      await onSendMessage(actionText);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="thread-container"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: "relative" }}
    >
      {/* Drag & Drop Vision Search Overlay */}
      {isDragging && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9999,
            backdropFilter: "blur(16px)",
            background: "rgba(10, 10, 15, 0.88)",
            border: "2px dashed var(--accent-coral, #d97706)",
            borderRadius: "20px",
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
              width: "68px",
              height: "68px",
              borderRadius: "22px",
              background: "linear-gradient(135deg, rgba(217, 119, 6, 0.3), rgba(239, 68, 68, 0.2))",
              border: "1px solid rgba(217, 119, 6, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-gold, #f59e0b)",
              boxShadow: "0 0 32px rgba(217, 119, 6, 0.4)",
            }}
          >
            <CameraIcon size={34} color="currentColor" />
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#FFFFFF" }}>
              Drop Photo for Vision Search
            </h3>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)" }}>
              Lumen AI analyzes architectural aesthetics & panoramic setting
            </p>
          </div>
        </div>
      )}

      {/* 1. THREAD HEADER */}
      <div className="thread-header">
        <div className="thread-header-left">
          <div
            className={`thread-avatar ${
              isThinking ? "lumen-avatar-thinking" : "lumen-avatar-glow"
            }`}
          >
            <SparklesIcon size={20} color="#FFFFFF" />
          </div>

          <div>
            <div className="thread-title">
              <span>{conversation.title}</span>
              <span className="lumen-tag">AI Travel Companion</span>
            </div>
            <div className="thread-subtitle">knows your trip history & preferences</div>
          </div>
        </div>

        <button onClick={onOpenMemoryDrawer} className="memory-trigger-btn">
          <BrainIcon size={14} color="var(--accent-coral)" />
          <span>Preferences</span>
        </button>
      </div>

      {/* 2. MESSAGES STREAM */}
      <div className="messages-container">
        <div className="security-pill">
          Lumen reasons over properties, verified bookings & local concierge services
        </div>

        {messages.map((msg) => {
          const isUser = msg.senderType === "USER";

          return (
            <div
              key={msg.id}
              className={`message-item ${isUser ? "user" : "lumen"} animate-fade-in`}
            >
              <div className="message-bubble-row">
                {!isUser && (
                  <div className="bot-avatar-mini">
                    <SparklesIcon size={14} color="#FFFFFF" />
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  {msg.imageAttachmentUrl && (
                    <div style={{ marginBottom: msg.content || (msg.blocks && msg.blocks.length > 0) ? "8px" : "0", borderRadius: "10px", overflow: "hidden", maxWidth: "340px" }}>
                      <img
                        src={msg.imageAttachmentUrl}
                        alt={msg.imageAttachmentName || "Screen Snapshot"}
                        style={{ width: "100%", maxHeight: "240px", objectFit: "cover", objectPosition: "top", display: "block", borderRadius: "8px", cursor: "pointer" }}
                        onClick={() => typeof window !== "undefined" && window.open(msg.imageAttachmentUrl, "_blank")}
                      />
                    </div>
                  )}

                  {!isUser && msg.blocks && msg.blocks.length > 0 ? (
                    <LumenBlockRenderer
                      blocks={msg.blocks}
                      onQuickPrompt={handleQuickAction}
                      onConfirmAction={onConfirmAction}
                      onConfirmMemory={onConfirmMemory}
                    />
                  ) : (
                    <>
                      <div className={`bubble-content ${isUser ? "bubble-user" : "bubble-lumen"}`}>
                        {!isUser && msg.quoteHeader && (
                          <div className="quote-header-title">
                            "{msg.quoteHeader}"
                          </div>
                        )}

                        {isUser ? (
                          <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                        ) : (
                          <MarkdownRenderer content={msg.content} />
                        )}

                        {/* Price Breakdown Table */}
                        {!isUser && msg.priceBreakdown && (
                          <div className="price-card">
                            <div className="price-card-title">{msg.priceBreakdown.title}</div>
                            {msg.priceBreakdown.items.map((item, i) => (
                              <div key={i} className="price-card-row">
                                <span>{item.label}</span>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                  {item.amount === 0
                                    ? "Included"
                                    : `${msg.priceBreakdown?.currency}${Number(item.amount || 0).toLocaleString()}`}
                                </span>
                              </div>
                            ))}
                            <div className="price-card-total">
                              <span>Total Estimate</span>
                              <span className="numeral-gold" style={{ fontSize: "15px" }}>
                                {msg.priceBreakdown.currency}
                                {Number(msg.priceBreakdown.total || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 1. Property Showcase Deep-Dive Card */}
                      {!isUser && msg.propertyShowcase && (
                        <PropertyDetailsShowcaseCard
                          property={msg.propertyShowcase}
                          onReserve={(p) =>
                            handleQuickAction(`Reserve ${p.title} with Lumen`)
                          }
                          onAskLumen={(q) => handleQuickAction(q)}
                        />
                      )}

                      {/* 2. Property Compare Card */}
                      {!isUser && msg.propertyCompare && (
                        <PropertyCompareCard
                          data={msg.propertyCompare}
                          onSelectProperty={(id, title) =>
                            handleQuickAction(`Show ${title} details`)
                          }
                        />
                      )}

                      {/* 3. Availability Calendar Strip Card */}
                      {!isUser && msg.availabilityCalendar && (
                        <AvailabilityCalendarStripCard
                          data={msg.availabilityCalendar}
                          onSelectDateRange={(start, end, total, dateSummary) =>
                            handleQuickAction(
                              dateSummary
                                ? `Lock in ${dateSummary} (€${total.toLocaleString()})`
                                : `Lock in dates ${start} to ${end} (€${total.toLocaleString()})`
                            )
                          }
                        />
                      )}

                      {/* 4. Payment Prompt Card */}
                      {!isUser && msg.paymentPrompt && (
                        <PaymentPromptCard
                          data={msg.paymentPrompt}
                          onPaySuccess={async () => {
                            handleQuickAction(`What is the check-in timeline & lockbox code?`);
                          }}
                        />
                      )}

                      {/* 5. Private Chef Card */}
                      {!isUser && msg.privateChef && (
                        <PrivateChefExperienceCard
                          data={msg.privateChef}
                          onConfirmChef={(dietary) =>
                            handleQuickAction(
                              `Chef confirmed with preferences: ${dietary.join(", ") || "Standard"}`
                            )
                          }
                        />
                      )}

                      {/* 6. Booking Status Timeline Card */}
                      {!isUser && msg.bookingTimeline && (
                        <BookingStatusTimelineCard
                          data={msg.bookingTimeline}
                        />
                      )}

                      {/* 7. Cancellation Policy Card */}
                      {!isUser && msg.cancellationPolicy && (
                        <CancellationPolicyCard
                          data={msg.cancellationPolicy}
                          onAskRefund={() =>
                            handleQuickAction("Calculate refund if canceled 10 days before")
                          }
                        />
                      )}

                      {/* 8. Weather Forecast Card */}
                      {!isUser && msg.weatherForecast && (
                        <WeatherForecastWidgetCard
                          data={msg.weatherForecast}
                        />
                      )}

                      {/* 9. Support FAQ Card */}
                      {!isUser && msg.supportFaq && (
                        <SupportFaqCard
                          data={msg.supportFaq}
                        />
                      )}

                      {/* 10. Agent Thought Process & Audit Inspector */}
                      {!isUser && msg.thoughtProcess && (
                        <AgentThoughtProcessCard
                          data={msg.thoughtProcess}
                        />
                      )}

                      {/* 11. Inline Tool Result Carousel */}
                      {!isUser && msg.propertyResults && (
                        <ToolResultCarousel
                          properties={msg.propertyResults}
                          onQuickBook={(p) =>
                            handleQuickAction(`Book ${p.title} for upcoming dates`)
                          }
                        />
                      )}

                      {/* 12. Inline Confirmation Card */}
                      {!isUser && msg.confirmationCard && (
                        <ConfirmationCard
                          data={msg.confirmationCard}
                          onConfirm={onConfirmAction}
                        />
                      )}

                      {/* 13. Inline Memory Consent Card */}
                      {!isUser && msg.memoryConsent && (
                        <MemoryConsentCard
                          data={msg.memoryConsent}
                          onConfirm={onConfirmMemory}
                        />
                      )}

                      {/* Quick Action Prompts */}
                      {!isUser && msg.quickActions && msg.quickActions.length > 0 && (
                        <div className="quick-actions-wrap">
                          {msg.quickActions.map((action, idx) => {
                            const label = typeof action === "string" ? action : (action.label || action.action || "Action");
                            return (
                              <button
                                key={idx}
                                onClick={() => handleQuickAction(action)}
                                className="quick-action-chip"
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="message-timestamp">
                {isUser ? `You • ${msg.timestamp}` : `Lumen • ${msg.timestamp}`}
              </div>
            </div>
          );
        })}

        {/* 3. THINKING STATE */}
        {isThinking && (
          <div className="thinking-box animate-fade-in">
            <div className="bot-avatar-mini lumen-avatar-thinking">
              <SparklesIcon size={14} color="#FFFFFF" />
            </div>

            <div className="thinking-content">
              <div className="thinking-status-line">
                <span className="pulse-dot" style={{ background: "var(--accent-coral)" }}></span>
                <span className="thinking-caption">{thinkingCaption}</span>
              </div>
              <div className="hairline-progress-track">
                <div className="hairline-progress-bar animate-hairline-progress"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. COMPOSER BAR */}
      <div className="composer-footer">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png,image/jpeg,image/webp,image/jpg"
          style={{ display: "none" }}
          onChange={handleFileInputChange}
        />

        {/* Staged Image Preview Chip */}
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
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.55)",
              backdropFilter: "blur(14px)",
              width: "fit-content",
            }}
          >
            <img
              src={imagePreviewUrl}
              alt="Selected reference"
              style={{
                width: "42px",
                height: "42px",
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
                  maxWidth: "240px",
                }}
              >
                {selectedImage.name}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearSelectedImage}
              style={{
                marginLeft: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "50%",
                width: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255, 255, 255, 0.7)",
                cursor: "pointer",
              }}
              title="Remove photo"
            >
              <CloseIcon size={12} color="currentColor" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} onPaste={handlePaste} className="composer-form">
          <div className="composer-pill-input">
            <SparklesIcon size={18} color="var(--accent-coral)" />
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              placeholder={
                selectedImage
                  ? "Describe style, location or press Enter to search similar stays..."
                  : "Ask Lumen anything or paste/upload a photo for Vision Search..."
              }
              className="composer-input-field"
              disabled={isSubmitting || isThinking}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="composer-icon-btn"
              style={{
                color: selectedImage ? "var(--accent-gold, #f59e0b)" : "currentColor",
              }}
              title="Attach image for Vision Search"
            >
              <CameraIcon size={18} color="currentColor" />
            </button>
          </div>

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isSubmitting || isThinking}
            className="btn-send-message"
            title="Send to Lumen"
          >
            <SendIcon size={18} color="#FFFFFF" />
          </button>
        </form>
      </div>
    </div>
  );
};
