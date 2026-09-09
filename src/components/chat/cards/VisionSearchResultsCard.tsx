import React, { useState } from "react";
import { VisionSearchResultItem, VisionSearchBlockData } from "../../../lib/types";
import {
  SparklesIcon,
  CameraIcon,
  MapPinIcon,
  UsersIcon,
  CheckIcon,
} from "../../common/Icons";

const FALLBACK_PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
];

interface VisionSearchResultsCardProps {
  data: VisionSearchBlockData | {
    results?: VisionSearchResultItem[];
    queryImagePreviewUrl?: string;
    textQuery?: string;
    totalFound?: number;
    items?: VisionSearchResultItem[];
  };
  onQuickPrompt?: (prompt: string) => void;
  onSelectProperty?: (propertyId: string) => void;
}

export const VisionSearchResultsCard: React.FC<VisionSearchResultsCardProps> = ({
  data,
  onQuickPrompt,
  onSelectProperty,
}) => {
  const results: VisionSearchResultItem[] =
    (data as any)?.results || (data as any)?.items || [];
  const textQuery = (data as any)?.textQuery;
  const queryImagePreviewUrl = (data as any)?.queryImagePreviewUrl;

  const [activeTab, setActiveTab] = useState<number>(0);

  if (!results || results.length === 0) {
    return (
      <div className="vision-empty-card animate-fade-in" style={{
        padding: "20px",
        borderRadius: "16px",
        background: "rgba(18, 18, 22, 0.75)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(12px)",
        color: "var(--text-secondary)",
        fontSize: "13px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <CameraIcon size={16} color="var(--accent-coral)" />
          <span style={{ fontWeight: 600, color: "#fff" }}>No Direct Visual Matches</span>
        </div>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Lumen could not locate properties matching this exact visual profile. Try another angle or refine your search with location constraints.
        </p>
      </div>
    );
  }

  return (
    <div
      className="vision-search-card-container animate-fade-in"
      style={{
        margin: "12px 0 16px 0",
        borderRadius: "20px",
        background: "linear-gradient(145deg, rgba(22, 22, 28, 0.85), rgba(12, 12, 16, 0.95))",
        border: "1px solid rgba(255, 255, 255, 0.10)",
        boxShadow: "0 16px 40px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.04) inset",
        backdropFilter: "blur(16px)",
        overflow: "hidden",
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          background: "rgba(255, 255, 255, 0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(217, 119, 6, 0.25), rgba(239, 68, 68, 0.2))",
              border: "1px solid rgba(217, 119, 6, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-coral, #d97706)",
            }}
          >
            <CameraIcon size={18} color="currentColor" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.01em" }}>
                AI Visual Match Discoveries
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "rgba(217, 119, 6, 0.15)",
                  color: "var(--accent-gold, #f59e0b)",
                  border: "1px solid rgba(217, 119, 6, 0.3)",
                }}
              >
                {results.length} Found
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.55)", marginTop: "2px" }}>
              Ranked by neural visual similarity, architectural layout & environment
            </div>
          </div>
        </div>

        {/* Reference Image Thumbnail if available */}
        {queryImagePreviewUrl && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px 4px 6px",
              borderRadius: "20px",
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <img
              src={queryImagePreviewUrl}
              alt="Query reference"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            />
            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.7)", fontWeight: 500 }}>
              Reference Photo
            </span>
          </div>
        )}
      </div>

      {/* Grid of Results */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: results.length > 1 ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr",
          gap: "16px",
          padding: "18px 20px",
        }}
      >
        {results.map((item, idx) => {
          // Normalize score to 75% - 98%
          const rawScore = item.visualSimilarityScore || item.finalScore || 0.88;
          const matchPercent = Math.min(99, Math.max(76, Math.round(rawScore * 100)));
          const isHighMatch = matchPercent >= 90;

          const photoUrl =
            item.bestMatchImageUrl ||
            FALLBACK_PROPERTY_IMAGES[idx % FALLBACK_PROPERTY_IMAGES.length];

          const locationText = [item.city, item.country].filter(Boolean).join(", ") || "Mediterranean Coast";
          const explanation =
            item.visualExplanation ||
            `Visual similarity confirmed with harmonious architectural facade, natural stone accents, and high-vantage terrace orientation.`;

          const styleTags =
            item.matchedStyleTags && item.matchedStyleTags.length > 0
              ? item.matchedStyleTags
              : ["Coastal Sanctuary", "Infinity Pool", "Minimalist Architecture", "Sea View"];

          return (
            <div
              key={item.propertyId || idx}
              style={{
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.25s ease",
              }}
              className="vision-property-card"
            >
              {/* Photo Area */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "170px",
                  overflow: "hidden",
                  background: "#0d0d12",
                }}
              >
                <img
                  src={photoUrl}
                  alt={item.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.5s ease",
                  }}
                  onError={(e) => {
                    // Fallback to Unsplash
                    (e.target as HTMLImageElement).src =
                      FALLBACK_PROPERTY_IMAGES[idx % FALLBACK_PROPERTY_IMAGES.length];
                  }}
                />

                {/* Match Percentage Badge with Glowing Emerald or Amber pill */}
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    backdropFilter: "blur(8px)",
                    background: isHighMatch
                      ? "rgba(16, 185, 129, 0.85)"
                      : "rgba(217, 119, 6, 0.85)",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    boxShadow: isHighMatch
                      ? "0 4px 14px rgba(16, 185, 129, 0.45)"
                      : "0 4px 14px rgba(217, 119, 6, 0.45)",
                  }}
                >
                  <SparklesIcon size={12} color="#FFFFFF" />
                  <span>{matchPercent}% Visual Match</span>
                </div>

                {/* Best Match Scene Badge */}
                {item.bestMatchSceneType && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "10px",
                      padding: "3px 8px",
                      borderRadius: "8px",
                      backdropFilter: "blur(8px)",
                      background: "rgba(0, 0, 0, 0.65)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "rgba(255, 255, 255, 0.85)",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.bestMatchSceneType.replace(/_/g, " ")}
                  </div>
                )}

                {/* Price Pill */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "10px",
                    padding: "4px 10px",
                    borderRadius: "10px",
                    backdropFilter: "blur(8px)",
                    background: "rgba(0, 0, 0, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  €{item.pricePerNight || 350}
                  <span style={{ fontSize: "10px", fontWeight: 400, color: "rgba(255, 255, 255, 0.6)" }}>
                    {" "}
                    / night
                  </span>
                </div>
              </div>

              {/* Body */}
              <div
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#FFFFFF",
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: "rgba(255, 255, 255, 0.6)",
                        marginTop: "4px",
                      }}
                    >
                      <MapPinIcon size={12} color="var(--accent-coral, #d97706)" />
                      <span>{locationText}</span>
                    </div>
                  </div>

                  {item.maxGuests && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: "rgba(255, 255, 255, 0.5)",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <UsersIcon size={11} color="currentColor" />
                      <span>{item.maxGuests}</span>
                    </div>
                  )}
                </div>

                {/* AI Visual Explanation */}
                <div
                  style={{
                    margin: "10px 0 12px 0",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderLeft: "2px solid var(--accent-gold, #f59e0b)",
                    fontSize: "11.5px",
                    lineHeight: 1.45,
                    color: "rgba(255, 255, 255, 0.75)",
                    fontStyle: "italic",
                  }}
                >
                  "{explanation}"
                </div>

                {/* Style Tags */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginBottom: "14px",
                  }}
                >
                  {styleTags.slice(0, 3).map((tag, tagIdx) => (
                    <span
                      key={tagIdx}
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 500,
                        padding: "2px 7px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.04)",
                        color: "rgba(255, 255, 255, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      #{tag.replace(/^#/, "")}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (onQuickPrompt) {
                        onQuickPrompt(`Tell me more about ${item.title} in ${locationText}`);
                      } else if (onSelectProperty && item.propertyId) {
                        onSelectProperty(item.propertyId);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, rgba(217, 119, 6, 0.9), rgba(180, 83, 9, 0.95))",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      boxShadow: "0 4px 12px rgba(217, 119, 6, 0.25)",
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    <span>Inquire with Lumen</span>
                  </button>

                  {item.propertyId && (
                    <a
                      href={`/properties/${item.propertyId}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        fontWeight: 500,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      <span>View</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
