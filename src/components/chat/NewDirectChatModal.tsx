import React, { useState, useEffect } from "react";
import { UserProfileSummary, Conversation } from "../../lib/types";
import { AggarlyChatBridgeClient } from "../../lib/chatBridgeClient";
import { CloseIcon, SearchIcon, SendIcon, UsersIcon } from "../common/Icons";

interface NewDirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export const NewDirectChatModal: React.FC<NewDirectChatModalProps> = ({
  isOpen,
  onClose,
  onConversationCreated,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserProfileSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileSummary | null>(null);
  const [initialMessage, setInitialMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedUser(null);
      setInitialMessage("");
      setErrorMessage("");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    AggarlyChatBridgeClient.searchUsers(searchQuery)
      .then((res) => {
        if (isMounted) {
          setUsers(res.data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("User search error:", err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const conv = await AggarlyChatBridgeClient.createDirectConversation(
        selectedUser.id,
        undefined,
        selectedUser.displayName || selectedUser.username,
        initialMessage.trim() || undefined
      );
      onConversationCreated(conv);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initiate direct message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop-blur animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="new-direct-modal-card animate-scale-up"
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.18)",
          overflow: "hidden",
          border: "1px solid var(--border-hairline, #e2e8f0)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderBottom: "1px solid var(--border-hairline, #e2e8f0)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#18181b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#dfb15b",
                border: "1px solid rgba(223, 177, 91, 0.35)",
              }}
            >
              <UsersIcon size={18} color="currentColor" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary, #0f172a)" }}>
                Start Direct Message
              </h3>
              <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-secondary, #64748b)" }}>
                Chat with any host or guest on Aggarly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              color: "var(--text-secondary, #64748b)",
            }}
          >
            <CloseIcon size={18} color="currentColor" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {/* Search Input */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-tertiary, #94a3b8)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <SearchIcon size={16} color="currentColor" />
            </span>
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                borderRadius: "12px",
                border: "1px solid var(--border-hairline, #cbd5e1)",
                fontSize: "13px",
                outline: "none",
                background: "var(--bg-bubble-incoming, #f8fafc)",
                color: "var(--text-primary, #0f172a)",
              }}
            />
          </div>

          {/* User List */}
          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-tertiary, #64748b)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Select User
            </span>

            {isLoading ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                Searching members...
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                No members found matching "{searchQuery}".
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                {users.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const fallbackAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80";

                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        border: isSelected
                          ? "1.5px solid #18181b"
                          : "1px solid var(--border-hairline, #e2e8f0)",
                        background: isSelected
                          ? "var(--accent-gold-wash, #fbf7ec)"
                          : "#ffffff",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <img
                        src={u.avatarUrl || fallbackAvatar}
                        alt={u.displayName || u.username}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid var(--border-hairline, #e2e8f0)",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "13.5px",
                            color: "var(--text-primary, #0f172a)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {u.displayName || u.username}
                        </div>
                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "var(--text-secondary, #64748b)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          @{u.username} {u.email ? `· ${u.email}` : ""}
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: "var(--accent-coral, #c04a26)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Initial Message Input */}
          {selectedUser && (
            <div style={{ marginTop: "14px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--text-tertiary, #64748b)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Initial Message (Optional)
              </span>
              <textarea
                placeholder={`Say hello to ${selectedUser.displayName || selectedUser.username}...`}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-hairline, #cbd5e1)",
                  fontSize: "13px",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                marginTop: "12px",
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.1)",
                color: "#dc2626",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-hairline, #e2e8f0)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            background: "var(--bg-bubble-incoming, #f8fafc)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: "10px",
              border: "1px solid var(--border-hairline, #cbd5e1)",
              background: "#ffffff",
              color: "var(--text-primary, #334155)",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedUser || isSubmitting}
            onClick={handleStartChat}
            style={{
              padding: "9px 18px",
              borderRadius: "10px",
              border: selectedUser ? "1px solid rgba(223, 177, 91, 0.35)" : "none",
              background: selectedUser ? "#18181b" : "#cbd5e1",
              color: selectedUser ? "#dfb15b" : "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: selectedUser && !isSubmitting ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: selectedUser ? "0 4px 14px rgba(0, 0, 0, 0.25)" : "none",
            }}
          >
            <SendIcon size={14} color={selectedUser ? "#dfb15b" : "#FFFFFF"} />
            <span>{isSubmitting ? "Opening Thread..." : "Start Message"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
