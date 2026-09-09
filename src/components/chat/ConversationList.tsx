import React, { useState } from "react";
import { Conversation } from "../../lib/types";
import { SparklesIcon, SearchIcon, MapPinIcon } from "../common/Icons";

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewInquiry?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewInquiry,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();
    return (
      conv.title.toLowerCase().includes(q) ||
      conv.lastMessage.toLowerCase().includes(q) ||
      (conv.location && conv.location.toLowerCase().includes(q))
    );
  });

  const lumenConvs = filteredConversations.filter((c) => c.isLumen);
  const hostConvs = filteredConversations.filter((c) => !c.isLumen);

  return (
    <aside className="sidebar-container">
      {/* Header and Search */}
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <h2 className="sidebar-title">Inquiries & Stays</h2>
          {onNewInquiry && (
            <button onClick={onNewInquiry} className="btn-new-inquiry">
              + New Inquiry
            </button>
          )}
        </div>

        <div className="search-input-wrap">
          <SearchIcon size={15} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations & stays..."
            className="search-input"
          />
        </div>
      </div>

      {/* Conversations Scroll Area */}
      <div className="conversations-scroll">
        {/* 1. LUMEN AI INQUIRIES */}
        {lumenConvs.length > 0 && (
          <>
            <div className="section-label">Lumen AI Inquiries</div>
            {lumenConvs.map((conv) => {
              const isSelected = selectedConversationId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`lumen-conv-item ${isSelected ? "active" : ""}`}
                >
                  <div className="lumen-avatar-circle lumen-avatar-glow">
                    <SparklesIcon size={20} color="#FFFFFF" />
                    <span className="lumen-online-dot" />
                  </div>

                  <div className="conv-item-content">
                    <div className="conv-item-top">
                      <div className="conv-item-title">
                        <span>{conv.title}</span>
                        <span className="lumen-tag">AI Concierge</span>
                      </div>
                      <span className="conv-item-time">{conv.lastMessageTimestamp}</span>
                    </div>
                    <p className="conv-item-preview">{conv.lastMessage || "New inquiry..."}</p>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* 2. HOST & STAY INQUIRIES */}
        {hostConvs.length > 0 && (
          <>
            <div className="section-label">Host Conversations</div>
            {hostConvs.map((conv) => {
              const isSelected = selectedConversationId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`host-conv-item ${isSelected ? "active" : ""}`}
                >
                  <img
                    src={
                      conv.property?.thumbnailUrl ||
                      conv.host?.avatarUrl ||
                      "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=200&q=80"
                    }
                    alt={conv.title}
                    className="host-thumb"
                  />

                  <div className="conv-item-content">
                    <div className="conv-item-top">
                      <span className="conv-item-title" style={{ fontSize: "14px" }}>
                        {conv.title}
                      </span>
                      <span className="conv-item-time">{conv.lastMessageTimestamp}</span>
                    </div>

                    {conv.location && (
                      <div className="host-location-line">
                        <MapPinIcon size={11} color="var(--accent-coral)" />
                        <span>{conv.location}</span>
                      </div>
                    )}

                    <p className="conv-item-preview" style={{ fontSize: "11.5px" }}>
                      {conv.lastMessage}
                    </p>

                    {conv.status === "DATES_CONFIRMED" && (
                      <span className="status-tag status-confirmed">✓ Dates Confirmed</span>
                    )}
                    {conv.status === "COMPLETED" && (
                      <span className="status-tag status-completed">Completed Stay</span>
                    )}
                    {conv.status === "ARCHIVED" && (
                      <span className="status-tag status-archived">Archived</span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </aside>
  );
};
