import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ExternalLinkIcon } from "../../common/Icons";

interface HtmlEmbedBlockCardProps {
  data?: {
    title?: string;
    src?: string;
    html?: string;
    height?: number | string;
    badge?: string;
    allowFullscreen?: boolean;
  };
  content?: string;
  onQuickPrompt?: (prompt: string) => void;
  onExecuteAction?: (action: string, parameters?: Record<string, any>, label?: string) => void;
}

const FRAME_BLOCKED_DOMAINS = [
  "airbnb.com",
  "booking.com",
  "google.com",
  "vrbo.com",
  "expedia.com",
  "tripadvisor.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "github.com",
  "amazon.com",
];

export const HtmlEmbedBlockCard: React.FC<HtmlEmbedBlockCardProps> = ({
  data,
  content,
  onQuickPrompt,
  onExecuteAction,
}) => {
  const src = data?.src || "";
  const rawHtml = data?.html || content || "";
  const title = data?.title || (src ? "External Web Page" : "Interactive View");
  const badge = data?.badge || (src ? "Web Page" : "Interactive HTML");
  const baseHeight = data?.height
    ? typeof data.height === "number"
      ? `${data.height}px`
      : data.height
    : "380px";

  // Unique frame identifier to prevent cross-card message bubbling/duplication
  const frameIdRef = useRef<string>("");
  if (!frameIdRef.current) {
    frameIdRef.current = `frame_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
  }

  // Deduplication guard: prevent same prompt from dispatching multiple times within 1200ms
  const lastDispatchedRef = useRef<number>(0);

  // Check if target URL belongs to a known X-Frame-Options blocked domain
  const isKnownBlockedDomain = (url: string): boolean => {
    if (!url) return false;
    try {
      const parsedUrl = url.startsWith("http") ? new URL(url) : null;
      if (!parsedUrl) return false;
      const hostname = parsedUrl.hostname.toLowerCase();
      return FRAME_BLOCKED_DOMAINS.some((domain) => hostname.includes(domain));
    } catch {
      return false;
    }
  };

  const isProtectedSite = isKnownBlockedDomain(src);

  const [forceIframe, setForceIframe] = useState(false);
  const [isLoading, setIsLoading] = useState(!!src && !rawHtml);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen strictly for interactive events posted ONLY from THIS specific HTML iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      const { type, frameId, text, prompt, action, payload, url } = event.data;

      // Strict frame isolation: ignore messages sent by other iframe cards
      if (frameId && frameId !== frameIdRef.current) return;

      // Debounce duplicate events triggered by rapid clicks or dual submit listeners
      const now = Date.now();
      if (now - lastDispatchedRef.current < 1200) {
        return;
      }

      if (type === "AGGARLY_SEND_MESSAGE" || type === "AGGARLY_SEND_PROMPT") {
        const msg = text || prompt;
        if (msg && onQuickPrompt) {
          lastDispatchedRef.current = now;
          onQuickPrompt(msg);
        }
      } else if (type === "AGGARLY_FORM_SUBMIT") {
        const msg = prompt || text;
        if (msg && onQuickPrompt) {
          lastDispatchedRef.current = now;
          onQuickPrompt(msg);
        }
      } else if (type === "AGGARLY_ACTION") {
        if (action && onExecuteAction) {
          lastDispatchedRef.current = now;
          onExecuteAction(action, payload);
        }
      } else if (type === "AGGARLY_NAVIGATE") {
        if (url) {
          lastDispatchedRef.current = now;
          if (url.startsWith("http://") || url.startsWith("https://")) {
            window.open(url, "_blank", "noopener,noreferrer");
          } else {
            window.location.href = url;
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onQuickPrompt, onExecuteAction]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  // Inject interactive bridge script into raw HTML so forms and buttons can trigger real chat actions
  const preparedHtml = useMemo(() => {
    if (!rawHtml) return "";

    const currentFrameId = frameIdRef.current;
    const bridgeScript = `
<script>
(function() {
  var FRAME_ID = '${currentFrameId}';
  window.AggarlyBridge = {
    frameId: FRAME_ID,
    sendMessage: function(text) {
      window.parent.postMessage({ type: 'AGGARLY_SEND_MESSAGE', frameId: FRAME_ID, text: text }, '*');
    },
    sendPrompt: function(prompt) {
      window.parent.postMessage({ type: 'AGGARLY_SEND_PROMPT', frameId: FRAME_ID, prompt: prompt }, '*');
    },
    triggerAction: function(action, payload) {
      window.parent.postMessage({ type: 'AGGARLY_ACTION', frameId: FRAME_ID, action: action, payload: payload }, '*');
    },
    navigate: function(url) {
      window.parent.postMessage({ type: 'AGGARLY_NAVIGATE', frameId: FRAME_ID, url: url }, '*');
    }
  };

  function initBridge() {
    // 1. Intercept standard form submissions
    document.querySelectorAll('form').forEach(function(form) {
      if (form.__aggarly_bound) return;
      form.__aggarly_bound = true;

      form.addEventListener('submit', function(e) {
        var actionAttr = form.getAttribute('action');
        if (!actionAttr || actionAttr === '#' || actionAttr.startsWith('javascript:')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          
          var formData = new FormData(form);
          var parts = [];
          var formObj = {};

          formData.forEach(function(value, key) {
            var v = (value !== undefined && value !== null) ? String(value).trim() : '';
            // Only include meaningful, non-empty, non-default fields
            if (v !== '' && v.toUpperCase() !== 'ANY' && v.toUpperCase() !== 'ALL' && v.toUpperCase() !== 'NONE') {
              parts.push(key + ': ' + v);
              formObj[key] = v;
            }
          });

          // Visual feedback on the submit button
          var submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
          if (submitBtn) {
            var oldHtml = submitBtn.innerHTML;
            var oldVal = submitBtn.value;
            submitBtn.disabled = true;
            if (submitBtn.tagName === 'INPUT') {
              submitBtn.value = '✓ Sent to Chat!';
            } else {
              submitBtn.innerHTML = '✓ Sent to Chat!';
            }
            var oldBg = submitBtn.style.background;
            submitBtn.style.background = '#10b981';
            submitBtn.style.color = '#ffffff';

            setTimeout(function() {
              submitBtn.disabled = false;
              if (submitBtn.tagName === 'INPUT') {
                submitBtn.value = oldVal;
              } else {
                submitBtn.innerHTML = oldHtml;
              }
              submitBtn.style.background = oldBg;
              submitBtn.style.color = '';
            }, 3000);
          }

          var customPrompt = form.getAttribute('data-prompt');
          var promptText = '';
          if (customPrompt) {
            promptText = customPrompt;
          } else if (parts.length > 0) {
            var formTitle = form.getAttribute('data-title') || document.title || 'Inquiry';
            promptText = formTitle + ' (' + parts.join(', ') + ')';
          } else {
            promptText = 'Submitted ' + (form.getAttribute('data-title') || 'form');
          }

          window.parent.postMessage({
            type: 'AGGARLY_FORM_SUBMIT',
            frameId: FRAME_ID,
            prompt: promptText,
            formData: formObj
          }, '*');
        }
      });
    });

    // 2. Intercept elements with data-prompt, data-action, or data-url
    document.querySelectorAll('[data-prompt], [data-action], [data-url]').forEach(function(el) {
      if (el.__aggarly_bound) return;
      el.__aggarly_bound = true;

      el.addEventListener('click', function(e) {
        if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.hasAttribute('role')) {
          var prompt = el.getAttribute('data-prompt');
          var action = el.getAttribute('data-action');
          var url = el.getAttribute('data-url');

          if (prompt) {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.parent.postMessage({ type: 'AGGARLY_SEND_MESSAGE', frameId: FRAME_ID, text: prompt }, '*');
          } else if (action) {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.parent.postMessage({ type: 'AGGARLY_ACTION', frameId: FRAME_ID, action: action }, '*');
          } else if (url) {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.parent.postMessage({ type: 'AGGARLY_NAVIGATE', frameId: FRAME_ID, url: url }, '*');
          }
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBridge);
  } else {
    initBridge();
  }
})();
</script>
`;

    if (rawHtml.includes("</body>")) {
      return rawHtml.replace("</body>", bridgeScript + "</body>");
    } else if (rawHtml.includes("</html>")) {
      return rawHtml.replace("</html>", bridgeScript + "</html>");
    }
    return rawHtml + bridgeScript;
  }, [rawHtml]);

  if (!src && !rawHtml) {
    return null;
  }

  const handleRefresh = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenNewTab = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (src) {
      window.open(src, "_blank", "noopener,noreferrer");
    } else if (rawHtml) {
      try {
        const blob = new Blob([preparedHtml], { type: "text/html;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } catch {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(preparedHtml);
          win.document.close();
        }
      }
    }
  };

  const getDomainName = (url: string): string => {
    try {
      if (url.startsWith("http")) {
        const u = new URL(url);
        return u.hostname.replace("www.", "");
      }
      return url;
    } catch {
      return url;
    }
  };

  const domain = getDomainName(src);

  const renderIframeContent = (isModal: boolean = false) => {
    if (isProtectedSite && !forceIframe) {
      return (
        <div className="html-protected-site-container" style={{ padding: isModal ? "60px 24px" : "32px 24px", textAlign: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 16px",
              borderRadius: "16px",
              background: "rgba(192, 74, 38, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            🌐
          </div>

          <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
            {title} ({domain})
          </h4>

          <p style={{ fontSize: "12.5px", color: "#64748b", maxWidth: "440px", margin: "0 auto 18px", lineHeight: "1.5" }}>
            This website enforces strict security policies (<code>X-Frame-Options: SAMEORIGIN</code>) that prevent inline embedding.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleOpenNewTab}
              type="button"
              className="btn-launch-external"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "12px",
                background: "var(--accent-coral)",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(192, 74, 38, 0.25)",
              }}
            >
              <span>Open {domain || "Page"} in New Tab</span>
              <ExternalLinkIcon size={13} color="#ffffff" />
            </button>

            <button
              type="button"
              onClick={() => setForceIframe(true)}
              style={{
                background: "transparent",
                border: "1px solid #cbd5e1",
                padding: "10px 16px",
                borderRadius: "12px",
                color: "#64748b",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Try Embedding Anyway
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="html-embed-body" style={{ height: isModal ? "100%" : baseHeight }}>
        {isLoading && (
          <div className="html-embed-loading">
            <div className="html-spinner" />
            <span>Loading interactive view...</span>
          </div>
        )}

        {src ? (
          <iframe
            key={iframeKey}
            src={src}
            title={title}
            className="html-embed-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="fullscreen; clipboard-read; clipboard-write"
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <iframe
            key={iframeKey}
            srcDoc={preparedHtml}
            title={title}
            className="html-embed-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => setIsLoading(false)}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {/* 1. Standard Inline Gray Glassy Card in Chat */}
      <div className="html-embed-card animate-fade-in">
        {/* Header Bar */}
        <div className="html-embed-header">
          <div className="html-embed-controls">
            <span className="window-dot dot-red" />
            <span className="window-dot dot-yellow" />
            <span className="window-dot dot-green" />
          </div>

          <div className="html-embed-title-wrap">
            <span className="html-embed-badge">{badge}</span>
            <span className="html-embed-title" title={src || title}>
              {title}
            </span>
            {src && (
              <span className="html-embed-url" title={src}>
                {domain}
              </span>
            )}
          </div>

          <div className="html-embed-actions">
            {/* Reload Button */}
            <button
              onClick={handleRefresh}
              className="html-action-btn"
              title="Reload Frame"
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
              </svg>
            </button>

            {/* Open in New Tab Button */}
            <button
              onClick={handleOpenNewTab}
              className="html-action-btn"
              title="Open in New Tab"
              type="button"
            >
              <ExternalLinkIcon size={13} color="currentColor" />
            </button>

            {/* Full Window / Extend Modal Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="html-action-btn html-expand-btn"
              title="Extend in Full Floating Window"
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Card Body */}
        {renderIframeContent(false)}
      </div>

      {/* 2. Glassy Centered Full-Window Modal (Portal directly to document.body) */}
      {isModalOpen && mounted && typeof document !== "undefined" && createPortal(
        <div className="html-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="html-modal-window"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="html-modal-header">
              <div className="html-embed-controls">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="window-dot dot-red dot-red-btn"
                  title="Close Window (Esc)"
                />
                <span className="window-dot dot-yellow" />
                <span className="window-dot dot-green" />
              </div>

              <div className="html-embed-title-wrap">
                <span className="html-embed-badge">{badge}</span>
                <span className="html-modal-title" title={src || title}>
                  {title}
                </span>
                {src && (
                  <span className="html-embed-url" title={src}>
                    {domain}
                  </span>
                )}
              </div>

              <div className="html-embed-actions">
                {/* Reload Button */}
                <button
                  onClick={handleRefresh}
                  className="html-action-btn"
                  title="Reload Page"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
                  </svg>
                </button>

                {/* Open in New Tab */}
                <button
                  onClick={handleOpenNewTab}
                  className="html-action-btn"
                  title="Open in New Tab"
                  type="button"
                >
                  <ExternalLinkIcon size={14} color="currentColor" />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="html-modal-close-btn"
                  title="Close Full Window (Esc)"
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Frame Body */}
            <div className="html-modal-body">
              {renderIframeContent(true)}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
