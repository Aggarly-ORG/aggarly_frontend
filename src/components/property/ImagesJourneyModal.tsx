"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PropertyImageTourItem } from "../../lib/propertyTypes";
import { HeartIcon } from "../common/Icons";

interface ImagesJourneyModalProps {
  isOpen: boolean;
  images: PropertyImageTourItem[];
  initialIndex?: number;
  onClose: () => void;
  propertyTitle: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All Photos",
  LIVING: "Living & Lounge",
  BEDROOM: "Bedrooms & Suites",
  KITCHEN: "Kitchen & Dining",
  OUTDOOR: "Terrace & Outdoor",
  BATHROOM: "Spa & Bathrooms",
  VIEW: "Scenic Views",
};

export const ImagesJourneyModal: React.FC<ImagesJourneyModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
  propertyTitle,
}) => {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [isSaved, setIsSaved] = useState(false);
  const thumbnailRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  // Derive dynamic category tabs from actual images
  const categoryCounts = images.reduce<Record<string, number>>((acc, img) => {
    const cat = img.roomCategory || "ALL";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const dynamicTabs: Array<{ key: string; label: string; count: number }> = [
    { key: "ALL", label: "All Photos", count: images.length },
  ];

  Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
    if (key !== "ALL" && categoryCounts[key] && categoryCounts[key] > 0) {
      dynamicTabs.push({ key, label, count: categoryCounts[key] });
    }
  });

  // Filter images based on active tab
  const filteredImages = activeCategory === "ALL"
    ? images
    : images.filter((img) => img.roomCategory === activeCategory);

  const activeImage = filteredImages[currentIndex] || filteredImages[0] || images[0];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, filteredImages.length]);

  const handleNext = () => {
    if (filteredImages.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % filteredImages.length);
  };

  const handlePrev = () => {
    if (filteredImages.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
  };

  const handleSelectTab = (tabKey: string) => {
    setActiveCategory(tabKey);
    setCurrentIndex(0);
  };

  if (!isOpen || !mounted || typeof document === "undefined" || images.length === 0) {
    return null;
  }

  return createPortal(
    <div className="images-journey-overlay animate-fade-in" role="dialog" aria-modal="true">
      {/* 1. Dark Stage Top Navigation Bar */}
      <div className="journey-top-bar">
        <div className="journey-top-left">
          <button
            type="button"
            onClick={onClose}
            className="journey-close-btn"
            title="Close Spatial Tour (Esc)"
          >
            <span className="close-x">✕</span>
            <span className="close-label">Close</span>
          </button>
        </div>

        {/* Center: Dynamic Category Tabs Rail */}
        <div className="journey-tabs-rail">
          {dynamicTabs.map((tab) => {
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleSelectTab(tab.key)}
                className={`journey-tab-chip ${isActive ? "active-journey-tab" : ""}`}
              >
                <span>{tab.label}</span>
                <span className="journey-tab-count">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Right: Counter & Actions */}
        <div className="journey-top-right">
          <span className="journey-counter-pill">
            {filteredImages.length > 0 ? `${currentIndex + 1} / ${filteredImages.length}` : "0 / 0"}
          </span>

          <button
            type="button"
            onClick={() => setIsSaved(!isSaved)}
            className={`journey-icon-btn ${isSaved ? "is-saved" : ""}`}
            title={isSaved ? "Saved" : "Save to Wishlist"}
          >
            <HeartIcon size={16} filled={isSaved} color={isSaved ? "var(--accent-coral)" : "#ffffff"} />
          </button>
        </div>
      </div>

      {/* 2. Center Cinematic Stage */}
      <div className="journey-main-stage">
        {/* Previous Chevron Button */}
        {filteredImages.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="journey-nav-arrow arrow-left"
            title="Previous Photo (Left Arrow)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}

        {/* Main Photograph */}
        <div className="journey-photo-viewport">
          {activeImage && (
            <img
              key={activeImage.id || currentIndex}
              src={activeImage.url}
              alt={activeImage.caption || `${propertyTitle} photo`}
              className="journey-hero-image"
            />
          )}

          {/* Caption & AI Spatial Metadata Overlay */}
          {activeImage && (
            <div className="journey-caption-glass">
              <div className="journey-caption-main">
                {activeImage.roomCategory && activeImage.roomCategory !== "ALL" && (
                  <span className="journey-room-pill">{CATEGORY_LABELS[activeImage.roomCategory] || activeImage.roomCategory}</span>
                )}
                <p className="journey-caption-text">{activeImage.caption || propertyTitle}</p>
              </div>

              {(activeImage.aiLighting || (activeImage.aiSpatialTags && activeImage.aiSpatialTags.length > 0)) && (
                <div className="journey-ai-meta-strip">
                  {activeImage.aiLighting && (
                    <span className="journey-ai-tag">
                      ☀️ {activeImage.aiLighting}
                    </span>
                  )}
                  {activeImage.aiSpatialTags?.map((tag, tIdx) => (
                    <span key={tIdx} className="journey-ai-tag">
                      ✦ {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Next Chevron Button */}
        {filteredImages.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="journey-nav-arrow arrow-right"
            title="Next Photo (Right Arrow)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* 3. Bottom Filmstrip Thumbnail Rail */}
      {filteredImages.length > 1 && (
        <div className="journey-filmstrip-container">
          <div className="journey-filmstrip-rail" ref={thumbnailRailRef}>
            {filteredImages.map((img, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`journey-thumb-item ${isSelected ? "selected-thumb" : ""}`}
                  title={img.caption || `Photo ${idx + 1}`}
                >
                  <img src={img.url} alt={`Thumbnail ${idx + 1}`} className="journey-thumb-img" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
