"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PropertyClient } from "../../../../lib/propertyClient";
import { PropertyDetail } from "../../../../lib/propertyTypes";
import { ReservationPaymentView } from "../../../../components/checkout/ReservationPaymentView";
import { LonaHeader } from "../../../../components/common/LonaHeader";
import { LonaFooter } from "../../../../components/common/LonaFooter";

function CheckoutContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const propertyId = params?.id as string;

  const checkIn = searchParams.get("checkIn") || undefined;
  const checkOut = searchParams.get("checkOut") || undefined;
  const guestsParam = searchParams.get("guests");
  const guests = guestsParam ? parseInt(guestsParam, 10) : 2;
  const existingBookingId = searchParams.get("bookingId") || undefined;

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProperty() {
      if (!propertyId) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const res = await PropertyClient.getPropertyById(propertyId);
        if (isMounted && res) {
          setProperty((res as any)?.data || res);
        }
      } catch (err: any) {
        console.warn("[CheckoutPage] Property load error:", err);
        if (isMounted) {
          setError(err?.message || "Unable to retrieve nocturnal sanctuary data.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadProperty();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  if (isLoading) {
    return (
      <div className="bg-[#0B0B0D] text-white min-h-screen flex flex-col justify-between">
        <LonaHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
          <div className="w-14 h-14 rounded-full border-2 border-[#E5E2DC]/20 border-t-[#E5E2DC] animate-spin" />
          <p className="font-serif text-xs uppercase tracking-[0.2em] text-white/50">
            Calibrating Sanctuary Reservation &amp; Ephemeris...
          </p>
        </div>
        <LonaFooter />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="bg-[#0B0B0D] text-white min-h-screen flex flex-col justify-between">
        <LonaHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md p-8 rounded-3xl bg-[#141416] border border-white/10 space-y-4 shadow-2xl">
            <span className="material-symbols-outlined text-[36px] text-[#D4AF37]">
              bedtime_off
            </span>
            <h2 className="font-serif text-2xl uppercase tracking-wider text-white">
              Sanctuary Not Found
            </h2>
            <p className="text-xs text-white/60 leading-relaxed font-sans">
              {error || "The selected architectural sanctuary could not be located in the ephemeris."}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-full bg-[#E5E2DC] text-[#0B0B0D] font-semibold text-xs uppercase tracking-wider hover:bg-white transition-all"
            >
              ← Return to Retreats Almanac
            </Link>
          </div>
        </div>
        <LonaFooter />
      </div>
    );
  }

  return (
    <ReservationPaymentView
      property={property}
      initialCheckIn={checkIn}
      initialCheckOut={checkOut}
      initialGuests={guests}
      existingBookingId={existingBookingId}
    />
  );
}

export default function PropertyCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#0B0B0D] text-white min-h-screen flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#E5E2DC]/20 border-t-[#E5E2DC] animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
