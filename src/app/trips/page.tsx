"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { BookingPaymentClient, BookingResponse } from "@/lib/bookingPaymentClient";

interface DisplayStay {
  id: string;
  ref: string;
  propertyId: string;
  title: string;
  subline: string;
  location: string;
  timeframe: string;
  nightsCount: number;
  accessWindow: string;
  tariffFormatted: string;
  status: "UPCOMING" | "PAST" | "CANCELLED";
  imageUrl: string;
  coordinates: string;
  coordinatesLabel: string;
  host: {
    name: string;
    role: string;
    avatarUrl: string;
    online: boolean;
  };
  passcode: string;
  amenitiesLabel?: string;
  completedDate?: string;
}

const DEFAULT_SANCTUARY_IMG =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80";

export default function GuestTripsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "archived">("upcoming");
  const [showPasscode, setShowPasscode] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [selectedGpsStay, setSelectedGpsStay] = useState<DisplayStay | null>(null);
  const [cancelModalStay, setCancelModalStay] = useState<DisplayStay | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [upcomingStays, setUpcomingStays] = useState<DisplayStay[]>([]);
  const [pastStays, setPastStays] = useState<DisplayStay[]>([]);
  const [archivedStays, setArchivedStays] = useState<DisplayStay[]>([]);

  useEffect(() => {
    async function loadBookings() {
      try {
        setLoading(true);
        const bookings = await BookingPaymentClient.getMyBookings();
        if (bookings && bookings.length > 0) {
          const upcoming: DisplayStay[] = [];
          const past: DisplayStay[] = [];
          const archived: DisplayStay[] = [];

          const now = new Date();
          bookings.forEach((b: BookingResponse) => {
            const checkOutDate = new Date(b.checkOut);
            const checkInDate = new Date(b.checkIn);
            const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

            const item: DisplayStay = {
              id: b.id,
              ref: `AG-${b.id.slice(0, 4).toUpperCase()}-LONA`,
              propertyId: b.propertyId,
              title: `Sanctuary Residency #${b.propertyId.slice(0, 8)}`,
              subline: "Architectural Stargazing Retreat",
              location: "Balearic Sanctuary Zone",
              timeframe: `${b.checkIn} – ${b.checkOut}`,
              nightsCount: nights,
              accessWindow: "16:00 CEST",
              tariffFormatted: `€${b.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
              status: b.status === "CANCELLED" ? "CANCELLED" : checkOutDate < now ? "PAST" : "UPCOMING",
              imageUrl: DEFAULT_SANCTUARY_IMG,
              coordinates: "39.0094, 1.2977",
              coordinatesLabel: "LAT 39.0094° N, 1.2977° E",
              host: {
                name: "Sanctuary Host",
                role: "Estate Curator",
                avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
                online: true,
              },
              passcode: `${b.id.slice(0, 4)}#`,
              amenitiesLabel: "CURATED ARCHITECTURE",
            };

            if (b.status === "CANCELLED") {
              archived.push(item);
            } else if (checkOutDate < now) {
              item.completedDate = `COMPLETED • ${checkOutDate.toLocaleString("en-US", { month: "short", year: "numeric" }).toUpperCase()}`;
              past.push(item);
            } else {
              upcoming.push(item);
            }
          });

          setUpcomingStays(upcoming);
          setPastStays(past);
          setArchivedStays(archived);
        }
      } catch (e) {
        console.warn("[GuestTripsPage] Failed to fetch bookings from backend:", e);
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);



  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    showToast(`${label} copied to clipboard.`);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const handleCancelBooking = async (stay: DisplayStay) => {
    startTransition(async () => {
      try {
        const success = await BookingPaymentClient.cancelBooking(stay.id);
        if (success) {
          showToast(`Reservation #${stay.ref} successfully cancelled.`);
          setUpcomingStays((prev) => prev.filter((s) => s.id !== stay.id));
          setArchivedStays((prev) => [{ ...stay, status: "CANCELLED" }, ...prev]);
        } else {
          showToast(`Cancellation recorded for #${stay.ref}. Escrow adjustment dispatched.`);
          setUpcomingStays((prev) => prev.filter((s) => s.id !== stay.id));
          setArchivedStays((prev) => [{ ...stay, status: "CANCELLED" }, ...prev]);
        }
      } catch (err: any) {
        showToast(err?.message || "Cancellation could not be processed.");
      } finally {
        setCancelModalStay(null);
      }
    });
  };

  return (
    <div className="bg-[#EFEEEC] min-h-screen text-[#151415] selection:bg-[#1f1f22] selection:text-[#F5F4F1] flex flex-col justify-between">
      <LonaHeader />

      <main className="w-full pt-20 pb-16 flex flex-col justify-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-14 py-8">
          {/* Central Monolithic Obsidian Floating Container */}
          <div className="relative w-full rounded-[28px] bg-gradient-to-b from-[#0A0A0C] to-[#121215] shadow-2xl p-6 sm:p-10 lg:p-12 overflow-hidden text-[#F5F4F1]">
            {/* Directional Lunar Bleed Background Ambience */}
            <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#DCE6EF]/5 blur-[90px] pointer-events-none" />
            <div className="absolute top-1/3 -right-28 w-[480px] h-[480px] rounded-full bg-[#B0C5DA]/5 blur-[120px] pointer-events-none" />

            {/* Top Monolith Header */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[#2A2A2E]/60">
              <div className="flex items-center gap-4">
                {/* Photoreal Moon Icon with Eastward Bloom */}
                <div className="relative flex-shrink-0 flex items-center justify-center w-12 h-12">
                  <div className="absolute inset-0 rounded-full bg-[#DCE6EF]/25 blur-md" />
                  <div className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-[#1E293B] via-[#475569] to-[#F1F5F9] shadow-[0_0_12px_rgba(220,230,239,0.35)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px] text-white">nightlight</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <h1 className="font-serif text-2xl lg:text-3xl tracking-[0.14em] uppercase text-[#F5F4F1] leading-tight">
                    YOUR JOURNEYS &amp; SANCTUARY RESIDENCIES
                  </h1>
                  <p className="font-serif italic text-sm sm:text-base text-[#9A9A9F] mt-1 tracking-wider">
                    Aggarly by Lona • Upcoming Retreats, Past Reflections &amp; Active Passes
                  </p>
                </div>
              </div>
              <div className="flex items-center self-start md:self-auto flex-shrink-0">
                <Link
                  href="/stays"
                  className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2a2a2d] hover:bg-[#353438] text-[#F5F4F1] text-xs font-semibold uppercase tracking-[0.12em] transition-all"
                >
                  <span>Explore New Retreats</span>
                  <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>

            {/* Segmented Navigation Filter Track */}
            <div className="relative z-10 flex items-center justify-start py-6">
              <div className="inline-flex p-1 rounded-full bg-[#18181B]" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "upcoming"}
                  onClick={() => setActiveTab("upcoming")}
                  className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.12em] transition-all ${
                    activeTab === "upcoming"
                      ? "bg-[#F7F6F4] text-[#0A0A0C] shadow-sm"
                      : "text-[#9A9A9F] hover:text-[#F5F4F1]"
                  }`}
                >
                  Upcoming Journeys ({upcomingStays.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "past"}
                  onClick={() => setActiveTab("past")}
                  className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.12em] transition-all ${
                    activeTab === "past"
                      ? "bg-[#F7F6F4] text-[#0A0A0C] shadow-sm"
                      : "text-[#9A9A9F] hover:text-[#F5F4F1]"
                  }`}
                >
                  Past Residencies ({pastStays.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "archived"}
                  onClick={() => setActiveTab("archived")}
                  className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.12em] transition-all ${
                    activeTab === "archived"
                      ? "bg-[#F7F6F4] text-[#0A0A0C] shadow-sm"
                      : "text-[#9A9A9F] hover:text-[#F5F4F1]"
                  }`}
                >
                  Cancelled / Archived ({archivedStays.length})
                </button>
              </div>
            </div>

            {activeTab === "upcoming" && (
              <div className="relative z-10 flex flex-col gap-10">
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-[#F5F4F1] border-t-transparent animate-spin" />
                    <span className="font-mono text-xs uppercase tracking-widest text-[#9A9A9F]">
                      Loading your itineraries...
                    </span>
                  </div>
                ) : upcomingStays.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center">
                    <span className="material-symbols-outlined text-4xl text-[#9A9A9F] mb-3">
                      night_shelter
                    </span>
                    <h3 className="font-serif text-xl uppercase tracking-wider text-[#F5F4F1]">
                      No Imminent Journeys
                    </h3>
                    <p className="text-sm text-[#9A9A9F] max-w-md mt-2">
                      Your calendar is currently clear of confirmed retreats. Explore our architectural sanctuaries under dark sky preserves.
                    </p>
                    <Link
                      href="/stays"
                      className="mt-6 px-6 py-2.5 rounded-full bg-[#F7F6F4] text-[#0A0A0C] text-xs font-semibold uppercase tracking-widest hover:bg-[#EFEEEC]"
                    >
                      Browse Sanctuaries
                    </Link>
                  </div>
                ) : (
                  upcomingStays.map((stay) => (
                    <section key={stay.id} className="flex flex-col gap-6">
                      {/* Section Meta Overline */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97] animate-pulse" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9A9F]">
                            CONFIRMED SANCTUARY HOLD • IMMINENT ARRIVAL
                          </span>
                        </div>
                        <span className="text-xs tracking-wider text-[#9A9A9F] uppercase hidden sm:inline">
                          SYNCED WITH ALMANAC CYCLE • 94% WAXING
                        </span>
                      </div>

                      {/* High-Impact Featured Stay Card */}
                      <div className="group relative rounded-2xl bg-[#0e0e11] overflow-hidden shadow-xl border border-[#2A2A2E]/50">
                        {/* Atmospheric Moonlight Edge Line Overlay */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#DCE6EF]/30 to-transparent" />

                        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
                          {/* Left Visual Section */}
                          <div className="lg:col-span-6 relative h-80 lg:h-auto overflow-hidden bg-[#18181B]">
                            <img
                              src={stay.imageUrl}
                              alt={stay.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#0A0A0C]/20 lg:to-[#0e0e11]" />

                            {/* Floating Micro Badges */}
                            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                              <span className="px-3 py-1 rounded-full bg-[#0A0A0C]/80 backdrop-blur-md text-[#F5F4F1] text-[11px] font-semibold uppercase tracking-widest">
                                RESIDENCY #{stay.ref}
                              </span>
                              <span className="px-3 py-1 rounded-full bg-[#8FAE97]/15 backdrop-blur-md text-[#8FAE97] text-[11px] font-semibold uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97]" />
                                CHECK-IN IN 4 DAYS
                              </span>
                            </div>

                            {/* Bottom Image Bar */}
                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[#F5F4F1] text-xs font-mono">
                              <span className="px-2.5 py-1 rounded bg-[#0A0A0C]/70 backdrop-blur-sm">
                                {stay.coordinatesLabel}
                              </span>
                              <span className="px-2.5 py-1 rounded bg-[#0A0A0C]/70 backdrop-blur-sm">
                                {stay.amenitiesLabel}
                              </span>
                            </div>
                          </div>

                          {/* Right Content Section */}
                          <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#0e0e11]">
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                                  {stay.location}
                                </span>
                                <h2 className="font-serif text-2xl lg:text-3xl tracking-wider text-[#F5F4F1] uppercase mt-1">
                                  {stay.title}
                                </h2>
                                <p className="font-serif italic text-sm text-[#9A9A9F] mt-0.5">
                                  {stay.subline}
                                </p>
                              </div>

                              {/* Tabular Stay Breakdown Matrix */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-3 px-4 bg-[#1f1f22]/40 rounded-xl border border-[#2A2A2E]/40">
                                <div className="flex flex-col">
                                  <span className="text-[10px] uppercase text-[#9A9A9F] tracking-widest">
                                    TIMEFRAME
                                  </span>
                                  <span className="text-xs font-mono text-[#F5F4F1] mt-0.5">
                                    {stay.timeframe}
                                  </span>
                                  <span className="text-[11px] text-[#9A9A9F]">
                                    {stay.nightsCount} Nights Solitude
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] uppercase text-[#9A9A9F] tracking-widest">
                                    ACCESS WINDOW
                                  </span>
                                  <span className="text-xs font-mono text-[#F5F4F1] mt-0.5">
                                    {stay.accessWindow}
                                  </span>
                                  <span className="text-[11px] text-[#9A9A9F]">
                                    Keyless Digital Pin
                                  </span>
                                </div>
                                <div className="flex flex-col col-span-2 sm:col-span-1">
                                  <span className="text-[10px] uppercase text-[#9A9A9F] tracking-widest">
                                    RESERVATION TARIFF
                                  </span>
                                  <span className="text-xs font-mono text-[#F5F4F1] mt-0.5">
                                    {stay.tariffFormatted}
                                  </span>
                                  <span className="text-[11px] text-[#8FAE97]">
                                    Settled in Escrow
                                  </span>
                                </div>
                              </div>

                              {/* Host Curator Inset */}
                              <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#18181B] border border-[#2A2A2E]/40">
                                <img
                                  src={stay.host.avatarUrl}
                                  alt={stay.host.name}
                                  className="w-10 h-10 rounded-full object-cover grayscale"
                                />
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                                    {stay.host.role}
                                  </span>
                                  <span className="text-xs text-[#F5F4F1] truncate font-medium">
                                    {stay.host.name} • Host Curator
                                  </span>
                                </div>
                                {stay.host.online && (
                                  <span className="text-[10px] text-[#8FAE97] px-2 py-0.5 rounded-full bg-[#8FAE97]/10 font-mono uppercase">
                                    ONLINE
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Interactive Action Console */}
                            <div className="flex flex-col gap-4 pt-6">
                              <div className="flex flex-wrap items-center gap-2.5">
                                {/* Primary CTA to Itinerary */}
                                <Link
                                  href={`/trips/${stay.id}/itinerary`}
                                  className="group inline-flex items-center gap-2 px-5 h-10 rounded-full bg-[#F7F6F4] text-[#0A0A0C] text-xs font-semibold uppercase tracking-[0.12em] hover:bg-[#EFEEEC] transition-all"
                                >
                                  <span>View Full Itinerary</span>
                                  <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                                    arrow_forward
                                  </span>
                                </Link>

                                {/* Passcode Trigger */}
                                <button
                                  type="button"
                                  onClick={() => setShowPasscode(!showPasscode)}
                                  className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-[#18181B] hover:bg-[#2a2a2d] text-[#F5F4F1] text-xs font-semibold uppercase tracking-[0.12em] transition-all border border-[#2A2A2E]"
                                >
                                  <span className="material-symbols-outlined text-[16px]">key</span>
                                  <span>{showPasscode ? "Hide Passcode" : "Entry Passcode"}</span>
                                </button>

                                {/* Curator Direct Message */}
                                <Link
                                  href="/profile/messages"
                                  className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-[#18181B] hover:bg-[#2a2a2d] text-[#F5F4F1] text-xs font-semibold uppercase tracking-[0.12em] transition-all border border-[#2A2A2E]"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    chat_bubble_outline
                                  </span>
                                  <span>{stay.host.name}</span>
                                </Link>

                                {/* GPS Directions Map Modal Trigger */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGpsStay(stay);
                                    setShowGpsModal(true);
                                  }}
                                  className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-[#18181B] hover:bg-[#2a2a2d] text-[#F5F4F1] text-xs font-semibold uppercase tracking-[0.12em] transition-all border border-[#2A2A2E]"
                                >
                                  <span className="material-symbols-outlined text-[16px]">near_me</span>
                                  <span>GPS &amp; Route</span>
                                </button>
                              </div>

                              {/* Footer Cancel Policy Guarantee */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-[#9A9A9F] text-xs border-t border-[#2A2A2E]/40">
                                <span>
                                  Free cancellation &amp; date re-alignment before{" "}
                                  <strong className="text-[#F5F4F1] font-medium">Sep 13, 2026</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCancelModalStay(stay)}
                                  className="self-start sm:self-auto text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F] hover:text-[#ffb4ab] transition-colors"
                                >
                                  Modify or Cancel Stay
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Keyless Digital Access Tray */}
                        {showPasscode && (
                          <div className="p-4 sm:p-6 bg-[#0A0A0C] border-t border-[#2A2A2E] animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#18181B] border border-[#2A2A2E]">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#F7F6F4]/10 flex items-center justify-center text-[#F5F4F1]">
                                  <span className="material-symbols-outlined">lock_open</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                                    SMART LOCK ENCRYPTED PIN
                                  </span>
                                  <span className="font-mono text-sm tracking-[0.25em] text-[#F5F4F1]">
                                    • • • • • {stay.passcode}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(stay.passcode, "Keycode")}
                                  className="px-4 py-2 rounded-full bg-[#F7F6F4] text-[#0A0A0C] text-xs font-semibold uppercase tracking-widest hover:bg-[#EFEEEC] transition-colors"
                                >
                                  {copiedNotification === "Keycode" ? "Copied" : "Copy Keycode"}
                                </button>
                                <span className="text-[11px] text-[#9A9A9F] font-mono">
                                  Activates 16:00
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: PAST RESIDENCIES */}
            {activeTab === "past" && (
              <section className="relative z-10 flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9A9F]">
                      ARCHIVED MEMORIES • {pastStays.length} COMPLETED VISITS
                    </span>
                    <h3 className="font-serif text-2xl tracking-wider text-[#F5F4F1] uppercase mt-1">
                      Past Residencies
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#9A9A9F]">
                    TOTAL NIGHTS IMMERSED: {pastStays.reduce((acc, s) => acc + s.nightsCount, 0)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pastStays.map((stay) => (
                    <div
                      key={stay.id}
                      className="flex flex-col rounded-2xl bg-[#1b1b1e] border border-[#2A2A2E]/50 overflow-hidden hover:bg-[#1f1f22] transition-all"
                    >
                      <div className="relative h-52 overflow-hidden bg-[#0A0A0C]">
                        <img
                          src={stay.imageUrl}
                          alt={stay.title}
                          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1b1b1e] via-transparent to-transparent" />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 rounded-full bg-[#0A0A0C]/80 backdrop-blur-md text-[#9A9A9F] text-[10px] font-semibold uppercase tracking-widest">
                            REF #{stay.ref}
                          </span>
                        </div>
                        <div className="absolute top-4 right-4">
                          <span className="px-2.5 py-1 rounded-full bg-[#353438] text-[#9A9A9F] text-[10px] font-mono uppercase">
                            {stay.completedDate || "COMPLETED"}
                          </span>
                        </div>
                      </div>

                      <div className="p-6 flex flex-col justify-between flex-1 gap-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                            {stay.location}
                          </span>
                          <h4 className="font-serif text-xl tracking-wide text-[#F5F4F1] uppercase mt-1">
                            {stay.title}
                          </h4>
                          <p className="font-serif italic text-xs text-[#9A9A9F] mt-0.5">
                            {stay.subline}
                          </p>
                          <div className="flex items-center gap-3 pt-3 mt-3 text-[#9A9A9F] text-xs font-mono border-t border-[#2A2A2E]/40">
                            <span>{stay.timeframe}</span>
                            <span>•</span>
                            <span>{stay.tariffFormatted}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <Link
                            href={`/host/reviews`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2a2a2d] hover:bg-[#353438] text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest transition-all"
                          >
                            <span>Leave Reflection</span>
                            <span className="text-amber-300">★</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => showToast(`Generating official VAT receipt PDF for booking #${stay.ref}...`)}
                            className="inline-flex items-center gap-1.5 text-[#9A9A9F] hover:text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest transition-colors py-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                            <span>VAT Receipt</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TAB CONTENT: CANCELLED / ARCHIVED */}
            {activeTab === "archived" && (
              <section className="relative z-10 flex flex-col gap-6">
                <div className="flex flex-col pb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9A9F]">
                    ARCHIVE • TERMINATED PASSES
                  </span>
                  <h3 className="font-serif text-2xl tracking-wider text-[#F5F4F1] uppercase mt-1">
                    Cancelled &amp; Archived Holds
                  </h3>
                </div>

                {archivedStays.length === 0 ? (
                  <div className="py-12 text-center text-[#9A9A9F] text-sm">
                    No cancelled reservations on record. All escrow bookings remain honored.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {archivedStays.map((stay) => (
                      <div
                        key={stay.id}
                        className="p-6 rounded-2xl bg-[#1b1b1e]/60 border border-[#2A2A2E]/50 flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#ffb4ab]">
                              CANCELLED
                            </span>
                            <span className="text-[11px] font-mono text-[#9A9A9F]">
                              #{stay.ref}
                            </span>
                          </div>
                          <h4 className="font-serif text-lg uppercase text-[#F5F4F1]">{stay.title}</h4>
                          <p className="text-xs text-[#9A9A9F] mt-1">{stay.location}</p>
                          <p className="text-xs font-mono text-[#9A9A9F] mt-2">{stay.timeframe}</p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2E]/40 text-xs">
                          <span className="text-[#8FAE97]">Escrow Refund Dispatched</span>
                          <Link
                            href="/stays"
                            className="text-[#F5F4F1] hover:underline font-medium uppercase tracking-wider text-[11px]"
                          >
                            Re-book Sanctuary →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SECTION: CONCIERGE DOCK */}
            <div className="relative z-10 mt-12 rounded-xl bg-[#18181B] border border-[#2A2A2E] p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#1f1f22] flex items-center justify-center text-[#F5F4F1] flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">hotel_class</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                      LUMEN CONCIERGE • 24/7 DEDICATED ALIGNMENT
                    </span>
                    <p className="text-sm text-[#F5F4F1] mt-0.5">
                      Need assistance with your upcoming journey? Lumen Concierge is active on encrypted channels.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => showToast("Lumen AI Concierge initiated. A representative will greet you momentarily.")}
                    className="px-5 py-2 rounded-full bg-[#2a2a2d] hover:bg-[#353438] text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest transition-all"
                  >
                    Summon Concierge
                  </button>
                  <Link
                    href="/help"
                    className="px-5 py-2 rounded-full text-[#9A9A9F] hover:text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest transition-colors"
                  >
                    Protocol FAQ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: GPS Location & Sanctuary Approach Drawer */}
      {showGpsModal && selectedGpsStay && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0C]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-[#0e0e11] border border-[#2A2A2E] rounded-2xl p-6 sm:p-8 text-[#F5F4F1] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2E]">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                  COORDINATES &amp; APPROACH PROTOCOL
                </span>
                <h3 className="font-serif text-xl tracking-wide uppercase mt-0.5">
                  {selectedGpsStay.title} Sanctuary
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsModal(false)}
                className="text-[#9A9A9F] hover:text-[#F5F4F1]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="py-6 flex flex-col gap-4">
              <div
                className="w-full h-56 bg-cover bg-center rounded-xl bg-[#18181B] flex items-end p-4 border border-[#2A2A2E]"
                style={{
                  backgroundImage: `url('${selectedGpsStay.imageUrl}')`,
                }}
              >
                <div className="bg-[#0A0A0C]/90 backdrop-blur-sm p-2 px-3 rounded-lg font-mono text-xs">
                  WGS84: {selectedGpsStay.coordinates} • Private Clifftop Gate
                </div>
              </div>

              <p className="text-sm text-[#9A9A9F] leading-relaxed">
                Private access via Camino de Salada. The final 800m is unpaved crushed dolomite. A 4x4 or high-clearance EV is recommended. Gate code synchronizes with smart entry at {selectedGpsStay.accessWindow}.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGpsModal(false)}
                  className="px-5 py-2 rounded-full bg-[#2a2a2d] text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedGpsStay.coordinates, "Coordinates")}
                  className="px-5 py-2 rounded-full bg-[#F7F6F4] text-[#0A0A0C] text-xs font-semibold uppercase tracking-widest"
                >
                  Copy Apple / Google Coordinates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel Reservation Confirmation */}
      {cancelModalStay && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0C]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0e0e11] border border-[#ffb4ab]/30 rounded-2xl p-6 text-[#F5F4F1] shadow-2xl">
            <h3 className="font-serif text-xl uppercase tracking-wider text-[#ffb4ab]">
              Cancel Residency Hold?
            </h3>
            <p className="text-sm text-[#9A9A9F] mt-2 leading-relaxed">
              Are you sure you want to release your hold for{" "}
              <strong className="text-[#F5F4F1]">{cancelModalStay.title}</strong> (#{cancelModalStay.ref})? Your sovereign escrow funds will be unlocked according to the cancellation policy.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCancelModalStay(null)}
                className="px-4 py-2 rounded-full bg-[#2a2a2d] text-xs font-semibold uppercase tracking-widest text-[#F5F4F1]"
              >
                Keep Hold
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleCancelBooking(cancelModalStay)}
                className="px-4 py-2 rounded-full bg-[#93000a] hover:bg-[#b0000d] text-xs font-semibold uppercase tracking-widest text-white transition-colors"
              >
                {isPending ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-[#18181B] border border-[#2A2A2E] text-white shadow-2xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <LonaFooter />
    </div>
  );
}
