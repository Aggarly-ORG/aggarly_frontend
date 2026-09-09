"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { PropertyAmenity } from "../../lib/propertyTypes";

interface AmenitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  amenities: PropertyAmenity[];
}

export const AmenitiesModal: React.FC<AmenitiesModalProps> = ({
  isOpen,
  onClose,
  amenities,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  const filtered = amenities.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categories = [
    { key: "LUXURY", label: "Luxury & Scenic Views" },
    { key: "WORKSPACE", label: "Remote Work & High-Speed Internet" },
    { key: "KITCHEN", label: "Chef's Kitchen & Dining" },
    { key: "ESSENTIALS", label: "Bedroom & Laundry Essentials" },
    { key: "OUTDOOR", label: "Outdoor & Garden" },
    { key: "SAFETY", label: "Home Safety & Access" },
  ];

  return createPortal(
    <div className="amenities-modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="amenities-modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="amenities-modal-header">
          <button
            type="button"
            onClick={onClose}
            className="amenities-close-btn"
            title="Close amenities (Esc)"
          >
            ✕
          </button>
          <h3 className="amenities-modal-title">What this place offers</h3>
          <div style={{ width: "32px" }} />
        </div>

        {/* Search input */}
        <div className="amenities-search-wrap">
          <input
            type="text"
            placeholder="Search amenities (e.g. pool, wifi, kitchen)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="amenities-search-input"
          />
        </div>

        <div className="amenities-modal-body">
          {categories.map((cat) => {
            const catAmenities = filtered.filter((a) => a.category === cat.key);
            if (catAmenities.length === 0) return null;

            return (
              <div key={cat.key} className="amenities-category-block">
                <h4 className="amenities-category-heading">{cat.label}</h4>
                <div className="amenities-list-grid">
                  {catAmenities.map((item) => (
                    <div key={item.id} className="amenity-detail-row">
                      <span className="amenity-check-icon">✓</span>
                      <div className="amenity-text-wrap">
                        <span className="amenity-name-bold">{item.name}</span>
                        {item.description && (
                          <p className="amenity-desc-sub">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="amenities-empty-state">
              <p>No amenities matching "{searchTerm}".</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
