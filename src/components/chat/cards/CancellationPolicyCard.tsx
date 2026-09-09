import React from "react";
import { CancellationPolicyData } from "../../../lib/types";
import { ShieldCheckIcon, CheckIcon } from "../../common/Icons";

interface CancellationPolicyCardProps {
  data: CancellationPolicyData;
  onAskRefund?: () => void;
}

export const CancellationPolicyCard: React.FC<CancellationPolicyCardProps> = ({
  data,
  onAskRefund,
}) => {
  return (
    <div className="cancellation-policy-card animate-fade-in">
      <div className="policy-header-row">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheckIcon size={16} color="var(--accent-sage)" />
          <h4 className="policy-title">{data.title}</h4>
        </div>
        <span className="policy-tier-badge">{data.tier} POLICY</span>
      </div>

      {/* Visual Refund Timeline Bar */}
      <div className="policy-timeline-bar-box">
        <div className="policy-timeline-track">
          <div className="timeline-segment full" style={{ width: "50%" }}>
            100% Refund
          </div>
          <div className="timeline-segment half" style={{ width: "25%" }}>
            50%
          </div>
          <div className="timeline-segment none" style={{ width: "25%" }}>
            No Refund
          </div>
        </div>

        <div className="policy-cutoffs-row">
          <span>Booking Date</span>
          <span style={{ fontWeight: 600, color: "var(--accent-sage)" }}>
            {data.fullRefundCutoff} (100%)
          </span>
          <span style={{ fontWeight: 600, color: "var(--accent-gold)" }}>
            {data.halfRefundCutoff} (50%)
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>Check-in</span>
        </div>
      </div>

      {/* Policy Bullet Notes */}
      <div className="policy-notes-list">
        {data.policyNotes.map((note, idx) => (
          <div key={idx} className="policy-note-item">
            <CheckIcon size={12} color="var(--accent-sage)" />
            <span>{note}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="policy-footer">
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
          Automated refunds processed to original Stripe payment method.
        </span>
        <button
          onClick={onAskRefund}
          className="btn-ghost-outline"
          style={{ padding: "6px 12px", fontSize: "11px" }}
        >
          Check Refund Amount
        </button>
      </div>
    </div>
  );
};
