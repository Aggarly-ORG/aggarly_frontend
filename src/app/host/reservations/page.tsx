"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { HostClient, HostBookingItem } from "@/lib/hostClient";

interface ReservationCardModel {
  id: string;
  bookingRef: string;
  sanctuaryTitle: string;
  sanctuaryLocation: string;
  status: "inhouse" | "upcoming" | "completed" | "cancelled";
  statusLabel: string;
  guestName: string;
  guestInitials: string;
  guestTier: string;
  isVerified: boolean;
  checkIn: string;
  checkOut: string;
  nightsCount: number;
  guestsCount: number;
  astrologicalPhase: string;
  clarityMetric: string;
  totalAmount: number;
  escrowStatus: string;
  guestMessage?: string;
  sanctuaryImageUrl: string;
}

export default function HostReservationsPage() {
  const [reservations, setReservations] = useState<ReservationCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "inhouse" | "upcoming" | "completed" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [retreatFilter, setRetreatFilter] = useState("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Message dispatch modal
  const [messageModalBooking, setMessageModalBooking] = useState<{ id: string; guestName: string } | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const raw = await HostClient.getHostBookings();
      if (raw && raw.length > 0) {
        const mapped: ReservationCardModel[] = raw.map((b) => {
          const isCompleted = b.status === "COMPLETED";
          const isCancelled = b.status === "CANCELLED";
          const checkInDate = new Date(b.checkIn);
          const checkOutDate = new Date(b.checkOut);
          const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
          return {
            id: b.id,
            bookingRef: `#AG-${b.id.slice(0, 4).toUpperCase()}`,
            sanctuaryTitle: "Sanctuary Residence",
            sanctuaryLocation: "Balearic Sanctuary Portfolio",
            status: isCompleted ? "completed" : isCancelled ? "cancelled" : "upcoming",
            statusLabel: isCompleted ? "Stay Concluded" : isCancelled ? "Cancelled" : "Confirmed Arrival",
            guestName: b.guestId ? `Resident #${b.guestId.slice(0, 6)}` : "Verified Patron",
            guestInitials: "VP",
            guestTier: "Passport Verified Patron",
            isVerified: true,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            nightsCount: nights,
            guestsCount: b.guestCount,
            astrologicalPhase: "Dark-Sky Calibration",
            clarityMetric: "Bortle Class 2.0 Night Sky",
            totalAmount: b.totalAmount,
            escrowStatus: isCompleted ? "Settlement Complete" : "Guarded by Stripe Escrow",
            sanctuaryImageUrl:
              "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
          };
        });
        setReservations(mapped);
      } else {
        setReservations([]);
      }
    } catch (err) {
      console.error("Failed to load host reservations", err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = (bookingId: string, guest: string) => {
    startTransition(async () => {
      await HostClient.cancelBooking(bookingId);
      setReservations((prev) =>
        prev.map((r) =>
          r.id === bookingId
            ? { ...r, status: "cancelled", statusLabel: "Cancelled / Declined" }
            : r
        )
      );
      showToast(`Reservation for ${guest} declined`);
    });
  };

  const handleAcceptBooking = (bookingId: string, guest: string) => {
    startTransition(async () => {
      await HostClient.acceptBooking(bookingId);
      showToast(`Reservation for ${guest} accepted and confirmed`);
    });
  };

  const filteredReservations = reservations.filter((r) => {
    if (activeTab !== "all" && r.status !== activeTab) return false;
    if (retreatFilter !== "ALL" && !r.sanctuaryTitle.toLowerCase().includes(retreatFilter.toLowerCase())) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchGuest = r.guestName.toLowerCase().includes(q);
      const matchRef = r.bookingRef.toLowerCase().includes(q);
      const matchSanctuary = r.sanctuaryTitle.toLowerCase().includes(q);
      if (!matchGuest && !matchRef && !matchSanctuary) return false;
    }
    return true;
  });

  const totalEscrow = reservations
    .filter((r) => r.status !== "cancelled")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="bg-canvas-outer min-h-screen flex flex-col justify-between text-text-on-light-primary selection:bg-surface-container selection:text-text-on-dark-primary">
      <LonaHeader />

      <main className="w-full pt-20 bg-canvas-outer min-h-[calc(100vh-80px)] flex flex-col justify-center">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-8 right-8 z-50 transition-all duration-300">
            <div className="px-5 py-3 rounded-full bg-text-on-dark-primary text-obsidian-base font-label-caps-sm uppercase tracking-widest shadow-2xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-state-success">check_circle</span>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col w-full py-space-xl px-card-margin-mobile lg:px-card-margin-desktop items-center">
          {/* Monolithic Floating Obsidian Hub Container */}
          <div className="relative w-full max-w-7xl rounded-[28px] bg-gradient-to-b from-obsidian-base to-[#121215] text-text-on-dark-primary shadow-2xl border border-hairline-on-dark overflow-hidden transition-all duration-300">
            {/* Directional Moonlight Glow */}
            <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#DCE6EF]/10 blur-[90px] pointer-events-none" />
            <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-[#A8C4DE]/5 blur-[110px] pointer-events-none" />

            {/* Hub Header Section */}
            <div className="p-card-padding-mobile lg:p-card-padding-desktop pb-space-lg lg:pb-space-xl relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-space-lg">
                <div className="flex items-start gap-space-md">
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="w-12 h-12 rounded-full bg-[#DCE6EF]/20 blur-[10px] absolute inset-0" />
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-obsidian-elevated flex items-center justify-center border border-hairline-on-dark">
                      <span className="material-symbols-outlined text-text-on-dark-primary text-[24px]">
                        luggage
                      </span>
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-state-success rounded-full ring-2 ring-obsidian-base" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-[0.2em]">
                        Sanctuary Registry // Epoch 2026
                      </span>
                      <span className="w-1 h-1 rounded-full bg-text-on-dark-secondary/60" />
                      <span className="font-data-tabular text-data-tabular text-secondary uppercase tracking-widest">
                        E.L. 41°N 02°E
                      </span>
                    </div>
                    <h1 className="font-headline-xl text-headline-xl text-text-on-dark-primary tracking-[0.08em] uppercase mt-1">
                      Master Reservations &amp; Guest Inquiries
                    </h1>
                    <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary mt-1">
                      Aggarly by Lona • Curated Resident Arrivals &amp; Verification Dossiers
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-space-sm self-start lg:self-center bg-obsidian-elevated/70 border border-hairline-on-dark backdrop-blur-md px-space-md py-space-sm rounded-full">
                  <div className="flex flex-col text-right">
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                      Aggregate Escrow
                    </span>
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-primary">
                      €{totalEscrow.toLocaleString("en-US", { minimumFractionDigits: 2 })} EUR
                    </span>
                  </div>
                  <div className="w-px h-6 bg-hairline-on-dark mx-space-2xs" />
                  <button
                    onClick={() => showToast("Registry synchronized with ledger")}
                    className="w-8 h-8 rounded-full bg-obsidian-bubble flex items-center justify-center text-text-on-dark-secondary hover:text-text-on-dark-primary transition-colors"
                    title="Synchronize Registry"
                  >
                    <span className="material-symbols-outlined text-[18px]">sync</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Segmented Tabs Bar */}
            <div className="px-card-padding-mobile lg:px-card-padding-desktop py-space-md bg-obsidian-elevated/40 border-y border-hairline-on-dark">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
                <div className="inline-flex p-1 rounded-full bg-obsidian-elevated border border-hairline-on-dark self-start overflow-x-auto max-w-full">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-4 py-1.5 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-widest transition-all duration-200 ${
                      activeTab === "all"
                        ? "bg-primary text-obsidian-base font-semibold shadow-sm"
                        : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                    }`}
                  >
                    All Stays ({reservations.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("upcoming")}
                    className={`px-4 py-1.5 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-widest transition-all duration-200 ${
                      activeTab === "upcoming"
                        ? "bg-primary text-obsidian-base font-semibold shadow-sm"
                        : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                    }`}
                  >
                    Upcoming Stays ({reservations.filter((r) => r.status === "upcoming").length})
                  </button>
                  <button
                    onClick={() => setActiveTab("inhouse")}
                    className={`px-4 py-1.5 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-widest transition-all duration-200 ${
                      activeTab === "inhouse"
                        ? "bg-primary text-obsidian-base font-semibold shadow-sm"
                        : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                    }`}
                  >
                    Currently In-House ({reservations.filter((r) => r.status === "inhouse").length})
                  </button>
                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`px-4 py-1.5 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-widest transition-all duration-200 ${
                      activeTab === "completed"
                        ? "bg-primary text-obsidian-base font-semibold shadow-sm"
                        : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                    }`}
                  >
                    Completed Stays ({reservations.filter((r) => r.status === "completed").length})
                  </button>
                  <button
                    onClick={() => setActiveTab("cancelled")}
                    className={`px-4 py-1.5 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-widest transition-all duration-200 ${
                      activeTab === "cancelled"
                        ? "bg-primary text-obsidian-base font-semibold shadow-sm"
                        : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                    }`}
                  >
                    Cancelled ({reservations.filter((r) => r.status === "cancelled").length})
                  </button>
                </div>

                <div className="flex items-center gap-space-sm text-text-on-dark-secondary">
                  <span className="font-data-tabular text-data-tabular uppercase text-secondary">
                    Displaying {filteredReservations.length} of {reservations.length} Dossiers
                  </span>
                  <button
                    onClick={() => showToast("Ledger configuration dialog opened")}
                    className="text-xs uppercase tracking-widest hover:text-text-on-dark-primary transition-colors flex items-center gap-1 font-label-caps-sm text-label-caps-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span> Ledger Settings
                  </button>
                </div>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="px-card-padding-mobile lg:px-card-padding-desktop py-space-lg bg-obsidian-base/90 border-b border-hairline-on-dark">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md lg:gap-space-lg items-end">
                <div className="md:col-span-6 flex flex-col">
                  <label
                    htmlFor="search-input"
                    className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest mb-1"
                  >
                    Search Resident, Booking Reference, or Retreat
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. Sterling, #AG-8829, or Es Vedrà"
                      type="text"
                      className="w-full h-11 bg-transparent text-text-on-dark-primary placeholder:text-text-on-dark-secondary/40 font-body-md text-body-md focus:outline-none transition-colors border-b border-hairline-on-dark focus:border-text-on-dark-primary pr-8"
                    />
                    <span className="material-symbols-outlined absolute right-0 text-[18px] text-text-on-dark-secondary pointer-events-none">
                      search
                    </span>
                  </div>
                </div>

                <div className="md:col-span-4 flex flex-col">
                  <label
                    htmlFor="retreat-filter"
                    className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest mb-1"
                  >
                    Sanctuary Location
                  </label>
                  <div className="relative flex items-center">
                    <select
                      id="retreat-filter"
                      value={retreatFilter}
                      onChange={(e) => setRetreatFilter(e.target.value)}
                      className="w-full h-11 bg-transparent text-text-on-dark-primary font-body-md text-body-md focus:outline-none appearance-none cursor-pointer border-b border-hairline-on-dark focus:border-text-on-dark-primary"
                    >
                      <option className="bg-obsidian-elevated text-text-on-dark-primary" value="ALL">
                        All Sanctuaries (Baleares)
                      </option>
                      <option className="bg-obsidian-elevated text-text-on-dark-primary" value="Cala Salada">
                        Casa Cala Salada (Ibiza)
                      </option>
                      <option className="bg-obsidian-elevated text-text-on-dark-primary" value="Sa Rota">
                        Finca Sa Rota (Mallorca)
                      </option>
                      <option className="bg-obsidian-elevated text-text-on-dark-primary" value="Es Vedra">
                        Villa Es Vedrà Horizon (Ibiza)
                      </option>
                    </select>
                    <span className="material-symbols-outlined absolute right-0 text-[18px] text-text-on-dark-secondary pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setRetreatFilter("ALL");
                      setActiveTab("all");
                    }}
                    className="w-full h-11 rounded-full font-label-caps-sm text-label-caps-sm tracking-widest uppercase bg-obsidian-elevated hover:bg-surface-container text-text-on-dark-secondary hover:text-text-on-dark-primary transition-colors flex items-center justify-center gap-1 border border-hairline-on-dark"
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span> Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Reservation Cards Feed */}
            <div className="p-card-padding-mobile lg:p-card-padding-desktop space-y-space-xl">
              {filteredReservations.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-obsidian-elevated/50 border border-hairline-on-dark">
                  <span className="material-symbols-outlined text-[48px] text-text-on-dark-secondary">
                    folder_off
                  </span>
                  <p className="font-label-caps-md text-text-on-dark-secondary uppercase tracking-widest mt-2">
                    No matching reservation dossiers found
                  </p>
                </div>
              ) : (
                filteredReservations.map((item) => (
                  <article
                    key={item.id}
                    className="relative rounded-2xl bg-gradient-to-br from-obsidian-elevated to-[#141417] p-space-lg lg:p-space-xl overflow-hidden shadow-2xl border border-hairline-on-dark transition-all duration-300"
                  >
                    {/* Status Indicator Strip */}
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        item.status === "inhouse"
                          ? "bg-state-success"
                          : item.status === "cancelled"
                          ? "bg-state-error"
                          : "bg-primary"
                      }`}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                      {/* Col 1: Sanctuary Visual & Identity */}
                      <div className="lg:col-span-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-space-xs mb-space-xs">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-widest flex items-center gap-1.5 ${
                                item.status === "inhouse"
                                  ? "bg-state-success/10 text-state-success"
                                  : item.status === "cancelled"
                                  ? "bg-state-error/10 text-state-error"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.status === "inhouse"
                                    ? "bg-state-success animate-pulse"
                                    : item.status === "cancelled"
                                    ? "bg-state-error"
                                    : "bg-primary"
                                }`}
                              />
                              {item.statusLabel}
                            </span>
                            <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary tracking-widest uppercase">
                              Ref: {item.bookingRef}
                            </span>
                          </div>

                          <h2 className="font-headline-md text-headline-md text-text-on-dark-primary mt-1">
                            {item.sanctuaryTitle}
                          </h2>
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest block">
                            {item.sanctuaryLocation}
                          </span>

                          {/* Sanctuary Image */}
                          <div className="mt-space-md relative rounded-xl overflow-hidden h-36 w-full bg-surface-container border border-hairline-on-dark">
                            <img
                              alt={item.sanctuaryTitle}
                              className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                              src={item.sanctuaryImageUrl}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base via-transparent to-transparent opacity-60" />
                            <div className="absolute bottom-2 left-3 right-3 flex justify-between items-center text-text-on-dark-primary font-data-tabular text-data-tabular text-xs">
                              <span>Collimation: Active</span>
                              <span>Horizon 288° W</span>
                            </div>
                          </div>
                        </div>

                        {/* Resident Persona Details */}
                        <div className="mt-space-md pt-space-sm border-t border-hairline-on-dark">
                          <div className="flex items-center gap-space-sm">
                            <div className="w-10 h-10 rounded-full bg-obsidian-bubble flex items-center justify-center text-text-on-dark-primary font-headline-md border border-hairline-on-dark">
                              {item.guestInitials}
                            </div>
                            <div>
                              <h3 className="font-body-md text-body-md text-text-on-dark-primary font-medium flex items-center gap-1.5">
                                {item.guestName}
                                {item.isVerified && (
                                  <span
                                    className="material-symbols-outlined text-[16px] text-state-success"
                                    title="Passport Verified"
                                  >
                                    verified
                                  </span>
                                )}
                              </h3>
                              <span className="font-label-caps-sm text-label-caps-sm text-secondary uppercase tracking-wider block">
                                {item.guestTier}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Col 2: Chronological Timeline & Astrological Window */}
                      <div className="lg:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-hairline-on-dark pt-space-md lg:pt-0 lg:pl-space-lg">
                        <div className="space-y-space-md">
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest block">
                            Residency Chronology
                          </span>

                          <div className="grid grid-cols-2 gap-space-sm">
                            <div className="p-3 rounded-xl bg-obsidian-base/60 border border-hairline-on-dark/40">
                              <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase block">
                                Arrival Check-In
                              </span>
                              <span className="font-data-tabular text-data-tabular text-text-on-dark-primary mt-0.5 block">
                                {item.checkIn}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-obsidian-base/60 border border-hairline-on-dark/40">
                              <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase block">
                                Checkout Departure
                              </span>
                              <span className="font-data-tabular text-data-tabular text-text-on-dark-primary mt-0.5 block">
                                {item.checkOut}
                              </span>
                            </div>
                          </div>

                          {/* Astrological Alignment */}
                          <div className="p-3.5 rounded-xl bg-obsidian-bubble/70 border border-hairline-on-dark/60 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider">
                                Astrological Ephemeris
                              </span>
                              <span className="font-data-tabular text-state-success">Verified Clear</span>
                            </div>
                            <span className="font-headline-md text-sm text-text-on-dark-primary block">
                              {item.astrologicalPhase}
                            </span>
                            <span className="font-body-sm text-xs text-text-on-dark-secondary block">
                              {item.clarityMetric}
                            </span>
                          </div>

                          {/* Resident Special Inquiries */}
                          {item.guestMessage && (
                            <div className="p-3 rounded-xl bg-obsidian-base/40 border border-hairline-on-dark/30 space-y-1">
                              <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase tracking-widest block">
                                Resident Note / Telescope Request
                              </span>
                              <p className="font-body-sm text-xs italic text-text-on-dark-primary">
                                &ldquo;{item.guestMessage}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-space-sm pt-space-md text-xs text-text-on-dark-secondary font-data-tabular">
                          <span>{item.nightsCount} Solitude Moons</span>
                          <span>•</span>
                          <span>{item.guestsCount} Guests Allocated</span>
                        </div>
                      </div>

                      {/* Col 3: Financial Settlement & Actions */}
                      <div className="lg:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-hairline-on-dark pt-space-md lg:pt-0 lg:pl-space-lg">
                        <div className="space-y-space-md">
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest block">
                            Settlement Ledger
                          </span>

                          <div className="p-4 rounded-xl bg-obsidian-base/80 border border-hairline-on-dark space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-text-on-dark-secondary">Gross Booking Volume</span>
                              <span className="font-data-tabular text-text-on-dark-primary">
                                €{item.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-text-on-dark-secondary">Aggarly Split (-12%)</span>
                              <span className="font-data-tabular text-text-on-dark-secondary">
                                -€{(item.totalAmount * 0.12).toFixed(2)}
                              </span>
                            </div>
                            <div className="h-px bg-hairline-on-dark my-1" />
                            <div className="flex justify-between items-center">
                              <span className="font-label-caps-sm text-text-on-dark-secondary uppercase">
                                Net Host Proceeds
                              </span>
                              <span className="font-headline-md text-headline-md text-text-on-dark-primary">
                                €{(item.totalAmount * 0.88).toFixed(2)}
                              </span>
                            </div>
                            <span className="font-label-caps-sm text-[10px] text-state-success uppercase tracking-wider block mt-1">
                              {item.escrowStatus}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons Stack */}
                        <div className="flex flex-col gap-2 pt-space-md">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => showToast(`Messaging dispatch opened for ${item.guestName}`)}
                              className="h-10 rounded-full bg-obsidian-elevated hover:bg-surface-container border border-hairline-on-dark font-label-caps-sm text-label-caps-sm text-text-on-dark-primary uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">chat</span>
                              <span>Message</span>
                            </button>
                            <Link
                              href={`/trips/${item.id}/itinerary`}
                              className="h-10 rounded-full bg-obsidian-elevated hover:bg-surface-container border border-hairline-on-dark font-label-caps-sm text-label-caps-sm text-text-on-dark-primary uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">article</span>
                              <span>Dossier</span>
                            </Link>
                          </div>

                          {item.status === "upcoming" ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleAcceptBooking(item.id, item.guestName)}
                                disabled={isPending}
                                className="h-10 rounded-full bg-primary text-obsidian-base font-label-caps-sm text-label-caps-sm uppercase tracking-wider hover:bg-canvas-outer transition-colors font-semibold"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleCancelBooking(item.id, item.guestName)}
                                disabled={isPending}
                                className="h-10 rounded-full bg-obsidian-base text-text-on-dark-secondary hover:text-state-error hover:bg-state-error/10 border border-hairline-on-dark font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => showToast(`Escrow clearance statement downloaded for ${item.bookingRef}`)}
                              className="h-10 w-full rounded-full bg-obsidian-elevated hover:bg-surface-container border border-hairline-on-dark font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary hover:text-text-on-dark-primary uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">verified</span>
                              <span>Review Escrow</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <LonaFooter />
    </div>
  );
}
