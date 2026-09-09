import React, { useState } from "react";
import { MemoryConsentData } from "../../lib/types";
import { PawIcon, SparklesIcon, CheckIcon, CloseIcon } from "../common/Icons";

interface MemoryConsentCardProps {
  data: MemoryConsentData;
  onConfirm: (data: MemoryConsentData) => Promise<void>;
  onDismiss?: (id: string) => void;
}

export const MemoryConsentCard: React.FC<MemoryConsentCardProps> = ({
  data,
  onConfirm,
  onDismiss,
}) => {
  const [status, setStatus] = useState<"PENDING" | "REMEMBERED" | "DISMISSED">(
    data.status
  );
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(data);
      setStatus("REMEMBERED");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setStatus("DISMISSED");
    if (onDismiss) onDismiss(data.id);
  };

  return (
    <div className="memory-consent-box animate-fade-in">
      <div className="memory-consent-header">
        {data.category === "PETS" ? (
          <PawIcon size={16} color="var(--accent-coral)" />
        ) : (
          <SparklesIcon size={16} color="var(--accent-coral)" />
        )}
        <span>Lumen Long-Term Memory</span>
      </div>

      <p className="memory-consent-text">
        Remember: <span style={{ fontStyle: "italic", fontWeight: "normal" }}>"{data.label}"</span> for future trip searches?
      </p>

      {status === "PENDING" && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="btn-coral-primary"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            {loading ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckIcon size={13} color="#FFFFFF" />
                <span>Confirm</span>
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            disabled={loading}
            className="btn-ghost-outline"
            style={{ padding: "6px 12px", fontSize: "12px", background: "#FFFFFF" }}
          >
            <CloseIcon size={12} color="currentColor" />
            <span>Not now</span>
          </button>
        </div>
      )}

      {status === "REMEMBERED" && (
        <div className="memory-tag-confirmed">
          <CheckIcon size={12} color="var(--accent-sage)" />
          <span>Remembered ✓</span>
        </div>
      )}

      {status === "DISMISSED" && (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontStyle: "italic" }}>
          Preference was not saved.
        </div>
      )}
    </div>
  );
};
