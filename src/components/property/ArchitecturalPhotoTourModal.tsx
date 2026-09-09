"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { PropertyDetail, PropertyImageTourItem } from "../../lib/propertyTypes";
import { LonaHeader } from "../common/LonaHeader";
import { LonaFooter } from "../common/LonaFooter";
import { WishlistClient } from "../../lib/wishlistClient";

export interface ArchitecturalPhotoTourModalProps {
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
  property: PropertyDetail;
  isSaved?: boolean;
  onToggleSave?: () => Promise<void> | void;
}

const CATEGORY_NAMES: Record<string, string> = {
  ALL: "ALL PHOTOS",
  OUTDOOR: "POOL & SEA TERRACE",
  LIVING: "LIVING & SALON",
  BEDROOM: "SUITES & BEDROOMS",
  KITCHEN: "KITCHEN & DINING",
  BATHROOM: "SPA & BATHS",
  VIEW: "SCENIC VISTAS",
  COURTYARD: "COURTYARD & GROVE",
};

interface ExhibitionPlate {
  id: string | number;
  originalIndex: number;
  url: string;
  plateNumber: string;
  plateTitle: string;
  shortLabel: string;
  narrative: string;
  category: string;
  categoryLabel: string;
  opticalMeta: string;
}

export const ArchitecturalPhotoTourModal: React.FC<ArchitecturalPhotoTourModalProps> = ({
  isOpen,
  initialIndex = 0,
  onClose,
  property,
  isSaved: isSavedProp,
  onToggleSave,
}) => {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"full" | "split">("full");
  const [isSaved, setIsSaved] = useState<boolean>(isSavedProp ?? false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync initial index
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setSelectedCategory("ALL");
    }
  }, [isOpen, initialIndex]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Sync saved state with prop or load from backend Wishlist API
  useEffect(() => {
    if (typeof isSavedProp === "boolean") {
      setIsSaved(isSavedProp);
      return;
    }
    if (!isOpen || !property?.id) return;
    let isMounted = true;
    WishlistClient.isSaved(property.id).then((saved) => {
      if (isMounted) setIsSaved(saved);
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, property?.id, isSavedProp]);

  // Format real address / location subtitle
  const locationSubtitle = useMemo(() => {
    const parts = [property?.address?.city, property?.address?.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Private Sanctuary";
  }, [property]);

  // Build real exhibition plates strictly from property.images
  const plates: ExhibitionPlate[] = useMemo(() => {
    if (!property?.images || property.images.length === 0) {
      return [];
    }

    return property.images.map((img: PropertyImageTourItem, idx: number) => {
      const numStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
      const rawCategory = (img.roomCategory || "ALL").toUpperCase();
      const categoryLabel = CATEGORY_NAMES[rawCategory] || rawCategory;

      // Extract real title from caption or room category
      let title = img.caption ? img.caption.toUpperCase() : categoryLabel;
      // Derive short label for filmstrip thumbnail
      const shortLabel = img.caption
        ? img.caption.length > 18
          ? img.caption.slice(0, 16) + "…"
          : img.caption
        : categoryLabel;

      // Real narrative description
      const narrative =
        img.caption ||
        property.description ||
        "Curated architectural perspective capturing the spatial harmony, ambient illumination, and materiality of the residence.";

      // Real metadata without mock gear
      let opticalMeta = "";
      if (img.aiLighting) {
        opticalMeta = img.aiLighting.toUpperCase();
      } else if (img.aiSpatialTags && img.aiSpatialTags.length > 0) {
        opticalMeta = img.aiSpatialTags.join(" • ").toUpperCase();
      } else {
        opticalMeta = `ARCHITECTURAL ARCHIVE • CURATED PERSPECTIVE • ${property.propertyType || "SANCTUARY"}`;
      }

      return {
        id: img.id || idx,
        originalIndex: idx,
        url: img.url,
        plateNumber: numStr,
        plateTitle: title,
        shortLabel,
        narrative,
        category: rawCategory,
        categoryLabel,
        opticalMeta,
      };
    });
  }, [property]);

  // Dynamic Category Filters with Counts
  const categoryFilters = useMemo(() => {
    const counts: Record<string, number> = {};
    plates.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const list: Array<{ key: string; label: string; count: number }> = [
      { key: "ALL", label: `ALL PHOTOS (${plates.length})`, count: plates.length },
    ];

    Object.entries(counts).forEach(([catKey, count]) => {
      if (catKey !== "ALL") {
        const displayLabel = CATEGORY_NAMES[catKey] || `${catKey} (${count})`;
        list.push({
          key: catKey,
          label: `${displayLabel} (${count})`,
          count,
        });
      }
    });

    return list;
  }, [plates]);

  // Filtered plates for current tab
  const filteredPlates = useMemo(() => {
    if (selectedCategory === "ALL") return plates;
    return plates.filter((p) => p.category === selectedCategory);
  }, [plates, selectedCategory]);

  // Index within the currently active category array
  const currentFilteredIndex = useMemo(() => {
    if (filteredPlates.length === 0) return 0;
    const idx = filteredPlates.findIndex((p) => p.originalIndex === currentIndex);
    return idx !== -1 ? idx : 0;
  }, [filteredPlates, currentIndex]);

  // Active plate strictly belonging to the filtered category (with fallback)
  const activePlate = useMemo(() => {
    if (filteredPlates.length === 0) return plates[0];
    const found = filteredPlates.find((p) => p.originalIndex === currentIndex);
    return found || filteredPlates[0];
  }, [filteredPlates, currentIndex, plates]);

  // Next plate in the active category for split view
  const nextPlate = useMemo(() => {
    if (filteredPlates.length <= 1) return activePlate;
    const nextIdx = (currentFilteredIndex + 1) % filteredPlates.length;
    return filteredPlates[nextIdx];
  }, [filteredPlates, currentFilteredIndex, activePlate]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [currentIndex]);

  const handleNext = () => {
    if (filteredPlates.length <= 1) return;
    const nextIdx = (currentFilteredIndex + 1) % filteredPlates.length;
    setCurrentIndex(filteredPlates[nextIdx].originalIndex);
  };

  const handlePrev = () => {
    if (filteredPlates.length <= 1) return;
    const prevIdx = (currentFilteredIndex - 1 + filteredPlates.length) % filteredPlates.length;
    setCurrentIndex(filteredPlates[prevIdx].originalIndex);
  };

  // Keyboard navigation within active category
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
  }, [isOpen, filteredPlates, currentFilteredIndex]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleToggleSave = async () => {
    if (!property?.id) return;
    if (onToggleSave) {
      await onToggleSave();
      return;
    }
    const previousState = isSaved;
    setIsSaved(!previousState); // optimistic update
    showToast(!previousState ? "Saved to wishlists" : "Removed from wishlists");
    try {
      const confirmedState = await WishlistClient.toggleSave(property.id, previousState);
      setIsSaved(confirmedState);
    } catch {
      setIsSaved(previousState); // rollback on error
      showToast("Unable to update wishlists");
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast("Exhibition link copied to clipboard");
    }
  };

  const handleDownload = () => {
    if (!activePlate?.url) return;
    const link = document.createElement("a");
    link.href = activePlate.url;
    link.download = `${property.title || "retreat"}-plate-${activePlate.plateNumber}.jpg`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Opening high-resolution plate");
  };

  const handleSelectCategory = (catKey: string) => {
    setSelectedCategory(catKey);
    const targetPlates = catKey === "ALL" ? plates : plates.filter((p) => p.category === catKey);
    if (targetPlates.length > 0) {
      const alreadyInTarget = targetPlates.find((p) => p.originalIndex === currentIndex);
      if (!alreadyInTarget) {
        setCurrentIndex(targetPlates[0].originalIndex);
      }
    }
  };

  if (!isOpen || !mounted || typeof document === "undefined" || plates.length === 0) {
    return null;
  }

  const totalCountStr = plates.length < 10 ? `0${plates.length}` : `${plates.length}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-[#EFEEEC] text-[#151415] min-h-screen flex flex-col justify-between overflow-y-auto antialiased animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* ────────────────────────────────────────────────────────── */}
      {/* GLOBAL LONA HEADER                                         */}
      {/* ────────────────────────────────────────────────────────── */}
      <LonaHeader />

      {/* ────────────────────────────────────────────────────────── */}
      {/* CURATORIAL EXHIBITION BAR                                  */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="relative z-30 w-full border-b border-[#DEDCD8] bg-[#EFEEEC]/90 backdrop-blur-md">
        <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Back Button */}
          <div className="w-full md:w-auto flex items-center justify-between md:justify-start">
            <button
              type="button"
              onClick={onClose}
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#DEDCD8] hover:border-[#151415]/40 bg-white hover:bg-[#E8E6E1] text-[#151415] transition-all shadow-sm cursor-pointer"
              id="closeTourBtn"
            >
              <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform text-[#151415]">
                west
              </span>
              <span className="text-[11px] uppercase tracking-[0.16em] font-medium">
                Back to Retreat
              </span>
            </button>
          </div>

          {/* Center: Property Exhibition Title & Location Subtitle */}
          <div className="text-center flex flex-col items-center">
            <h1 className="font-serif text-base sm:text-lg tracking-[0.18em] uppercase text-[#151415] font-normal">
              {property.title} — PHOTO TOUR &amp; ARCHITECTURAL GALLERY
            </h1>
            <p className="font-serif italic text-xs text-[#8A8884] tracking-wider mt-0.5">
              Aggarly by Lona • {locationSubtitle}
            </p>
          </div>

          {/* Right: View Mode Pill, Download, Share */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {/* View Mode Pill */}
            <div className="flex items-center bg-white border border-[#DEDCD8] rounded-full p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("full")}
                className={`px-3.5 py-1 rounded-full text-[10.5px] uppercase tracking-widest font-medium transition-all cursor-pointer ${
                  viewMode === "full"
                    ? "bg-[#151415] text-white shadow"
                    : "text-[#8A8884] hover:text-[#151415]"
                }`}
              >
                Full View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-3.5 py-1 rounded-full text-[10.5px] uppercase tracking-widest font-medium transition-all cursor-pointer ${
                  viewMode === "split"
                    ? "bg-[#151415] text-white shadow"
                    : "text-[#8A8884] hover:text-[#151415]"
                }`}
              >
                Split View
              </button>
            </div>

            {/* Download Photo Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-full bg-white hover:bg-[#E8E6E1] border border-[#DEDCD8] text-[#151415] transition-colors flex items-center justify-center shadow-sm cursor-pointer"
              title="Download High-Res Photo"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
            </button>

            {/* Save / Wishlist Heart Button */}
            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-2 rounded-full border transition-all flex items-center justify-center shadow-sm cursor-pointer ${
                isSaved
                  ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
                  : "bg-white hover:bg-[#E8E6E1] border-[#DEDCD8] text-[#151415]"
              }`}
              title={isSaved ? "Saved in wishlists" : "Save to wishlists"}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </span>
            </button>

            {/* Share Photo Button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-full bg-white hover:bg-[#E8E6E1] border border-[#DEDCD8] text-[#151415] transition-colors flex items-center justify-center shadow-sm cursor-pointer"
              title="Share Exhibition"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* MAIN DARKROOM EXHIBITION CANVAS                            */}
      {/* ────────────────────────────────────────────────────────── */}
      <main className="relative z-20 flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-4 flex flex-col justify-center">
        {/* Central Cinematic Exhibition Stage */}
        <div
          className="relative w-full aspect-[16/10] sm:aspect-[2.1/1] max-h-[66vh] min-h-[460px] rounded-2xl overflow-hidden bg-obsidian-base border border-hairline-on-dark shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] group select-none"
          id="stageViewport"
        >
          {/* MODE A: FULL VIEW */}
          {viewMode === "full" && (
            <div className="w-full h-full relative overflow-hidden transition-opacity duration-500">
              <img
                key={activePlate.url}
                src={activePlate.url}
                alt={activePlate.plateTitle}
                className="w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-[1.01]"
              />
              {/* Subtle Nocturnal Vignette Gradients */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-obsidian-base/95 via-obsidian-base/15 to-obsidian-base/50" />
            </div>
          )}

          {/* MODE B: SPLIT VIEW (ARCHITECTURAL DIPTYCH) */}
          {viewMode === "split" && (
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-obsidian-base">
              {/* Left Diptych: Plate A */}
              <div className="relative rounded-xl overflow-hidden group/split h-full bg-[#121215]">
                <img
                  src={activePlate.url}
                  alt={activePlate.plateTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-obsidian-base/85 border border-hairline-on-dark px-3 py-1 rounded backdrop-blur-md text-[10px] uppercase tracking-widest text-text-on-dark-primary font-mono">
                  [PLATE {activePlate.plateNumber}] • {activePlate.plateTitle}
                </div>
              </div>

              {/* Right Diptych: Plate B */}
              <div className="relative rounded-xl overflow-hidden group/split h-full bg-[#121215]">
                <img
                  src={nextPlate.url}
                  alt={nextPlate.plateTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-obsidian-base/85 border border-hairline-on-dark px-3 py-1 rounded backdrop-blur-md text-[10px] uppercase tracking-widest text-text-on-dark-primary font-mono">
                  [PLATE {nextPlate.plateNumber}] • {nextPlate.plateTitle}
                </div>
              </div>
            </div>
          )}

          {/* Left Navigation Chevron Button */}
          {filteredPlates.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Curated Plate"
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-obsidian-base/70 hover:bg-obsidian-elevated/95 border border-hairline-on-dark hover:border-white/40 text-text-on-dark-primary flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-300 hover:scale-105 group/arrow z-20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-[#C9CDD2] group-hover/arrow:text-white -translate-x-0.5 transition-colors">
                west
              </span>
            </button>
          )}

          {/* Right Navigation Chevron Button */}
          {filteredPlates.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Curated Plate"
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-obsidian-base/70 hover:bg-obsidian-elevated/95 border border-hairline-on-dark hover:border-white/40 text-text-on-dark-primary flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-300 hover:scale-105 group/arrow z-20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-[#C9CDD2] group-hover/arrow:text-white translate-x-0.5 transition-colors">
                east
              </span>
            </button>
          )}

          {/* Floating Dark Glass Caption Capsule */}
          <div className="absolute bottom-4 sm:bottom-6 left-4 right-4 sm:left-12 sm:right-12 max-w-4xl mx-auto pointer-events-auto z-20">
            <div className="px-6 py-4 rounded-xl bg-[#0A0A0C]/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col gap-2">
              {/* Row 1: Plate Number Badge • Title • Save CTA */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="font-mono text-[10px] tracking-widest text-[#0A0A0C] bg-[#EFEEEC] font-bold px-2.5 py-0.5 rounded shrink-0">
                    {selectedCategory !== "ALL"
                      ? `PHOTO ${currentFilteredIndex + 1} / ${filteredPlates.length} • PLATE ${activePlate.plateNumber}`
                      : `PLATE ${activePlate.plateNumber} / ${totalCountStr}`}
                  </span>
                  <span className="text-[#9A9A9F] text-xs">•</span>
                  <h2 className="font-serif text-sm sm:text-base tracking-widest uppercase text-[#F5F4F1] font-medium truncate">
                    {activePlate.plateTitle}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSave}
                  className={`transition-colors shrink-0 flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
                    isSaved ? "text-red-500 hover:text-red-400" : "text-[#C9CDD2] hover:text-white"
                  }`}
                  title={isSaved ? "Saved in wishlists" : "Save to wishlists"}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </span>
                  <span className="hidden sm:inline tracking-wider uppercase text-[10px]">
                    {isSaved ? "SAVED" : "SAVE"}
                  </span>
                </button>
              </div>

              {/* Row 2: Narrative Description */}
              <p className="font-serif italic text-xs sm:text-[13.5px] leading-relaxed text-[#C9CDD2] line-clamp-2">
                &ldquo;{activePlate.narrative}&rdquo;
              </p>

              {/* Row 3: Metadata Specifications & Location */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#9A9A9F] uppercase tracking-wider">
                <span className="truncate">{activePlate.opticalMeta}</span>
                <span className="hidden md:inline text-white/70">
                  {locationSubtitle.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* CURATED CHAPTER THUMBNAILS STRIP CARD                      */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="w-full mt-4 flex flex-col gap-3 bg-obsidian-base border border-hairline-on-dark rounded-2xl p-4 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {categoryFilters.map((tab) => {
              const isActive = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleSelectCategory(tab.key)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-wider transition-all font-medium shadow-sm cursor-pointer ${
                    isActive
                      ? "bg-white text-[#151415]"
                      : "bg-[#121215] hover:bg-[#18181B] text-[#9A9A9F] hover:text-white border border-hairline-on-dark"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filmstrip Gallery Rail */}
          <div className="overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-3 min-w-max">
              {filteredPlates.map((item) => {
                const isActive = item.originalIndex === currentIndex;
                return (
                  <button
                    key={item.id}
                    ref={isActive ? activeThumbRef : null}
                    type="button"
                    onClick={() => setCurrentIndex(item.originalIndex)}
                    className={`group relative w-28 sm:w-32 h-16 rounded-[8px] overflow-hidden shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? "ring-2 ring-white shadow-[0_0_22px_2px_rgba(220,230,239,0.35)] opacity-100 scale-[1.02] border-white"
                        : "border border-hairline-on-dark opacity-60 hover:opacity-100 hover:scale-[1.02]"
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.plateTitle}
                      className="w-full h-full object-cover brightness-85 group-hover:brightness-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base/80 to-transparent" />
                    <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-text-on-dark-primary">
                      {item.plateNumber} {item.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TOAST FEEDBACK ALERT                                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] px-5 py-2.5 rounded-full bg-[#151415]/95 text-white border border-white/20 shadow-2xl backdrop-blur-md text-xs font-mono tracking-wider animate-in fade-in slide-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* EDITORIAL DARKROOM FOOTER                                  */}
      {/* ────────────────────────────────────────────────────────── */}
      <LonaFooter />
    </div>,
    document.body
  );
};
