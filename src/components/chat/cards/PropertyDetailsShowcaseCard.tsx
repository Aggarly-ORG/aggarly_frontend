import React from "react";
import { PropertySnippet } from "../../../lib/types";
import {
  StarIcon,
  MapPinIcon,
  UsersIcon,
  CheckIcon,
  SparklesIcon,
} from "../../common/Icons";

const FALLBACK_PHOTO = "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80";

interface PropertyDetailsShowcaseCardProps {
  property: PropertySnippet;
  onReserve?: (property: PropertySnippet) => void;
  onAskLumen?: (question: string) => void;
}

export const PropertyDetailsShowcaseCard: React.FC<PropertyDetailsShowcaseCardProps> = ({
  property,
  onReserve,
  onAskLumen,
}) => {
  return (
    <div className="property-showcase-card animate-fade-in">
      {/* Photo Collage Header */}
      <div className="showcase-photo-container">
        <img
          src={property.imageUrl || FALLBACK_PHOTO}
          alt={property.title}
          className="showcase-main-photo"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_PHOTO;
          }}
        />
        <div className="showcase-badge-rating">
          <StarIcon size={13} filled color="var(--accent-gold)" />
          <span>{property.rating.toFixed(2)}</span>
          <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
            ({property.reviewCount} reviews)
          </span>
        </div>

        {property.isSuperhost && (
          <div className="showcase-superhost-pill">
            <SparklesIcon size={12} color="#FFFFFF" />
            <span>Superhost Certified</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="showcase-body">
        <div className="showcase-title-row">
          <div>
            <h3 className="showcase-title">{property.title}</h3>
            <div className="showcase-location">
              <MapPinIcon size={13} color="var(--accent-coral)" />
              <span>{property.location}</span>
            </div>
          </div>

          <div className="showcase-price-box">
            <span className="numeral-gold" style={{ fontSize: "20px" }}>
              €{property.nightlyPrice}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              {" "}
              / night
            </span>
          </div>
        </div>

        {/* Specs Pill Row */}
        <div className="showcase-specs-row">
          <span className="spec-pill">
            <UsersIcon size={12} color="var(--text-secondary)" />
            {property.maxGuests} Guests
          </span>
          <span className="spec-pill">{property.bedrooms} Bedrooms</span>
          <span className="spec-pill">{property.bathrooms} Bathrooms</span>
          {property.datesAvailable && (
            <span className="spec-pill" style={{ background: "var(--accent-sage-wash)", color: "var(--accent-sage)", fontWeight: 600 }}>
              {property.datesAvailable}
            </span>
          )}
        </div>

        {/* Description / Lumen Match Reason */}
        <p className="showcase-description">
          {property.description ||
            property.matchReason ||
            "Sculpted into coastal limestone cliffs with private sea veranda, heated infinity plunge pool, and dedicated sommelier service."}
        </p>

        {/* Amenities List */}
        <div className="showcase-amenities-grid">
          {property.features.map((feat, idx) => (
            <div key={idx} className="amenity-item">
              <CheckIcon size={12} color="var(--accent-sage)" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="showcase-actions-row">
          <button
            onClick={() => onReserve && onReserve(property)}
            className="btn-confirm-action"
          >
            Reserve with Lumen
          </button>
          {property.id && (
            <a
              href={`/properties/${property.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-dismiss-action"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              View Listing
            </a>
          )}
          <button
            onClick={() =>
              onAskLumen &&
              onAskLumen(`What are the check-in rules for ${property.title}?`)
            }
            className="btn-dismiss-action"
          >
            Ask a Question
          </button>
        </div>
      </div>
    </div>
  );
};
