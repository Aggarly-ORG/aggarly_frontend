"use client";

import React, { useState } from "react";
import { PropertyDetail } from "../../lib/propertyTypes";
import { HeartIcon } from "../common/Icons";

interface PropertyHeaderProps {
  property: PropertyDetail;
  onScrollToReviews: () => void;
  onScrollToMap: () => void;
}

export const PropertyHeader: React.FC<PropertyHeaderProps> = ({
  property,
  onScrollToReviews,
  onScrollToMap,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        if (navigator.share) {
          await navigator.share({
            title: property.title,
            text: `Check out ${property.title} on Aggarly`,
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        }
      } catch {
        // user dismissed share sheet
      }
    }
  };

  const propertyTypeLabel = property.propertyType
    ? property.propertyType.charAt(0) + property.propertyType.slice(1).toLowerCase().replace(/_/g, " ")
    : "Entire Place";

  const hasReviews = property.reviewSummary.totalReviews > 0;

  return (
    <header className="property-editorial-header animate-fade-in">
      <div className="property-title-badge-row">
        {property.host.isSuperhost && (
          <span className="property-superhost-pill">
            <span className="superhost-sparkle">✦</span>
            <span>Superhost Collection</span>
          </span>
        )}
        <span className="property-space-type-pill">
          {propertyTypeLabel}
        </span>
      </div>

      <h1 className="property-display-title">
        {property.title}
      </h1>

      <div className="property-sub-meta-row">
        <div className="property-meta-left">
          <button
            type="button"
            onClick={onScrollToReviews}
            className="property-rating-link"
            title="View verified guest reviews"
          >
            <span className="star-gold">★</span>
            <span className="rating-score">
              {hasReviews ? property.reviewSummary.avgRating.toFixed(2) : "New"}
            </span>
            {hasReviews && (
              <>
                <span className="rating-divider">·</span>
                <span className="reviews-count-underline">
                  {property.reviewSummary.totalReviews} verified review{property.reviewSummary.totalReviews > 1 ? "s" : ""}
                </span>
              </>
            )}
          </button>

          <span className="meta-dot">·</span>

          <button
            type="button"
            onClick={onScrollToMap}
            className="property-location-link"
            title="View on interactive map"
          >
            <span className="location-pin-icon">📍</span>
            <span className="location-text-underline">{property.address.formattedAddress}</span>
          </button>
        </div>

        <div className="property-actions-right">
          <button
            type="button"
            onClick={handleShare}
            className="property-action-btn"
            title="Share listing"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            <span>{copied ? "Link Copied!" : "Share"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSaved(!isSaved)}
            className={`property-action-btn ${isSaved ? "is-saved" : ""}`}
            title={isSaved ? "Saved to Wishlist" : "Save to Wishlist"}
          >
            <HeartIcon size={16} filled={isSaved} color={isSaved ? "var(--accent-coral)" : "currentColor"} />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
