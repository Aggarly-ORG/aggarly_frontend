import React, { useState } from "react";
import { PrivateChefExperienceData } from "../../../lib/types";
import { SparklesIcon, CheckIcon } from "../../common/Icons";

interface PrivateChefExperienceCardProps {
  data: PrivateChefExperienceData;
  onConfirmChef?: (selectedOptions: string[]) => void;
}

export const PrivateChefExperienceCard: React.FC<PrivateChefExperienceCardProps> = ({
  data,
  onConfirmChef,
}) => {
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(data.status === "CONFIRMED");

  const toggleOption = (opt: string) => {
    setSelectedDietary((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
    if (onConfirmChef) onConfirmChef(selectedDietary);
  };

  return (
    <div className="private-chef-card animate-fade-in">
      {/* Chef Profile Header */}
      <div className="chef-header-row">
        <img
          src={data.chefAvatar}
          alt={data.chefName}
          className="chef-avatar"
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <h4 className="chef-name">{data.chefName}</h4>
            <span className="chef-title-tag">{data.chefTitle}</span>
          </div>
          <p className="chef-exp-title">{data.experienceTitle}</p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="numeral-gold" style={{ fontSize: "18px" }}>
            {data.currency}
            {data.price}
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--text-tertiary)" }}>
            For {data.guestCount} guests
          </div>
        </div>
      </div>

      <p className="chef-desc">{data.description}</p>

      {/* Menu Courses */}
      <div className="chef-menu-box">
        <div className="menu-box-header">Curated 4-Course Coastal Menu</div>
        <div className="menu-courses-list">
          {data.menuCourses.map((c, idx) => (
            <div key={idx} className="menu-course-row">
              <span className="course-label">{c.course}</span>
              <span className="dish-name">{c.dish}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dietary & Customization Checkboxes */}
      {!isConfirmed ? (
        <>
          <div className="dietary-options-box">
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Tailor Ingredients:
            </span>
            <div className="dietary-chips-row">
              {data.dietaryOptions.map((opt, idx) => {
                const isSelected = selectedDietary.includes(opt);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className={`dietary-chip ${isSelected ? "active" : ""}`}
                  >
                    {isSelected && <CheckIcon size={12} color="currentColor" />}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: "14px" }}>
            <button onClick={handleConfirm} className="btn-confirm-action">
              <SparklesIcon size={15} color="#FFFFFF" />
              <span>Confirm Arrival Night Banquet (€{data.price})</span>
            </button>
          </div>
        </>
      ) : (
        <div className="payment-success-card" style={{ marginTop: "12px" }}>
          <div className="payment-success-badge">
            <CheckIcon size={14} color="#FFFFFF" />
          </div>
          <div style={{ fontSize: "12px", color: "var(--accent-sage)", fontWeight: 600 }}>
            Chef Marco arrival night booking confirmed & added to your stay itinerary.
          </div>
        </div>
      )}
    </div>
  );
};
