"use client";

import React, { useState } from "react";
import { PropertyImageTourItem } from "../../lib/propertyTypes";

interface PropertyHeroGalleryProps {
  images: PropertyImageTourItem[];
  onOpenTour: (initialIndex?: number) => void;
}

export const PropertyHeroGallery: React.FC<PropertyHeroGalleryProps> = ({
  images,
  onOpenTour,
}) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const validImages = images.filter((img) => img.url && !imageErrors[img.id]);
  const hasImages = validImages.length > 0;

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  // 1. Zero Images: Clean Fallback Hero
  if (!hasImages) {
    return (
      <section className="property-hero-gallery-container animate-fade-in">
        <div className="property-hero-empty-stage">
          <div className="empty-stage-inner">
            <span className="empty-stage-icon">🏛️</span>
            <h3 className="empty-stage-title">Architectural Sanctuary</h3>
            <p className="empty-stage-sub">Photos and spatial tour being curated for this property</p>
          </div>
        </div>
      </section>
    );
  }

  const coverImage = validImages[0];
  const secondaryImages = validImages.slice(1, 5);
  const totalCount = validImages.length;

  // 2. Single Image: Full Width Hero
  if (totalCount === 1) {
    return (
      <section className="property-hero-gallery-container animate-fade-in">
        <div
          className="property-bento-grid grid-single-image"
          onClick={() => onOpenTour(0)}
          role="button"
          tabIndex={0}
          title="Open Photo View (1 photo)"
        >
          <div className="bento-hero-main full-width-hero">
            <img
              src={coverImage.url}
              alt={coverImage.caption || "Property Cover Photo"}
              className="bento-img bento-img-cover"
              loading="eager"
              onError={() => handleImageError(coverImage.id)}
            />
            <div className="bento-hover-overlay">
              <span className="bento-expand-indicator">⛶ View High-Res Photo</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenTour(0)}
          className="bento-tour-trigger-pill"
          title="Open Spatial View"
        >
          <span>1 photo</span>
          <span className="tour-badge-pill">View</span>
        </button>
      </section>
    );
  }

  // 3. Multi-Image: Dynamic Bento Grid (2 to 5+ photos)
  const gridClass =
    totalCount === 2
      ? "grid-two-images"
      : totalCount === 3
      ? "grid-three-images"
      : totalCount === 4
      ? "grid-four-images"
      : "grid-standard-bento";

  return (
    <section className="property-hero-gallery-container animate-fade-in">
      <div className={`property-bento-grid ${gridClass}`}>
        {/* Large Cover Hero (Left Column) */}
        <div
          className="bento-hero-main"
          onClick={() => onOpenTour(0)}
          role="button"
          tabIndex={0}
          title="Open Images Journey (Cover Photo)"
        >
          <img
            src={coverImage.url}
            alt={coverImage.caption || "Property Cover Photo"}
            className="bento-img bento-img-cover"
            loading="eager"
            onError={() => handleImageError(coverImage.id)}
          />
          <div className="bento-hover-overlay">
            <span className="bento-expand-indicator">⛶ Explore Cover</span>
          </div>
        </div>

        {/* Dynamic Secondary Grid Photos (Right Column) */}
        {secondaryImages.length > 0 && (
          <div className={`bento-sub-grid sub-grid-count-${secondaryImages.length}`}>
            {secondaryImages.map((img, idx) => (
              <div
                key={img.id || idx}
                className={`bento-sub-item bento-sub-item-${idx}`}
                onClick={() => onOpenTour(idx + 1)}
                role="button"
                tabIndex={0}
                title={`View ${img.caption || `Photo ${idx + 2}`}`}
              >
                <img
                  src={img.url}
                  alt={img.caption || `Property Photo ${idx + 2}`}
                  className="bento-img"
                  loading="lazy"
                  onError={() => handleImageError(img.id)}
                />
                <div className="bento-hover-overlay">
                  <span className="bento-expand-indicator">⛶ Expand</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Spatial Tour Action Pill */}
      <button
        type="button"
        onClick={() => onOpenTour(0)}
        className="bento-tour-trigger-pill"
        title="Open Full Architectural Images Journey"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span>Show all {totalCount} photos</span>
        <span className="tour-badge-pill">Spatial Tour</span>
      </button>
    </section>
  );
};
