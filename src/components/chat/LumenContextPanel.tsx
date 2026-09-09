"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ContextPreviewData } from "./LumenChatSlice";
import { ProfileBooking } from "../../lib/profileClient";
import { PropertyDetail } from "../../lib/propertyTypes";
import {
  PanelRightClose,
  Phone,
  Calendar,
  Users,
  MapPin,
  ExternalLink,
  RotateCw,
  ArrowLeft,
  X,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LumenContextPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  previewContext: ContextPreviewData | null;
  onClosePreview: () => void;
  onSelectProperty?: (propertyId: string) => void;
  booking?: ProfileBooking | null;
  property?: PropertyDetail | null;
  isLoading?: boolean;
  width?: number;
}

export const LumenContextPanel: React.FC<LumenContextPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  previewContext,
  onClosePreview,
  onSelectProperty,
  booking,
  property,
  isLoading = false,
  width,
}) => {
  const [syncAutomation, setSyncAutomation] = useState(true);
  const [notifyHost, setNotifyHost] = useState(true);
  const [callNotice, setCallNotice] = useState<string | null>(null);

  const handleCallHost = (contactName: string) => {
    setCallNotice(`Connecting private audio call to ${contactName}...`);
    setTimeout(() => setCallNotice(null), 3500);
  };

  const handleTogglePreference = (msg: string) => {
    setCallNotice(msg);
    setTimeout(() => setCallNotice(null), 2500);
  };

  return (
    <aside
      style={!isCollapsed && width ? { width: `${width}px` } : undefined}
      className={cn(
        "self-stretch min-h-full h-full bg-[#0E0E10] border-l border-white/10 flex flex-col justify-between select-none shrink-0 relative",
        isCollapsed
          ? "w-0 min-w-0 p-0 opacity-0 overflow-hidden border-l-0 pointer-events-none transition-all duration-300 ease-in-out"
          : "w-88 min-w-[260px] max-w-[600px] p-3.5 sm:p-4 opacity-100 overflow-y-auto overflow-x-hidden transition-opacity duration-200"
      )}
    >
      <div
        className={cn(
          "w-full flex flex-col justify-between h-full min-h-full flex-1 transition-opacity duration-200 overflow-y-auto overflow-x-hidden custom-scrollbar",
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
      {/* Call Notice Toast */}
      {callNotice && (
        <div className="absolute top-4 left-4 right-4 z-50 p-3 rounded-2xl bg-white text-black text-xs font-mono text-center shadow-2xl animate-in fade-in">
          {callNotice}
        </div>
      )}

      {/* Mode A: In-Context Window / Webpage Viewport */}
      {previewContext ? (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-200">
          {/* Top Browser Navigation Bar */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClosePreview}
                title="Back to Reservation Context"
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {}}
                title="Reload"
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Address Pill */}
            <div className="flex-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono text-white/60 truncate text-center">
              lona.internal/{previewContext.type}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse context panel"
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-sm group shrink-0"
              >
                <PanelRightClose className="w-4 h-4 text-[#D4AF37] group-hover:scale-105 transition-transform" />
              </button>
              <button
                type="button"
                onClick={onClosePreview}
                title="Close Preview"
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Viewport Content */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Title */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                IN-CONTEXT INTELLIGENCE
              </span>
              <h3 className="font-serif text-lg text-white tracking-wide mt-1">
                {previewContext.title}
              </h3>
            </div>

            {/* If Tasting Menu */}
            {previewContext.type === "tasting_menu" && previewContext.data?.courses && (
              <div className="space-y-3">
                <p className="text-xs text-white/60 font-sans leading-relaxed">
                  Crafted over stone firepit embers with fresh local catches from the Cala Salada cove and foraged wild herbs.
                </p>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
                    SANCTUARY TASTING COURSES
                  </span>
                  {previewContext.data.courses.map((course: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs font-serif text-white">
                        <span>{course.name}</span>
                        <span className="font-mono text-[10px] text-[#D4AF37]">
                          {course.pairing}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 font-sans">
                        {course.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 font-mono text-xs text-white/70 space-y-1">
                  <span className="text-[10px] text-white/40 uppercase block">SOMMELIER PAIRING</span>
                  <span>{previewContext.data.pairing}</span>
                </div>
              </div>
            )}

            {/* If Dossier Preview */}
            {previewContext.type === "dossier" && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-white/40 uppercase text-[10px]">SANCTUARY</span>
                    <span className="text-white">{previewContext.data?.retreat}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-white/40 uppercase text-[10px]">DATES</span>
                    <span className="text-white">{previewContext.data?.dates}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-white/40 uppercase text-[10px]">OCCUPANCY</span>
                    <span className="text-white">{previewContext.data?.guests}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 uppercase text-[10px]">SKY VISIBILITY</span>
                    <span className="text-[#10B981]">{previewContext.data?.skyCondition}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alert("Sanctuary itinerary compiled and exported to your resident profile.")}
                  className="w-full py-3 rounded-xl bg-[#E5E2DC] hover:bg-white text-black font-semibold text-xs uppercase tracking-wider transition-all"
                >
                  Download Formal PDF Dossier
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mode B: Real Reservation / Sanctuary Context */
        <div className="flex flex-col space-y-5">
          {/* Header & Accordion Collapse Trigger directly in header */}
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-white/80">
              RESERVATION CONTEXT
            </span>

            {/* Accordion Collapse Trigger directly in header - matches outer header icon button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse context panel"
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-sm group shrink-0"
            >
              <PanelRightClose className="w-4 h-4 text-[#D4AF37] group-hover:scale-105 transition-transform" />
            </button>
          </div>

          {/* If user has an active real booking */}
          {booking ? (
            <div className="space-y-4">
              {/* SANCTUARY Card */}
              <Link
                href={`/properties/${booking.propertyId}`}
                className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 group cursor-pointer transition-all hover:border-white/20 block"
              >
                {booking.propertyImage && (
                  <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
                    <img
                      src={booking.propertyImage}
                      alt={booking.propertyTitle}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] via-transparent to-transparent" />
                  </div>
                )}

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#D4AF37]">
                      SANCTUARY
                    </span>
                    <span className="text-[9px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {booking.status}
                    </span>
                  </div>

                  <h4 className="font-serif text-lg sm:text-xl text-white font-normal tracking-wide group-hover:text-[#D4AF37] transition-colors truncate">
                    {booking.propertyTitle}
                  </h4>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-white/50">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-white/40" />
                      {booking.checkIn} – {booking.checkOut}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-white/40" />
                      {booking.guestCount} {booking.guestCount === 1 ? "Guest" : "Guests"}
                    </span>
                  </div>

                  {booking.propertyCity && (
                    <div className="pt-0.5 text-[11px] font-sans text-white/40 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-white/30 shrink-0" />
                      <span className="truncate">
                        {booking.propertyCity}, {booking.propertyCountry}
                      </span>
                    </div>
                  )}
                </div>
              </Link>

              {/* Host Contact from Property Data */}
              {property?.host && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 block">
                    CONCIERGE &amp; HOST
                  </span>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {property.host.avatarUrl ? (
                        <img
                          src={property.host.avatarUrl}
                          alt={property.host.name}
                          className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-serif text-xs text-[#D4AF37] shrink-0">
                          {(property.host.name || "H")[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-serif font-medium text-white block truncate">
                          {property.host.name || "Sanctuary Host"}
                        </span>
                        <span className="text-[10px] font-mono text-white/40 block truncate">
                          {property.host.isSuperhost ? "Superhost • Verified Sanctuary" : "Resident Sanctuary Host"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCallHost(property.host?.name || "Sanctuary Host")}
                      className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Contact Host"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Real Sanctuary Highlights */}
              {property?.amenities && property.amenities.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 block">
                    SANCTUARY HIGHLIGHTS
                  </span>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap gap-1.5">
                    {property.amenities.slice(0, 6).map((amenity) => (
                      <span
                        key={amenity.id}
                        className="px-2 py-1 rounded-md bg-white/[0.04] text-[10px] font-mono text-white/70 border border-white/5"
                      >
                        {amenity.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : property ? (
            /* If no active booking, display real curated sanctuary from database */
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#D4AF37] block">
                  CURATED SANCTUARY
                </span>
                <p className="text-xs font-sans text-white/50 leading-relaxed">
                  Explore celestial retreats and inquire with Lumen about reservations.
                </p>
              </div>

              <Link
                href={`/properties/${property.id}`}
                className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 group cursor-pointer transition-all hover:border-white/20 block"
              >
                {property.images?.[0]?.url && (
                  <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
                    <img
                      src={property.images[0].url}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] via-transparent to-transparent" />
                  </div>
                )}

                <div className="p-4 space-y-1.5">
                  <h4 className="font-serif text-lg text-white font-normal tracking-wide group-hover:text-[#D4AF37] transition-colors truncate">
                    {property.title}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                      {property.address?.city || property.address?.country || "Sanctuary"}
                    </span>
                    <span className="text-[#D4AF37] font-serif shrink-0">
                      ${property.basePricePerNight} / night
                    </span>
                  </div>

                  {property.amenities && property.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {property.amenities.slice(0, 3).map((a) => (
                        <span
                          key={a.id}
                          className="px-1.5 py-0.5 rounded bg-white/5 text-[9.5px] font-mono text-white/50"
                        >
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          ) : (
            /* Clean Authentic Empty State */
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-3 my-4">
              <div className="w-10 h-10 rounded-full bg-white/5 mx-auto flex items-center justify-center text-white/40">
                <Compass className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h5 className="font-serif text-sm text-white font-normal">
                  No Active Reservation
                </h5>
                <p className="text-[11.5px] font-sans text-white/40 leading-relaxed">
                  Your sanctuary stay details and host contacts will synchronize here upon booking.
                </p>
              </div>
              <Link
                href="/properties"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/10 text-white text-[11px] font-mono uppercase tracking-wider transition-colors"
              >
                <span>Explore Stays</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Automation & Notification Checkboxes */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] text-xs font-mono text-white/70 cursor-pointer select-none">
              <span>Sync Villa Automation</span>
              <input
                type="checkbox"
                checked={syncAutomation}
                onChange={(e) => {
                  setSyncAutomation(e.target.checked);
                  handleTogglePreference(e.target.checked ? "Villa automation synced" : "Villa automation paused");
                }}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-white accent-[#E5E2DC] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] text-xs font-mono text-white/70 cursor-pointer select-none">
              <span>Notify Villa Host</span>
              <input
                type="checkbox"
                checked={notifyHost}
                onChange={(e) => {
                  setNotifyHost(e.target.checked);
                  handleTogglePreference(e.target.checked ? "Host notifications active" : "Host notifications muted");
                }}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-white accent-[#E5E2DC] cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}
      </div>
    </aside>
  );
};
