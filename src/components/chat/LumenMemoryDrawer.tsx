import React, { useState } from "react";
import { UserMemoryItem } from "../../lib/types";
import { BrainIcon, TrashIcon, CloseIcon, SparklesIcon } from "../common/Icons";

interface LumenMemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memories: UserMemoryItem[];
  onForgetMemory: (key: string) => Promise<void>;
  onAddMemory: (item: UserMemoryItem) => Promise<void>;
}

export const LumenMemoryDrawer: React.FC<LumenMemoryDrawerProps> = ({
  isOpen,
  onClose,
  memories,
  onForgetMemory,
  onAddMemory,
}) => {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newValue.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddMemory({
        id: `mem-${Date.now()}`,
        key: newKey.trim() || newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
        value: newValue.trim(),
        label: newLabel.trim(),
        category: "Personal Preference",
        createdAt: "Just now",
      });

      setNewLabel("");
      setNewValue("");
      setNewKey("");
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add memory:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (key: string) => {
    setDeletingKey(key);
    try {
      await onForgetMemory(key);
    } catch (err) {
      console.error("Failed to forget memory:", err);
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "#18181b",
                border: "1px solid rgba(223, 177, 91, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <BrainIcon size={18} color="#dfb15b" />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>
                Lumen Companion Memory
              </h3>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Stored preferences Lumen uses to curate stays
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px" }}
          >
            <CloseIcon size={18} color="currentColor" />
          </button>
        </div>

        {/* Content */}
        <div className="drawer-body">
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#faf9f6",
              border: "1px solid rgba(197, 155, 39, 0.25)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              display: "flex",
              gap: "8px",
            }}
          >
            <SparklesIcon size={16} color="#c59b27" style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>
              Lumen only saves memories with your explicit confirmation. These are automatically factored into search filters, dietary requests, and private host accommodations.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-tertiary)" }}>
              Stored Preferences ({memories.length})
            </span>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#c59b27",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>+ Add Preference</span>
              </button>
            )}
          </div>

          {/* Add memory form */}
          {isAdding && (
            <form
              onSubmit={handleSave}
              style={{
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid rgba(223, 177, 91, 0.4)",
                background: "#faf7ed",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
              }}
            >
              <input
                type="text"
                placeholder="Preference label (e.g. Always travels with a dog)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-hairline)",
                  background: "#ffffff",
                  fontSize: "12.5px",
                  outline: "none",
                }}
                required
                disabled={isSubmitting}
              />
              <textarea
                placeholder="Details (e.g. Golden retriever named Cooper, needs ground floor)"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                rows={2}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-hairline)",
                  background: "#ffffff",
                  fontSize: "12.5px",
                  outline: "none",
                  fontFamily: "inherit",
                }}
                required
                disabled={isSubmitting}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: "6px 12px",
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "7px 16px",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "8px",
                    background: "#18181b",
                    color: "#dfb15b",
                    border: "1px solid rgba(223, 177, 91, 0.35)",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? "Saving..." : "Save Memory"}
                </button>
              </div>
            </form>
          )}

          {/* List of memories */}
          {memories.length === 0 ? (
            <div style={{ textAlign: "center", padding: "34px 0", fontSize: "12.5px", color: "var(--text-tertiary)" }}>
              No preferences stored yet. Chat with Lumen to build your traveler profile.
            </div>
          ) : (
            memories.map((item) => (
              <div
                key={item.id || item.key}
                className="memory-item-card"
                style={{
                  opacity: deletingKey === item.key ? 0.4 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 7px",
                        borderRadius: "4px",
                        background: "#faf7ed",
                        color: "#9e7819",
                        border: "1px solid rgba(197, 155, 39, 0.25)",
                        fontWeight: 600,
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    {item.value}
                  </p>
                  <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>
                    Key: <code style={{ fontSize: "10px", background: "rgba(0,0,0,0.04)", padding: "1px 4px", borderRadius: "3px" }}>{item.key}</code>
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(item.key)}
                  className="btn-forget-memory"
                  title="Forget this memory"
                  disabled={deletingKey === item.key}
                >
                  <TrashIcon size={15} color="currentColor" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Linked to Spring Boot AI Memory Store
          </span>
          <button
            onClick={onClose}
            className="btn-ghost-outline"
            style={{ padding: "6px 16px", fontSize: "12px", background: "#FFFFFF", borderRadius: "8px" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
