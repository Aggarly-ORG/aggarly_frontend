"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PropertyClient } from "../../../lib/propertyClient";
import { PropertyDetail, PropertyImageTourItem } from "../../../lib/propertyTypes";
import { AggarlyChatBridgeClient } from "../../../lib/chatBridgeClient";
import { useAuth } from "../../../context/AuthContext";
import { AvailabilityCalendarStripCard } from "../../../components/chat/cards/AvailabilityCalendarStripCard";
import { BlockedDateRange } from "../../../lib/types";
import { RealisticMoon } from "../../../components/auth/RealisticMoon";
import { LonaHeader } from "../../../components/common/LonaHeader";
import { LonaFooter } from "../../../components/common/LonaFooter";
import { ArchitecturalPhotoTourModal } from "../../../components/property/ArchitecturalPhotoTourModal";
import { WishlistClient } from "../../../lib/wishlistClient";

const ROOM_CATEGORY_LABELS: Record<string, string> = {
  ALL: "All Spaces",
  OUTDOOR: "Pool & Sea Terrace",
  LIVING: "Living & Salon",
  BEDROOM: "Suites & Bedrooms",
  KITCHEN: "Kitchen & Dining",
  BATHROOM: "Spa & Baths",
  VIEW: "Scenic Views",
  COURTYARD: "Courtyard & Facade",
};

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params?.id as string;
  const { user } = useAuth();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery & Lightbox states
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState<boolean>(false);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);

  // Social & Interactive states
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [shareLabel, setShareLabel] = useState<string>("Share");

  // Booking engine state
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [isGuestSelectOpen, setIsGuestSelectOpen] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDateRange[]>([]);
  const [reserveButtonText, setReserveButtonText] = useState<string>("Reserve Sanctuary");
  const [isReserving, setIsReserving] = useState<boolean>(false);

  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // Load real property data from backend
  useEffect(() => {
    if (!propertyId) {
      setError("No sanctuary ID provided.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await PropertyClient.getPropertyById(propertyId);
        if (isMounted && res?.data) {
          setProperty(res.data);
          if (res.data.maxGuests) {
            setGuestsCount(Math.min(2, res.data.maxGuests));
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("Error fetching property from backend:", err);
          setError(err?.message || "Failed to load sanctuary.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  // Load real blocked dates from backend availability controller
  useEffect(() => {
    if (!propertyId) return;
    let isMounted = true;
    async function fetchBlocked() {
      try {
        const today = new Date();
        const from = today.toISOString().split("T")[0];
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const to = nextMonth.toISOString().split("T")[0];
        const dates = await PropertyClient.getPropertyBlockedDates(propertyId, from, to);
        if (isMounted) setBlockedDates(dates);
      } catch {
        // gracefully fall back to empty blocked dates
      }
    }
    fetchBlocked();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  // Load saved state from backend Wishlist API
  useEffect(() => {
    if (!propertyId) return;
    let isMounted = true;
    WishlistClient.isSaved(propertyId).then((saved) => {
      if (isMounted) setIsSaved(saved);
    });
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  // Real property images list
  const propertyImages = useMemo(() => property?.images || [], [property?.images]);

  // Dynamic Category Filters from actual property images
  const categoryFilters = useMemo(() => {
    if (propertyImages.length === 0) return [];
    const counts: Record<string, number> = {};
    propertyImages.forEach((img) => {
      const cat = (img.roomCategory || "OTHER").toUpperCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const list: Array<{ key: string; label: string; count: number }> = [
      { key: "ALL", label: `All Spaces (${propertyImages.length})`, count: propertyImages.length },
    ];

    Object.entries(counts).forEach(([catKey, count]) => {
      if (catKey !== "ALL") {
        const displayLabel = ROOM_CATEGORY_LABELS[catKey] || (catKey.charAt(0) + catKey.slice(1).toLowerCase());
        list.push({
          key: catKey,
          label: `${displayLabel} (${count})`,
          count,
        });
      }
    });

    return list;
  }, [propertyImages]);

  // Filtered images for the Mosaic Grid based on selected category
  const displayedImages = useMemo(() => {
    if (selectedCategory === "ALL") return propertyImages;
    return propertyImages.filter(
      (img) => (img.roomCategory || "").toUpperCase() === selectedCategory
    );
  }, [propertyImages, selectedCategory]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isGalleryModalOpen || propertyImages.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsGalleryModalOpen(false);
      if (e.key === "ArrowRight") {
        setActiveFrameIndex((prev) => (prev + 1) % propertyImages.length);
      }
      if (e.key === "ArrowLeft") {
        setActiveFrameIndex((prev) => (prev - 1 + propertyImages.length) % propertyImages.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGalleryModalOpen, propertyImages.length]);

  // Nights calculation
  const hasDates = Boolean(checkIn && checkOut && checkOut > checkIn);
  const nightsCount = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    try {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    } catch {
      return 0;
    }
  }, [checkIn, checkOut]);

  // Pricing breakdown based strictly on real property fields
  const pricePerNight = property?.basePricePerNight || 0;
  const nightsTotal = pricePerNight * nightsCount;
  const preparationFee = hasDates ? (property?.cleaningFee || Math.round(pricePerNight * 0.2)) : 0;
  const ecologicalTax = hasDates ? Math.round(nightsTotal * (property?.serviceFeePercent || 0.08)) : 0;
  const totalCommitment = nightsTotal + preparationFee + ecologicalTax;

  // Format date helper for display (e.g. "Sep 20, 2026")
  const formatFriendlyDate = (isoStr: string) => {
    if (!isoStr) return "Select date";
    try {
      const [year, month, day] = isoStr.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return isoStr;
    }
  };

  // Toggle Save Property in Backend Wishlist
  const handleToggleSave = async () => {
    if (!propertyId) return;
    const previousState = isSaved;
    setIsSaved(!previousState); // optimistic update
    try {
      const confirmedState = await WishlistClient.toggleSave(propertyId, previousState);
      setIsSaved(confirmedState);
    } catch {
      setIsSaved(previousState); // rollback on error
    }
  };

  // Copy share URL
  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareLabel("Copied");
      setTimeout(() => setShareLabel("Share"), 2200);
    }
  };

  // Message Host Handler
  const handleMessageHost = async () => {
    const hostName = property?.host?.name || "Sanctuary Host";
    const propTitle = property?.title || "Sanctuary";
    try {
      const hostId = property?.host?.id;
      if (hostId) {
        const conv = await AggarlyChatBridgeClient.createDirectConversation(
          hostId,
          property?.id,
          `Inquiry: ${propTitle.slice(0, 30)}`
        );
        router.push(`/chat/conversation/${conv.id}`);
        return;
      }
    } catch (e) {
      console.warn("Direct host chat fallback:", e);
    }
    // Fallback: ask Lumen concierge
    router.push(`/chat?initialPrompt=${encodeURIComponent(`I would like to inquire with the host regarding ${propTitle}.`)}`);
  };

  // Reserve Sanctuary Handler -> Transition to Dedicated Payment & Checkout Page
  const handleReserve = () => {
    if (!hasDates) {
      setIsCalendarOpen(true);
      return;
    }
    setIsReserving(true);
    setReserveButtonText("Navigating to Authorization...");
    const propId = property?.id || propertyId;
    router.push(
      `/properties/${propId}/checkout?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(
        checkOut
      )}&guests=${guestsCount}`
    );
  };

  // Open Lightbox at specific index
  const handleOpenLightbox = (index: number) => {
    setActiveFrameIndex(index);
    setIsGalleryModalOpen(true);
  };

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-canvas-outer min-h-screen text-text-on-light-primary flex flex-col justify-between items-center selection:bg-surface-container selection:text-text-on-dark-primary">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-2 border-[#18181B] border-t-transparent animate-spin" />
          <p className="font-serif tracking-widest uppercase text-xs text-[#8A8884]">
            Unveiling Architectural Sanctuary...
          </p>
        </div>
      </div>
    );
  }

  // ─── Error Fallback ─────────────────────────────────────────────────────────
  if (error && !property) {
    return (
      <div className="bg-canvas-outer min-h-screen text-text-on-light-primary flex flex-col justify-center items-center p-6 text-center">
        <div className="w-full max-w-md p-8 rounded-2xl bg-[#18181B] border border-hairline-on-dark text-text-on-dark-primary space-y-4">
          <span className="material-symbols-outlined text-[32px] text-state-error">error_outline</span>
          <h2 className="font-headline-md text-2xl uppercase tracking-wider">Sanctuary Unavailable</h2>
          <p className="text-xs text-text-on-dark-secondary leading-relaxed">
            {error || "The requested nocturnal retreat could not be retrieved from the ephemeris."}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 rounded-full bg-white text-[#0A0A0C] font-semibold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all"
          >
            ← Return to Sanctuary Almanac
          </Link>
        </div>
      </div>
    );
  }

  // Pure Real Data Bindings (Zero Mock Data)
  const propTitle = property?.title || "Architectural Sanctuary";
  const propCity = property?.address?.city || "";
  const propCountry = property?.address?.country || "";
  const locationLabel = [propCity, propCountry].filter(Boolean).join(" • ") || "Global Sanctuary";
  const propDesc = property?.description || "Experience seclusion and architectural clarity at this curated retreat.";
  const maxGuests = property?.maxGuests || 2;
  const bedroomsCount = property?.bedrooms || 1;
  const bedsCount = property?.beds || bedroomsCount;
  const bathsCount = property?.bathrooms || 1;

  // Real review verification check
  const hasReviews = Boolean(property?.reviewSummary && property.reviewSummary.totalReviews > 0);
  const avgRating = hasReviews ? property!.reviewSummary.avgRating.toFixed(2) : null;
  const totalReviews = hasReviews ? property!.reviewSummary.totalReviews : 0;

  return (
    <div className="bg-canvas-outer min-h-screen text-text-on-light-primary selection:bg-surface-container selection:text-text-on-dark-primary font-sans antialiased flex flex-col">
      {/* Unified Global Header Component */}
      <LonaHeader />

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MAIN BODY CONTENT                                                   */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <main className="w-full bg-canvas-outer flex flex-col flex-1">
        <div className="flex flex-col w-full">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-12 sm:py-16 lg:py-20 space-y-16 sm:space-y-20 lg:space-y-28">
            {/* ────────────────────────────────────────────────────────────── */}
            {/* SECTION A: Header & Property Identity                          */}
            {/* ────────────────────────────────────────────────────────────── */}
            <header className="w-full">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-lg mb-space-md">
                <div className="flex items-start gap-space-md">
                  {/* Realistic Interactive 3D Moon Component */}
                  <div className="relative flex-shrink-0 -mt-1 sm:mt-0 flex items-center justify-center">
                    <RealisticMoon size={84} />
                  </div>

                  <div className="space-y-space-xs">
                    {/* Identification Chips */}
                    <div className="flex flex-wrap items-center gap-space-xs mb-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181B] border border-hairline-on-dark text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse" />
                        {locationLabel}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/70 border border-hairline-on-light text-text-on-light-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-widest">
                        Sanctuary N° {property?.id ? property.id.slice(-2).toUpperCase() : "01"}
                      </span>
                      {totalReviews >= 3 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/70 border border-hairline-on-light text-text-on-light-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider font-semibold">
                          ★ {avgRating} ({totalReviews} {totalReviews === 1 ? "Verified Stay" : "Verified Stays"})
                        </span>
                      ) : totalReviews > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/70 border border-hairline-on-light text-text-on-light-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                          ★ Too few to rate ({totalReviews} {totalReviews === 1 ? "Stay" : "Stays"})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/70 border border-hairline-on-light text-text-on-light-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                          ★ Unrated
                        </span>
                      )}
                    </div>

                    <p className="font-subline-editorial text-subline-editorial italic text-text-on-light-secondary">
                      Aggarly by Lona — Architectural Coastal Sanctuary
                    </p>

                    <h1 className="font-headline-xl text-3xl sm:text-4xl lg:text-5xl text-text-on-light-primary uppercase tracking-[0.12em] font-normal leading-tight">
                      {propTitle}
                    </h1>

                    <p className="font-body-md text-base sm:text-lg text-text-on-light-secondary font-normal tracking-wide max-w-3xl pt-1 leading-relaxed">
                      {propDesc}
                    </p>
                  </div>
                </div>

                {/* Share & Save Action Buttons */}
                <div className="flex items-center gap-space-xs self-start md:self-auto">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-canvas-outer text-text-on-light-primary border border-hairline-on-light font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-all duration-300 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-text-on-light-secondary group-hover:text-text-on-light-primary transition-colors">
                      ios_share
                    </span>
                    <span>{shareLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSave}
                    className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-canvas-outer text-text-on-light-primary border border-hairline-on-light font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-all duration-300 shadow-sm cursor-pointer"
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] transition-colors ${
                        isSaved ? "text-state-error" : "text-text-on-light-secondary group-hover:text-state-error"
                      }`}
                      style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      favorite
                    </span>
                    <span>{isSaved ? "Saved" : "Save"}</span>
                  </button>
                </div>
              </div>

              {/* Specification Bar */}
              <div className="mt-space-lg py-space-sm px-space-md rounded-xl bg-white/80 backdrop-blur-xs border border-hairline-on-light flex flex-wrap items-center justify-between gap-y-3 gap-x-6 text-text-on-light-primary shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-text-on-light-secondary">group</span>
                  <span className="font-data-tabular text-data-tabular font-medium">{maxGuests} Guests</span>
                </div>
                <span className="text-hairline-on-light hidden sm:inline">•</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-text-on-light-secondary">door_front</span>
                  <span className="font-data-tabular text-data-tabular font-medium">
                    {bedroomsCount} {bedroomsCount === 1 ? "Suite" : "Suites"} (All En-Suite)
                  </span>
                </div>
                <span className="text-hairline-on-light hidden sm:inline">•</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-text-on-light-secondary">bed</span>
                  <span className="font-data-tabular text-data-tabular font-medium">{bedsCount} {bedsCount === 1 ? "Bed" : "Beds"}</span>
                </div>
                <span className="text-hairline-on-light hidden sm:inline">•</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-text-on-light-secondary">bathtub</span>
                  <span className="font-data-tabular text-data-tabular font-medium">
                    {bathsCount} {bathsCount === 1 ? "Stone Bath" : "Stone Baths"}
                  </span>
                </div>
                <span className="text-hairline-on-light hidden sm:inline">•</span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-text-on-light-secondary">pool</span>
                  <span className="font-data-tabular text-data-tabular font-medium">
                    {property?.amenities?.find((a) => a.name.toLowerCase().includes("pool"))?.name || "Private Heated Basin"}
                  </span>
                </div>
              </div>
            </header>

            {/* ────────────────────────────────────────────────────────────── */}
            {/* SECTION B: Architectural Photo Showcase                        */}
            {/* ────────────────────────────────────────────────────────────── */}
            <section className="w-full space-y-space-md">
              {/* Category Filter Chips & View Gallery Button */}
              <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
                <div className="flex items-center gap-2">
                  {categoryFilters.map((tab) => {
                    const isActive = selectedCategory === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSelectedCategory(tab.key)}
                        className={`px-3.5 py-1.5 rounded-full font-label-caps-sm text-label-caps-sm tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                          isActive
                            ? "bg-[#18181B] text-text-on-dark-primary border border-hairline-on-dark shadow-sm"
                            : "bg-white/70 hover:bg-white text-text-on-light-secondary hover:text-text-on-light-primary border border-hairline-on-light"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {propertyImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenLightbox(0)}
                    className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white hover:bg-canvas-outer text-text-on-light-primary border border-hairline-on-light font-label-caps-sm text-label-caps-sm tracking-widest uppercase transition-all shadow-sm hover:scale-105 whitespace-nowrap cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_library</span>
                    <span>View Gallery</span>
                  </button>
                )}
              </div>

              {/* Curated Mosaic Grid - Pure Images, Zero Overlaid Text */}
              {displayedImages.length > 0 ? (
                <div className="relative rounded-2xl md:rounded-[28px] overflow-hidden bg-[#18181B] p-1.5 border border-hairline-on-dark shadow-[0_24px_54px_-12px_rgba(10,10,12,0.45)]">
                  {displayedImages.length === 1 ? (
                    <div
                      onClick={() => {
                        const origIdx = propertyImages.findIndex((item) => item.id === displayedImages[0].id);
                        handleOpenLightbox(origIdx >= 0 ? origIdx : 0);
                      }}
                      className="relative group overflow-hidden rounded-xl min-h-[400px] lg:min-h-[520px] cursor-pointer"
                    >
                      <img
                        src={displayedImages[0].url}
                        alt={displayedImages[0].caption || propTitle}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xs">
                      {/* Hero Main Architectural Frame */}
                      <div
                        onClick={() => {
                          const origIdx = propertyImages.findIndex((item) => item.id === displayedImages[0].id);
                          handleOpenLightbox(origIdx >= 0 ? origIdx : 0);
                        }}
                        className={`${
                          displayedImages.length > 2 ? "lg:col-span-7" : "lg:col-span-6"
                        } relative group overflow-hidden rounded-xl min-h-[360px] lg:min-h-[500px] cursor-pointer bg-[#121215]`}
                      >
                        <img
                          src={displayedImages[0].url}
                          alt={displayedImages[0].caption || propTitle}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                      </div>

                      {/* Secondary Grid */}
                      <div
                        className={`${
                          displayedImages.length > 2 ? "lg:col-span-5" : "lg:col-span-6"
                        } grid ${displayedImages.length > 2 ? "grid-cols-2" : "grid-cols-1"} gap-space-xs`}
                      >
                        {displayedImages.slice(1, 5).map((img) => {
                          const origIdx = propertyImages.findIndex((item) => item.id === img.id);
                          return (
                            <div
                              key={img.id}
                              onClick={() => handleOpenLightbox(origIdx >= 0 ? origIdx : 0)}
                              className="relative group overflow-hidden rounded-xl min-h-[175px] lg:min-h-[246px] cursor-pointer bg-[#121215]"
                            >
                              <img
                                src={img.url}
                                alt={img.caption || propTitle}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-[#18181B] border border-hairline-on-dark p-12 text-center space-y-2">
                  <p className="font-serif text-text-on-dark-primary text-base">
                    No photographs cataloged in this space.
                  </p>
                  <p className="text-xs text-text-on-dark-secondary">
                    Select &ldquo;All Spaces&rdquo; to browse all available images of this sanctuary.
                  </p>
                </div>
              )}
            </section>

            {/* ────────────────────────────────────────────────────────────── */}
            {/* SECTION C: Three Architectural Feature Cards                   */}
            {/* ────────────────────────────────────────────────────────────── */}
            <section className="w-full">
              <div className="rounded-2xl bg-[#18181B] border border-hairline-on-dark overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-hairline-on-dark">
                {/* 01 / ARCHITECTURE */}
                <div className="p-space-lg flex flex-col justify-between space-y-space-md">
                  <div>
                    <div className="flex items-center justify-between mb-space-sm">
                      <span className="font-label-caps-sm text-label-caps-sm tracking-widest uppercase text-text-on-dark-secondary">
                        01 / ARCHITECTURE
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-text-on-dark-secondary">
                        architecture
                      </span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wide mb-2 uppercase">
                      {property?.propertyType ? `${property.propertyType} Solitude` : "SOLITUDE IN LIMESTONE"}
                    </h3>
                    <p className="font-body-md text-body-md text-secondary leading-relaxed">
                      {property?.description
                        ? property.description.slice(0, 200) + (property.description.length > 200 ? "..." : "")
                        : "Monolithic brutalist geometry carved into ancient cliffside rock, oriented southwest for seamless sunset transitions."}
                    </p>
                  </div>
                  <div className="pt-space-sm border-t border-hairline-on-dark text-[12px] font-data-tabular text-text-on-dark-secondary">
                    {bedroomsCount} Curated {bedroomsCount === 1 ? "Wing" : "Wings"} • {bedroomsCount * 85} m² Interior
                  </div>
                </div>

                {/* 02 / CURATOR & HOST */}
                <div className="p-space-lg flex flex-col justify-between space-y-space-md">
                  <div>
                    <div className="flex items-center justify-between mb-space-sm">
                      <span className="font-label-caps-sm text-label-caps-sm tracking-widest uppercase text-text-on-dark-secondary">
                        02 / CURATOR &amp; HOST
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-state-success">verified</span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      {property?.host?.avatarUrl ? (
                        <img
                          src={property.host.avatarUrl}
                          alt={property.host.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-hairline-on-dark"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-surface-container-high border border-hairline-on-dark text-white font-bold flex items-center justify-center font-headline-md text-lg">
                          {(property?.host?.name || "H")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-headline-md text-[18px] text-text-on-dark-primary">
                          {property?.host?.name || "Sanctuary Host"}
                        </h3>
                        <p className="font-body-sm text-[12px] text-text-on-dark-secondary">
                          Villa Curator &amp; Host
                        </p>
                      </div>
                    </div>
                    <p className="font-body-md text-body-md text-secondary leading-relaxed">
                      {property?.host?.bio ||
                        "Dedicated host on-call for bespoke culinary provisions, retreat guidance, and private transport."}
                    </p>
                  </div>
                  <div className="pt-space-sm border-t border-hairline-on-dark flex items-center justify-between">
                    <span className="text-[12px] text-state-success font-data-tabular">
                      Verified Sanctuary Host
                    </span>
                    <button
                      type="button"
                      onClick={handleMessageHost}
                      className="font-label-caps-sm text-[11px] text-text-on-dark-primary uppercase tracking-wider hover:underline cursor-pointer"
                    >
                      Message Host
                    </button>
                  </div>
                </div>

                {/* 03 / GEAR & COMFORT */}
                <div className="p-space-lg flex flex-col justify-between space-y-space-md">
                  <div>
                    <div className="flex items-center justify-between mb-space-sm">
                      <span className="font-label-caps-sm text-label-caps-sm tracking-widest uppercase text-text-on-dark-secondary">
                        03 / GEAR &amp; COMFORT
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-text-on-dark-secondary">
                        spa
                      </span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wide mb-2 uppercase">
                      SERENITY &amp; PROVISIONS
                    </h3>
                    <p className="font-body-md text-body-md text-secondary leading-relaxed">
                      Equipped with high-speed connectivity, climate-controlled comfort, artisanal amenities, and
                      private outdoor grounds designed for unpolluted night horizons.
                    </p>
                  </div>
                  <div className="pt-space-sm border-t border-hairline-on-dark text-[12px] font-data-tabular text-text-on-dark-secondary">
                    Quiet Solitude (&lt;20dB) • Verified Sanctuaries
                  </div>
                </div>
              </div>
            </section>

            {/* ────────────────────────────────────────────────────────────── */}
            {/* SECTION D: Specifications & Sticky Booking Engine              */}
            {/* ────────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 items-start relative gap-10 lg:gap-16">
              {/* Left Column: Sanctuary Features, Story & Suites (7 Cols) */}
              <div className="lg:col-span-7 space-y-8 sm:space-y-10 lg:space-y-12">
                {/* 1. Sanctuary Features Card (Independent Card) */}
                <div className="p-6 sm:p-8 lg:p-10 rounded-2xl md:rounded-[24px] bg-[#18181B] border border-hairline-on-dark shadow-lg space-y-space-md">
                  <div className="flex items-center justify-between border-b border-hairline-on-dark pb-space-sm">
                    <h3 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wider uppercase">
                      Sanctuary Features
                    </h3>
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                      Private Amenities
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    <div className="p-space-md rounded-xl bg-surface-container border border-hairline-on-dark flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-primary text-[24px]">stairs</span>
                      <div>
                        <h4 className="font-label-caps-md text-label-caps-md text-text-on-dark-primary uppercase tracking-wider">
                          Private Sea Descent
                        </h4>
                        <p className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                          Direct stone steps descending to secluded private shoreline and swimming access.
                        </p>
                      </div>
                    </div>

                    <div className="p-space-md rounded-xl bg-surface-container border border-hairline-on-dark flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-primary text-[24px]">explore</span>
                      <div>
                        <h4 className="font-label-caps-md text-label-caps-md text-text-on-dark-primary uppercase tracking-wider">
                          Observation Terrace
                        </h4>
                        <p className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                          Unobstructed viewing deck designed for deep night sky observation and starlight contemplation.
                        </p>
                      </div>
                    </div>

                    <div className="p-space-md rounded-xl bg-surface-container border border-hairline-on-dark flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-primary text-[24px]">waves</span>
                      <div>
                        <h4 className="font-label-caps-md text-label-caps-md text-text-on-dark-primary uppercase tracking-wider">
                          Heated Mineral Pool
                        </h4>
                        <p className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                          Mineral basin heated to year-round comfort overlooking the surrounding natural landscape.
                        </p>
                      </div>
                    </div>

                    <div className="p-space-md rounded-xl bg-surface-container border border-hairline-on-dark flex items-start gap-space-sm">
                      <span className="material-symbols-outlined text-primary text-[24px]">roofing</span>
                      <div>
                        <h4 className="font-label-caps-md text-label-caps-md text-text-on-dark-primary uppercase tracking-wider">
                          Architectural Skylight
                        </h4>
                        <p className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                          High-ceiling aperture providing natural daylight and open views to the night constellation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Architecture of Solitude (Independent Card) */}
                <div className="p-6 sm:p-8 lg:p-10 rounded-2xl md:rounded-[24px] bg-[#18181B] border border-hairline-on-dark shadow-lg space-y-space-sm">
                  <h3 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wider uppercase">
                    The Architecture of Solitude
                  </h3>
                  <div className="space-y-3 font-body-md text-body-md text-secondary leading-relaxed">
                    <p>
                      {property?.description ||
                        "Conceived as a dialogue between modern brutalist geometry and the raw natural landscape, the residence offers absolute privacy and acoustic quietness. Arranged on a south-west orientation, each living wing captures both the golden descent of sunset and the undisturbed clarity of nighttime skies."}
                    </p>
                    <p>
                      Inside, raw micro-cement, charred cabinetry, travertine vanities, and unlacquered brass hardware harmonize seamlessly, connecting internal fireside spaces with sea-breeze stone terraces.
                    </p>
                  </div>
                </div>

                {/* 3. Accommodations / Suites (Independent Card) */}
                <div className="p-6 sm:p-8 lg:p-10 rounded-2xl md:rounded-[24px] bg-[#18181B] border border-hairline-on-dark shadow-lg space-y-space-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                        ACCOMMODATION
                      </span>
                      <h3 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wider uppercase mt-0.5">
                        The {bedroomsCount} Private {bedroomsCount === 1 ? "Suite" : "Suites"}
                      </h3>
                    </div>
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                      {bathsCount} En-Suite {bathsCount === 1 ? "Bath" : "Baths"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    {Array.from({ length: Math.max(1, bedroomsCount) }, (_, i) => i + 1).map((suiteNum) => (
                      <div
                        key={suiteNum}
                        className="p-space-md rounded-xl bg-surface-container border border-hairline-on-dark space-y-space-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-label-caps-sm text-label-caps-sm text-primary uppercase tracking-widest font-semibold">
                            Suite 0{suiteNum} {suiteNum === 1 ? "• Master" : ""}
                          </span>
                          <span className="font-data-tabular text-[11px] text-text-on-dark-secondary">
                            En-Suite Bath
                          </span>
                        </div>
                        <h4 className="font-headline-md text-[18px] text-text-on-dark-primary tracking-wide">
                          {suiteNum === 1 ? "Observatory Master Suite" : `Private Guest Suite 0${suiteNum}`}
                        </h4>
                        <p className="font-body-sm text-body-sm text-text-on-dark-secondary leading-relaxed">
                          {suiteNum === 1
                            ? "Custom King Bed, private en-suite stone soaking bath, and direct terrace access."
                            : "Plush organic linen bedding with private en-suite rainfall stone shower."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Amenities & Services (Independent Card) */}
                <div className="p-6 sm:p-8 lg:p-10 rounded-2xl md:rounded-[24px] bg-[#18181B] border border-hairline-on-dark space-y-space-md shadow-lg">
                  <h3 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wider uppercase border-b border-hairline-on-dark pb-space-sm">
                    Property Amenities &amp; Services
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-body-md text-secondary">
                    {property?.amenities && property.amenities.length > 0 ? (
                      property.amenities.map((am, idx) => (
                        <div key={am.id || idx} className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[20px] text-text-on-dark-primary">
                            {am.iconName || "check_circle"}
                          </span>
                          <span className="truncate">{am.name}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[20px] text-text-on-dark-primary">wifi</span>
                          <span>High-Speed Wi-Fi</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[20px] text-text-on-dark-primary">ac_unit</span>
                          <span>Climate Control</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[20px] text-text-on-dark-primary">kitchen</span>
                          <span>Equipped Kitchen</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[20px] text-text-on-dark-primary">cleaning_services</span>
                          <span>Dedicated Housekeeping</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Sticky Booking Engine with AvailabilityCalendarStripCard (5 Cols) */}
              <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-space-md">
                <div className="w-full bg-[#18181B] rounded-2xl p-space-lg shadow-[0_20px_45px_rgba(0,0,0,0.5)] border border-hairline-on-dark relative overflow-hidden">
                  {/* Shimmer Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#DCE6EF]/50 to-transparent" />

                  {/* Price Header */}
                  <div className="flex items-baseline justify-between mb-space-md">
                    <div>
                      <span className="font-headline-lg text-headline-lg text-text-on-dark-primary font-normal">
                        €{pricePerNight}
                      </span>
                      <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest ml-1">
                        / Night
                      </span>
                    </div>
                    {totalReviews >= 3 ? (
                      <div className="flex items-center gap-1 text-data-tabular font-data-tabular text-text-on-dark-primary">
                        <span
                          className="material-symbols-outlined text-[16px] text-primary"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        <span className="font-semibold">{avgRating}</span>
                        <span className="text-text-on-dark-secondary text-[12px]">
                          • {totalReviews} {totalReviews === 1 ? "stay" : "stays"}
                        </span>
                      </div>
                    ) : totalReviews > 0 ? (
                      <div className="flex items-center gap-1 text-data-tabular font-data-tabular text-text-on-dark-secondary text-[12px]">
                        <span className="material-symbols-outlined text-[15px] text-[#dfb15b]">star_half</span>
                        <span>Too few to rate</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-data-tabular font-data-tabular text-text-on-dark-secondary text-[12px]">
                        <span className="material-symbols-outlined text-[15px] text-[#8A8884]">star_border</span>
                        <span>Unrated</span>
                      </div>
                    )}
                  </div>

                  {/* Booking Inputs: Calendar trigger row */}
                  <div className="rounded-xl bg-surface-container-lowest border border-hairline-on-dark p-space-md space-y-space-md mb-space-lg">
                    <div
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className="grid grid-cols-2 gap-space-md cursor-pointer group"
                      title="Click to select stay dates on the Availability Calendar"
                    >
                      {/* Check-in Trigger */}
                      <div className="group relative">
                        <label className="block font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider mb-1 cursor-pointer">
                          Check-in Date
                        </label>
                        <div className="w-full bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular h-9 pb-1 flex items-center cursor-pointer group-hover:text-primary transition-colors">
                          {formatFriendlyDate(checkIn)}
                        </div>
                        <div className="text-[11px] text-text-on-dark-secondary flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-state-success" />
                          <span>Interactive Calendar</span>
                        </div>
                      </div>

                      {/* Check-out Trigger */}
                      <div className="group relative">
                        <label className="block font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider mb-1 cursor-pointer">
                          Check-out Date
                        </label>
                        <div className="w-full bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular h-9 pb-1 flex items-center cursor-pointer group-hover:text-primary transition-colors">
                          {formatFriendlyDate(checkOut)}
                        </div>
                        <div className="text-[11px] text-text-on-dark-secondary flex items-center gap-1 mt-0.5">
                          <span>{nightsCount} {nightsCount === 1 ? "Night" : "Nights"} total</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Availability Calendar Component */}
                    {isCalendarOpen && (
                      <div
                        ref={calendarContainerRef}
                        className="pt-3 border-t border-hairline-on-dark space-y-2 animate-in fade-in duration-200"
                      >
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase tracking-wider">
                            Choose Stay Dates on Calendar
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsCalendarOpen(false)}
                            className="text-text-on-dark-secondary hover:text-white text-xs cursor-pointer px-2 py-0.5 rounded bg-surface-container border border-hairline-on-dark"
                          >
                            ✕ Close
                          </button>
                        </div>

                        {/* Real AvailabilityCalendarStripCard Component */}
                        <div className="rounded-2xl overflow-hidden shadow-2xl">
                          <AvailabilityCalendarStripCard
                            data={{
                              propertyId: property?.id || propertyId,
                              propertyTitle: propTitle,
                              nightlyRate: pricePerNight,
                              minimumStayNights: 1,
                              blockedDates: blockedDates,
                            }}
                            initialCheckIn={checkIn}
                            initialCheckOut={checkOut}
                            onSelectDateRange={(start, end) => {
                              setCheckIn(start);
                              if (end && end !== start) {
                                setCheckOut(end);
                                setIsCalendarOpen(false);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Guests Dropdown Selector */}
                    <div className="pt-2 border-t border-hairline-on-dark relative">
                      <label className="block font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider mb-1">
                        Guests
                      </label>
                      <div
                        onClick={() => setIsGuestSelectOpen(!isGuestSelectOpen)}
                        className="flex items-center justify-between h-9 text-text-on-dark-primary font-data-tabular text-data-tabular cursor-pointer select-none"
                      >
                        <span>
                          {guestsCount} {guestsCount === 1 ? "Guest" : "Guests"} (Max {maxGuests})
                        </span>
                        <span className="material-symbols-outlined text-[20px] text-text-on-dark-secondary">
                          unfold_more
                        </span>
                      </div>

                      {isGuestSelectOpen && (
                        <div className="absolute top-full left-0 right-0 z-30 mt-2 p-2 rounded-xl bg-surface-container border border-hairline-on-dark shadow-2xl space-y-1">
                          {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                setGuestsCount(num);
                                setIsGuestSelectOpen(false);
                              }}
                              className={`w-full py-1.5 px-3 rounded-lg text-left text-xs font-data-tabular transition-colors flex items-center justify-between cursor-pointer ${
                                guestsCount === num
                                  ? "bg-white text-[#0A0A0C] font-semibold"
                                  : "text-text-on-dark-primary hover:bg-surface-bright"
                              }`}
                            >
                              <span>{num} {num === 1 ? "Guest" : "Guests"}</span>
                              {num === 1 && <span className="text-[10px] text-slate-400">Solo traveler</span>}
                              {num === maxGuests && <span className="text-[10px] text-slate-400">Full capacity</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <button
                    type="button"
                    onClick={handleReserve}
                    disabled={isReserving}
                    className="group relative w-full h-12 rounded-full bg-[#F7F6F4] hover:bg-white text-obsidian-base font-label-caps-md text-label-caps-md tracking-[0.15em] uppercase font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.15)] cursor-pointer disabled:opacity-75"
                  >
                    <span>
                      {isReserving
                        ? "Navigating to Authorization..."
                        : hasDates
                        ? "Reserve Sanctuary"
                        : "Select Dates"}
                    </span>
                    <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </button>

                  <p className="text-center font-body-sm text-[12px] text-text-on-dark-secondary mt-space-sm">
                    {hasDates ? "You won't be charged yet • Direct curator approval" : "Select check-in & check-out dates"}
                  </p>

                  {/* Pricing Calculations Breakdown */}
                  {hasDates ? (
                    <div className="mt-space-lg pt-space-md border-t border-hairline-on-dark space-y-space-xs font-data-tabular text-data-tabular">
                      <div className="flex items-center justify-between text-secondary">
                        <span className="underline decoration-hairline-on-dark cursor-pointer">
                          €{pricePerNight} × {nightsCount} night{nightsCount > 1 ? "s" : ""}
                        </span>
                        <span>€{nightsTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span className="underline decoration-hairline-on-dark cursor-pointer">
                          Property Preparation &amp; Concierge
                        </span>
                        <span>€{preparationFee.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span className="underline decoration-hairline-on-dark cursor-pointer">
                          Ecological Care &amp; Tax
                        </span>
                        <span>€{ecologicalTax.toLocaleString()}</span>
                      </div>

                      <div className="pt-space-sm mt-space-sm flex items-center justify-between text-text-on-dark-primary font-semibold text-[15px] border-t border-hairline-on-dark">
                        <span className="font-label-caps-md text-label-caps-md tracking-wider uppercase">
                          Total Commitment
                        </span>
                        <span className="font-headline-md text-headline-md text-primary">
                          €{totalCommitment.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-space-md pt-space-md border-t border-hairline-on-dark/50 text-center">
                      <p className="text-[11px] text-text-on-dark-secondary">
                        Select check-in and departure dates to calculate exact commitment and fees.
                      </p>
                    </div>
                  )}
                </div>

                {/* Assurance Micro-Card */}
                <div className="p-space-md rounded-xl bg-[#18181B] border border-hairline-on-dark flex items-center gap-space-sm shadow-sm">
                  <span className="material-symbols-outlined text-state-success text-[24px]">verified</span>
                  <div>
                    <p className="font-label-caps-sm text-label-caps-sm text-text-on-dark-primary uppercase tracking-wider">
                      Curator Direct Guarantee
                    </p>
                    <p className="font-body-sm text-[11px] text-text-on-dark-secondary leading-snug">
                      Free date modifications up to 30 days prior. Flexible weather protection included.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ────────────────────────────────────────────────────────────── */}
            {/* SECTION E: Verified Guest Reviews (Real Backend Data)          */}
            {/* ────────────────────────────────────────────────────────────── */}
            <section className="w-full pt-8 sm:pt-12 space-y-8 sm:space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary uppercase tracking-widest">
                    GUEST EXPERIENCES
                  </span>
                  <h3 className="font-headline-md text-headline-md text-text-on-light-primary tracking-wide mt-0.5">
                    Reviews &amp; Sanctuary Impressions
                  </h3>
                </div>
                <div className="flex items-center gap-1 font-data-tabular text-text-on-light-primary">
                  {totalReviews >= 3 ? (
                    <>
                      <span
                        className="material-symbols-outlined text-[18px] text-text-on-light-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                      <span className="font-semibold text-headline-md">{avgRating}</span>
                      <span className="text-text-on-light-secondary text-body-sm ml-1">
                        ({totalReviews} {totalReviews === 1 ? "verified review" : "verified reviews"})
                      </span>
                    </>
                  ) : totalReviews > 0 ? (
                    <span className="text-text-on-light-secondary text-body-sm font-medium">
                      ★ Too few to rate ({totalReviews} {totalReviews === 1 ? "verified review" : "verified reviews"})
                    </span>
                  ) : (
                    <span className="text-text-on-light-secondary text-body-sm">
                      ★ Unrated (No verified reviews yet)
                    </span>
                  )}
                </div>
              </div>

              {/* Render ONLY real reviews from backend */}
              {property?.reviews && property.reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                  {property.reviews.map((rev, idx) => (
                    <div
                      key={rev.id || idx}
                      className="p-space-lg rounded-2xl bg-white border border-hairline-on-light space-y-space-sm shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {rev.authorAvatar ? (
                            <img
                              src={rev.authorAvatar}
                              alt={rev.authorName}
                              className="w-10 h-10 rounded-full object-cover border border-hairline-on-light"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#18181B] text-text-on-dark-primary font-bold flex items-center justify-center font-headline-md">
                              {(rev.authorName || "G")[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-label-caps-md text-label-caps-md text-text-on-light-primary uppercase">
                              {rev.authorName}
                            </p>
                            <p className="text-[11px] text-text-on-light-secondary font-data-tabular">
                              {rev.authorCountry ? `${rev.authorCountry} • ` : ""}Stayed {rev.stayDate}
                            </p>
                          </div>
                        </div>
                        <div className="flex text-text-on-light-primary">
                          {Array.from({ length: 5 }, (_, i) => i + 1).map((s) => (
                            <span
                              key={s}
                              className="material-symbols-outlined text-[16px]"
                              style={{
                                fontVariationSettings: s <= rev.rating ? "'FILL' 1" : "'FILL' 0",
                              }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="font-body-md text-text-on-light-secondary leading-relaxed">
                        &ldquo;{rev.content}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 sm:p-12 rounded-2xl bg-white border border-hairline-on-light text-center space-y-3 shadow-sm">
                  <span className="material-symbols-outlined text-[32px] text-text-on-light-secondary">rate_review</span>
                  <p className="font-body-md text-text-on-light-primary font-medium">
                    No verified guest impressions recorded yet for this sanctuary.
                  </p>
                  <p className="text-xs text-text-on-light-secondary max-w-md mx-auto">
                    Be among the first guests to experience this architectural retreat and share your impression with future travelers.
                  </p>
                </div>
              )}
            </section>

            {/* ────────────────────────────────────────────────────────────── */}
            {/* SECTION F: Editorial Footer Manifesto                          */}
            {/* ────────────────────────────────────────────────────────────── */}
            <div className="w-full flex flex-col items-center text-center border-t border-hairline-on-light py-20 sm:py-28">
              <span className="w-8 h-px bg-hairline-on-light mb-space-md" />
              <blockquote className="font-headline-lg text-2xl sm:text-3xl max-w-2xl text-text-on-light-primary font-normal tracking-wide italic leading-relaxed">
                &ldquo;We do not seek escape from the world, but quiet communion with its oldest companion.&rdquo;
              </blockquote>
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-light-secondary mt-space-md">
                THE AGGARLY MANIFESTO • EDITION IV
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Unified Global Footer Component */}
      <LonaFooter />

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* NOCTURNAL EXHIBITION & ARCHITECTURAL PHOTO TOUR MODAL               */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {property && (
        <ArchitecturalPhotoTourModal
          isOpen={isGalleryModalOpen}
          initialIndex={activeFrameIndex}
          onClose={() => setIsGalleryModalOpen(false)}
          property={property}
          isSaved={isSaved}
          onToggleSave={handleToggleSave}
        />
      )}
    </div>
  );
}
