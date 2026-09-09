import React from "react";
import { Conversation } from "../../lib/types";
import { SparklesIcon } from "../common/Icons";

interface EmptyChatWelcomeHeroProps {
  conversation: Conversation;
  onSelectPrompt: (prompt: string) => void;
}

export const EmptyChatWelcomeHero: React.FC<EmptyChatWelcomeHeroProps> = ({
  conversation,
  onSelectPrompt,
}) => {
  const isLumen = conversation?.isLumen || conversation?.type === "LUMEN";

  if (isLumen) {
    return (
      <div className="empty-welcome-hero animate-fade-in">
        <div className="empty-hero-icon-box">
          <SparklesIcon size={32} color="#FFFFFF" />
        </div>

        <h2 className="empty-hero-title">Aggarly AI Concierge</h2>
        <p className="empty-hero-subtitle">
          I'm Lumen, your intelligent hospitality companion. Ask me anything about luxury properties, availability, bespoke culinary experiences, or managing your reservations.
        </p>

        <div className="empty-starter-grid">
          <button
            onClick={() => onSelectPrompt("What stays do you recommend for a scenic coastal escape?")}
            className="empty-starter-card"
          >
            <span className="starter-card-icon">🏝️</span>
            <div>
              <div className="starter-card-title">Discover Stays</div>
              <div className="starter-card-desc">Find tailored estates and villas</div>
            </div>
          </button>

          <button
            onClick={() => onSelectPrompt("What dates and pricing are available for upcoming trips?")}
            className="empty-starter-card"
          >
            <span className="starter-card-icon">📅</span>
            <div>
              <div className="starter-card-title">Check Availability</div>
              <div className="starter-card-desc">Inquire about dates and live rates</div>
            </div>
          </button>

          <button
            onClick={() => onSelectPrompt("Can you arrange private chef or local dining experiences?")}
            className="empty-starter-card"
          >
            <span className="starter-card-icon">🍷</span>
            <div>
              <div className="starter-card-title">Gastronomy & Chefs</div>
              <div className="starter-card-desc">Private dining, wine pairings, and local chefs</div>
            </div>
          </button>

          <button
            onClick={() => onSelectPrompt("What are the booking and cancellation policies?")}
            className="empty-starter-card"
          >
            <span className="starter-card-icon">🛡️</span>
            <div>
              <div className="starter-card-title">Concierge & Policies</div>
              <div className="starter-card-desc">Guarantees, payments, and stay logistics</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Host Direct Chat Welcome
  return (
    <div className="empty-welcome-hero animate-fade-in">
      <div className="empty-hero-avatar-box">
        {conversation?.avatarUrl ? (
          <img
            src={conversation.avatarUrl}
            alt={conversation?.title}
            className="empty-hero-avatar-img"
          />
        ) : (
          <div className="header-lumen-avatar" style={{ width: "100%", height: "100%" }}>
            <span style={{ fontSize: "20px", color: "#FFF" }}>💬</span>
          </div>
        )}
      </div>

      <h2 className="empty-hero-title">Direct Conversation with {conversation?.title || "Host"}</h2>
      <p className="empty-hero-subtitle">
        {conversation?.subtitle || "Active conversation thread"}. Send a message to coordinate details, ask questions, or request assistance.
      </p>
    </div>
  );
};
