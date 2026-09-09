import React, { useEffect, useRef } from "react";
import { SparklesIcon, UsersIcon } from "../common/Icons";

export interface MentionItem {
  id: string;
  tag: string;
  name: string;
  subtitle: string;
  avatarUrl?: string;
  isAi?: boolean;
  roleBadge?: string;
}

interface MentionAutocompleteProps {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
  extraParticipants?: Array<{ id: string; name: string; username?: string; avatarUrl?: string; role?: string }>;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  isOpen,
  query,
  selectedIndex,
  onSelect,
  onClose,
  extraParticipants = [],
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim().replace(/^[@/]/, "");

  // Base list includes Lumen AI and special Lumen commands
  const allItems: MentionItem[] = [
    {
      id: "lumen-ai",
      tag: "@Lumen",
      name: "Lumen",
      subtitle: "Aggarly AI Concierge • Smart recommendations & stay booking",
      isAi: true,
      roleBadge: "AI Companion",
    },
    {
      id: "lumen-command-clear",
      tag: "@Lumen command:clear",
      name: "@Lumen command:clear",
      subtitle: "Clear all messages in AI conversation thread",
      isAi: true,
      roleBadge: "Command",
    },
    ...extraParticipants.map((p) => ({
      id: p.id,
      tag: `@${p.name.replace(/\s+/g, "")}`,
      name: p.name,
      subtitle: p.username ? `@${p.username}` : (p.role || "Member"),
      avatarUrl: p.avatarUrl,
      isAi: false,
      roleBadge: p.role || "Participant",
    })),
  ];

  // Filter based on query
  const filteredItems = allItems.filter(
    (item) =>
      item.tag.toLowerCase().includes(normalizedQuery) ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.subtitle.toLowerCase().includes(normalizedQuery) ||
      (normalizedQuery === "clear" && item.tag.includes("clear"))
  );

  if (filteredItems.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="mention-autocomplete-menu animate-scale-up"
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "0",
        right: "0",
        maxWidth: "380px",
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(14px)",
        border: "1px solid var(--border-hairline, #e2e8f0)",
        borderRadius: "16px",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08)",
        zIndex: 50,
        overflow: "hidden",
        padding: "6px",
      }}
    >
      <div
        style={{
          padding: "6px 10px 4px",
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--text-tertiary, #94a3b8)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Mention & Bring into Chat</span>
        <span style={{ fontSize: "10px", fontWeight: 400 }}>Tab / Enter to select</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "240px", overflowY: "auto" }}>
        {filteredItems.map((item, idx) => {
          const isSelected = idx === selectedIndex % filteredItems.length;

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "10px",
                cursor: "pointer",
                background: isSelected
                  ? "var(--accent-gold-wash, #fbf7ec)"
                  : "transparent",
                border: isSelected
                  ? "1px solid rgba(197, 155, 39, 0.35)"
                  : "1px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              {/* Avatar / Icon */}
              {item.isAi ? (
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
                    border: "1.5px solid #dfb15b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#dfb15b",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25), 0 0 10px rgba(223, 177, 91, 0.25)",
                    flexShrink: 0,
                  }}
                >
                  <SparklesIcon size={15} color="#dfb15b" />
                </div>
              ) : (
                <img
                  src={
                    item.avatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                  }
                  alt={item.name}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                    border: "1px solid var(--border-hairline, #cbd5e1)",
                  }}
                />
              )}

              {/* Tag & Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "13px",
                      color: item.isAi ? "var(--accent-gold-deep, #9e7819)" : "var(--text-primary, #121214)",
                    }}
                  >
                    {item.tag}
                  </span>
                  {item.roleBadge && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: "9999px",
                        background: item.isAi
                          ? "#fbf7ec"
                          : "rgba(100, 116, 139, 0.12)",
                        color: item.isAi
                          ? "#9e7819"
                          : "var(--text-secondary, #64748b)",
                        border: item.isAi ? "1px solid rgba(197, 155, 39, 0.3)" : "none",
                      }}
                    >
                      {item.roleBadge}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-secondary, #64748b)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.subtitle}
                </div>
              </div>

              {isSelected && (
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#18181b",
                    background: "#ffffff",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    border: "1px solid rgba(197, 155, 39, 0.3)",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  Enter ↵
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
