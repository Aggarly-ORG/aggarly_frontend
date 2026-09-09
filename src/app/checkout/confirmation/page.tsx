"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { BookingPaymentClient, BookingResponse } from "@/lib/bookingPaymentClient";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId") || searchParams.get("id") || "";
  const refParam = searchParams.get("ref") || "";

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingIdParam) return;
    BookingPaymentClient.getBooking(bookingIdParam).then((res) => {
      if (res) setBooking(res);
    });
  }, [bookingIdParam]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const bookingRef = refParam || (booking ? `AG-${booking.id.slice(0, 4).toUpperCase()}-IBZ` : "AG-8829-IBZ");
  const checkInDisplay = booking?.checkIn ? `${booking.checkIn} • 16:00 CEST` : "Sep 20, 2026 • 16:00 CEST";
  const checkOutDisplay = booking?.checkOut ? `${booking.checkOut} • 11:00 CEST` : "Sep 25, 2026 • 11:00 CEST";
  const totalDisplay = booking ? `€${booking.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "€4,020.00";
  const guestCountDisplay = booking?.guestCount ? `${booking.guestCount} Adults • Full Estate Solitude` : "4 Adults • Full Estate Solitude";

  // Dynamic .ics calendar generator
  const handleAddToCalendar = () => {
    const title = `Aggarly Sanctuary Residency (${bookingRef})`;
    const description = `Aggarly by Lona Sanctuary Residency at Casa Cala Salada.\\nRef: ${bookingRef}\\nCheck-in Window: 16:00 CEST.\\nVault PIN and arrival coordinates active in your portal.`;
    const location = "Cala Salada, Ibiza, Balearic Islands, Spain";
    const startDate = "20260920T140000Z";
    const endDate = "20260925T090000Z";

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Aggarly by Lona//Nocturnal Sanctuary//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      "STATUS:CONFIRMED",
      `UID:${bookingRef}@aggarly.lona`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Aggarly-Residency-${bookingRef}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showToast("Calendar pass (.ics) generated and downloaded.");
  };

  const handleDownloadInvoice = () => {
    showToast(`Generating verified cryptographic VAT invoice for ${bookingRef}...`);
  };

  return (
    <div className="bg-[#EFEEEC] min-h-screen text-[#151415] selection:bg-[#1f1f22] selection:text-[#F5F4F1] flex flex-col justify-between">
      <LonaHeader />

      <main className="w-full pt-20 pb-16 flex flex-col justify-center">
        <section className="w-full py-8 lg:py-12 px-4 sm:px-6 lg:px-14 flex items-center justify-center">
          <div className="w-full max-w-5xl rounded-[28px] bg-gradient-to-b from-[#0A0A0C] via-[#0E0E12] to-[#121215] text-[#F5F4F1] shadow-[0_24px_54px_-12px_rgba(10,10,12,0.22),0_4px_18px_rgba(10,10,12,0.08)] relative overflow-hidden p-6 sm:p-10 lg:p-14 border border-[#2A2A2E]/50">
            {/* Directional Lunar Glow Blooms */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-[#DCE6EF]/15 blur-[90px]" />
            <div className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full bg-[#EAF2FA]/25 blur-[55px]" />
            <div className="pointer-events-none absolute -top-10 right-16 w-80 h-80 rounded-full bg-[#C3D9EC]/10 blur-[75px]" />

            {/* Lunar Visual & Status Core */}
            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Moon Hero Asset with directional cast */}
              <div className="relative mb-6 group">
                <div className="absolute inset-0 rounded-full shadow-[14px_4px_24px_rgba(225,240,255,0.38),32px_8px_50px_rgba(175,215,255,0.24),70px_16px_95px_rgba(120,170,235,0.15)] pointer-events-none transition-all duration-700" />
                <div className="w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-full bg-gradient-to-tr from-[#1E293B] via-[#475569] to-[#F1F5F9] relative z-10 shadow-2xl flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined text-6xl sm:text-7xl text-white/90">
                    nightlight
                  </span>
                </div>
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-3 py-0.5 rounded-full bg-[#18181B]/95 backdrop-blur-md shadow-md border border-[#2A2A2E]">
                  <span className="font-mono text-[11px] text-[#c3c7cc] tracking-widest uppercase">
                    Phase: 88.4% Waxing
                  </span>
                </div>
              </div>

              {/* Verification Capsule */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18181B]/80 mb-4 shadow-inner border border-[#2A2A2E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97] animate-pulse" />
                <span className="text-[11px] font-semibold text-[#9A9A9F] uppercase tracking-[0.18em]">
                  Reservation Confirmed &amp; Guaranteed{" "}
                  <span className="text-white/30 mx-1">/</span> Ref #{bookingRef}
                </span>
              </div>

              {/* Typography Cluster */}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#F5F4F1] uppercase tracking-[0.14em] max-w-3xl leading-tight">
                Your Celestial Residency Is Secured
              </h1>
              <p className="font-serif italic text-base sm:text-lg text-[#c3c7cc] mt-2 max-w-2xl tracking-wide">
                Casa Cala Salada • San Antonio Coastline, Ibiza • Sep 20 – 25, 2026
              </p>
              <p className="text-sm sm:text-base text-[#9A9A9F] max-w-2xl mt-4 leading-relaxed font-light">
                The nocturnal sanctuary is aligned for your arrival. Your keyless access codes, arrival coordinates, and astronomical observatory protocols have been initialized in your secure portal.
              </p>

              {/* Quick Action Pill Matrix */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-8 w-full max-w-3xl">
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  className="h-11 px-7 rounded-full bg-[#F7F6F4] text-[#0A0A0C] text-xs font-semibold uppercase tracking-[0.14em] inline-flex items-center gap-2 hover:bg-[#EFEEEC] transition-all duration-300 shadow-lg group active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  <span>Add to Apple / Google (.ics)</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </button>

                <Link
                  href={bookingIdParam ? `/trips/${bookingIdParam}/itinerary` : `/trips/booking-8829/itinerary`}
                  className="h-11 px-6 rounded-full bg-[#18181B]/70 text-[#F5F4F1] text-xs font-semibold uppercase tracking-[0.14em] inline-flex items-center gap-2 hover:bg-[#2a2a2d] hover:text-white transition-all duration-300 border border-[#2A2A2E]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#9A9A9F]">explore</span>
                  <span>View Arrival Dossier</span>
                </Link>

                <Link
                  href="/profile/messages"
                  className="h-11 px-6 rounded-full bg-[#18181B]/70 text-[#F5F4F1] text-xs font-semibold uppercase tracking-[0.14em] inline-flex items-center gap-2 hover:bg-[#2a2a2d] hover:text-white transition-all duration-300 border border-[#2A2A2E]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#9A9A9F]">chat_bubble_outline</span>
                  <span>Message Elena Vance</span>
                </Link>

                <div className="w-full flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={handleDownloadInvoice}
                    className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F] hover:text-[#F5F4F1] transition-colors inline-flex items-center gap-1.5 py-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    <span>Download VAT Invoice &amp; Escrow Receipt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Two-Column Architectural Residency & Settlement Ledger */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
              {/* Left Column: Residency Summary */}
              <div className="md:col-span-7 bg-[#18181B]/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-[#2A2A2E]/40">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2A2A2E]/40">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#c3c7cc]">night_shelter</span>
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#F5F4F1]">
                        Residency Summary
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#9A9A9F] uppercase">5 Nights Solitude</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9A9F] block mb-1">
                        Check-in Date &amp; Window
                      </span>
                      <div className="font-mono text-xs text-[#F5F4F1] font-medium">{checkInDisplay}</div>
                      <div className="text-[11px] text-[#c3c7cc]/80 mt-0.5">Keyless access token activates autonomously</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9A9F] block mb-1">
                        Check-out Date
                      </span>
                      <div className="font-mono text-xs text-[#F5F4F1] font-medium">{checkOutDisplay}</div>
                      <div className="text-[11px] text-[#c3c7cc]/80 mt-0.5">Late solar checkout requestable via Curator</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9A9F] block mb-1">
                        Sanctuary Allocation
                      </span>
                      <div className="font-mono text-xs text-[#F5F4F1] font-medium">{guestCountDisplay}</div>
                      <div className="text-[11px] text-[#c3c7cc]/80 mt-0.5">Zero acoustic bleed zone</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9A9F] block mb-1">
                        Curator Assignment
                      </span>
                      <div className="font-mono text-xs text-[#F5F4F1] font-medium">Elena Vance (Ibiza North)</div>
                      <div className="text-[11px] text-[#c3c7cc]/80 mt-0.5">Dedicated private channel active</div>
                    </div>
                  </div>

                  {/* Pre-Configured Instruments & Solitude Amenities */}
                  <div className="mt-6 pt-4 border-t border-[#2A2A2E]/30">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9A9F] block mb-2">
                      Instruments &amp; Sanctuary Assets Primed
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f1f22] text-[#c3c7cc] text-xs">
                        <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                        Celestron 11&quot; Schmidt-Cassegrain
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f1f22] text-[#c3c7cc] text-xs">
                        <span className="material-symbols-outlined text-[14px]">waves</span>
                        Magnesium Immersion Pool (34°C)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f1f22] text-[#c3c7cc] text-xs">
                        <span className="material-symbols-outlined text-[14px]">landscape</span>
                        Private Cove Descent Access
                      </span>
                    </div>
                  </div>
                </div>

                {/* Micro Location Inset Map Hook */}
                <div className="mt-6 pt-4 border-t border-[#2A2A2E]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#9A9A9F]">pin_drop</span>
                    <span className="text-xs text-[#9A9A9F]">38°59&apos;48.2&quot;N 1°17&apos;38.5&quot;E • Cala Salada Cliffs</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast("Satellite route coordinates 38.9967, 1.2940 copied to buffer.")}
                    className="text-[11px] font-semibold uppercase tracking-widest text-[#c3c7cc] hover:text-[#F5F4F1] transition-colors"
                  >
                    Open Satellite Route →
                  </button>
                </div>
              </div>

              {/* Right Column: Settlement Breakdown */}
              <div className="md:col-span-5 bg-[#18181B]/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 flex flex-col justify-between border border-[#2A2A2E]/40">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2A2A2E]/40">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#c3c7cc]">verified_user</span>
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#F5F4F1]">
                        Settlement Breakdown
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#8FAE97]/15 text-[#8FAE97] text-[10px] font-mono uppercase font-semibold">
                      Settled in Escrow
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#9A9A9F]">5 Nights Architectural Sanctuary</span>
                      <span className="font-mono text-[#F5F4F1]">€3,500.00</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#9A9A9F]">Celestial Observatory Calibration</span>
                      <span className="font-mono text-[#F5F4F1]">€180.00</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#9A9A9F]">Biodynamic Vineyard Welcome Provisions</span>
                      <span className="font-mono text-[#F5F4F1]">€140.00</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#9A9A9F]">Balearic Ecological Solitude Surcharge</span>
                      <span className="font-mono text-[#F5F4F1]">€200.00</span>
                    </div>

                    {/* High-contrast Accent Card for Total */}
                    <div className="mt-4 p-4 rounded-xl bg-[#1E1D1C]/90 border border-[#2A2A2E]">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9A9F] block">
                            Total Settled
                          </span>
                          <span className="text-xs text-[#c3c7cc]">Mastercard •••• 9102</span>
                        </div>
                        <div className="font-serif text-2xl text-[#F5F4F1] font-medium tracking-tight">
                          {totalDisplay}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cancellation Clause Note */}
                <div className="mt-6 pt-4 border-t border-[#2A2A2E]/40">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#9A9A9F] shrink-0 mt-0.5">info</span>
                    <p className="text-xs text-[#9A9A9F] leading-relaxed">
                      <strong className="font-semibold text-[#F5F4F1]">Cancellation Grace:</strong> Complimentary modifications conclude Sep 13, 2026 (7 days prior to check-in). Funds remain locked in sovereign escrow until successful door unseal.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps Chronology Timeline Strip */}
            <div className="mt-8 bg-[#18181B]/40 backdrop-blur-sm rounded-2xl p-6 relative z-10 border border-[#2A2A2E]/40">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#F5F4F1]">
                  Sequential Arrival Milestones
                </span>
                <span className="font-mono text-xs text-[#c3c7cc]">Protocol 4 of 4 Active</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                {/* Step 1 */}
                <div className="relative flex flex-col p-4 rounded-xl bg-[#1E1D1C]/70 border border-[#2A2A2E]/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8FAE97] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      Step 01 • Complete
                    </span>
                    <span className="font-mono text-xs text-[#9A9A9F]">Instant</span>
                  </div>
                  <h3 className="font-serif text-sm font-medium text-[#F5F4F1] mb-1">Identity &amp; Deposit Verified</h3>
                  <p className="text-xs text-[#9A9A9F]">Biometric compliance and escrow token processed securely.</p>
                </div>

                {/* Step 2 */}
                <div className="relative flex flex-col p-4 rounded-xl bg-[#1E1D1C] border border-[#2A2A2E]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F5F4F1] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      Step 02 • Underway
                    </span>
                    <span className="font-mono text-xs text-[#9A9A9F]">Active</span>
                  </div>
                  <h3 className="font-serif text-sm font-medium text-[#F5F4F1] mb-1">Curator Provisioning</h3>
                  <p className="text-xs text-[#9A9A9F]">Elena Vance is personalizing regional provisions &amp; optical alignments.</p>
                </div>

                {/* Step 3 */}
                <div className="relative flex flex-col p-4 rounded-xl bg-[#1E1D1C]/40 opacity-75 border border-[#2A2A2E]/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9A9F]">
                      Step 03 • Scheduled
                    </span>
                    <span className="font-mono text-xs text-[#9A9A9F]">Sep 19</span>
                  </div>
                  <h3 className="font-serif text-sm font-medium text-[#F5F4F1] mb-1">Vault Code Dispatch</h3>
                  <p className="text-xs text-[#9A9A9F]">Automated unseal code and high-bandwidth satellite Wi-Fi sent via SMS.</p>
                </div>

                {/* Step 4 */}
                <div className="relative flex flex-col p-4 rounded-xl bg-[#1E1D1C]/40 opacity-75 border border-[#2A2A2E]/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9A9F]">
                      Step 04 • Climax
                    </span>
                    <span className="font-mono text-xs text-[#9A9A9F]">Sep 20 • 16:00</span>
                  </div>
                  <h3 className="font-serif text-sm font-medium text-[#F5F4F1] mb-1">Arrival &amp; Descent</h3>
                  <p className="text-xs text-[#9A9A9F]">Sanctuary opens to your presence under the waxing gibbous sky.</p>
                </div>
              </div>
            </div>

            {/* Observatory Footnote */}
            <div className="mt-8 pt-4 border-t border-[#2A2A2E]/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left relative z-10">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[#9A9A9F]">
                <span className="text-[11px] font-semibold uppercase tracking-widest">End-to-End Encrypted</span>
                <span>•</span>
                <span className="text-[11px] font-semibold uppercase tracking-widest">Sovereign Escrow Protection</span>
              </div>
              <span className="text-[11px] font-mono text-[#9A9A9F]">SESSION HASH: 0x94F2...8829</span>
            </div>
          </div>
        </section>
      </main>

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

export default function ReservationConfirmationPage() {
  return (
    <Suspense fallback={<div className="bg-[#EFEEEC] min-h-screen" />}>
      <ConfirmationContent />
    </Suspense>
  );
}
