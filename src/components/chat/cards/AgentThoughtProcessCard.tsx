import React, { useState } from "react";
import { AgentThoughtProcessData } from "../../../lib/types";
import { BrainIcon, ChevronRightIcon, CheckIcon, SparklesIcon } from "../../common/Icons";

interface AgentThoughtProcessCardProps {
  data: AgentThoughtProcessData;
}

export const AgentThoughtProcessCard: React.FC<AgentThoughtProcessCardProps> = ({
  data,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="thought-process-card animate-fade-in">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="thought-toggle-btn"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BrainIcon size={15} color="var(--accent-coral)" />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
            Lumen Reasoning Engine ({data.toolsInvoked.length} tools · {data.totalLatencyMs}ms)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
            {isExpanded ? "Hide" : "Inspect audit"}
          </span>
          <span
            style={{
              transform: isExpanded ? "rotate(90deg)" : "none",
              transition: "transform 0.2s ease",
              display: "inline-flex",
            }}
          >
            <ChevronRightIcon size={13} color="var(--text-secondary)" />
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="thought-details-panel animate-fade-in">
          <div className="thought-tools-list">
            {data.toolsInvoked.map((t, idx) => (
              <div key={idx} className="thought-tool-row">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <SparklesIcon size={12} color="var(--accent-coral)" />
                    <span style={{ fontFamily: "monospace", fontSize: "11.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {t.toolName}
                    </span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>
                    {t.executionTimeMs}ms
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  {t.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
