"use client";

import React, { useState } from "react";
import { PropertyDetail } from "../../lib/propertyTypes";

interface PropertyDetailsContentProps {
  property: PropertyDetail;
  onOpenAmenities: () => void;
  onAskLumen: (prompt: string) => void;
  onMessageHost?: () => void;
  reviewsRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<HTMLDivElement | null>;
}

export const PropertyDetailsContent: React.FC<PropertyDetailsContentProps> = ({
  property,
  onOpenAmenities,
  onAskLumen,
  onMessageHost,
  reviewsRef,
  mapRef,
}) => {
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const LUMEN_PROMPTS = [
    `Tell me about the location and surroundings of ${property.title}`,
    "What are the check-in rules and quiet hours?",
    "Is this property suitable for remote work?",
    "What is the cancellation policy?",
  ];

  const hasReviews = property.reviews && property.reviews.length > 0;
  const hasAmenities = property.amenities && property.amenities.length > 0;

  return (
    <div className="property-main-left-column">
      {/* 1. Key Specs Strip */}
      <section className="property-specs-strip">
        <div className="specs-items-wrap">
          <div className="spec-badge-item">
            <span className="spec-icon">👥</span>
            <span>{property.maxGuests} Guest{property.maxGuests > 1 ? "s" : ""}</span>
          </div>
          <span className="spec-separator">·</span>
          <div className="spec-badge-item">
            <span className="spec-icon">🛏️</span>
            <span>{property.bedrooms} Bedroom{property.bedrooms > 1 ? "s" : ""}</span>
          </div>
          <span className="spec-separator">·</span>
          <div className="spec-badge-item">
            <span className="spec-icon">🛋️</span>
            <span>{property.beds} Bed{property.beds > 1 ? "s" : ""}</span>
          </div>
          <span className="spec-separator">·</span>
          <div className="spec-badge-item">
            <span className="spec-icon">🚿</span>
            <span>{property.bathrooms} Bath{property.bathrooms > 1 ? "s" : ""}</span>
          </div>
        </div>
      </section>

      <div className="property-section-divider" />

      {/* 2. Host Profile Card */}
      <section className="property-host-section">
        <div className="host-card-main">
          <div className="host-avatar-wrap">
            <img src={property.host.avatarUrl} alt={property.host.name} className="host-avatar-img" />
            {property.host.isSuperhost && (
              <span className="host-superhost-badge" title="Verified Superhost">✦</span>
            )}
          </div>

          <div className="host-info-block">
            <h3 className="host-name-title">Hosted by {property.host.name}</h3>
            <p className="host-meta-sub">
              {property.host.isSuperhost ? "Superhost · " : ""}
              Hosting since {property.host.joinedYear}
              {property.reviewSummary.totalReviews > 0 ? ` · ${property.reviewSummary.totalReviews} Reviews (★ ${property.reviewSummary.avgRating.toFixed(2)})` : ""}
            </p>
            <p className="host-response-rate">
              ⚡ Response rate: {property.host.responseRate} ({property.host.responseTime})
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onMessageHost) {
                onMessageHost();
              } else {
                onAskLumen(`I'd like to inquire with host ${property.host.name} about ${property.title}`);
              }
            }}
            className="btn-contact-host"
          >
            Message Host
          </button>
        </div>
      </section>

      <div className="property-section-divider" />

      {/* 3. "Ask Lumen About This Stay" Ambient AI Card */}
      <section className="property-lumen-banner animate-fade-in">
        <div className="lumen-banner-header">
          <div className="lumen-banner-avatar-ring">
            <span className="lumen-sparkle">✦</span>
          </div>
          <div className="lumen-banner-heading-wrap">
            <span className="lumen-banner-kicker">Lumen AI Concierge</span>
            <h4 className="lumen-banner-title">Instant answers about this stay & destination</h4>
          </div>
        </div>

        <p className="lumen-banner-desc">
          Lumen knows this property's specs, layout, WiFi details, house rules, and nearby highlights.
        </p>

        <div className="lumen-prompt-chips-wrap">
          {LUMEN_PROMPTS.map((prompt, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => onAskLumen(prompt)}
              className="lumen-prompt-chip"
            >
              <span>{prompt}</span>
              <span className="chip-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      <div className="property-section-divider" />

      {/* 4. Editorial Story / Description */}
      <section className="property-story-section">
        <h3 className="section-serif-heading">About this space</h3>
        <div className={`property-description-body ${isDescExpanded ? "expanded" : "clamped"}`}>
          {property.description.split("\n\n").map((para, idx) => (
            <p key={idx} className="property-description-p">{para}</p>
          ))}
        </div>

        {property.description.length > 280 && (
          <button
            type="button"
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className="btn-show-more-toggle"
          >
            {isDescExpanded ? "Show less ↑" : "Show more details ↓"}
          </button>
        )}
      </section>

      <div className="property-section-divider" />

      {/* 5. "Where you'll sleep" Room Explorer */}
      {property.rooms && property.rooms.length > 0 && (
        <>
          <section className="property-rooms-section">
            <h3 className="section-serif-heading">Where you'll sleep</h3>
            <div className="rooms-cards-grid">
              {property.rooms.map((room) => (
                <div key={room.id} className="room-sleep-card">
                  {room.imageUrl ? (
                    <img src={room.imageUrl} alt={room.roomName} className="room-card-img" />
                  ) : (
                    <div className="room-card-img-placeholder">
                      <span>🛏️</span>
                    </div>
                  )}
                  <div className="room-card-content">
                    <h4 className="room-card-title">{room.roomName}</h4>
                    <p className="room-bed-type">{room.bedType}</p>
                    {room.description && (
                      <p className="room-card-sub">{room.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <div className="property-section-divider" />
        </>
      )}

      {/* 6. Luxury Amenities Showcase */}
      {hasAmenities && (
        <>
          <section className="property-amenities-section">
            <h3 className="section-serif-heading">What this place offers</h3>
            <div className="amenities-highlights-grid">
              {property.amenities.slice(0, 8).map((am) => (
                <div key={am.id} className="amenity-highlight-row">
                  <span className="amenity-check">✦</span>
                  <div className="amenity-info">
                    <span className="amenity-title">{am.name}</span>
                    {am.description && (
                      <span className="amenity-sub">{am.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {property.amenities.length > 8 && (
              <button
                type="button"
                onClick={onOpenAmenities}
                className="btn-show-all-amenities"
              >
                Show all {property.amenities.length} amenities
              </button>
            )}
          </section>
          <div className="property-section-divider" />
        </>
      )}

      {/* 7. Verified Guest Reviews Matrix */}
      <section ref={reviewsRef} className="property-reviews-section">
        <div className="reviews-hero-header">
          <div className="reviews-score-block">
            <span className="star-gold-large">★</span>
            <span className="reviews-big-number">
              {property.reviewSummary.totalReviews > 0
                ? property.reviewSummary.avgRating.toFixed(2)
                : "New"}
            </span>
          </div>
          <div className="reviews-title-block">
            <h3 className="section-serif-heading">
              {property.reviewSummary.totalReviews > 0 ? "Guest Reviews" : "No Reviews Yet"}
            </h3>
            <p className="reviews-summary-sub">
              {property.reviewSummary.totalReviews > 0
                ? `Based on ${property.reviewSummary.totalReviews} verified guest review${property.reviewSummary.totalReviews > 1 ? "s" : ""}.`
                : "Be one of the first guests to experience this sanctuary."}
            </p>
          </div>
        </div>

        {/* 6 Sub-Category Ratings Matrix (only when reviews exist) */}
        {hasReviews && (
          <div className="review-subratings-grid">
            {[
              { label: "Cleanliness", score: property.reviewSummary.cleanliness },
              { label: "Accuracy", score: property.reviewSummary.accuracy },
              { label: "Communication", score: property.reviewSummary.communication },
              { label: "Location", score: property.reviewSummary.location },
              { label: "Check-in", score: property.reviewSummary.checkIn },
              { label: "Value", score: property.reviewSummary.value },
            ].map((cat, idx) => (
              <div key={idx} className="subrating-bar-row">
                <span className="subrating-label">{cat.label}</span>
                <div className="subrating-bar-track">
                  <div
                    className="subrating-bar-fill"
                    style={{ width: `${(cat.score / 5) * 100}%` }}
                  />
                </div>
                <span className="subrating-score">{cat.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reviews Cards List */}
        {hasReviews ? (
          <div className="reviews-cards-container">
            {property.reviews.map((rev) => (
              <div key={rev.id} className="review-item-card">
                <div className="reviewer-header">
                  <img src={rev.authorAvatar} alt={rev.authorName} className="reviewer-avatar" />
                  <div className="reviewer-meta">
                    <h5 className="reviewer-name">{rev.authorName}</h5>
                    <span className="reviewer-sub">
                      {rev.authorCountry} · {rev.stayDate}
                    </span>
                  </div>
                </div>

                <div className="reviewer-rating-stars">
                  {"★".repeat(Math.max(1, Math.min(5, rev.rating)))}
                </div>

                <p className="review-body-text">{rev.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="reviews-empty-banner">
            <p>No written reviews yet for this listing. Reserve and leave the first verified rating!</p>
          </div>
        )}
      </section>

      <div className="property-section-divider" />

      {/* 8. Location Map & Curated Landmarks */}
      <section ref={mapRef} className="property-location-section">
        <h3 className="section-serif-heading">Where you'll be</h3>
        <p className="location-sub-address">{property.address.formattedAddress}</p>

        <div className="property-map-preview-card">
          <div className="map-mock-bg">
            <div className="map-pin-pulse">
              <div className="pin-inner">✦ {property.title.slice(0, 24)}</div>
            </div>
          </div>
        </div>

        {property.nearbyLandmarks && property.nearbyLandmarks.length > 0 && (
          <div className="nearby-landmarks-block">
            <h4 className="landmarks-title">Getting around {property.address.city || "the area"}</h4>
            <div className="landmarks-grid">
              {property.nearbyLandmarks.map((lm, idx) => (
                <div key={idx} className="landmark-item-row">
                  <span className="landmark-icon">
                    {lm.type === "BEACH" ? "🏖️" : lm.type === "AIRPORT" ? "✈️" : lm.type === "DINING" ? "🍷" : "🏛️"}
                  </span>
                  <div className="landmark-details">
                    <span className="landmark-name">{lm.name}</span>
                    <span className="landmark-travel">{lm.travelTime} ({lm.distance})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="property-section-divider" />

      {/* 9. House Rules & Policies */}
      <section className="property-rules-section">
        <h3 className="section-serif-heading">Things to know</h3>
        <div className="rules-columns-grid">
          <div className="rules-column">
            <h4 className="rules-col-title">House Rules</h4>
            <ul className="rules-list">
              <li>🕒 Check-in: {property.houseRules.checkInTime}</li>
              <li>🕚 Check-out: {property.houseRules.checkOutTime}</li>
              <li>🔑 {property.houseRules.selfCheckInMethod || "Self check-in"}</li>
              <li>🚭 Smoking {property.houseRules.smokingAllowed ? "allowed" : "strictly prohibited"}</li>
              <li>🐾 Pets {property.houseRules.petsAllowed ? "welcome" : "not allowed"}</li>
            </ul>
          </div>

          <div className="rules-column">
            <h4 className="rules-col-title">Safety & Property</h4>
            <ul className="rules-list">
              <li>🛡️ Carbon monoxide & smoke detectors installed</li>
              <li>🔇 Quiet hours: {property.houseRules.quietHours || "10:00 PM – 8:00 AM"}</li>
              <li>👥 Max guests: {property.maxGuests} allowed</li>
            </ul>
          </div>

          <div className="rules-column">
            <h4 className="rules-col-title">Cancellation Policy</h4>
            <p className="cancellation-desc">
              <strong>{property.cancellationPolicy} Policy:</strong>{" "}
              {property.cancellationPolicy === "FLEXIBLE"
                ? "Full refund up to 24 hours before check-in."
                : property.cancellationPolicy === "MODERATE"
                ? "Full refund up to 5 days before check-in."
                : "Full refund up to 14 days before check-in."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
