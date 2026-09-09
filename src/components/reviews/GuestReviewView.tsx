"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LonaHeader } from "../common/LonaHeader";
import { ReviewClient } from "../../lib/reviewClient";
import { HostClient, HostPropertyItem } from "../../lib/hostClient";
import { useAuth } from "../../context/AuthContext";
import { 
  Star, 
  CheckCircle, 
  ArrowRight, 
  Shield, 
  Sparkles, 
  AlertCircle,
  Building,
  Calendar,
  Compass,
  Check,
  RotateCw,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { cn } from "../../lib/utils";

interface EligibleBooking {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
}

const RATING_DESCRIPTORS: Record<number, string> = {
  1: "1.0 / 5.0 (Incomplete Calibration)",
  2: "2.0 / 5.0 (Sub-Standard Sanctuary)",
  3: "3.0 / 5.0 (Acceptable Presence)",
  4: "4.0 / 5.0 (High Solitude)",
  5: "5.0 / 5.0 (Absolute Solitude)",
};

const SANCTUARY_ATTRIBUTES = [
  "Discerning Solitude",
  "Architectural Stillness",
  "Pristine Dark Sky",
  "Flawless Concierge Keying",
  "Acoustic Serenity",
  "Elevated Curatorial Touch",
];

export const GuestReviewView: React.FC = () => {
  const searchParams = useSearchParams();
  const paramBookingId = searchParams.get("bookingId");
  const paramPropertyId = searchParams.get("propertyId");

  const { user, isAuthenticated } = useAuth();

  // Booking and Property Data States
  const [eligibleBookings, setEligibleBookings] = useState<EligibleBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<EligibleBooking | null>(null);
  const [property, setProperty] = useState<HostPropertyItem | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);
  const [isLoadingProperty, setIsLoadingProperty] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Review Form States
  const [overallRating, setOverallRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Curatorial Sub-Indices (1-5)
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(5);
  const [accuracyRating, setAccuracyRating] = useState<number>(5);
  const [communicationRating, setCommunicationRating] = useState<number>(5);
  const [locationRating, setLocationRating] = useState<number>(5);
  const [valueRating, setValueRating] = useState<number>(5);

  // Selected quick tags
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Discerning Solitude",
    "Pristine Dark Sky"
  ]);

  // Public editorial review
  const [comment, setComment] = useState<string>("");

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [verificationHash, setVerificationHash] = useState<string | null>(null);

  // 1. Fetch eligible completed bookings
  useEffect(() => {
    let isMounted = true;

    async function loadBookings() {
      setIsLoadingBookings(true);
      setLoadError(null);

      try {
        const bookings = await ReviewClient.getCompletedBookings();
        if (!isMounted) return;

        setEligibleBookings(bookings);

        if (bookings.length > 0) {
          // Priority 1: Match requested paramBookingId
          let target = bookings.find((b) => b.id === paramBookingId);
          // Priority 2: Match requested paramPropertyId
          if (!target && paramPropertyId) {
            target = bookings.find((b) => b.propertyId === paramPropertyId);
          }
          // Priority 3: First available booking
          if (!target) {
            target = bookings[0];
          }

          setSelectedBooking(target);
        } else if (paramBookingId && paramPropertyId) {
          // If user provided specific IDs in query param
          setSelectedBooking({
            id: paramBookingId,
            propertyId: paramPropertyId,
            checkIn: "",
            checkOut: "",
            status: "COMPLETED",
            totalAmount: 0,
          });
        }
      } catch (err: any) {
        if (!isMounted) return;
        setLoadError(err?.message || "Failed to load stay history");
      } finally {
        if (isMounted) {
          setIsLoadingBookings(false);
        }
      }
    }

    loadBookings();

    return () => {
      isMounted = false;
    };
  }, [paramBookingId, paramPropertyId]);

  // 2. Fetch property details when selectedBooking changes
  useEffect(() => {
    let isMounted = true;
    const propertyId = selectedBooking?.propertyId || paramPropertyId;

    if (!propertyId) {
      setProperty(null);
      return;
    }

    async function loadProperty(id: string) {
      setIsLoadingProperty(true);
      try {
        const prop = await HostClient.getPropertyById(id);
        if (!isMounted) return;
        setProperty(prop);
      } catch (e) {
        console.error("Error fetching property for review:", e);
      } finally {
        if (isMounted) {
          setIsLoadingProperty(false);
        }
      }
    }

    loadProperty(propertyId);

    return () => {
      isMounted = false;
    };
  }, [selectedBooking?.propertyId, paramPropertyId]);

  // Format booking date range
  const formattedDates = useMemo(() => {
    if (!selectedBooking?.checkIn || !selectedBooking?.checkOut) {
      return "Completed Residence Stay";
    }
    try {
      const inDate = new Date(selectedBooking.checkIn);
      const outDate = new Date(selectedBooking.checkOut);
      const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
      return `${inDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${outDate.toLocaleDateString("en-US", options)}`;
    } catch {
      return `${selectedBooking.checkIn} – ${selectedBooking.checkOut}`;
    }
  }, [selectedBooking?.checkIn, selectedBooking?.checkOut]);

  // User monogram initials
  const userMonogram = useMemo(() => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.displayName) {
      const parts = user.displayName.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return user.displayName.slice(0, 2).toUpperCase();
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return "AG";
  }, [user]);

  // Toggle quick tags
  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Submit review handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBooking) {
      setSubmitError("No eligible booking selected for curatorial review.");
      return;
    }

    if (!comment.trim()) {
      setSubmitError("Please provide your public editorial reflection before committing the review.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Append selected attributes to comment if helpful
      let fullComment = comment.trim();
      if (selectedTags.length > 0) {
        const tagsNote = `\n\n[Sanctuary Attributes: ${selectedTags.join(", ")}]`;
        if (!fullComment.includes("[Sanctuary Attributes:")) {
          fullComment += tagsNote;
        }
      }

      const payload = {
        propertyId: selectedBooking.propertyId,
        bookingId: selectedBooking.id,
        rating: overallRating,
        comment: fullComment,
        cleanlinessRating,
        accuracyRating,
        communicationRating,
        locationRating,
        valueRating,
      };

      const result = await ReviewClient.submitReview(payload);

      if (result.success) {
        const hash = `#LONA-${selectedBooking.id.slice(0, 6).toUpperCase()}-REV`;
        setVerificationHash(hash);
        setSubmitSuccess(true);
      } else {
        setSubmitError(result.error || "Failed to commit residence appraisal.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "An unexpected error occurred while saving your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Property primary image
  const resolvedCoverImage = useMemo(() => {
    if (!property?.images || property.images.length === 0) return "";
    const cover = property.images.find((img) => img.isCover) || property.images[0];
    const key = cover.objectKey || cover.imageUrl || (cover as any).url;
    return HostClient.resolveImageUrl(key);
  }, [property?.images]);

  // Location string
  const locationDisplay = useMemo(() => {
    if (!property?.address) return "Curated Sanctuary";
    const parts = [property.address.city, property.address.state, property.address.country].filter(Boolean);
    return parts.join(", ");
  }, [property?.address]);

  return (
    <div className="min-h-screen bg-canvas-outer text-text-on-light-primary antialiased selection:bg-obsidian-base selection:text-text-on-dark-primary flex flex-col justify-between">
      {/* Global Header */}
      <LonaHeader />

      {/* Main Sanctuary Review Stage */}
      <main className="w-full pt-24 pb-16 min-h-[calc(100vh-80px)] bg-canvas-outer">
        <div className="w-full max-w-[1440px] mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-12">
          
          {/* Loading Indicator */}
          {isLoadingBookings && (
            <div className="w-full max-w-[1240px] mx-auto rounded-[28px] bg-obsidian-base border border-hairline-on-dark text-text-on-dark-primary p-12 sm:p-20 flex flex-col items-center justify-center gap-6 shadow-2xl relative overflow-hidden">
              <div className="relative w-16 h-16 rounded-full bg-obsidian-elevated flex items-center justify-center border border-hairline-on-dark">
                <RotateCw className="w-8 h-8 text-text-on-dark-primary animate-spin" />
                <div className="absolute inset-0 rounded-full bg-[#DAE4ED]/10 animate-ping pointer-events-none" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-headline-md text-headline-md uppercase tracking-wider text-text-on-dark-primary">
                  Calibrating Residence Archives
                </p>
                <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary">
                  Retrieving your completed stays and celestial itineraries...
                </p>
              </div>
            </div>
          )}

          {/* Authentic Empty State when zero eligible bookings */}
          {!isLoadingBookings && eligibleBookings.length === 0 && !selectedBooking && (
            <div className="w-full max-w-[1240px] mx-auto rounded-[28px] bg-obsidian-base border border-hairline-on-dark text-text-on-dark-primary p-8 sm:p-16 flex flex-col items-center justify-center gap-8 shadow-2xl relative overflow-hidden text-center">
              {/* Lunar Radial Glow */}
              <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 rounded-full bg-tertiary-container/10 blur-3xl"></div>
              
              {/* Photoreal Moon Disc Silhouette */}
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-3 rounded-full bg-tertiary-fixed-dim/20 blur-md animate-pulse"></div>
                <div className="w-16 h-16 rounded-full bg-obsidian-elevated p-1 shadow-[0_0_24px_rgba(218,228,237,0.35)] relative flex items-center justify-center border border-hairline-on-dark">
                  <svg className="w-12 h-12 text-tertiary-container" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" fill="#18181B" r="46"></circle>
                    <circle cx="36" cy="42" fill="#2A2A2E" opacity="0.6" r="14"></circle>
                    <circle cx="68" cy="34" fill="#2A2A2E" opacity="0.5" r="8"></circle>
                    <circle cx="58" cy="66" fill="#2A2A2E" opacity="0.4" r="16"></circle>
                    <path d="M 50 4 A 46 46 0 0 1 96 50 A 46 46 0 0 1 50 96 A 46 46 0 0 0 50 4 Z" fill="#F7F6F4" fillOpacity="0.9" filter="drop-shadow(0px 0px 8px rgba(220, 230, 239, 0.8))"></path>
                    <path d="M 50 4 C 64 22 68 76 50 96 A 46 46 0 0 0 96 50 A 46 46 0 0 0 50 4 Z" fill="#DAE4ED" opacity="0.95"></path>
                  </svg>
                </div>
              </div>

              <div className="space-y-3 max-w-xl">
                <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-[0.2em]">
                  Curatorial Appraisal Eligibility
                </span>
                <h2 className="font-headline-xl text-headline-xl text-text-on-dark-primary tracking-wide uppercase">
                  No Completed Stays Found
                </h2>
                <p className="font-subline-editorial text-subline-editorial italic text-secondary-fixed-dim leading-relaxed">
                  “No completed stays found eligible for review. Only guests with completed residences can submit a curatorial appraisal.”
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-primary text-obsidian-base font-label-caps-md text-label-caps-md uppercase tracking-wider font-semibold hover:bg-canvas-outer shadow-[0_4px_24px_rgba(255,255,255,0.22)] transition-all"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Sanctuaries</span>
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-obsidian-elevated hover:bg-surface-container-high border border-hairline-on-dark text-text-on-dark-secondary hover:text-text-on-dark-primary font-label-caps-md text-label-caps-md uppercase tracking-wider transition-colors"
                >
                  <span>Return to Home</span>
                </Link>
              </div>
            </div>
          )}

          {/* Main Form: Rendered when a booking is eligible/selected */}
          {!isLoadingBookings && selectedBooking && (
            <div className="flex flex-col w-full items-center justify-center">
              
              {/* Optional Stay Selector Pill Row if multiple eligible bookings exist */}
              {eligibleBookings.length > 1 && (
                <div className="w-full max-w-[1240px] mb-6 p-4 rounded-2xl bg-obsidian-base border border-hairline-on-dark shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-text-on-dark-secondary" />
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                      Select Residence Stay to Appraise ({eligibleBookings.length} eligible):
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {eligibleBookings.map((b) => {
                      const isCurrent = b.id === selectedBooking.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBooking(b);
                            setSubmitSuccess(false);
                            setSubmitError(null);
                          }}
                          className={cn(
                            "px-3.5 py-1.5 rounded-full text-xs font-data-tabular uppercase tracking-wider transition-all",
                            isCurrent
                              ? "bg-primary text-obsidian-base font-semibold shadow-sm"
                              : "bg-obsidian-elevated text-text-on-dark-secondary hover:text-text-on-dark-primary border border-hairline-on-dark"
                          )}
                        >
                          Stay #{b.id.slice(0, 6).toUpperCase()} ({b.checkIn ? b.checkIn.slice(0, 10) : "Stay"})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monolithic Obsidian Island Card */}
              <div className="w-full max-w-[1240px] rounded-[28px] bg-obsidian-base text-text-on-dark-primary shadow-[0_24px_54px_-12px_rgba(10,10,12,0.22),0_4px_20px_rgba(10,10,12,0.06)] relative overflow-hidden transition-all duration-300 border border-hairline-on-dark">
                
                {/* Atmospheric Lunar Glow & Subtle Eastward Light Bleed */}
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-tertiary-container/10 blur-[90px] pointer-events-none"></div>
                <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-l from-tertiary-fixed/5 via-transparent to-transparent blur-[110px] pointer-events-none"></div>

                <div className="p-6 md:p-10 lg:p-16 relative z-10 flex flex-col gap-10">
                  
                  {/* Header & Celestial Context */}
                  <header className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-4">
                    {/* Lunar Badge with Photoreal Moon Disc SVG */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute -inset-2 rounded-full bg-tertiary-fixed-dim/20 blur-md animate-pulse"></div>
                      <div className="w-14 h-14 rounded-full bg-obsidian-elevated p-1 shadow-[0_0_24px_rgba(218,228,237,0.35)] relative flex items-center justify-center border border-hairline-on-dark">
                        <svg className="w-10 h-10 text-tertiary-container" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="50" cy="50" fill="#18181B" r="46"></circle>
                          <circle cx="36" cy="42" fill="#2A2A2E" opacity="0.6" r="14"></circle>
                          <circle cx="68" cy="34" fill="#2A2A2E" opacity="0.5" r="8"></circle>
                          <circle cx="58" cy="66" fill="#2A2A2E" opacity="0.4" r="16"></circle>
                          <path d="M 50 4 A 46 46 0 0 1 96 50 A 46 46 0 0 1 50 96 A 46 46 0 0 0 50 4 Z" fill="#F7F6F4" fillOpacity="0.9" filter="drop-shadow(0px 0px 8px rgba(220, 230, 239, 0.8))"></path>
                          <path d="M 50 4 C 64 22 68 76 50 96 A 46 46 0 0 0 96 50 A 46 46 0 0 0 50 4 Z" fill="#DAE4ED" opacity="0.95"></path>
                        </svg>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-[0.2em]">
                        Aggarly by Lona • Post-Stay Curatorial Review
                      </p>
                      <h1 className="font-headline-xl text-headline-xl text-text-on-dark-primary tracking-[0.08em] uppercase">
                        Reflections on Your Residence
                      </h1>
                      <p className="font-subline-editorial text-subline-editorial italic text-secondary-fixed-dim max-w-xl mx-auto">
                        “Solitude is an architectural condition. Your appraisal preserves the sanctuary standards of our global enclave.”
                      </p>
                    </div>

                    {/* Verification Meta Capsule */}
                    <div className="inline-flex flex-wrap items-center justify-center gap-3 px-5 py-2.5 rounded-full bg-obsidian-elevated/90 border border-hairline-on-dark shadow-sm text-text-on-dark-secondary max-w-full">
                      <span className="font-label-caps-md text-label-caps-md text-text-on-dark-primary tracking-wider uppercase font-semibold truncate max-w-[200px] sm:max-w-none">
                        {property?.title || "Architectural Sanctuary"}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-hairline-on-dark"></span>
                      <span className="font-data-tabular text-data-tabular">
                        {formattedDates}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-hairline-on-dark"></span>
                      <span className="font-data-tabular text-data-tabular text-secondary">
                        #AG-{selectedBooking.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-hairline-on-dark"></span>
                      <span className="font-label-caps-sm text-label-caps-sm uppercase text-state-success flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-state-success"></span>
                        Verified Residence
                      </span>
                    </div>
                  </header>

                  {/* Submission Error Banner */}
                  {submitError && (
                    <div className="p-4 rounded-xl bg-state-error/15 border border-state-error/40 text-text-on-dark-primary flex items-center gap-3 text-sm animate-shake">
                      <AlertCircle className="w-5 h-5 text-state-error flex-shrink-0" />
                      <span className="flex-1">{submitError}</span>
                      <button
                        type="button"
                        onClick={() => setSubmitError(null)}
                        className="text-text-on-dark-secondary hover:text-text-on-dark-primary text-xs uppercase"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Curatorial Canvas: Asymmetric Two-Column Grid */}
                  <form onSubmit={handleSubmitReview} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 pt-4">
                    
                    {/* Left Column: Metrics & Granular Scores (5 Cols) */}
                    <section className="lg:col-span-5 flex flex-col gap-8 bg-surface-container-lowest/70 border border-hairline-on-dark/50 p-6 md:p-8 rounded-2xl">
                      
                      {/* Overall Rating Module */}
                      <div className="flex flex-col gap-3 pb-6 border-b border-hairline-on-dark">
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                            Overall Sanctuary Calibration
                          </span>
                          <span className="font-data-tabular text-data-tabular text-text-on-dark-primary tracking-wider font-semibold">
                            {RATING_DESCRIPTORS[hoverRating || overallRating]}
                          </span>
                        </div>

                        {/* Interactive 5-Star Lunar Scale */}
                        <div
                          aria-label="Sanctuary Rating"
                          className="flex items-center gap-3 pt-2"
                          role="radiogroup"
                        >
                          {[1, 2, 3, 4, 5].map((score) => {
                            const isFilled = (hoverRating || overallRating) >= score;

                            return (
                              <button
                                key={score}
                                type="button"
                                aria-label={`Rate ${score} Star${score > 1 ? "s" : ""}`}
                                onClick={() => setOverallRating(score)}
                                onMouseEnter={() => setHoverRating(score)}
                                onMouseLeave={() => setHoverRating(null)}
                                className={cn(
                                  "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none",
                                  isFilled
                                    ? "bg-primary text-obsidian-base shadow-[0_0_14px_rgba(255,255,255,0.6)] scale-105"
                                    : "bg-obsidian-elevated text-text-on-dark-secondary hover:text-text-on-dark-primary hover:scale-110 border border-hairline-on-dark"
                                )}
                              >
                                <Star
                                  className={cn(
                                    "w-5 h-5",
                                    isFilled ? "fill-obsidian-base stroke-obsidian-base" : "stroke-current fill-none"
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Curatorial Sub-Indices */}
                      <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                            Curatorial Sub-Indices
                          </span>
                          <span className="font-body-sm text-body-sm text-text-on-dark-secondary italic">
                            Tap to calibrate
                          </span>
                        </div>

                        {/* Criterion 1: Cleanliness */}
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-body-sm">
                            <span className="text-text-on-dark-primary font-body-sm font-medium">
                              Cleanliness &amp; Sanctuary Calibration
                            </span>
                            <span className="font-data-tabular text-data-tabular text-state-success font-semibold">
                              {cleanlinessRating}.0 ★
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-obsidian-elevated rounded-full overflow-hidden border border-hairline-on-dark/50">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${cleanlinessRating * 20}%` }}
                              />
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setCleanlinessRating(v)}
                                  className={cn(
                                    "w-5 h-5 text-[10px] font-mono rounded flex items-center justify-center transition-colors",
                                    cleanlinessRating === v
                                      ? "bg-primary text-obsidian-base font-bold"
                                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary hover:bg-obsidian-elevated"
                                  )}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Criterion 2: Architectural Serenity & Design */}
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-body-sm">
                            <span className="text-text-on-dark-primary font-body-sm font-medium">
                              Architectural Serenity &amp; Design
                            </span>
                            <span className="font-data-tabular text-data-tabular text-state-success font-semibold">
                              {accuracyRating}.0 ★
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-obsidian-elevated rounded-full overflow-hidden border border-hairline-on-dark/50">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${accuracyRating * 20}%` }}
                              />
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setAccuracyRating(v)}
                                  className={cn(
                                    "w-5 h-5 text-[10px] font-mono rounded flex items-center justify-center transition-colors",
                                    accuracyRating === v
                                      ? "bg-primary text-obsidian-base font-bold"
                                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary hover:bg-obsidian-elevated"
                                  )}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Criterion 3: Curator Responsiveness */}
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-body-sm">
                            <span className="text-text-on-dark-primary font-body-sm font-medium">
                              Curator Responsiveness
                            </span>
                            <span className="font-data-tabular text-data-tabular text-state-success font-semibold">
                              {communicationRating}.0 ★
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-obsidian-elevated rounded-full overflow-hidden border border-hairline-on-dark/50">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${communicationRating * 20}%` }}
                              />
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setCommunicationRating(v)}
                                  className={cn(
                                    "w-5 h-5 text-[10px] font-mono rounded flex items-center justify-center transition-colors",
                                    communicationRating === v
                                      ? "bg-primary text-obsidian-base font-bold"
                                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary hover:bg-obsidian-elevated"
                                  )}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Criterion 4: Nighttime Quietude & Solitude */}
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-body-sm">
                            <span className="text-text-on-dark-primary font-body-sm font-medium">
                              Nighttime Quietude &amp; Solitude
                            </span>
                            <span className="font-data-tabular text-data-tabular text-state-success font-semibold">
                              {locationRating}.0 ★
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-obsidian-elevated rounded-full overflow-hidden border border-hairline-on-dark/50">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${locationRating * 20}%` }}
                              />
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setLocationRating(v)}
                                  className={cn(
                                    "w-5 h-5 text-[10px] font-mono rounded flex items-center justify-center transition-colors",
                                    locationRating === v
                                      ? "bg-primary text-obsidian-base font-bold"
                                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary hover:bg-obsidian-elevated"
                                  )}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Criterion 5: Optics & Value */}
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-body-sm">
                            <span className="text-text-on-dark-primary font-body-sm font-medium">
                              Optics &amp; Value
                            </span>
                            <span className="font-data-tabular text-data-tabular text-state-success font-semibold">
                              {valueRating}.0 ★
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-obsidian-elevated rounded-full overflow-hidden border border-hairline-on-dark/50">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${valueRating * 20}%` }}
                              />
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setValueRating(v)}
                                  className={cn(
                                    "w-5 h-5 text-[10px] font-mono rounded flex items-center justify-center transition-colors",
                                    valueRating === v
                                      ? "bg-primary text-obsidian-base font-bold"
                                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary hover:bg-obsidian-elevated"
                                  )}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Highlight Descriptors / Quick Tag Pills */}
                      <div className="flex flex-col gap-3 pt-4 border-t border-hairline-on-dark">
                        <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                          Sanctuary Attributes
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {SANCTUARY_ATTRIBUTES.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleToggleTag(tag)}
                                className={cn(
                                  "px-3.5 py-1.5 rounded-full text-xs font-body-sm transition-all duration-200 flex items-center gap-1.5",
                                  isSelected
                                    ? "bg-primary text-obsidian-base shadow-sm font-medium"
                                    : "bg-obsidian-elevated text-text-on-dark-secondary hover:text-text-on-dark-primary border border-hairline-on-dark"
                                )}
                              >
                                <span>{isSelected ? "✓" : "+"}</span>
                                <span>{tag}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Residence Thumbnail Visual (Real Image) */}
                      <div className="relative rounded-xl overflow-hidden mt-2 border border-hairline-on-dark group">
                        {resolvedCoverImage ? (
                          <img
                            src={resolvedCoverImage}
                            alt={property?.title || "Sanctuary Visual"}
                            className="w-full h-36 object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300"
                          />
                        ) : (
                          <div className="w-full h-36 bg-obsidian-elevated flex items-center justify-center text-text-on-dark-secondary">
                            <Building className="w-8 h-8 opacity-40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base via-obsidian-base/40 to-transparent"></div>
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                          <div className="truncate mr-2">
                            <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase block">
                              Sanctuary Visual
                            </span>
                            <span className="font-headline-md text-headline-md text-text-on-dark-primary text-sm font-medium truncate block">
                              {property?.title || "Curated Sanctuary"}
                            </span>
                          </div>
                          <span className="font-data-tabular text-data-tabular text-secondary text-xs flex-shrink-0">
                            {locationDisplay}
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Right Column: Public Editorial Reflection & Submission (7 Cols) */}
                    <section className="lg:col-span-7 flex flex-col justify-between gap-8">
                      <div className="space-y-8">
                        
                        {/* Public Editorial Reflection Form Field */}
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-baseline">
                            <label
                              htmlFor="editorialReview"
                              className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest"
                            >
                              Your Editorial Reflection <span className="text-primary">*</span>
                            </label>
                            <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary">
                              Public Curatorial Digest
                            </span>
                          </div>

                          <div className="relative group">
                            <textarea
                              id="editorialReview"
                              rows={6}
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Express the sensory quality, architectural proportions, and acoustic stillness of the residence..."
                              className="w-full bg-transparent text-text-on-dark-primary font-subline-editorial text-subline-editorial leading-relaxed border-b border-hairline-on-dark focus:border-text-on-dark-primary focus:outline-none transition-colors duration-200 py-3 resize-none placeholder:text-text-on-dark-secondary/40 min-h-[140px]"
                              required
                            />
                          </div>
                          <p className="font-body-sm text-body-sm text-text-on-dark-secondary italic pt-1">
                            Published with your verified guest monogram in Aggarly’s Curated Residence Ledger.
                          </p>
                        </div>

                        {/* Identity and Verification Monogram Card */}
                        <div className="p-5 rounded-xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high border border-hairline-on-dark flex items-center justify-center text-text-on-dark-primary font-label-caps-md text-label-caps-md font-semibold tracking-wider">
                              {userMonogram}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-body-md text-body-md font-medium text-text-on-dark-primary">
                                  {user?.displayName || user?.email || "Verified Resident"}
                                </span>
                                <CheckCircle className="w-4 h-4 text-state-success" />
                              </div>
                              <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary block">
                                Verified Resident • Completed Stay
                              </span>
                            </div>
                          </div>

                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-obsidian-base border border-hairline-on-dark text-xs text-state-success font-data-tabular">
                            <span className="w-1.5 h-1.5 rounded-full bg-state-success"></span>
                            <span>Cryptographically Verified Stay</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Row */}
                      <div className="pt-6 border-t border-hairline-on-dark flex flex-col sm:flex-row items-center justify-between gap-6">
                        <Link
                          href={property ? `/properties/${property.id}` : "/properties"}
                          className="font-label-caps-md text-label-caps-md text-text-on-dark-secondary hover:text-text-on-dark-primary uppercase tracking-widest transition-colors"
                        >
                          Return without saving
                        </Link>

                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <button
                            type="submit"
                            disabled={isSubmitting || submitSuccess}
                            className={cn(
                              "group relative w-full sm:w-auto inline-flex items-center justify-center h-[48px] px-8 rounded-full bg-primary text-obsidian-base font-label-caps-md text-label-caps-md tracking-[0.14em] uppercase transition-all duration-200 shadow-[0_4px_24px_rgba(255,255,255,0.22)] active:scale-95 font-semibold",
                              isSubmitting || submitSuccess
                                ? "opacity-75 cursor-not-allowed"
                                : "hover:bg-canvas-outer"
                            )}
                          >
                            {isSubmitting ? (
                              <span className="flex items-center gap-2">
                                <RotateCw className="w-4 h-4 animate-spin" />
                                <span>Inscribing Review...</span>
                              </span>
                            ) : submitSuccess ? (
                              <span className="flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                <span>Review Inscribed</span>
                              </span>
                            ) : (
                              <>
                                <span>Commit Residence Review</span>
                                <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </section>
                  </form>

                  {/* Confirmation Banner (Revealed on successful submission) */}
                  {submitSuccess && (
                    <div className="mt-6 p-6 rounded-2xl bg-surface-container-low border border-state-success/40 shadow-[0_0_30px_rgba(220,230,239,0.15)] transition-all animate-fadeIn">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-state-success/20 text-state-success flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-headline-md text-headline-md text-text-on-dark-primary">
                              Curatorial Record Logged
                            </h4>
                            <p className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                              Your appraisal for <strong className="text-text-on-dark-primary">{property?.title || "the residence"}</strong> is sealed under cryptographic verification hash <span className="font-mono text-state-success">{verificationHash}</span>.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                          {selectedBooking?.propertyId && (
                            <Link
                              href={`/properties/${selectedBooking.propertyId}`}
                              className="px-5 py-2.5 rounded-full bg-primary text-obsidian-base font-label-caps-sm text-label-caps-sm font-semibold uppercase tracking-wider hover:bg-canvas-outer transition-colors flex items-center gap-1.5"
                            >
                              <span>View Property Reviews</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          <Link
                            href="/properties"
                            className="px-4 py-2.5 rounded-full bg-obsidian-elevated hover:bg-surface-container-high border border-hairline-on-dark text-text-on-dark-secondary hover:text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors"
                          >
                            Explore More
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Global Footer matching design reference */}
      <footer className="w-full bg-canvas-outer border-t border-hairline-on-light py-10">
        <div className="w-full max-w-[1560px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary text-center md:text-left tracking-[0.14em]">
            © 2025 AGGARLY BY LONA. ALL RIGHTS RESERVED. CELESTIAL ARCHITECTURAL SOLITUDE
          </div>
          <div className="flex items-center gap-6">
            <Link className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary hover:text-text-on-light-primary uppercase transition-colors" href="/properties">
              Stays &amp; Retreats
            </Link>
            <Link className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary hover:text-text-on-light-primary uppercase transition-colors" href="/host">
              Host Portfolio
            </Link>
            <Link className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary hover:text-text-on-light-primary uppercase transition-colors" href="/moon-phase">
              Moon Phase
            </Link>
            <Link className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary hover:text-text-on-light-primary uppercase transition-colors" href="/chat">
              Curator Concierge
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
