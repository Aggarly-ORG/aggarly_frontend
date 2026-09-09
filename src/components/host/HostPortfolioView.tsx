"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import {
  HostClient,
  HostPropertyItem,
  HostBookingItem,
} from "../../lib/hostClient";
import { LonaHeader } from "../common/LonaHeader";
import {
  Sparkles,
  TrendingUp,
  Star,
  Users,
  Calendar,
  Settings,
  ArrowRight,
  Download,
  RotateCw,
  Plus,
  Bed,
  Bath,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Activity,
  Home,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type FilterTab = "ALL" | "ACTIVE" | "INACTIVE" | "DRAFT";

export const HostPortfolioView: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [properties, setProperties] = useState<HostPropertyItem[]>([]);
  const [bookings, setBookings] = useState<HostBookingItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPrevPage, setHasPrevPage] = useState<boolean>(false);
  const pageSize = 10;
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const fetchPortfolioData = useCallback(async (page: number = 0) => {
    setIsLoadingData(true);
    try {
      const [pageData, bookingsData] = await Promise.all([
        HostClient.getMyProperties(page, pageSize),
        HostClient.getHostBookings(),
      ]);
      setProperties(pageData.items || []);
      setCurrentPage(pageData.page);
      setTotalPages(pageData.totalPages);
      setTotalElements(pageData.totalElements);
      setHasNextPage(pageData.hasNext);
      setHasPrevPage(pageData.hasPrevious);
      setBookings(bookingsData || []);
      setLastUpdated(new Date());
    } catch {
      // Ignore network errors
    } finally {
      setIsLoadingData(false);
    }
  }, [pageSize]);

  // Fetch dashboard data on mount and auth state
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      fetchPortfolioData(currentPage);
    } else {
      const timer = setTimeout(() => {
        if (isMounted && !authLoading) {
          setIsLoadingData(false);
        }
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authLoading, fetchPortfolioData, currentPage]);

  // Explicit user-triggered refresh
  const handleRefresh = useCallback(async () => {
    await fetchPortfolioData(currentPage);
  }, [fetchPortfolioData, currentPage]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setCurrentPage(newPage);
  }, [totalPages]);

  // Lookup map for fast property title resolution
  const propertyMap = useMemo(() => {
    const map = new Map<string, HostPropertyItem>();
    properties.forEach((p) => map.set(p.id, p));
    return map;
  }, [properties]);

  // Dynamic KPI Calculations (ZERO MOCK DATA)
  const kpis = useMemo(() => {
    // 1. Net Revenue: sum of totalAmount for completed / confirmed bookings
    const confirmedBookings = bookings.filter(
      (b) => b.status === "CONFIRMED" || b.status === "COMPLETED"
    );
    const netRevenue = confirmedBookings.reduce(
      (sum, b) => sum + (Number(b.totalAmount) || 0),
      0
    );

    // 2. Occupancy Rate: Booked nights in current month vs total available capacity
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalPotentialNights = Math.max(1, properties.length * daysInMonth);

    // Sum booked nights falling within current month
    let bookedNightsThisMonth = 0;
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth, daysInMonth);

    confirmedBookings.forEach((b) => {
      const checkInDate = new Date(b.checkIn);
      const checkOutDate = new Date(b.checkOut);
      const effectiveStart = checkInDate > monthStart ? checkInDate : monthStart;
      const effectiveEnd = checkOutDate < monthEnd ? checkOutDate : monthEnd;
      if (effectiveEnd > effectiveStart) {
        const nights = Math.round(
          (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        bookedNightsThisMonth += nights;
      }
    });

    const occupancyRate =
      properties.length === 0
        ? 0
        : Math.min(100, Math.round((bookedNightsThisMonth / totalPotentialNights) * 100));

    // Calculate average stay duration across bookings
    const totalNights = confirmedBookings.reduce((sum, b) => {
      const inD = new Date(b.checkIn).getTime();
      const outD = new Date(b.checkOut).getTime();
      const nights = Math.max(1, Math.round((outD - inD) / (1000 * 60 * 60 * 24)));
      return sum + nights;
    }, 0);
    const avgStayDuration =
      confirmedBookings.length > 0
        ? (totalNights / confirmedBookings.length).toFixed(1)
        : "0.0";

    // 3. Sanctuary Index: average rating across properties
    const ratedProperties = properties.filter(
      (p) => typeof p.avgRating === "number" && p.avgRating > 0
    );
    const avgRating =
      ratedProperties.length > 0
        ? ratedProperties.reduce((sum, p) => sum + (p.avgRating || 0), 0) /
          ratedProperties.length
        : null;

    const totalReviewCount = properties.reduce(
      (sum, p) => sum + (p.reviewCount || 0),
      0
    );

    // 4. Upcoming Arrivals: count of bookings with checkIn >= today
    const upcomingBookings = bookings.filter(
      (b) =>
        b.checkIn >= today &&
        (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT")
    );
    const upcomingGuestCount = upcomingBookings.reduce(
      (sum, b) => sum + (b.guestCount || 1),
      0
    );

    // Next upcoming arrival details
    const sortedUpcoming = [...upcomingBookings].sort((a, b) =>
      a.checkIn.localeCompare(b.checkIn)
    );
    const nextArrival = sortedUpcoming[0];
    const nextArrivalProperty = nextArrival
      ? propertyMap.get(nextArrival.propertyId)
      : null;

    return {
      netRevenue,
      occupancyRate,
      avgStayDuration,
      avgRating,
      totalReviewCount,
      upcomingArrivalsCount: upcomingBookings.length,
      upcomingGuestCount,
      nextArrival,
      nextArrivalProperty,
    };
  }, [bookings, properties, propertyMap, today]);

  // Filtered properties based on status tab
  const counts = useMemo(
    () => ({
      all: totalElements || properties.length,
      active: properties.filter((p) => p.status === "ACTIVE").length,
      inactive: properties.filter((p) => p.status === "INACTIVE").length,
      draft: properties.filter((p) => p.status === "DRAFT").length,
    }),
    [properties, totalElements]
  );

  const filteredProperties = useMemo(() => {
    if (activeTab === "ALL") return properties;
    return properties.filter((p) => p.status === activeTab);
  }, [properties, activeTab]);

  // Pending guest inquiries: bookings with status === 'PENDING_PAYMENT'
  const pendingInquiries = useMemo(() => {
    return bookings.filter((b) => b.status === "PENDING_PAYMENT");
  }, [bookings]);

  // Handle Accept Booking
  const handleAcceptBooking = async (bookingId: string) => {
    setProcessingBookingId(bookingId);
    try {
      const ok = await HostClient.acceptBooking(bookingId);
      if (ok) {
        setActionFeedback("Residency inquiry confirmed and calibrated.");
        // Optimistically update
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "CONFIRMED" } : b))
        );
      } else {
        setActionFeedback("Failed to confirm booking inquiry with server.");
      }
    } catch {
      setActionFeedback("Network error confirming reservation.");
    } finally {
      setProcessingBookingId(null);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Handle Decline Booking
  const handleDeclineBooking = async (bookingId: string) => {
    if (!window.confirm("Are you sure you wish to decline this guest inquiry?")) return;
    setProcessingBookingId(bookingId);
    try {
      const ok = await HostClient.cancelBooking(bookingId, "Declined by sanctuary host");
      if (ok) {
        setActionFeedback("Residency inquiry has been respectfully declined.");
        // Optimistically update
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
        );
      } else {
        setActionFeedback("Server rejected inquiry cancellation request.");
      }
    } catch {
      setActionFeedback("Network error declining reservation.");
    } finally {
      setProcessingBookingId(null);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Export Telemetry and Portfolio Data
  const handleExportData = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      hostUser: user?.email || "curator",
      summaryKpis: {
        netRevenueEur: kpis.netRevenue,
        occupancyRatePercent: kpis.occupancyRate,
        sanctuaryIndex: kpis.avgRating ?? "Unrated",
        upcomingGuestArrivals: kpis.upcomingGuestCount,
        totalSanctuaries: properties.length,
      },
      sanctuaries: properties.map((p) => ({
        id: p.id,
        title: p.title,
        propertyType: p.propertyType,
        status: p.status,
        basePricePerNight: p.basePricePerNight,
        city: p.address?.city,
        country: p.address?.country,
        maxGuests: p.maxGuests,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        avgRating: p.avgRating,
        reviewCount: p.reviewCount,
      })),
      bookings: bookings.map((b) => ({
        id: b.id,
        propertyId: b.propertyId,
        propertyTitle: propertyMap.get(b.propertyId)?.title || "Unknown Retreat",
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        guestCount: b.guestCount,
        status: b.status,
        totalAmount: b.totalAmount,
        currency: b.currency,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aggarly-host-telemetry-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Formatter helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-canvas-outer text-[#151415] flex flex-col selection:bg-obsidian-base selection:text-text-on-dark-primary">
      {/* Top Main Navigation */}
      <LonaHeader />

      {/* Main Container */}
      <main className="w-full flex-grow pt-4 sm:pt-6 pb-20 px-3 sm:px-6 lg:px-10 xl:px-12">
        <div className="w-full max-w-[1560px] mx-auto">
          {/* Action Feedback Toast */}
          {actionFeedback && (
            <div className="mb-4 p-4 rounded-xl bg-obsidian-base border border-state-success text-state-success text-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-2xl">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-state-success" />
                <span>{actionFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="text-text-on-dark-secondary hover:text-text-on-dark-primary text-xs uppercase cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Central Monolithic Rounded Obsidian Card */}
          <div className="w-full bg-obsidian-base text-text-on-dark-primary rounded-[28px] border border-hairline-on-dark shadow-[0_24px_48px_-12px_rgba(10,10,12,0.25),0_4px_16px_rgba(10,10,12,0.08)] p-6 sm:p-8 lg:p-12 flex flex-col gap-8 relative overflow-hidden">
            {/* Atmospheric Celestial Bloom & Glow Effects */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-tertiary-fixed/5 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full bg-tertiary-fixed-dim/5 blur-[100px] pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-hairline-on-dark relative z-10">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-state-success shadow-[0_0_10px_rgba(143,174,151,0.6)]" />
                  <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-[0.16em]">
                    Verified Host &amp; Curator Portal
                  </span>
                </div>
                <h1 className="font-headline-xl text-3xl sm:text-4xl lg:text-[44px] text-text-on-dark-primary tracking-[0.08em] uppercase leading-tight">
                  Host Portfolio &amp; Sanctuaries
                </h1>
                <p className="font-subline-editorial text-base sm:text-lg text-text-on-dark-secondary italic">
                  Aggarly by Lona • Prime Balearic &amp; Mediterranean Residences
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isLoadingData}
                  className="h-[46px] px-4 rounded-full bg-transparent border border-hairline-on-dark hover:border-text-on-dark-primary transition-colors flex items-center gap-2 text-text-on-dark-secondary hover:text-text-on-dark-primary font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] cursor-pointer disabled:opacity-50"
                  title="Synchronize Live Telemetry"
                >
                  <RotateCw
                    className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Sync</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportData}
                  className="group h-[46px] px-5 sm:px-6 rounded-full bg-transparent border border-hairline-on-dark hover:border-text-on-dark-primary transition-colors flex items-center gap-2 text-text-on-dark-primary font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] cursor-pointer"
                >
                  <Download className="w-4 h-4 text-text-on-dark-secondary group-hover:text-text-on-dark-primary transition-colors" />
                  <span>Export Telemetry</span>
                </button>

                <Link
                  href="/host/sanctuaries/new"
                  className="group h-[46px] px-6 sm:px-7 rounded-full bg-text-on-dark-primary hover:bg-canvas-outer text-obsidian-base font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] transition-all flex items-center gap-2 shadow-[0_8px_20px_rgba(245,244,241,0.12)] font-semibold"
                >
                  <span>+ Add New Retreat</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Authentication Gate Warning */}
            {!authLoading && !isAuthenticated && (
              <div className="relative z-10 p-6 rounded-2xl bg-obsidian-elevated border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-text-on-dark-primary text-sm">
                      Host Authentication Required
                    </h3>
                    <p className="text-xs text-text-on-dark-secondary">
                      Sign in with your Aggarly host credentials to manage your residences, occupancy, and guest requests.
                    </p>
                  </div>
                </div>
                <Link
                  href="/auth"
                  className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-zinc-200 shrink-0"
                >
                  Sign In →
                </Link>
              </div>
            )}

            {/* Dynamic Telemetry KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
              {/* KPI 1: Net Revenue */}
              <div className="p-6 rounded-xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between min-h-[140px] hover:border-text-on-dark-secondary/40 transition-colors">
                <div className="flex items-center justify-between text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-[0.14em]">
                  <span>Net Revenue (Total)</span>
                  <span className="text-state-success flex items-center text-[12px]">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" />
                    Verified
                  </span>
                </div>
                <div className="flex flex-col mt-3">
                  <span className="font-headline-lg text-headline-lg text-text-on-dark-primary">
                    {formatCurrency(kpis.netRevenue)}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                    {bookings.filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED").length} confirmed bookings • {properties.length} retreats
                  </span>
                </div>
              </div>

              {/* KPI 2: Occupancy Rate */}
              <div className="p-6 rounded-xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between min-h-[140px] hover:border-text-on-dark-secondary/40 transition-colors">
                <div className="flex items-center justify-between text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-[0.14em]">
                  <span>Occupancy Rate</span>
                  <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                    {new Date().toLocaleString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex flex-col mt-3">
                  <span className="font-headline-lg text-headline-lg text-text-on-dark-primary">
                    {kpis.occupancyRate}%
                  </span>
                  <div className="w-full bg-surface-container h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-state-success h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(4, kpis.occupancyRate)}%` }}
                    />
                  </div>
                  <span className="font-body-sm text-body-sm text-text-on-dark-secondary mt-2">
                    Average stay duration: {kpis.avgStayDuration} nights
                  </span>
                </div>
              </div>

              {/* KPI 3: Sanctuary Index */}
              <div className="p-6 rounded-xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between min-h-[140px] hover:border-text-on-dark-secondary/40 transition-colors">
                <div className="flex items-center justify-between text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-[0.14em]">
                  <span>Sanctuary Index</span>
                  <span className="px-2 py-0.5 rounded-full bg-obsidian-base border border-hairline-on-dark text-text-on-dark-primary font-label-caps-sm text-[10px]">
                    {kpis.avgRating && kpis.avgRating >= 4.8 ? "ELITE" : "CURATED"}
                  </span>
                </div>
                <div className="flex flex-col mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg text-text-on-dark-primary">
                      {kpis.avgRating ? kpis.avgRating.toFixed(2) : "New"}
                    </span>
                    {kpis.avgRating && (
                      <span className="text-[#dfb15b] font-headline-md text-headline-md">
                        ★
                      </span>
                    )}
                  </div>
                  <span className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                    {kpis.totalReviewCount} verified guest reviews
                  </span>
                </div>
              </div>

              {/* KPI 4: Upcoming Arrivals */}
              <div className="p-6 rounded-xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between min-h-[140px] hover:border-text-on-dark-secondary/40 transition-colors">
                <div className="flex items-center justify-between text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-[0.14em]">
                  <span>Upcoming Arrivals</span>
                  <span className="w-2 h-2 rounded-full bg-state-success animate-ping" />
                </div>
                <div className="flex flex-col mt-3">
                  <span className="font-headline-lg text-headline-lg text-text-on-dark-primary">
                    {kpis.upcomingGuestCount} Guests
                  </span>
                  <span className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1 truncate">
                    {kpis.nextArrival ? (
                      <>
                        Next: {formatDateLabel(kpis.nextArrival.checkIn)} •{" "}
                        {kpis.nextArrivalProperty?.title || "Sanctuary"}
                      </>
                    ) : (
                      "No incoming arrivals scheduled"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Operational Workspace (Asymmetric Layout: 7 Cols Left, 5 Cols Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
              {/* Left Column: Sanctuaries Inventory (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Sanctuary Filter Tabs */}
                <div className="flex items-center justify-between border-b border-hairline-on-dark pb-4">
                  <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setActiveTab("ALL")}
                      className={`font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] pb-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === "ALL"
                          ? "text-text-on-dark-primary border-b-2 border-text-on-dark-primary"
                          : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                      }`}
                    >
                      All ({counts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ACTIVE")}
                      className={`font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] pb-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === "ACTIVE"
                          ? "text-text-on-dark-primary border-b-2 border-text-on-dark-primary"
                          : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                      }`}
                    >
                      Active ({counts.active})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("INACTIVE")}
                      className={`font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] pb-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === "INACTIVE"
                          ? "text-text-on-dark-primary border-b-2 border-text-on-dark-primary"
                          : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                      }`}
                    >
                      In Calibration ({counts.inactive})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("DRAFT")}
                      className={`font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] pb-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === "DRAFT"
                          ? "text-text-on-dark-primary border-b-2 border-text-on-dark-primary"
                          : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                      }`}
                    >
                      Draft ({counts.draft})
                    </button>
                  </div>
                  <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary hidden sm:inline-block">
                    Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Loading State */}
                {isLoadingData && properties.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <RotateCw className="w-8 h-8 text-[#dfb15b] animate-spin" />
                    <p className="text-sm font-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                      Synthesizing Sanctuary Portfolios...
                    </p>
                  </div>
                )}

                {/* Empty State */}
                {!isLoadingData && filteredProperties.length === 0 && (
                  <div className="p-10 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-obsidian-base border border-hairline-on-dark flex items-center justify-center text-text-on-dark-secondary">
                      <Home className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-sm">
                      <h4 className="font-headline-md text-lg text-text-on-dark-primary">
                        No Sanctuaries in {activeTab === "ALL" ? "Portfolio" : activeTab === "ACTIVE" ? "Active" : activeTab === "INACTIVE" ? "Calibration" : "Draft"}
                      </h4>
                      <p className="text-xs text-text-on-dark-secondary font-body-sm">
                        {properties.length === 0
                          ? "You have not listed any secluded architectural retreats yet. Begin your curation journey now."
                          : `There are currently no sanctuaries designated with the status '${activeTab}'.`}
                      </p>
                    </div>
                    <Link
                      href="/host/sanctuaries/new"
                      className="mt-2 px-6 py-2.5 rounded-full bg-text-on-dark-primary text-obsidian-base font-semibold text-xs uppercase tracking-wider hover:bg-canvas-outer transition-colors inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Sanctuary
                    </Link>
                  </div>
                )}

                {/* Property Cards List */}
                <div className="flex flex-col gap-6">
                  {filteredProperties.map((property) => {
                    // Check if there is an active resident currently checked in today
                    const activeResident = bookings.find(
                      (b) =>
                        b.propertyId === property.id &&
                        (b.status === "CONFIRMED" || b.status === "COMPLETED") &&
                        b.checkIn <= today &&
                        b.checkOut >= today
                    );

                    // Next upcoming booking for this property
                    const nextBooking = bookings
                      .filter(
                        (b) =>
                          b.propertyId === property.id &&
                          b.checkIn >= today &&
                          (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT")
                      )
                      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];

                    // Cover photo resolution
                    const coverImageObj =
                      property.images?.find((img) => img.isCover) ||
                      property.images?.[0];
                    const rawKey = coverImageObj?.objectKey || coverImageObj?.imageUrl || (coverImageObj as any)?.url;
                    const coverImageUrl = rawKey
                      ? HostClient.resolveImageUrl(rawKey)
                      : "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";

                    return (
                      <div
                        key={property.id}
                        className="rounded-2xl bg-obsidian-elevated border border-hairline-on-dark hover:border-text-on-dark-secondary/50 transition-all duration-300 overflow-hidden flex flex-col group"
                      >
                        {/* Cover Image & Badges */}
                        <div className="relative w-full h-64 sm:h-72 overflow-hidden bg-surface-container">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverImageUrl}
                            alt={property.title}
                            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          />

                          {/* Gradient Overlay for Readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-obsidian-elevated via-transparent to-black/40" />

                          {/* Top Badges */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                            <span className="px-3 py-1 rounded-full bg-obsidian-base/80 backdrop-blur-md border border-hairline-on-dark text-text-on-dark-primary font-label-caps-sm text-[11px] uppercase tracking-wider">
                              {property.address?.city || "Balearic Isles"}, {property.address?.country || "Spain"}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full backdrop-blur-md border font-label-caps-sm text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${
                                property.status === "ACTIVE"
                                  ? "bg-state-success/20 border-state-success/40 text-state-success"
                                  : property.status === "INACTIVE"
                                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                  : "bg-zinc-500/20 border-zinc-500/40 text-zinc-300"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  property.status === "ACTIVE"
                                    ? "bg-state-success"
                                    : property.status === "INACTIVE"
                                    ? "bg-amber-400"
                                    : "bg-zinc-400"
                                }`}
                              />
                              {property.status === "ACTIVE"
                                ? "Active Listing"
                                : property.status === "INACTIVE"
                                ? "In Calibration"
                                : "Draft"}
                            </span>
                          </div>

                          {/* Bottom info strip on photo */}
                          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-text-on-dark-primary">
                            <div>
                              <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase tracking-[0.14em]">
                                {property.propertyType}
                              </span>
                              <h3 className="font-headline-md text-2xl text-text-on-dark-primary drop-shadow-md">
                                {property.title}
                              </h3>
                            </div>
                            <div className="text-right">
                              <span className="font-data-tabular text-xl font-semibold text-text-on-dark-primary">
                                {formatCurrency(property.basePricePerNight)}
                              </span>
                              <span className="block text-[11px] text-text-on-dark-secondary font-normal">
                                / night
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Active Resident Banner (If currently occupied today) */}
                        {activeResident && (
                          <div className="px-5 py-3 bg-obsidian-bubble border-y border-hairline-on-dark flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
                              <span className="font-label-caps-sm text-xs text-text-on-dark-primary font-semibold tracking-wider uppercase">
                                Currently Hosted Resident
                              </span>
                            </div>
                            <span className="font-body-sm text-xs text-text-on-dark-secondary">
                              {activeResident.guestCount} Guests • Checkout {formatDateLabel(activeResident.checkOut)}
                            </span>
                          </div>
                        )}

                        {/* Details & Action Footer */}
                        <div className="p-5 flex flex-col gap-4">
                          {/* Property Details Row */}
                          <div className="flex flex-wrap items-center justify-between text-xs text-text-on-dark-secondary font-body-sm gap-2">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-text-on-dark-secondary" />
                                {property.maxGuests} Guests
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Bed className="w-3.5 h-3.5 text-text-on-dark-secondary" />
                                {property.bedrooms} Suites
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Bath className="w-3.5 h-3.5 text-text-on-dark-secondary" />
                                {property.bathrooms} Baths
                              </span>
                            </div>

                            {property.avgRating ? (
                              <div className="flex items-center gap-1 text-[#dfb15b]">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="font-data-tabular font-medium text-text-on-dark-primary">
                                  {property.avgRating.toFixed(2)}
                                </span>
                                <span className="text-[11px] text-text-on-dark-secondary">
                                  ({property.reviewCount || 0})
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-on-dark-secondary">
                                New Sanctuary
                              </span>
                            )}
                          </div>

                          {/* Next Arrival or Status note */}
                          {!activeResident && (
                            <div className="text-xs text-text-on-dark-secondary">
                              {nextBooking ? (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-state-success" />
                                  Next Arrival: {formatDateLabel(nextBooking.checkIn)} ({nextBooking.guestCount} Guests)
                                </span>
                              ) : (
                                <span className="text-zinc-500">
                                  Ready for incoming residency bookings
                                </span>
                              )}
                            </div>
                          )}

                          {/* Actions Row */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-hairline-on-dark">
                            <Link
                              href={`/host/manage/${property.id}`}
                              className="h-10 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors font-label-caps-sm text-label-caps-sm uppercase tracking-[0.12em] text-text-on-dark-primary flex items-center justify-center gap-1.5"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              <span>Manage</span>
                            </Link>
                            <Link
                              href={`/host/manage/${property.id}?tab=calendar`}
                              className="h-10 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors font-label-caps-sm text-label-caps-sm uppercase tracking-[0.12em] text-text-on-dark-primary flex items-center justify-center gap-1.5"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Calendar</span>
                            </Link>
                            <Link
                              href={`/properties/${property.id}`}
                              target="_blank"
                              className="col-span-2 sm:col-span-1 h-10 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors font-label-caps-sm text-label-caps-sm uppercase tracking-[0.12em] text-text-on-dark-secondary hover:text-text-on-dark-primary flex items-center justify-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View Public</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls (10 by 10 properties) */}
                {totalPages > 1 && (
                  <div className="p-4 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-text-on-dark-secondary font-body-sm">
                      Showing <span className="font-semibold text-text-on-dark-primary">{currentPage * pageSize + 1}</span> to{" "}
                      <span className="font-semibold text-text-on-dark-primary">
                        {Math.min((currentPage + 1) * pageSize, totalElements)}
                      </span>{" "}
                      of <span className="font-semibold text-text-on-dark-primary">{totalElements}</span> sanctuaries
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!hasPrevPage || isLoadingData}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-all font-label-caps-sm text-xs uppercase tracking-wider text-text-on-dark-primary flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      <div className="px-3 py-1.5 rounded-lg bg-obsidian-base border border-hairline-on-dark text-xs font-data-tabular text-text-on-dark-primary">
                        Page {currentPage + 1} of {totalPages}
                      </div>

                      <button
                        type="button"
                        disabled={!hasNextPage || isLoadingData}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-all font-label-caps-sm text-xs uppercase tracking-wider text-text-on-dark-primary flex items-center gap-1.5"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Operations, Approvals & Curator Signals (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Pending Inquiries Panel */}
                <div className="rounded-2xl bg-obsidian-elevated border border-hairline-on-dark p-6 flex flex-col gap-5">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-tertiary-fixed" />
                      <h3 className="font-label-caps-md text-label-caps-md uppercase tracking-[0.14em] text-text-on-dark-primary">
                        Pending Guest Inquiries
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-obsidian-base border border-hairline-on-dark text-tertiary-fixed font-data-tabular text-[11px]">
                      {pendingInquiries.length} Pending
                    </span>
                  </div>

                  {/* Inquiry Items List */}
                  {pendingInquiries.length === 0 ? (
                    <div className="p-6 rounded-xl bg-obsidian-base border border-hairline-on-dark text-center flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-state-success" />
                      <p className="font-headline-md text-sm text-text-on-dark-primary mt-1">
                        All Inquiries Calibrated
                      </p>
                      <p className="font-body-sm text-xs text-text-on-dark-secondary max-w-xs">
                        No guest bookings currently pending approval. All incoming reservation dates are synchronized.
                      </p>
                    </div>
                  ) : (
                    pendingInquiries.map((inquiry) => {
                      const prop = propertyMap.get(inquiry.propertyId);
                      const inDate = new Date(inquiry.checkIn);
                      const outDate = new Date(inquiry.checkOut);
                      const nights = Math.max(
                        1,
                        Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24))
                      );
                      const isProcessing = processingBookingId === inquiry.id;

                      return (
                        <div
                          key={inquiry.id}
                          className="p-4 rounded-xl bg-obsidian-base border border-hairline-on-dark flex flex-col gap-3.5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden border border-hairline-on-dark flex items-center justify-center text-xs font-semibold text-text-on-dark-primary">
                                G
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-headline-md text-sm text-text-on-dark-primary">
                                    Guest #{inquiry.id.slice(0, 6)}
                                  </span>
                                  <Check className="w-3.5 h-3.5 text-state-success" />
                                </div>
                                <span className="font-body-sm text-[11px] text-text-on-dark-secondary">
                                  {inquiry.guestCount} Guests • Verified Member
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-data-tabular text-data-tabular text-text-on-dark-primary font-semibold">
                                {formatCurrency(inquiry.totalAmount)}
                              </span>
                              <span className="block font-label-caps-sm text-[10px] text-text-on-dark-secondary">
                                {nights} Nights
                              </span>
                            </div>
                          </div>

                          <div className="text-[12px] font-body-sm text-text-on-dark-secondary bg-obsidian-bubble p-2.5 rounded-lg border border-hairline-on-dark/60">
                            <span className="text-tertiary-fixed font-label-caps-sm text-[10px] uppercase block mb-1">
                              Target: {prop?.title || "Sanctuary"} • {formatDateLabel(inquiry.checkIn)} – {formatDateLabel(inquiry.checkOut)}
                            </span>
                            Requested reservation awaiting host confirmation.
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleDeclineBooking(inquiry.id)}
                              disabled={isProcessing}
                              className="h-9 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors font-label-caps-sm text-label-caps-sm uppercase tracking-[0.12em] text-text-on-dark-secondary hover:text-text-on-dark-primary disabled:opacity-50 cursor-pointer"
                            >
                              {isProcessing ? "Processing..." : "Decline"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAcceptBooking(inquiry.id)}
                              disabled={isProcessing}
                              className="h-9 rounded-full bg-text-on-dark-primary hover:bg-canvas-outer text-obsidian-base transition-colors font-label-caps-sm text-label-caps-sm uppercase tracking-[0.12em] font-semibold disabled:opacity-50 cursor-pointer"
                            >
                              {isProcessing ? "Calibrating..." : "Accept Stay"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Telemetry & Sanctuary Operations Overview (Replacing fake IoT hardware with real stats) */}
                <div className="rounded-2xl bg-obsidian-elevated border border-hairline-on-dark p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
                    <h3 className="font-label-caps-md text-label-caps-md uppercase tracking-[0.14em] text-text-on-dark-primary flex items-center gap-2">
                      <Activity className="w-4 h-4 text-state-success" />
                      Sanctuary Operational Telemetry
                    </h3>
                    <span className="font-label-caps-sm text-label-caps-sm text-state-success flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-state-success" /> Online
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-obsidian-base border border-hairline-on-dark flex flex-col">
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase">
                        Active Portfolios
                      </span>
                      <span className="font-data-tabular text-sm text-text-on-dark-primary mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-state-success" />
                        {counts.active} Sanctuaries Live
                      </span>
                      <span className="font-body-sm text-[11px] text-text-on-dark-secondary mt-0.5">
                        {counts.inactive} in calibration
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-obsidian-base border border-hairline-on-dark flex flex-col">
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase">
                        Turnover Readiness
                      </span>
                      <span className="font-data-tabular text-sm text-text-on-dark-primary mt-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-tertiary-fixed" />
                        {pendingInquiries.length === 0 ? "White-Glove Ready" : "Review Needed"}
                      </span>
                      <span className="font-body-sm text-[11px] text-text-on-dark-secondary mt-0.5">
                        Lona Curator Protocol
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-obsidian-base border border-hairline-on-dark flex flex-col">
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase">
                        Scheduled Arrivals
                      </span>
                      <span className="font-data-tabular text-sm text-text-on-dark-primary mt-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-state-success" />
                        {kpis.upcomingGuestCount} Guests
                      </span>
                      <span className="font-body-sm text-[11px] text-text-on-dark-secondary mt-0.5">
                        Upcoming 30 days
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-obsidian-base border border-hairline-on-dark flex flex-col">
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase">
                        Occupancy Status
                      </span>
                      <span className="font-data-tabular text-sm text-text-on-dark-primary mt-1 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#dfb15b]" />
                        {kpis.occupancyRate}% Capacity
                      </span>
                      <span className="font-body-sm text-[11px] text-text-on-dark-secondary mt-0.5">
                        Current month balance
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dedicated Lona Curator Advisory Card */}
                <div className="rounded-2xl bg-gradient-to-b from-obsidian-bubble to-obsidian-elevated border border-hairline-on-dark p-6 flex flex-col justify-between gap-5 relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-hairline-on-dark bg-[#0b0e14] flex items-center justify-center text-white">
                        <Sparkles className="w-6 h-6 text-[#dfb15b]" />
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-state-success border-2 border-obsidian-base" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-caps-sm text-[10px] text-tertiary-fixed tracking-[0.14em] uppercase">
                        Assigned Lona Lead Curator
                      </span>
                      <h4 className="font-headline-md text-lg text-text-on-dark-primary">
                        Elena Vance &amp; Lumen AI
                      </h4>
                      <span className="font-body-sm text-xs text-text-on-dark-secondary">
                        Direct Host Advisory • Mediterranean Bureau
                      </span>
                    </div>
                  </div>

                  <p className="font-body-sm text-xs text-text-on-dark-secondary italic">
                    “We reviewed the upcoming autumn lunar illumination cycles for your sanctuaries. Nocturnal demand remains exceptionally strong.”
                  </p>

                  <Link
                    href="/chat"
                    className="w-full h-[42px] rounded-full bg-surface-container hover:bg-surface-container-high border border-hairline-on-dark text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-[0.14em] transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-[#dfb15b]" />
                    <span>Direct Signal With Lumen AI</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom Contextual Footer Inside Obsidian Monolith */}
            <div className="pt-6 border-t border-hairline-on-dark flex flex-col sm:flex-row items-center justify-between text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm tracking-[0.14em] uppercase gap-4 relative z-10">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-text-on-dark-secondary" />
                <span>AGGARLY HOST ENGINE • VERSION 4.8.2 MEDITERRANEAN ARCHITECTURE COLLECTION</span>
              </div>
              <div className="flex items-center gap-6 text-[11px]">
                <Link href="/moon-phase" className="hover:text-text-on-dark-primary transition-colors">
                  Curator Guidelines
                </Link>
                <Link href="/properties" className="hover:text-text-on-dark-primary transition-colors">
                  Explore Stays
                </Link>
                <Link href="/chat" className="hover:text-text-on-dark-primary transition-colors">
                  Concierge Signal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
