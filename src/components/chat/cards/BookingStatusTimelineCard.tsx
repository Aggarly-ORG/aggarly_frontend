import React from "react";
import { BookingTimelineData } from "../../../lib/types";
import { CheckIcon, CalendarIcon, UsersIcon } from "../../common/Icons";

interface BookingStatusTimelineCardProps {
  data: BookingTimelineData;
  onMessageHost?: () => void;
}

export const BookingStatusTimelineCard: React.FC<BookingStatusTimelineCardProps> = ({
  data,
  onMessageHost,
}) => {
  if (!data || (!data.propertyTitle && !data.bookingId && !data.location && !data.accessCode && !data.checkInDate)) {
    return null;
  }

  const steps = [
    { key: "HELD", label: "Dates Held" },
    { key: "AUTHORIZED", label: "Payment Authorized" },
    { key: "CHECKIN_READY", label: "Check-in Ready" },
    { key: "COMPLETED", label: "Completed" },
  ];

  const currentStep = data.currentStep || "CHECKIN_READY";
  const currentStepIdx = steps.findIndex((s) => s.key === currentStep);
  const effectiveStepIdx = currentStepIdx >= 0 ? currentStepIdx : 2;
  const fallbackThumb = "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80";

  return (
    <div
      className="booking-timeline-card animate-fade-in"
      style={{
        margin: "14px 0",
        padding: "20px",
        background: "#ffffff",
        border: "1px solid var(--border-hairline, rgba(0, 0, 0, 0.08))",
        borderRadius: "20px",
        boxShadow: "var(--shadow-warm-md, 0 4px 20px rgba(0, 0, 0, 0.06))",
        maxWidth: "580px",
        width: "100%",
      }}
    >
      <div
        className="timeline-top-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "16px",
        }}
      >
        <img
          src={data.thumbnailUrl || fallbackThumb}
          alt={data.propertyTitle || "Property"}
          className="timeline-thumb"
          style={{
            width: "64px",
            height: "64px",
            minWidth: "64px",
            maxWidth: "64px",
            borderRadius: "12px",
            objectFit: "cover",
            border: "1px solid var(--border-hairline, rgba(0, 0, 0, 0.08))",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="timeline-prop-title"
            style={{
              fontFamily: "var(--font-serif, Georgia, serif)",
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--text-primary, #0f172a)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.propertyTitle || "Confirmed Reservation"}
          </div>
          {data.location && (
            <div
              className="timeline-prop-loc"
              style={{
                fontSize: "12px",
                color: "var(--text-secondary, #64748b)",
                marginBottom: "3px",
              }}
            >
              {data.location}
            </div>
          )}
          {(data.checkInDate || data.checkOutDate) && (
            <div
              className="timeline-stay-dates"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "var(--accent-coral, #c04a26)",
                fontWeight: 500,
              }}
            >
              <CalendarIcon size={12} color="var(--accent-coral)" />
              <span>
                {data.checkInDate || "Check-in"} – {data.checkOutDate || "Check-out"}
                {data.checkInTime ? ` · Check-in at ${data.checkInTime}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps Indicator */}
      <div className="timeline-steps-track" style={{ display: "flex", justifyContent: "space-between", position: "relative", margin: "18px 0" }}>
        {steps.map((step, idx) => {
          const isPassed = idx <= effectiveStepIdx;
          const isCurrent = idx === effectiveStepIdx;

          return (
            <div key={step.key} className="timeline-step-item" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", zIndex: 1 }}>
              <div
                className={`timeline-step-node ${
                  isPassed ? "active" : ""
                } ${isCurrent ? "current" : ""}`}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: isPassed ? "var(--accent-sage, #3e8871)" : "var(--bg-bubble-incoming, #f1f5f9)",
                  color: isPassed ? "#ffffff" : "var(--text-tertiary, #94a3b8)",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isCurrent ? "0 0 0 4px var(--accent-sage-wash, rgba(62, 136, 113, 0.15))" : "none",
                }}
              >
                {isPassed ? <CheckIcon size={11} color="#FFFFFF" /> : idx + 1}
              </div>
              <span
                className={`timeline-step-label ${isPassed ? "active" : ""}`}
                style={{
                  fontSize: "10.5px",
                  color: isPassed ? "var(--text-primary, #0f172a)" : "var(--text-tertiary, #94a3b8)",
                  fontWeight: isPassed ? 600 : 500,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Access Code & Coordinates (Only when real access code is available) */}
      {data.accessCode && (
        <div
          className="timeline-access-box"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "var(--bg-warm, #faf8f5)",
            borderRadius: "12px",
            border: "1px solid var(--border-hairline, rgba(0, 0, 0, 0.08))",
            marginBottom: "14px",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", color: "var(--text-secondary, #64748b)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              Terrace Key Lockbox PIN
            </span>
            <div style={{ fontFamily: "monospace", fontSize: "18px", fontWeight: 700, color: "var(--accent-coral, #c04a26)", letterSpacing: "0.15em", marginTop: "2px" }}>
              {data.accessCode}
            </div>
          </div>

          {(data.hostName || data.hostPhone) && (
            <div style={{ textAlign: "right" }}>
              {data.hostName && (
                <span style={{ fontSize: "11px", color: "var(--text-secondary, #64748b)" }}>
                  Host: {data.hostName}
                </span>
              )}
              {data.hostPhone && (
                <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary, #0f172a)" }}>
                  {data.hostPhone}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Row */}
      <div className="timeline-actions-row" style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={onMessageHost}
          className="btn-ghost-outline"
          style={{
            flex: 1,
            padding: "9px 14px",
            fontSize: "12.5px",
            fontWeight: 500,
            borderRadius: "10px",
            border: "1px solid var(--border-hairline, #cbd5e1)",
            background: "#ffffff",
            color: "var(--text-primary, #334155)",
            cursor: "pointer",
          }}
        >
          Message Host {data.hostName ? data.hostName : ""}
        </button>
        <button
          onClick={() => alert("Digital Stay Pass downloaded.")}
          className="btn-coral-primary"
          style={{
            padding: "9px 16px",
            fontSize: "12.5px",
            fontWeight: 600,
            borderRadius: "10px",
            border: "none",
            background: "var(--accent-coral, #c04a26)",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          Download Stay Pass
        </button>
      </div>
    </div>
  );
};
