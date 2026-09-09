"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PropertyDetail } from "../../lib/propertyTypes";
import { PropertyClient } from "../../lib/propertyClient";
import { AvailabilityCalendarStripCard } from "../chat/cards/AvailabilityCalendarStripCard";
import { CalendarIcon } from "../common/Icons";

interface StickyBookingWidgetProps {
  property: PropertyDetail;
  onAskLumen: (prompt: string) => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const StickyBookingWidget: React.FC<StickyBookingWidgetProps> = ({
  property,
  onAskLumen,
}) => {
  const router = useRouter();

  // Helper to format ISO date "YYYY-MM-DD" into "Aug 24, 2026"
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return "Add date";
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3) return dateStr;
    const m = MONTH_NAMES[parts[1] - 1] || "";
    return `${m} ${parts[2]}, ${parts[0]}`;
  };

  // Start with empty dates by default so users choose their stay explicitly (no auto-selected 10-17 dates)
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [guests, setGuests] = useState<number>(2);
  const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [blockedDates, setBlockedDates] = useState<Array<{ start: string; end: string; reason?: string }>>([]);

  const calendarPopoverRef = useRef<HTMLDivElement>(null);

  // Load real blocked dates from backend
  useEffect(() => {
    let isMounted = true;
    async function fetchBlocked() {
      try {
        const today = new Date();
        const from = today.toISOString().split("T")[0];
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const to = nextMonth.toISOString().split("T")[0];
        const dates = await PropertyClient.getPropertyBlockedDates(property.id, from, to);
        if (isMounted) setBlockedDates(dates);
      } catch {
        // silently ignore — calendar still usable without blocked dates
      }
    }
    if (property.id) fetchBlocked();
    return () => { isMounted = false; };
  }, [property.id]);

  // Close calendar popover on outside click
  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarPopoverRef.current &&
        !calendarPopoverRef.current.contains(e.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCalendarOpen]);

  // Calculate nights
  const hasDates = Boolean(checkIn && checkOut && checkOut > checkIn);
  let nights = 0;
  if (hasDates) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diffTime = Math.max(0, d2.getTime() - d1.getTime());
    nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const baseTotal = hasDates ? property.basePricePerNight * nights : 0;
  const cleaningFee = hasDates ? property.cleaningFee : 0;
  const serviceFee = hasDates ? Math.round(baseTotal * property.serviceFeePercent) : 0;
  const grandTotal = baseTotal + cleaningFee + serviceFee;

  const handleDatesSelected = (start: string, end: string) => {
    setCheckIn(start);
    // Only close calendar when both start and end date are selected (user clicked 2 separate days)
    if (end && end !== start) {
      setCheckOut(end);
      setIsCalendarOpen(false);
    }
  };

  const handleReserveClick = () => {
    if (!hasDates) {
      setIsCalendarOpen(true);
      return;
    }
    setIsReserving(true);
    router.push(
      `/properties/${property.id}/checkout?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(
        checkOut
      )}&guests=${guests}`
    );
  };

  return (
    <aside className="sticky-booking-widget-wrapper">
      <div className="sticky-booking-card">
        {/* Price & Rating Header */}
        <div className="booking-card-header">
          <div className="booking-price-line">
            <span className="numeral-gold price-amount">
              {property.currency}{property.basePricePerNight.toLocaleString()}
            </span>
            <span className="price-unit">/ night</span>
          </div>

          <div className="booking-rating-line">
            <span className="star-gold">★</span>
            <span className="rating-val">{property.reviewSummary.avgRating.toFixed(2)}</span>
            <span className="rating-sep">·</span>
            <span className="reviews-link">{property.reviewSummary.totalReviews} reviews</span>
          </div>
        </div>

        {/* Date & Guest Input Box */}
        <div className="booking-inputs-box">
          {/* Custom Date Trigger Row */}
          <div
            className="booking-dates-row clickable-date-row"
            onClick={() => {
              setIsGuestDropdownOpen(false);
              setIsCalendarOpen((prev) => !prev);
            }}
            role="button"
            tabIndex={0}
            title="Open Interactive Booking Calendar"
          >
            <div className="date-input-col date-col-left">
              <label className="input-micro-label">CHECK-IN</label>
              <div className="custom-date-val-box">
                <CalendarIcon size={13} color="var(--accent-coral)" />
                <span className="date-text-val">{formatDisplayDate(checkIn)}</span>
              </div>
            </div>

            <div className="date-input-col date-col-right">
              <label className="input-micro-label">CHECK-OUT</label>
              <div className="custom-date-val-box">
                <CalendarIcon size={13} color="var(--accent-coral)" />
                <span className="date-text-val">{formatDisplayDate(checkOut)}</span>
              </div>
            </div>
          </div>

          {/* Floating Calendar Popover */}
          {isCalendarOpen && (
            <div ref={calendarPopoverRef} className="booking-calendar-popover animate-fade-in">
              <div className="calendar-popover-header">
                <span className="popover-title">Choose reservation dates</span>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(false)}
                  className="popover-close-x"
                >
                  ✕
                </button>
              </div>
              <AvailabilityCalendarStripCard
                data={{
                  propertyId: property.id,
                  propertyTitle: property.title,
                  nightlyRate: property.basePricePerNight,
                  minimumStayNights: 1,
                  blockedDates,
                }}
                initialCheckIn={checkIn}
                initialCheckOut={checkOut}
                onSelectDateRange={handleDatesSelected}
              />
            </div>
          )}

          {/* Guest Count Selector */}
          <div
            className="booking-guest-row"
            onClick={() => {
              setIsCalendarOpen(false);
              setIsGuestDropdownOpen(!isGuestDropdownOpen);
            }}
          >
            <div className="guest-label-wrap">
              <label className="input-micro-label">GUESTS</label>
              <span className="guest-current-val">
                {guests} guest{guests > 1 ? "s" : ""}
              </span>
            </div>
            <span className="guest-dropdown-arrow">{isGuestDropdownOpen ? "▲" : "▼"}</span>
          </div>

          {/* Guest dropdown popover */}
          {isGuestDropdownOpen && (
            <div className="guest-stepper-popover animate-fade-in">
              <div className="guest-stepper-row">
                <div className="guest-stepper-label">
                  <span className="stepper-type">Guests</span>
                  <span className="stepper-sub">Age 13+ (Max {property.maxGuests})</span>
                </div>
                <div className="stepper-controls">
                  <button
                    type="button"
                    disabled={guests <= 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuests((prev) => Math.max(1, prev - 1));
                    }}
                    className="stepper-btn"
                  >
                    –
                  </button>
                  <span className="stepper-count">{guests}</span>
                  <button
                    type="button"
                    disabled={guests >= property.maxGuests}
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuests((prev) => Math.min(property.maxGuests, prev + 1));
                    }}
                    className="stepper-btn"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGuestDropdownOpen(false);
                }}
                className="btn-stepper-close"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Primary Reserve CTA */}
        <button
          type="button"
          onClick={handleReserveClick}
          className="btn-reserve-primary"
          disabled={isReserving}
        >
          {isReserving ? "Connecting to Lumen..." : hasDates ? "Reserve Stay" : "Check Availability & Dates"}
        </button>

        <p className="booking-reassurance-text">{hasDates ? "You won't be charged yet" : "Select dates to see total commitment"}</p>

        {/* Real-time Price Line Items */}
        {hasDates && (
          <div className="booking-price-table">
            <div className="price-line-row">
              <span className="line-label">
                {property.currency}{property.basePricePerNight} × {nights} night{nights > 1 ? "s" : ""}
              </span>
              <span className="line-val">
                {property.currency}{baseTotal.toLocaleString()}
              </span>
            </div>

            <div className="price-line-row">
              <span className="line-label">Cleaning & sanitation fee</span>
              <span className="line-val">{property.currency}{cleaningFee}</span>
            </div>

            <div className="price-line-row">
              <span className="line-label">Aggarly luxury service fee</span>
              <span className="line-val">{property.currency}{serviceFee}</span>
            </div>

            <div className="price-total-row">
              <span className="total-label">Total before taxes</span>
              <span className="numeral-gold total-amount">
                {property.currency}{grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Ask Lumen Ambient AI Trigger */}
        <div className="booking-lumen-sidecar">
          <div className="lumen-sidecar-avatar">
            <span className="lumen-sparkle">✦</span>
          </div>
          <div className="lumen-sidecar-content">
            <p className="lumen-sidecar-title">Have questions about this villa?</p>
            <button
              type="button"
              onClick={() => onAskLumen(`What are the check-in rules and cancellation options for ${property.title}?`)}
              className="btn-ask-lumen-ghost"
            >
              Ask Lumen AI Concierge
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
