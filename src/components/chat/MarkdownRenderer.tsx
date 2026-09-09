import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SparklesIcon } from "../common/Icons";

export function highlightMentions(text: React.ReactNode): React.ReactNode {
  if (typeof text !== "string" || !text.includes("@")) return text;

  const parts = text.split(/(@[A-Za-z0-9_-]+)/g);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      const tagLower = part.toLowerCase();
      if (tagLower === "@lumen" || tagLower === "@ai") {
        return (
          <span key={index} className="mention-pill-lumen">
            <SparklesIcon size={12} color="currentColor" />
            <span>@Lumen</span>
          </span>
        );
      }
      return (
        <span key={index} className="mention-pill-user">
          {part}
        </span>
      );
    }
    return part;
  });
}

function processChildrenMentions(children: React.ReactNode): React.ReactNode {
  if (React.Children.count(children) === 0) return children;
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return highlightMentions(child);
    }
    return child;
  });
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  if (!content) return null;

  return (
    <div className={`aggarly-markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphs
          p: ({ children }) => <p className="aggarly-md-p">{processChildrenMentions(children)}</p>,

          // Headings with Fraunces serif styling
          h1: ({ children }) => <h1 className="aggarly-md-h1">{processChildrenMentions(children)}</h1>,
          h2: ({ children }) => <h2 className="aggarly-md-h2">{processChildrenMentions(children)}</h2>,
          h3: ({ children }) => <h3 className="aggarly-md-h3">{processChildrenMentions(children)}</h3>,
          h4: ({ children }) => <h4 className="aggarly-md-h4">{processChildrenMentions(children)}</h4>,

          // Strong / Bold
          strong: ({ children }) => (
            <strong className="aggarly-md-strong">{processChildrenMentions(children)}</strong>
          ),

          // Emphasis
          em: ({ children }) => <em className="aggarly-md-em">{processChildrenMentions(children)}</em>,

          // Lists
          ul: ({ children }) => <ul className="aggarly-md-ul">{children}</ul>,
          ol: ({ children }) => <ol className="aggarly-md-ol">{children}</ol>,
          li: ({ children }) => <li className="aggarly-md-li">{processChildrenMentions(children)}</li>,

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="aggarly-md-blockquote">{processChildrenMentions(children)}</blockquote>
          ),

          // Code blocks & Inline code
          code: ({ className, children, ...props }) => {
            const isInline = !className && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return <code className="aggarly-md-inline-code" {...props}>{children}</code>;
            }
            return (
              <pre className="aggarly-md-pre">
                <code className="aggarly-md-code" {...props}>
                  {children}
                </code>
              </pre>
            );
          },

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="aggarly-md-link"
            >
              {processChildrenMentions(children)}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div className="aggarly-md-table-wrap">
              <table className="aggarly-md-table">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="aggarly-md-thead">{children}</thead>,
          tbody: ({ children }) => <tbody className="aggarly-md-tbody">{children}</tbody>,
          tr: ({ children }) => <tr className="aggarly-md-tr">{children}</tr>,
          th: ({ children }) => <th className="aggarly-md-th">{processChildrenMentions(children)}</th>,
          td: ({ children }) => <td className="aggarly-md-td">{processChildrenMentions(children)}</td>,

          // Horizontal rule
          hr: () => <hr className="aggarly-md-hr" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
