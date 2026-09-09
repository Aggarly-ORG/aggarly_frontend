import React, { useEffect } from "react";
import { ChatNotification } from "../../store/slices/uiSlice";
import { SparklesIcon } from "../common/Icons";

interface ChatNotificationToastProps {
  notification: ChatNotification | null;
  onOpenConversation: (conversationId: string) => void;
  onDismiss: () => void;
}

export const ChatNotificationToast: React.FC<ChatNotificationToastProps> = ({
  notification,
  onOpenConversation,
  onDismiss,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 7000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isLumen = notification.senderType === "LUMEN";
  const cleanSnippet =
    notification.content
      .replace(/<[^>]*>?/gm, "")
      .replace(/^"[^"]+"\s*\n\n/, "")
      .replace(/\{"version":.*$/, "")
      .trim() || "Sent a new message";

  return (
    <div
      className="chat-notification-toast animate-slide-down"
      onClick={() => onOpenConversation(notification.conversationId)}
      role="alert"
      title="Click to view conversation"
    >
      <div className="chat-toast-avatar-wrap">
        {isLumen ? (
          <div className="chat-toast-avatar-lumen">
            <SparklesIcon size={16} color="#c04a26" />
          </div>
        ) : (
          <div className="chat-toast-avatar-host">
            <span>👤</span>
          </div>
        )}
      </div>

      <div className="chat-toast-content">
        <div className="chat-toast-header">
          <span className="chat-toast-sender">
            {notification.senderName || (isLumen ? "Lumen AI" : "Host")}
          </span>
          <span className="chat-toast-tag">New Message</span>
          <span className="chat-toast-time">{notification.timestamp || "Just now"}</span>
        </div>
        <p className="chat-toast-snippet">{cleanSnippet}</p>
      </div>

      <div className="chat-toast-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onOpenConversation(notification.conversationId)}
          className="btn-toast-open"
        >
          Open
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="btn-toast-close"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
