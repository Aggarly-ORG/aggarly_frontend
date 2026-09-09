import React from "react";
import { PropertySnippet } from "../../lib/types";
import { StarIcon, MapPinIcon } from "../common/Icons";

interface ToolResultCarouselProps {
  properties: PropertySnippet[];
  onSelectProperty?: (property: PropertySnippet) => void;
  onQuickBook?: (property: PropertySnippet) => void;
}

export const ToolResultCarousel: React.FC<ToolResultCarouselProps> = ({
  properties,
  onQuickBook,
}) => {
  if (!properties || properties.length === 0) return null;

  return (
    <div className="carousel-container">
      {properties.map((prop) => (
        <div key={prop.id} className="property-mini-card">
          {/* Photo container */}
          <div className="property-card-img-box">
            <img
              src={prop.imageUrl}
              alt={prop.title}
              className="property-card-img"
            />
            <div className="card-rating-badge">
              <StarIcon size={12} filled color="var(--accent-gold)" />
              <span>{prop.rating.toFixed(2)}</span>
            </div>

            {prop.datesAvailable && (
              <div className="card-date-badge">
                {prop.datesAvailable}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="property-card-body">
            <div>
              <h4 className="property-card-title">{prop.title}</h4>
              <div className="property-card-loc">
                <MapPinIcon size={12} color="var(--accent-coral)" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {prop.location}
                </span>
              </div>

              {prop.matchReason && (
                <div className="property-card-reason">
                  <strong style={{ color: "var(--text-primary)" }}>Why it fits:</strong> {prop.matchReason}
                </div>
              )}

              <div className="card-tags-row">
                {prop.features.slice(0, 2).map((feat, idx) => (
                  <span key={idx} className="card-tag">
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            <div className="property-card-footer">
              <div>
                <span className="numeral-gold" style={{ fontSize: "16px" }}>
                  €{prop.nightlyPrice}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}> / night</span>
              </div>

              <button
                onClick={() => onQuickBook && onQuickBook(prop)}
                className="btn-select-stay"
              >
                Select Stay
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
