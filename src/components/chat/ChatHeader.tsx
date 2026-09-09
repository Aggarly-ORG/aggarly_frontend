import React from "react";
import { Conversation } from "../../lib/types";
import {
  SparklesIcon,
  BrainIcon,
  MapPinIcon,
  MenuIcon,
} from "../common/Icons";

import { useAuth } from "../../context/AuthContext";

interface ChatHeaderProps {
  conversation: Conversation;
  onToggleInquiries: () => void;
  onNewInquiry?: () => void;
  onNewDirectMessage?: () => void;
  onOpenMemoryDrawer?: () => void;
  onViewPropertyDetails?: (propertyId: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onToggleInquiries,
  onNewInquiry,
  onNewDirectMessage,
  onOpenMemoryDrawer,
  onViewPropertyDetails,
}) => {
  const { user } = useAuth();
  const isLumen = conversation?.isLumen || conversation?.type === "LUMEN";

  return (
    <header className="unified-chat-header animate-fade-in">
      {/* Left: Brand Logo & Conversation Identity */}
      <div className="header-identity-left">
        {/* Aggarly Brand Logo */}
        <div
          onClick={onNewInquiry}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            userSelect: "none",
          }}
          title="Aggarly • New AI Trip"
        >
          <span
            className="brand-logo-text"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "23px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            Aggarly
          </span>
        </div>

        {/* Subtle Vertical Divider */}
        <div
          style={{
            width: "1px",
            height: "22px",
            background: "var(--border-hairline)",
            margin: "0 8px",
          }}
        />

        {/* Avatar & Presence */}
        <div className="header-avatar-wrapper">
          {isLumen ? (
            <div className="header-lumen-avatar">
              <SparklesIcon size={17} color="#dfb15b" />
              <span className="header-presence-dot online"></span>
            </div>
          ) : (
            <div className="header-user-avatar-box">
              <img
                src={
                  conversation?.avatarUrl ||
                  conversation?.host?.avatarUrl ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                }
                alt={conversation?.title || "User Avatar"}
                className="header-user-avatar"
              />
              <span className="header-presence-dot online"></span>
            </div>
          )}
        </div>

        {/* Name & Subtitle */}
        <div className="header-title-column">
          <div className="header-name-row">
            <h2 className="header-participant-name">
              {conversation?.title || (isLumen ? "Lumen AI Concierge" : "Host")}
            </h2>
            {isLumen ? (
              <span className="header-ai-pill">AI Companion</span>
            ) : conversation?.type === "DIRECT" ? (
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: "var(--accent-sage-wash, rgba(62, 136, 113, 0.12))",
                  color: "var(--accent-sage, #3e8871)",
                }}
              >
                Direct Message
              </span>
            ) : (
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: "var(--accent-coral-wash, rgba(192, 74, 38, 0.12))",
                  color: "var(--accent-coral, #c04a26)",
                }}
              >
                Host Inquiry
              </span>
            )}
            {conversation?.id && conversation.id !== "conv-lumen" && conversation.id !== "new" && (
              <span
                className="header-conv-id-badge"
                title={`Conversation ID: ${conversation.id}`}
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "11px",
                  padding: "2px 8px",
                  background: "rgba(0, 0, 0, 0.04)",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "12px",
                  color: "var(--text-secondary, #94A3B8)",
                  cursor: "default",
                  letterSpacing: "0.5px",
                }}
              >
                #{conversation.id.slice(0, 8)}
              </span>
            )}
          </div>

          <div className="header-status-subtitle">
            <span className="header-online-indicator"></span>
            <span>
              {isLumen
                ? "Always online • Tailored recommendations & bookings"
                : conversation?.type === "DIRECT"
                ? "Direct message thread • Instant delivery"
                : (conversation?.subtitle && !conversation.subtitle.startsWith("{")
                    ? conversation.subtitle
                    : "Verified Host • Responds typically within an hour")}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Attached Property Pill & Actions */}
      <div className="header-actions-right">
        {onNewDirectMessage && (
          <button
            onClick={onNewDirectMessage}
            className="btn-ghost-outline"
            style={{ padding: "7px 14px", fontSize: "12.5px", borderRadius: "10px", fontWeight: 500 }}
            title="Start a direct message with any member"
          >
            <span>+ Direct Message</span>
          </button>
        )}

        {onNewInquiry && (
          <button
            onClick={onNewInquiry}
            className="btn-coral-primary"
            style={{
              padding: "7px 14px",
              fontSize: "12.5px",
              borderRadius: "10px",
              background: "#18181b",
              color: "#dfb15b",
              border: "1px solid rgba(223, 177, 91, 0.35)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
            title="Start a new AI conversation"
          >
            <SparklesIcon size={14} color="#dfb15b" />
            <span>+ AI Trip</span>
          </button>
        )}

        {conversation?.property && (
          <button
            onClick={() =>
              onViewPropertyDetails &&
              onViewPropertyDetails(conversation.property!.id)
            }
            className="header-property-badge"
            title="View Property Details"
          >
            <MapPinIcon size={13} color="var(--accent-coral)" />
            <span>
              {conversation.property.title} · {conversation.property.location}
            </span>
          </button>
        )}

        {onOpenMemoryDrawer && (
          <button
            onClick={onOpenMemoryDrawer}
            className="header-action-icon-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "10px",
              background: "#faf9f6",
              border: "1px solid var(--border-hairline)",
              cursor: "pointer",
            }}
            title="Lumen Memory & Travel Preferences"
          >
            <BrainIcon size={16} color="var(--accent-gold-deep)" />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>Memories</span>
          </button>
        )}

        {/* Multi-Role User Profile Pill */}
        {user && (
          <div
            className="header-user-profile-badge"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px 4px 6px",
              borderRadius: "20px",
              background: "rgba(0, 0, 0, 0.04)",
              border: "1px solid var(--border-hairline)",
            }}
            title={`${user.username || user.email} (${(user.roles || [user.role || "GUEST"]).join(", ")})`}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #dfb15b 0%, #c04a26 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              {(user.username || user.email || "U").slice(0, 1).toUpperCase()}
            </div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
              {user.username || (user.email ? user.email.split("@")[0] : "Member")}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {(user.roles && user.roles.length > 0 ? user.roles : ["GUEST", "HOST", "ADMIN"]).map((role) => {
                const norm = String(role).toUpperCase();
                const isGuest = norm === "GUEST";
                const isHost = norm === "HOST";
                const isAdmin = norm === "ADMIN";

                const bg = isAdmin
                  ? "rgba(147, 51, 234, 0.12)"
                  : isHost
                  ? "rgba(223, 177, 91, 0.16)"
                  : "rgba(100, 116, 139, 0.12)";
                const color = isAdmin
                  ? "#9333ea"
                  : isHost
                  ? "#b4842e"
                  : "#64748b";
                const border = isAdmin
                  ? "1px solid rgba(147, 51, 234, 0.25)"
                  : isHost
                  ? "1px solid rgba(223, 177, 91, 0.3)"
                  : "1px solid rgba(100, 116, 139, 0.2)";

                const label = isGuest ? "Guest" : isHost ? "Host" : isAdmin ? "Admin" : role;

                return (
                  <span
                    key={role}
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "1px 6px",
                      borderRadius: "10px",
                      background: bg,
                      color: color,
                      border: border,
                      letterSpacing: "0.02em",
                      textTransform: "capitalize",
                    }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
