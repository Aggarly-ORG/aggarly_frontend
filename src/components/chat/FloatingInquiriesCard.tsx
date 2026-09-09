import React, { useState } from "react";
import { Conversation } from "../../lib/types";
import { SparklesIcon, CloseIcon, UsersIcon } from "../common/Icons";

interface FloatingInquiriesCardProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  selectedConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewInquiry: () => void;
  onNewDirectMessage?: () => void;
}

export const FloatingInquiriesCard: React.FC<FloatingInquiriesCardProps> = ({
  isOpen,
  onClose,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewInquiry,
  onNewDirectMessage,
}) => {
  const [filterTab, setFilterTab] = useState<"ALL" | "AI" | "DIRECT">("ALL");

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) => {
    const isAi = c.isLumen || c.type === "LUMEN" || (c as any).type === "AI_CONCIERGE";
    if (filterTab === "AI") return isAi;
    if (filterTab === "DIRECT") return !isAi;
    return true;
  });

  return (
    <div className="floating-inquiries-modal animate-fade-in">
      {/* Floating Card Header */}
      <div className="floating-inquiries-header">
        <h3 className="floating-inquiries-title">Conversations</h3>
        <button
          onClick={onClose}
          className="floating-close-btn"
          title="Close Inquiries"
        >
          <CloseIcon size={16} color="var(--text-secondary)" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          padding: "8px 16px",
          borderBottom: "1px solid var(--border-hairline, #e2e8f0)",
          background: "var(--bg-bubble-incoming, #f8fafc)",
        }}
      >
        <button
          onClick={() => setFilterTab("ALL")}
          style={{
            padding: "4px 10px",
            borderRadius: "8px",
            border: "none",
            fontSize: "11.5px",
            fontWeight: 600,
            cursor: "pointer",
            background: filterTab === "ALL" ? "#ffffff" : "transparent",
            color: filterTab === "ALL" ? "var(--text-primary)" : "var(--text-secondary)",
            boxShadow: filterTab === "ALL" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          All ({conversations.length})
        </button>
        <button
          onClick={() => setFilterTab("AI")}
          style={{
            padding: "4px 10px",
            borderRadius: "8px",
            border: "none",
            fontSize: "11.5px",
            fontWeight: 600,
            cursor: "pointer",
            background: filterTab === "AI" ? "#ffffff" : "transparent",
            color: filterTab === "AI" ? "var(--accent-coral)" : "var(--text-secondary)",
            boxShadow: filterTab === "AI" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          AI Concierge
        </button>
        <button
          onClick={() => setFilterTab("DIRECT")}
          style={{
            padding: "4px 10px",
            borderRadius: "8px",
            border: "none",
            fontSize: "11.5px",
            fontWeight: 600,
            cursor: "pointer",
            background: filterTab === "DIRECT" ? "#ffffff" : "transparent",
            color: filterTab === "DIRECT" ? "var(--accent-sage, #3e8871)" : "var(--text-secondary)",
            boxShadow: filterTab === "DIRECT" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          Direct Messages
        </button>
      </div>

      {/* Inquiries List */}
      <div className="floating-inquiries-list">
        {filteredConversations.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "12.5px" }}>
            No conversations in this tab.
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversationId === conv.id;
            const isLumen = conv.isLumen || conv.type === "LUMEN";
            const isDirect = conv.type === "DIRECT";

            return (
              <div
                key={conv.id}
                onClick={() => {
                  onSelectConversation(conv.id);
                  onClose();
                }}
                className={`floating-inquiry-item ${isSelected ? "selected" : ""}`}
              >
                {/* Thumbnail or Avatar */}
                <div className="floating-item-avatar-box">
                  {isLumen ? (
                    <div className="floating-lumen-avatar">
                      <SparklesIcon size={16} color="#FFFFFF" />
                    </div>
                  ) : (
                    <img
                      src={
                        conv.avatarUrl ||
                        conv.property?.thumbnailUrl ||
                        conv.host?.avatarUrl ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                      }
                      alt={conv.title}
                      className="floating-item-img"
                    />
                  )}
                </div>

                {/* Information */}
                <div className="floating-item-info">
                  <div className="floating-item-title-row">
                    <span className="floating-item-title">{conv.title}</span>
                    {conv.status === "ACTIVE" && (
                      <span className="floating-status-dot active" />
                    )}
                  </div>

                  <div className="floating-item-sub">
                    {isLumen ? (
                      <span className="status-label active-lumen">
                        AI CONCIERGE
                      </span>
                    ) : isDirect ? (
                      <span className="status-label active-inquiry" style={{ color: "var(--accent-sage, #3e8871)", background: "var(--accent-sage-wash, rgba(62, 136, 113, 0.12))" }}>
                        DIRECT CHAT
                      </span>
                    ) : (
                      <span className="status-label active-inquiry">
                        HOST INQUIRY
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="floating-inquiries-footer" style={{ display: "flex", gap: "8px" }}>
        {onNewDirectMessage && (
          <button
            onClick={() => {
              onNewDirectMessage();
              onClose();
            }}
            className="btn-new-inquiry-floating"
            style={{ flex: 1, background: "#ffffff", color: "var(--text-primary)", border: "1px solid var(--border-hairline, #cbd5e1)" }}
          >
            <UsersIcon size={14} color="currentColor" />
            <span>+ Direct Message</span>
          </button>
        )}

        <button
          onClick={() => {
            onNewInquiry();
            onClose();
          }}
          className="btn-new-inquiry-floating"
          style={{ flex: 1 }}
        >
          <SparklesIcon size={14} color="#FFFFFF" />
          <span>+ AI Trip</span>
        </button>
      </div>
    </div>
  );
};
