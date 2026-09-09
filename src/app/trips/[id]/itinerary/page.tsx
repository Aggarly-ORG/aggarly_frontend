"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { BookingPaymentClient, BookingResponse } from "@/lib/bookingPaymentClient";

interface ItineraryPageProps {
  params: Promise<{ id: string }>;
}

export default function StayItineraryPage({ params }: ItineraryPageProps) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [dossier, setDossier] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinCopied, setPinCopied] = useState(false);
  const [wifiCopied, setWifiCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const load = async () => {
      setLoading(true);
      const [bookingData, dossierData] = await Promise.all([
        BookingPaymentClient.getBooking(bookingId),
        BookingPaymentClient.getBookingDossier(bookingId),
      ]);
      if (bookingData) setBooking(bookingData);
      if (dossierData) setDossier(dossierData);
      setLoading(false);
    };

    load();
  }, [bookingId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (loading) {
    return (
      <div className="bg-[#EFEEEC] min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-[#8A8884] animate-pulse">nightlight</span>
      </div>
    );
  }

  if (!booking && !dossier) {
    return (
      <div className="bg-[#EFEEEC] min-h-screen flex flex-col items-center justify-center gap-4 text-[#151415]">
        <span className="material-symbols-outlined text-[48px] text-[#8A8884]">error_outline</span>
        <p className="text-sm text-[#8A8884] uppercase tracking-widest">Itinerary not found</p>
        <Link href="/trips" className="text-xs underline text-[#151415]">Back to My Journeys</Link>
      </div>
    );
  }

  const bookingRef = booking ? `AG-${booking.id.slice(0, 4).toUpperCase()}-IBZ` : "—";
  const vaultPin = dossier?.vaultPin ?? "—";
  const wifiSSID = dossier?.wifiSsid ?? "—";
  const wifiPass = dossier?.wifiPasskey ?? "—";
  const sanctuaryTitle = dossier?.sanctuaryTitle ?? (booking as any)?.propertyTitle ?? "Your Sanctuary";
  const checkInDate = booking?.checkIn ?? "—";
  const checkInWindow = dossier?.checkInWindow ?? "—";
  const latitude = dossier?.latitude ?? null;
  const longitude = dossier?.longitude ?? null;
  const parking = dossier?.parkingProtocols ?? null;
  const totalAmountFormatted = booking
    ? `€${booking.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "—";

  const copyPin = () => {
    navigator.clipboard.writeText(vaultPin);
    setPinCopied(true);
    showToast(`Keyless Vault PIN ${vaultPin} copied to clipboard.`);
    setTimeout(() => setPinCopied(false), 2500);
  };

  const copyWifi = () => {
    navigator.clipboard.writeText(wifiPass);
    setWifiCopied(true);
    showToast(`Wi-Fi passcode copied to clipboard.`);
    setTimeout(() => setWifiCopied(false), 2500);
  };

  const handleAppleWallet = () => {
    showToast(`Generating signed Apple Wallet Pass for residency #${bookingRef}...`);
  };

  const handleDownloadPdf = () => {
    showToast(`Exporting high-resolution PDF Arrival Dossier for #${bookingRef}...`);
    window.print();
  };

  return (
    <div className="bg-[#EFEEEC] min-h-screen text-[#151415] selection:bg-[#1f1f22] selection:text-[#F5F4F1] flex flex-col justify-between">
      <LonaHeader />

      <main className="w-full pt-20 pb-16 flex flex-col justify-center">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Breadcrumb & Status Tracker */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 text-xs text-[#8A8884] hover:text-[#151415] transition-colors tracking-widest uppercase font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to My Journeys
            </Link>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[#8A8884] uppercase tracking-widest">
                Ref: #{bookingRef}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#DEDCD8]" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f1f22]/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97] animate-pulse" />
                <span className="text-[11px] text-[#151415] tracking-widest uppercase font-semibold">
                  Confirmed &amp; Guaranteed
                </span>
              </div>
            </div>
          </div>

          {/* Central Floating Monolith */}
          <div
            className="relative w-full rounded-[28px] bg-gradient-to-b from-[#0A0A0C] to-[#0e0e11] p-6 sm:p-10 lg:p-14 shadow-2xl text-[#F5F4F1] overflow-hidden border border-[#2A2A2E]/50"
            style={{
              boxShadow: "0 32px 64px -16px rgba(10, 10, 12, 0.45), 0 4px 24px rgba(10, 10, 12, 0.1)",
            }}
          >
            {/* Lunar Ambient Radial Bleed */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#DCE6EF]/5 blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 -right-48 w-[32rem] h-[32rem] rounded-full bg-[#9A9A9F]/5 blur-3xl pointer-events-none" />

            {/* Dossier Header Section */}
            <header className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-[#2A2A2E]/50">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-full bg-[#18181B] flex items-center justify-center shadow-inner overflow-hidden flex-shrink-0 border border-white/20">
                    <span className="material-symbols-outlined text-[24px] text-white">nightlight</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#9A9A9F]">
                      Celestial Sanctuary Dossier
                    </span>
                    <span className="font-mono text-xs text-[#9A9A9F]">
                      Aggarly by Lona
                    </span>
                  </div>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-wider text-[#F5F4F1] uppercase">
                  {sanctuaryTitle}
                </h1>
                <p className="font-serif italic text-sm sm:text-base text-[#9A9A9F] tracking-normal">
                  Aggarly by Lona • Check-in {checkInDate}
                </p>
              </div>

              {/* Quick Access Actions */}
              <div className="flex flex-wrap md:flex-col lg:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleAppleWallet}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] hover:bg-[#2a2a2d] transition-colors text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest border border-[#2A2A2E]"
                >
                  <span className="material-symbols-outlined text-[18px]">wallet</span>
                  Apple Wallet
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] hover:bg-[#2a2a2d] transition-colors text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest border border-[#2A2A2E]"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  PDF Dossier
                </button>
              </div>
            </header>

            {/* Key Access & Vault Pin Hero Box */}
            <section className="relative z-10 my-8 p-6 sm:p-8 rounded-2xl bg-[#18181B]/70 backdrop-blur-md border border-[#2A2A2E]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                {/* Keyless PIN */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#9A9A9F]">lock_clock</span>
                    <span className="text-[10px] font-semibold text-[#9A9A9F] tracking-widest uppercase">
                      Keyless Vault Pin
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-4">
                    <span className="font-mono text-3xl sm:text-4xl tracking-[0.25em] text-[#F5F4F1] font-medium">
                      {vaultPin}
                    </span>
                    <button
                      type="button"
                      onClick={copyPin}
                      className="text-[10px] font-semibold text-[#9A9A9F] hover:text-[#F5F4F1] uppercase tracking-widest px-3 py-1 rounded-full bg-[#2a2a2d] transition-all"
                    >
                      {pinCopied ? "COPIED" : "COPY PIN"}
                    </button>
                  </div>
                  <p className="font-mono text-xs text-[#9A9A9F]">
                    Active precisely from <span className="text-[#F5F4F1] font-medium">16:00 CEST</span> on {checkInDate} through departure.
                  </p>
                </div>

                {/* Separator on desktop */}
                <div className="hidden lg:block w-px h-16 bg-[#353438]" />

                {/* Wi-Fi Network & Password */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#9A9A9F]">wifi</span>
                    <span className="text-[10px] font-semibold text-[#9A9A9F] tracking-widest uppercase">
                      Dedicated Sanctuary Fiber
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#9A9A9F]">SSID</span>
                      <span className="text-[#F5F4F1] font-medium">{wifiSSID}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#9A9A9F]">Passcode</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#F5F4F1] tracking-wider font-medium">{wifiPass}</span>
                        <button
                          type="button"
                          onClick={copyWifi}
                          className="text-[10px] text-[#9A9A9F] hover:text-[#F5F4F1] uppercase tracking-wider px-2 py-0.5 rounded bg-[#2a2a2d]"
                        >
                          {wifiCopied ? "COPIED" : "COPY"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-7 space-y-10">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-xl sm:text-2xl text-[#F5F4F1] uppercase tracking-wider">
                      Arrival Cadence
                    </h2>
                    {checkInWindow !== "—" && (
                      <span className="font-mono text-xs text-[#9A9A9F]">Window: {checkInWindow}</span>
                    )}
                  </div>
                  <p className="text-sm text-[#9A9A9F] leading-relaxed">
                    Seamless self-admittance is available via the vault keypad. Please ensure you have your PIN ready upon arrival.
                  </p>
                </div>

                {latitude && longitude && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#9A9A9F] tracking-widest uppercase">
                        Coordinates &amp; Siting
                      </span>
                      <span className="font-mono text-xs text-[#F5F4F1]">
                        {latitude}° N, {longitude}° E
                      </span>
                    </div>

                    <div className="relative w-full h-56 rounded-xl overflow-hidden bg-[#1E1D1C] flex flex-col justify-between p-4 border border-[#2A2A2E]">
                      <div className="absolute inset-0 bg-[#0A0A0C]/60" />
                      <div className="relative z-10 self-start px-3 py-1 rounded-full bg-[#0A0A0C]/80 backdrop-blur-sm">
                        <span className="text-[10px] font-semibold text-[#F5F4F1] uppercase tracking-widest">
                          {sanctuaryTitle}
                        </span>
                      </div>
                      <div className="relative z-10 flex items-center gap-2 self-end">
                        <a
                          href={`https://maps.apple.com/?ll=${latitude},${longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-full bg-[#0A0A0C]/90 hover:bg-[#18181B] text-[#F5F4F1] text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md transition-all border border-[#2A2A2E]"
                        >
                          Open Apple Maps
                        </a>
                        <a
                          href={`https://maps.google.com/?q=${latitude},${longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-full bg-[#0A0A0C]/90 hover:bg-[#18181B] text-[#F5F4F1] text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md transition-all border border-[#2A2A2E]"
                        >
                          Google Maps
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {parking && (
                  <div className="p-5 rounded-xl bg-[#18181B] space-y-2 border border-[#2A2A2E]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#9A9A9F]">garage</span>
                      <span className="text-[10px] font-semibold text-[#9A9A9F] tracking-widest uppercase">
                        Parking
                      </span>
                    </div>
                    <p className="text-xs text-[#F5F4F1] leading-relaxed">{parking}</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 space-y-8">
                <div className="p-6 rounded-2xl bg-[#18181B] space-y-4 border border-[#2A2A2E]">
                  <span className="text-[10px] font-semibold text-[#9A9A9F] tracking-widest uppercase">
                    Settlement Account
                  </span>
                  <div className="space-y-2 pt-1 text-xs">
                    {booking && (
                      <div className="flex justify-between items-center text-[#9A9A9F]">
                        <span>Booking #{booking.id.slice(0, 8).toUpperCase()}</span>
                        <span className="font-mono text-[#8FAE97]">{booking.status}</span>
                      </div>
                    )}
                    <div className="pt-3 flex justify-between items-center border-t border-[#2A2A2E]/40">
                      <span className="text-xs font-semibold text-[#F5F4F1] uppercase">Total Settled</span>
                      <span className="font-serif text-xl text-[#F5F4F1] font-medium">
                        {totalAmountFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#18181B] space-y-3 border border-[#2A2A2E]">
                  <span className="text-[10px] font-semibold text-[#9A9A9F] tracking-widest uppercase">
                    Need Help?
                  </span>
                  <Link
                    href="/profile/messages"
                    className="w-full py-2.5 rounded-full bg-[#2a2a2d] hover:bg-[#353438] transition-colors text-[11px] font-semibold uppercase tracking-widest text-[#F5F4F1] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    <span>Message Host</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
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
