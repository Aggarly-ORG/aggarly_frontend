import React, { useState } from "react";
import { SupportFaqData } from "../../../lib/types";
import { ChevronRightIcon } from "../../common/Icons";

interface SupportFaqCardProps {
  data: SupportFaqData;
}

export const SupportFaqCard: React.FC<SupportFaqCardProps> = ({ data }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="support-faq-card animate-fade-in">
      <div className="faq-card-header">
        <h4 className="faq-topic-title">{data.topic}</h4>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
          Aggarly Verified Policy
        </span>
      </div>

      <div className="faq-accordion-list">
        {data.items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className="faq-accordion-item">
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="faq-question-btn"
              >
                <span>{item.question}</span>
                <span
                  style={{
                    transform: isOpen ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s ease",
                    display: "inline-flex",
                  }}
                >
                  <ChevronRightIcon size={14} color="var(--text-secondary)" />
                </span>
              </button>

              {isOpen && (
                <div className="faq-answer-box animate-fade-in">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
