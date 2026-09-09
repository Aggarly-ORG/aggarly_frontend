"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ActivityStep } from "../../lib/types";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  TerminalIcon,
} from "../common/Icons";

interface ClaudeActivityDropdownProps {
  steps: ActivityStep[];
  isStreaming?: boolean;
  agentName?: string;
  defaultOpen?: boolean;
  title?: string;
}

export const ClaudeActivityDropdown: React.FC<ClaudeActivityDropdownProps> = ({
  steps = [],
  isStreaming = false,
  agentName = "Lumen AI",
  defaultOpen = false,
  title,
}) => {
  const [isOuterOpen, setIsOuterOpen] = useState<boolean>(isStreaming || defaultOpen);
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());

  const prevStreamingRef = React.useRef(isStreaming);

  // Strictly use real steps sent by backend / WebSocket (filter out intent and execution plan)
  const displaySteps = useMemo(() => {
    return (steps || []).filter(
      (s) =>
        !s.activityType?.includes("INTENT") &&
        s.toolName !== "intent_classification" &&
        !s.friendlyTitle?.includes("Identified Intent") &&
        !s.friendlyTitle?.includes("Classifying intent") &&
        !s.friendlyTitle?.includes("Execution Plan")
    );
  }, [steps]);

  useEffect(() => {
    if (isStreaming) {
      setIsOuterOpen(true);
      const runningStep = displaySteps.find((s) => s.status === "RUNNING");
      if (runningStep) {
        setExpandedStepIds((prev) => new Set(prev).add(runningStep.id));
      }
    } else if (prevStreamingRef.current && !isStreaming) {
      setIsOuterOpen(false);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, displaySteps]);

  const toggleStep = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalDuration = useMemo(() => {
    return displaySteps.reduce((sum, s) => sum + (s.durationMs || 0), 0);
  }, [displaySteps]);

  // If not streaming and no tool steps were executed, do not render
  if (!isStreaming && displaySteps.length === 0) {
    return null;
  }

  const formatJson = (content?: string | null): string => {
    if (!content) return "";
    try {
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  };

  const effectiveAgent =
    displaySteps.find((s) => s.agentName)?.agentName || agentName || "Lumen AI";

  return (
    <div
      className="claude-activity-dropdown"
      style={{
        margin: "12px 0",
        borderRadius: "14px",
        border: "1.5px solid rgba(197, 155, 39, 0.3)",
        background: "#ffffff",
        boxShadow: "0 8px 24px rgba(197, 155, 39, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03)",
        overflow: "hidden",
        width: "100%",
        maxWidth: "640px",
        color: "#0f172a",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      {/* 1. Header Dropdown Bar */}
      <button
        type="button"
        className="claude-activity-dropdown-header"
        onClick={() => {
          if (displaySteps.length > 0) {
            setIsOuterOpen(!isOuterOpen);
          }
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          background: isStreaming ? "#faf8f2" : "#fcfbfa",
          border: "none",
          borderBottom: isOuterOpen && displaySteps.length > 0 ? "1px solid rgba(197, 155, 39, 0.2)" : "none",
          color: "#0f172a",
          fontSize: "12.5px",
          fontWeight: 600,
          cursor: displaySteps.length > 0 ? "pointer" : "default",
          textAlign: "left",
          transition: "background 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          {isStreaming ? (
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                height: "10px",
                width: "10px",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "9999px",
                  background: "#c59b27",
                  opacity: 0.75,
                  animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  borderRadius: "9999px",
                  height: "10px",
                  width: "10px",
                  background: "#c59b27",
                }}
              />
            </span>
          ) : (
            <TerminalIcon size={15} color="#c59b27" />
          )}

          <span
            style={{
              color: "#0f172a",
              fontWeight: 600,
              letterSpacing: "0.1px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {isStreaming
              ? displaySteps.length > 0
                ? `${effectiveAgent} is executing (${displaySteps.length} step${displaySteps.length > 1 ? "s" : ""})...`
                : `${effectiveAgent} is thinking...`
              : title
              ? `${title} (${displaySteps.length} step${displaySteps.length > 1 ? "s" : ""}${totalDuration ? ` • ${totalDuration}ms` : ""})`
              : `Thought & Execution (${displaySteps.length} tool${displaySteps.length > 1 ? "s" : ""} used${
                  totalDuration ? ` • ${totalDuration}ms` : ""
                })`}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span
            className="claude-activity-dropdown-badge"
            style={{
              fontSize: "10px",
              fontWeight: 700,
              fontFamily: "monospace",
              textTransform: "uppercase",
              padding: "3px 9px",
              borderRadius: "9999px",
              background: "#faf5ea",
              color: "#9a7219",
              border: "1px solid rgba(197, 155, 39, 0.35)",
              letterSpacing: "0.5px",
            }}
          >
            {effectiveAgent}
          </span>
          {displaySteps.length > 0 && (
            isOuterOpen ? (
              <ChevronUpIcon size={16} color="#c59b27" />
            ) : (
              <ChevronDownIcon size={16} color="#c59b27" />
            )
          )}
        </div>
      </button>

      {/* 2. Collapsible Execution Steps Stream */}
      {isOuterOpen && displaySteps.length > 0 && (
        <div
          className="claude-activity-dropdown-steps"
          style={{
            padding: "12px",
            background: "#faf9f6",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {displaySteps.map((step) => {
            const isStepExpanded = expandedStepIds.has(step.id);
            const isRunning = step.status === "RUNNING";
            const isFailed = step.status === "FAILED";

            return (
              <div
                key={step.id}
                className="claude-activity-step-item"
                style={{
                  borderRadius: "10px",
                  border: isRunning
                    ? "1.5px solid #d4af37"
                    : isFailed
                    ? "1.5px solid rgba(225, 29, 72, 0.4)"
                    : "1px solid #ede7db",
                  background: isRunning
                    ? "#ffffff"
                    : isFailed
                    ? "#fff5f5"
                    : "#ffffff",
                  boxShadow: isRunning ? "0 4px 12px rgba(197, 155, 39, 0.12)" : "0 1px 3px rgba(0, 0, 0, 0.02)",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Step Item Header */}
                <div
                  onClick={(e) => toggleStep(step.id, e)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {isRunning ? (
                      <ClockIcon
                        size={15}
                        color="#c59b27"
                        className="animate-spin"
                      />
                    ) : isFailed ? (
                      <AlertCircleIcon size={15} color="#e11d48" />
                    ) : (
                      <CheckCircle2Icon size={15} color="#16a34a" />
                    )}
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "12px",
                        color: isRunning ? "#9a7219" : isFailed ? "#e11d48" : "#0f172a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {step.friendlyTitle}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginLeft: "8px",
                      flexShrink: 0,
                    }}
                  >
                    {step.durationMs != null && (
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#9a7219",
                          background: "#faf5ea",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          border: "1px solid rgba(197, 155, 39, 0.35)",
                        }}
                      >
                        {step.durationMs}ms
                      </span>
                    )}
                    {isStepExpanded ? (
                      <ChevronUpIcon size={14} color="#9a7219" />
                    ) : (
                      <ChevronDownIcon size={14} color="#9a7219" />
                    )}
                  </div>
                </div>

                {/* Step Collapsible Details (Arguments & Output) */}
                {isStepExpanded && (step.inputSummary || step.resultSummary) && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderTop: "1px solid #ede7db",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      background: "#fcfaf7",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {step.inputSummary && (
                      <div>
                        <span
                          style={{
                            color: "#9a7219",
                            textTransform: "uppercase",
                            fontSize: "9px",
                            fontWeight: 700,
                            display: "block",
                            marginBottom: "4px",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Input Arguments:
                        </span>
                        <pre
                          style={{
                            margin: 0,
                            color: "#0f172a",
                            background: "#ffffff",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1px solid #e9dfcb",
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            maxHeight: "180px",
                          }}
                        >
                          {formatJson(step.inputSummary)}
                        </pre>
                      </div>
                    )}

                    {step.resultSummary && (
                      <div>
                        <span
                          style={{
                            color: "#15803d",
                            textTransform: "uppercase",
                            fontSize: "9px",
                            fontWeight: 700,
                            display: "block",
                            marginBottom: "4px",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Result Summary:
                        </span>
                        <pre
                          style={{
                            margin: 0,
                            color: "#0f172a",
                            background: "#ffffff",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: "1px solid #d1fae5",
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            maxHeight: "180px",
                          }}
                        >
                          {formatJson(step.resultSummary)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
