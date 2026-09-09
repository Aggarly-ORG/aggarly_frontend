import React, { useState, useEffect } from "react";
import { ConfirmationCardData } from "../../lib/types";
import { AggarlyChatBridgeClient } from "../../lib/chatBridgeClient";
import { ShieldCheckIcon, CheckIcon, CloseIcon } from "../common/Icons";

interface ConfirmationCardProps {
  data: ConfirmationCardData;
  onConfirm: (token: string) => Promise<void>;
  onDismiss?: (id: string) => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  data,
  onConfirm,
  onDismiss,
}) => {
  const [status, setStatus] = useState<"PENDING" | "CONFIRMED" | "DISMISSED">(
    data.status === "CONFIRMED" ? "CONFIRMED" : data.status
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if prop changes
  useEffect(() => {
    if (data.status === "CONFIRMED") {
      setStatus("CONFIRMED");
    }
  }, [data.status]);

  const hasCheckedRef = React.useRef(false);

  // Check database if token was already confirmed (ONCE on mount)
  useEffect(() => {
    let isMounted = true;
    if (data.token && status !== "CONFIRMED" && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      AggarlyChatBridgeClient.getUserConfirmedActions()
        .then((res: any) => {
          const actions = Array.isArray(res) ? res : res?.data || [];
          if (isMounted && Array.isArray(actions)) {
            const isConfirmed = actions.some(
              (a: any) =>
                a.confirmationToken === data.token ||
                a.confirmation_token === data.token ||
                a.token === data.token
            );
            if (isConfirmed) {
              setStatus("CONFIRMED");
            }
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [data.token, status]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const token = data.token || (data as any).confirmationToken || (data as any).confirmation_token || "";
      if (onConfirm) {
        await onConfirm(token);
      }
      setStatus("CONFIRMED");
    } catch (e: any) {
      console.warn("Confirmation action execution error:", e);
      setErrorMessage(e?.message || "Action confirmation failed or requires authorized session.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    setStatus("DISMISSED");
    if (onDismiss) onDismiss(data.id);
  };

  return (
    <div className="confirmation-gate-card animate-fade-in">
      <div className="gate-card-header">
        <div className="gate-badge">
          <div className="gate-shield-icon">
            <ShieldCheckIcon size={13} color="#FFFFFF" />
          </div>
          <span>Confirmation Required · Gate #20</span>
        </div>
        {status === "PENDING" && (
          <span style={{ fontSize: "11px", color: "var(--text-secondary)", background: "#ffffff", padding: "2px 8px", borderRadius: "9999px", border: "1px solid var(--border-hairline)" }}>
            Requires explicit yes
          </span>
        )}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <h4 className="gate-card-title">{data.title}</h4>
        <p className="gate-card-summary">
          {data.propertyTitle} · {data.dateRange}
        </p>
        <p className="gate-card-sub">{data.guestSummary}</p>
      </div>

      {data.totalPrice > 0 && (
        <div className="gate-price-row">
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Total reservation amount
          </span>
          <span className="numeral-gold" style={{ fontSize: "17px" }}>
            {data.currency}
            {data.totalPrice.toLocaleString()}
          </span>
        </div>
      )}

      {status === "PENDING" && (
        <div className="gate-actions-row">
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="btn-confirm-action"
          >
            {isProcessing ? (
              <span>Authorizing...</span>
            ) : (
              <>
                <CheckIcon size={16} color="#FFFFFF" />
                <span>Confirm & Authorize</span>
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            disabled={isProcessing}
            className="btn-dismiss-action"
          >
            <CloseIcon size={14} color="currentColor" />
            <span>Not now</span>
          </button>
        </div>
      )}

      {errorMessage && status === "PENDING" && (
        <div style={{ marginTop: "10px", padding: "8px 12px", background: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "12px", border: "1px solid #fecaca" }}>
          {errorMessage}
        </div>
      )}

      {status === "CONFIRMED" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "var(--accent-sage-wash)", borderRadius: "10px", color: "var(--accent-sage)", fontSize: "12px", fontWeight: "600" }}>
          <CheckIcon size={14} color="var(--accent-sage)" />
          <span>Action confirmed & authorized with Aggarly services.</span>
        </div>
      )}

      {status === "DISMISSED" && (
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic", padding: "4px 0" }}>
          Confirmation dismissed.
        </div>
      )}
    </div>
  );
};
