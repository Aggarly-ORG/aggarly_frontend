import React, { useState, useRef, useEffect } from "react";
import { Conversation, ChatMessage } from "../../lib/types";
import { highlightMentions } from "./MarkdownRenderer";
import { MentionAutocomplete, MentionItem } from "./MentionAutocomplete";
import {
  SendIcon,
  PaperclipIcon,
  CameraIcon,
  CalendarIcon,
  UsersIcon,
  CheckIcon,
  CloseIcon,
} from "../common/Icons";

interface HumanChatThreadProps {
  conversation: Conversation;
  messages: ChatMessage[];
  onSendMessage: (text: string, imageFile?: File, imagePreviewUrl?: string) => Promise<void>;
}

export const HumanChatThread: React.FC<HumanChatThreadProps> = ({
  conversation,
  messages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Vision Search / Attachment State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  // Mention Autocomplete State
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart || val.length;
    const beforeCursor = val.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@([a-zA-Z0-9_-]*)$/);

    if (atMatch) {
      setIsMentionOpen(true);
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setIsMentionOpen(false);
    }
  };

  const handleSelectMention = (item: MentionItem) => {
    const cursorPos = inputRef.current?.selectionStart || inputText.length;
    const beforeCursor = inputText.slice(0, cursorPos);
    const afterCursor = inputText.slice(cursorPos);
    const atIdx = beforeCursor.lastIndexOf("@");

    if (atIdx !== -1) {
      const newText = beforeCursor.slice(0, atIdx) + item.tag + " " + afterCursor;
      setInputText(newText);
    } else {
      setInputText((prev) => prev + " " + item.tag + " ");
    }

    setIsMentionOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
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
      handleSelectMention({
        id: "lumen-ai",
        tag: "@Lumen",
        name: "Lumen",
        subtitle: "Aggarly AI Concierge",
        isAi: true,
      });
    } else if (e.key === "Escape") {
      setIsMentionOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || isSending) return;

    const text = inputText;
    const imgToSubmit = selectedImage;
    const previewToSubmit = imagePreviewUrl;

    setInputText("");
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setIsSending(true);
    try {
      await onSendMessage(text, imgToSubmit || undefined, previewToSubmit || undefined);
    } finally {
      setIsSending(false);
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
      {/* Drag & Drop Overlay */}
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
              Drop Photo to Share
            </h3>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)" }}>
              Attach photo to send to {conversation.title || "Member"}
            </p>
          </div>
        </div>
      )}

      {/* 1. PROPERTY CONTEXT BANNER */}
      {conversation.property && (
        <div className="property-thread-banner">
          <div className="property-banner-info">
            <img
              src={conversation.property.thumbnailUrl}
              alt={conversation.property.title}
              className="property-banner-thumb"
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 className="thread-title">{conversation.title}</h3>
                {conversation.host?.isSuperhost && (
                  <span className="lumen-tag">Superhost</span>
                )}
              </div>

              <div className="property-banner-meta">
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <CalendarIcon size={12} color="var(--accent-coral)" />
                  {conversation.property.stayDates}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <UsersIcon size={12} color="var(--text-secondary)" />
                  {conversation.property.guestCount}
                </span>
              </div>
            </div>
          </div>

          <div className="status-tag status-confirmed" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "12px" }}>
            <CheckIcon size={13} color="var(--accent-sage)" />
            <span>{conversation.property.statusBadge}</span>
          </div>
        </div>
      )}

      {/* 2. MESSAGES STREAM */}
      <div className="messages-container">
        <div className="security-pill">
          Encrypted Member Direct Channel
        </div>

        {messages.map((msg) => {
          const isUser = msg.senderType === "USER";
          const isLumen = msg.senderType === "LUMEN";

          return (
            <div
              key={msg.id}
              className={`message-item ${isUser ? "user" : isLumen ? "lumen" : "host"} animate-fade-in`}
            >
              <div className="message-bubble-row">
                {!isUser && (
                  <img
                    src={
                      msg.senderAvatar ||
                      (isLumen
                        ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                        : conversation.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80")
                    }
                    alt={msg.senderName}
                    className="host-avatar-mini"
                  />
                )}

                <div style={{ flex: 1 }}>
                  <div className={`bubble-content ${isUser ? "bubble-user" : isLumen ? "bubble-lumen" : "bubble-host"}`}>
                    {!isUser && (
                      <div style={{ fontSize: "11px", fontWeight: 700, color: isLumen ? "var(--accent-coral)" : "var(--text-secondary)", marginBottom: "4px" }}>
                        {isLumen ? "✦ Lumen AI" : msg.senderName || conversation.title}
                      </div>
                    )}
                    {isUser && msg.imageAttachmentUrl && (
                      <div style={{ marginBottom: msg.content ? "8px" : "0", borderRadius: "10px", overflow: "hidden", maxWidth: "260px" }}>
                        <img
                          src={msg.imageAttachmentUrl}
                          alt="Uploaded reference"
                          style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block", borderRadius: "8px" }}
                        />
                      </div>
                    )}
                    <p>{highlightMentions(msg.content)}</p>
                  </div>
                </div>
              </div>

              <div className="message-timestamp">
                {isUser ? `You • ${msg.timestamp}` : `${msg.senderName || conversation.title || "Host"} • ${msg.timestamp}`}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. COMPOSER BAR */}
      <div className="composer-footer" style={{ position: "relative" }}>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png,image/jpeg,image/webp,image/jpg"
          style={{ display: "none" }}
          onChange={handleFileInputChange}
        />

        {/* Mention Autocomplete Dropdown */}
        <MentionAutocomplete
          isOpen={isMentionOpen}
          query={mentionQuery}
          selectedIndex={mentionIndex}
          onSelect={handleSelectMention}
          onClose={() => setIsMentionOpen(false)}
          extraParticipants={
            conversation.title ? [{ id: "thread-participant", name: conversation.title, role: "Participant" }] : []
          }
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
                  Photo Attached
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="composer-icon-btn"
              style={{
                color: selectedImage ? "var(--accent-gold, #f59e0b)" : "currentColor",
              }}
              title="Attach photo"
            >
              <CameraIcon size={18} color="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="composer-icon-btn"
              title="Attach document"
            >
              <PaperclipIcon size={18} color="currentColor" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onPaste={handlePaste}
              placeholder={`Message ${conversation.title || conversation.host?.name || "Host"} (type @Lumen to invite AI)...`}
              className="composer-input-field"
            />
          </div>

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isSending}
            className="btn-send-message"
          >
            <SendIcon size={18} color="#FFFFFF" />
          </button>
        </form>
      </div>
    </div>
  );
};
