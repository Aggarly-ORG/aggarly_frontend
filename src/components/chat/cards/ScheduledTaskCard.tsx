import React, { useState, useEffect } from "react";
import { ScheduledTaskCardData } from "../../../lib/types";
import { AggarlyChatBridgeClient } from "../../../lib/chatBridgeClient";

interface ScheduledTaskCardProps {
  task: ScheduledTaskCardData;
  onRefresh?: () => void;
}

export const ScheduledTaskCard: React.FC<ScheduledTaskCardProps> = ({ task, onRefresh }) => {
  const taskName = task.name || (task as any)?.title || "Scheduled Automation";
  const rawStatus = (task.status || (task as any)?.state || "ACTIVE").toUpperCase();
  const [currentStatus, setCurrentStatus] = useState<string>(rawStatus);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(task.message || null);

  const targetTaskId = task.id || task.taskId || "";
  const isCompleted = currentStatus === "COMPLETED" || currentStatus === "FINISHED";
  const isCancelled = currentStatus === "CANCELLED";
  const isCompletedOrCancelled = isCompleted || isCancelled;

  // Sync latest live status from backend if available
  useEffect(() => {
    let isMounted = true;
    if (targetTaskId) {
      AggarlyChatBridgeClient.getScheduledTask(targetTaskId).then((liveTask) => {
        if (isMounted && liveTask && liveTask.status) {
          setCurrentStatus(liveTask.status.toUpperCase());
        }
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [targetTaskId]);

  const getTriggerLabel = (): string => {
    const config = task.triggerConfig || {};
    const type = (task.triggerType || "").toUpperCase();
    const tz = task.timezone ? ` · ${task.timezone}` : "";

    switch (type) {
      case "DAILY":
        return `Daily at ${config.time || "09:00"}${tz}`;
      case "WEEKLY":
        const days = Array.isArray(config.days) ? config.days.join(", ") : "MONDAY";
        return `Every ${days} at ${config.time || "09:00"}${tz}`;
      case "MONTHLY":
        return `Monthly on day ${config.dayOfMonth || 10} at ${config.time || "09:00"}${tz}`;
      case "INTERVAL":
        return `Every ${config.every || 1} ${config.unit || "DAYS"}`;
      case "EVENT":
        return `On Event: ${config.event || "BOOKING.CREATED"}`;
      case "EVENT_OFFSET":
        return `Offset: ${config.offset?.value || -3} ${config.offset?.unit || "DAYS"} before ${config.event || "BOOKING.CHECK_IN"}`;
      case "ONCE":
        const raw = config.executeAt || (task.nextExecutionAt && !task.nextExecutionAt.includes("Event") ? task.nextExecutionAt : null);
        if (raw) {
          const parsed = Date.parse(raw);
          if (!isNaN(parsed)) {
            return `One-time: ${new Date(parsed).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
          }
        }
        return `One-time Reminder`;
      default:
        return `${type || "SCHEDULED"}${tz}`;
    }
  };

  const getNextExecutionDisplay = (): string => {
    const type = (task.triggerType || "").toUpperCase();

    if (isCompleted) {
      const lastRan = task.lastExecutionAt ? Date.parse(task.lastExecutionAt) : null;
      if (lastRan && !isNaN(lastRan)) {
        return `Completed on ${new Date(lastRan).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
      }
      return "Execution Completed";
    }

    if (isCancelled) {
      return "Cancelled";
    }

    if (type === "EVENT" || type === "EVENT_OFFSET") {
      const ev = task.triggerConfig?.event || "Domain Event";
      return `Event Trigger (${ev})`;
    }

    if (type === "ONCE") {
      const raw = task.nextExecutionAt && !task.nextExecutionAt.includes("Event")
        ? task.nextExecutionAt
        : task.triggerConfig?.executeAt;
      if (raw) {
        const timestamp = Date.parse(raw);
        if (!isNaN(timestamp)) {
          return new Date(timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
        }
      }
      return currentStatus === "ACTIVE" ? "Pending scheduled execution" : "Execution Finished";
    }

    if (!task.nextExecutionAt) {
      return currentStatus === "ACTIVE" ? "Waiting for schedule" : "None";
    }

    const timestamp = Date.parse(task.nextExecutionAt);
    if (!isNaN(timestamp)) {
      return new Date(timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    }

    return task.nextExecutionAt;
  };

  const handleRunNow = async () => {
    if (isCompletedOrCancelled) return;
    if (!targetTaskId) {
      setFeedbackMessage("Task ID is missing.");
      return;
    }
    setIsProcessing(true);
    setFeedbackMessage("Triggering manual run...");
    try {
      const result = await AggarlyChatBridgeClient.runScheduledTaskNow(targetTaskId);
      if (result) {
        setFeedbackMessage("Immediate execution triggered successfully!");
        if ((task.triggerType || "").toUpperCase() === "ONCE") {
          setCurrentStatus("COMPLETED");
        }
        setTimeout(() => setFeedbackMessage(null), 4500);
        if (onRefresh) onRefresh();
      } else {
        setFeedbackMessage("Task run request sent.");
      }
    } catch (e: any) {
      setFeedbackMessage(e.message || "Failed to trigger run.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTogglePause = async () => {
    if (isCompletedOrCancelled) return;
    if (!targetTaskId) return;
    setIsProcessing(true);
    try {
      if (currentStatus === "PAUSED") {
        await AggarlyChatBridgeClient.resumeScheduledTask(targetTaskId);
        setCurrentStatus("ACTIVE");
        setFeedbackMessage("Automation resumed.");
      } else {
        await AggarlyChatBridgeClient.pauseScheduledTask(targetTaskId);
        setCurrentStatus("PAUSED");
        setFeedbackMessage("Automation paused.");
      }
      setTimeout(() => setFeedbackMessage(null), 4000);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      setFeedbackMessage(e.message || "Failed to toggle task state.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (isCompletedOrCancelled) return;
    if (!targetTaskId) return;
    if (typeof window !== "undefined" && !window.confirm(`Are you sure you want to cancel '${taskName}'?`)) return;
    setIsProcessing(true);
    try {
      const res = await AggarlyChatBridgeClient.cancelScheduledTask(targetTaskId);
      if (res) {
        setCurrentStatus("CANCELLED");
        setFeedbackMessage("Automation cancelled permanently.");
        if (onRefresh) onRefresh();
      } else {
        setFeedbackMessage("Failed to cancel task.");
      }
    } catch (e: any) {
      setFeedbackMessage(e.message || "Failed to cancel task.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "ACTIVE":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "9999px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", fontSize: "11px", fontWeight: 600 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
            Active
          </span>
        );
      case "RUNNING":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "9999px", background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", fontSize: "11px", fontWeight: 600 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6" }} />
            Running
          </span>
        );
      case "PAUSED":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "9999px", background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", fontSize: "11px", fontWeight: 600 }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} />
            Paused
          </span>
        );
      case "COMPLETED":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "9999px", background: "rgba(100, 116, 139, 0.12)", color: "#475569", fontSize: "11px", fontWeight: 600 }}>
            ✓ Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "9999px", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", fontSize: "11px", fontWeight: 600 }}>
            Cancelled
          </span>
        );
      default:
        return (
          <span style={{ padding: "3px 9px", borderRadius: "9999px", background: "#e2e8f0", color: "#475569", fontSize: "11px", fontWeight: 600 }}>
            {currentStatus}
          </span>
        );
    }
  };

  return (
    <div
      className="scheduled-task-card animate-fade-in"
      style={{
        background: "var(--card-bg, #ffffff)",
        border: isCompleted ? "1px solid rgba(0, 0, 0, 0.05)" : "1px solid var(--border-hairline, rgba(0, 0, 0, 0.08))",
        borderRadius: "14px",
        padding: "16px",
        margin: "8px 0",
        boxShadow: isCompleted ? "none" : "0 4px 16px rgba(0, 0, 0, 0.04)",
        opacity: isCompleted ? 0.92 : 1,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              background: isCompletedOrCancelled ? "rgba(100, 116, 139, 0.1)" : "var(--accent-gold-wash, rgba(217, 119, 6, 0.12))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              color: isCompletedOrCancelled ? "#64748b" : "var(--accent-gold, #d97706)",
            }}
          >
            {isCompleted ? "✓" : isCancelled ? "✕" : "⏱️"}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: isCompleted ? "#475569" : "var(--text-primary, #0f172a)" }}>
              {taskName}
            </h4>
            <span style={{ fontSize: "12px", color: "var(--text-secondary, #64748b)" }}>
              {getTriggerLabel()}
            </span>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Description */}
      {task.description && (
        <p style={{ fontSize: "13px", color: "var(--text-secondary, #475569)", margin: "0 0 12px 0", lineHeight: 1.45 }}>
          {task.description}
        </p>
      )}

      {/* Execution Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          background: isCompleted ? "rgba(241, 245, 249, 0.6)" : "var(--bg-subtle, #f8fafc)",
          borderRadius: "8px",
          marginBottom: isCompletedOrCancelled ? "4px" : "12px",
          fontSize: "12px",
        }}
      >
        <span style={{ color: "var(--text-secondary, #64748b)" }}>
          {isCompleted ? "Status:" : isCancelled ? "Status:" : "Next scheduled run:"}
        </span>
        <span style={{ fontWeight: 600, color: isCompleted ? "#475569" : "var(--text-primary, #0f172a)" }}>
          {getNextExecutionDisplay()}
        </span>
      </div>

      {/* Feedback message banner */}
      {feedbackMessage && (
        <div
          style={{
            padding: "8px 12px",
            background: isCompletedOrCancelled ? "rgba(100, 116, 139, 0.08)" : "rgba(59, 130, 246, 0.08)",
            borderRadius: "6px",
            color: isCompletedOrCancelled ? "#475569" : "#2563eb",
            fontSize: "12px",
            marginBottom: "10px",
          }}
        >
          {feedbackMessage}
        </div>
      )}

      {/* Action Controls - Only shown for ACTIVE / PAUSED tasks */}
      {!isCompletedOrCancelled && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
          <button
            onClick={handleRunNow}
            disabled={isProcessing}
            title="Run this task immediately"
            style={{
              padding: "6px 14px",
              borderRadius: "7px",
              background: "var(--accent-gold, #d97706)",
              color: "#ffffff",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: isProcessing ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              opacity: isProcessing ? 0.7 : 1,
              transition: "all 0.15s ease",
            }}
          >
            ▶ Run Now
          </button>

          <button
            onClick={handleTogglePause}
            disabled={isProcessing}
            title={currentStatus === "PAUSED" ? "Resume task" : "Pause task"}
            style={{
              padding: "6px 14px",
              borderRadius: "7px",
              background: "transparent",
              border: "1px solid var(--border-hairline, #cbd5e1)",
              color: "var(--text-primary, #334155)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: isProcessing ? "wait" : "pointer",
              opacity: isProcessing ? 0.7 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {currentStatus === "PAUSED" ? "▶ Resume" : "⏸ Pause"}
          </button>

          <button
            onClick={handleCancel}
            disabled={isProcessing}
            title="Cancel task"
            style={{
              padding: "6px 14px",
              borderRadius: "7px",
              background: "transparent",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              fontSize: "12px",
              fontWeight: 500,
              cursor: isProcessing ? "wait" : "pointer",
              marginLeft: "auto",
              opacity: isProcessing ? 0.7 : 1,
              transition: "all 0.15s ease",
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
