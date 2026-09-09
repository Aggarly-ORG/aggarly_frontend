"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { DisplayProperty } from "../../lib/propertySearchClient";
import { GoogleLocationClient } from "../../lib/googleLocationClient";
import { ArrowRight, Compass, Layers, Maximize2, RotateCcw, Star } from "lucide-react";

interface NocturnalGoogleMapProps {
  properties: DisplayProperty[];
  selectedPropertyId: string | null;
  onSelectProperty: (id: string) => void;
  className?: string;
}

const DARK_NOCTURNAL_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0D0D11" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0D0D11" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8E8D92" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#E0B35D" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1B1B22" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#141419" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6B6A70" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#252530" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#060608" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#454550" }],
  },
];

export const NocturnalGoogleMap: React.FC<NocturnalGoogleMapProps> = ({
  properties,
  selectedPropertyId,
  onSelectProperty,
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapType, setMapType] = useState<"nocturnal" | "satellite">("nocturnal");

  const activeProperty =
    properties.find((p) => p.id === selectedPropertyId) || properties[0] || null;

  // Initialize Google Maps instance
  useEffect(() => {
    let isCancelled = false;

    const initMap = async () => {
      const ready = await GoogleLocationClient.initGoogleMaps();
      if (isCancelled || !ready || !mapContainerRef.current) return;

      const google = (window as any).google;
      if (!google || !google.maps) return;

      if (!mapInstanceRef.current) {
        // Initial center: Balearic Islands / Mediterranean defaults
        const defaultCenter = { lat: 39.5, lng: 2.5 };
        const map = new google.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 8,
          styles: DARK_NOCTURNAL_STYLE,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
      }
    };

    initMap();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Update Map Styles when mapType changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (mapType === "satellite") {
      mapInstanceRef.current.setMapTypeId("hybrid");
      mapInstanceRef.current.setOptions({ styles: null });
    } else {
      mapInstanceRef.current.setMapTypeId("roadmap");
      mapInstanceRef.current.setOptions({ styles: DARK_NOCTURNAL_STYLE });
    }
  }, [mapType]);

  // Render Custom Price Markers on Map
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const google = (window as any).google;
    if (!google?.maps?.OverlayView) return;

    // Clear previous overlays
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let validPinsCount = 0;

    // Custom Overlay Class for interactive Nocturnal Price Markers
    class NocturnalPriceOverlay extends google.maps.OverlayView {
      div: HTMLDivElement | null = null;
      position: any;
      property: DisplayProperty;
      isSelected: boolean;

      constructor(pos: any, property: DisplayProperty, isSelected: boolean) {
        super();
        this.position = pos;
        this.property = property;
        this.isSelected = isSelected;
        this.setMap(mapInstanceRef.current);
      }

      onAdd() {
        const div = document.createElement("div");
        div.className = "aggarly-nocturnal-marker";
        div.style.position = "absolute";
        div.style.cursor = "pointer";
        div.style.zIndex = this.isSelected ? "999" : "20";
        div.style.transition = "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";

        const isSel = this.isSelected;
        div.innerHTML = `
          <div style="
            padding: 5px 12px;
            border-radius: 9999px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
            border: ${isSel ? "2px solid #E0B35D" : "1px solid rgba(255,255,255,0.22)"};
            background: ${isSel ? "#FFFFFF" : "rgba(10, 10, 12, 0.94)"};
            color: ${isSel ? "#000000" : "#FFFFFF"};
            box-shadow: ${isSel ? "0 8px 30px rgba(224,179,93,0.4)" : "0 4px 20px rgba(0,0,0,0.6)"};
            transform: ${isSel ? "scale(1.15)" : "scale(1)"};
            backdrop-filter: blur(8px);
            white-space: nowrap;
          ">
            <span style="
              width: 6px;
              height: 6px;
              border-radius: 9999px;
              background: ${isSel ? "#E0B35D" : "#34D399"};
              box-shadow: 0 0 6px ${isSel ? "#E0B35D" : "#34D399"};
            "></span>
            <span>€${this.property.nightlyPrice}</span>
          </div>
        `;

        div.onclick = (e) => {
          e.stopPropagation();
          onSelectProperty(this.property.id);
        };

        this.div = div;
        const panes = this.getPanes();
        panes?.overlayMouseTarget?.appendChild(div);
      }

      draw() {
        const projection = this.getProjection();
        if (!projection || !this.div) return;
        const point = projection.fromLatLngToDivPixel(this.position);
        if (point) {
          this.div.style.left = point.x + "px";
          this.div.style.top = point.y + "px";
          this.div.style.transform = "translate(-50%, -100%)";
        }
      }

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }
    }

    // Place overlay for each property
    properties.forEach((property, index) => {
      let lat = Number(property.latitude);
      let lng = Number(property.longitude);

      // Graceful fallback for properties missing exact geocoordinates
      if (!lat || !lng || (lat === 0 && lng === 0)) {
        // Deterministic spread around Balearic reference coordinates
        const offsetLat = ((index % 5) - 2) * 0.08;
        const offsetLng = (Math.floor(index / 5) - 1) * 0.12;
        lat = 39.5 + offsetLat;
        lng = 2.5 + offsetLng;
      }

      const pos = new google.maps.LatLng(lat, lng);
      bounds.extend(pos);
      validPinsCount++;

      const isSelected = selectedPropertyId === property.id;
      const overlay = new NocturnalPriceOverlay(pos, property, isSelected);
      overlaysRef.current.push(overlay);
    });

    // Fit bounds smoothly if we have pins
    if (validPinsCount > 0 && !selectedPropertyId) {
      mapInstanceRef.current.fitBounds(bounds, {
        top: 60,
        right: 40,
        bottom: 120,
        left: 40,
      });
    }
  }, [properties, selectedPropertyId, mapLoaded, onSelectProperty]);

  // Pan smoothly when active property changes
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !activeProperty) return;
    const google = (window as any).google;
    if (!google) return;

    let lat = Number(activeProperty.latitude);
    let lng = Number(activeProperty.longitude);

    if (lat && lng && (lat !== 0 || lng !== 0)) {
      mapInstanceRef.current.panTo({ lat, lng });
    }
  }, [selectedPropertyId, activeProperty, mapLoaded]);

  // Controls Handlers
  const handleZoomIn = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 8) + 1);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 8) - 1);
  }, []);

  const handleResetView = useCallback(() => {
    if (!mapInstanceRef.current || properties.length === 0) return;
    const google = (window as any).google;
    if (!google) return;

    const bounds = new google.maps.LatLngBounds();
    properties.forEach((p, idx) => {
      let lat = Number(p.latitude);
      let lng = Number(p.longitude);
      if (!lat || !lng || (lat === 0 && lng === 0)) {
        lat = 39.5 + (((idx % 5) - 2) * 0.08);
        lng = 2.5 + ((Math.floor(idx / 5) - 1) * 0.12);
      }
      bounds.extend(new google.maps.LatLng(lat, lng));
    });

    mapInstanceRef.current.fitBounds(bounds, {
      top: 60,
      right: 40,
      bottom: 120,
      left: 40,
    });
  }, [properties]);

  return (
    <div
      className={`relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-[#0A0A0C] border border-white/10 flex flex-col justify-between ${className}`}
    >
      {/* Real Interactive Google Maps Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

      {/* Loading Overlay if Google Maps is initializing */}
      {!mapLoaded && (
        <div className="absolute inset-0 z-20 bg-[#0A0A0C] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#dfb15b] animate-spin mb-3" />
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Initializing Celestial Google Map...
          </span>
        </div>
      )}

      {/* Top Map Floating Control Strip */}
      <div className="relative z-30 p-3.5 flex items-center justify-between pointer-events-none">
        {/* Style mode switch */}
        <div className="pointer-events-auto flex items-center p-0.5 rounded-full bg-black/85 backdrop-blur-md border border-white/15 shadow-xl">
          <button
            onClick={() => setMapType("nocturnal")}
            className={`px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all ${
              mapType === "nocturnal"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Nocturnal
          </button>
          <button
            onClick={() => setMapType("satellite")}
            className={`px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all ${
              mapType === "satellite"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-full bg-black/85 backdrop-blur-md border border-white/15 shadow-xl">
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 flex items-center justify-center font-mono text-sm font-semibold transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 flex items-center justify-center font-mono text-sm font-semibold transition-colors"
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={handleResetView}
            className="w-7 h-7 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            title="Reset Map Bounds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected Stay Floating Dock at Bottom of Map */}
      {activeProperty && (
        <div className="relative z-30 p-3.5 pt-0 pointer-events-none">
          <div className="pointer-events-auto p-3 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-800 border border-white/10">
                <img
                  src={activeProperty.coverImage}
                  alt={activeProperty.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#dfb15b]">
                    Active Selection
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <h4 className="font-serif text-sm text-white truncate max-w-[220px]">
                  {activeProperty.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300">
                  <span className="text-white font-semibold">€{activeProperty.nightlyPrice}</span>
                  <span className="text-zinc-500">/ night</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-amber-300">
                    <Star className="w-3 h-3 fill-amber-300" />
                    <span>{activeProperty.rating.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            </div>
            <Link
              href={`/properties/${activeProperty.id}`}
              className="shrink-0 h-8 px-3 rounded-full bg-white hover:bg-zinc-200 text-black font-mono text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1 transition-transform hover:scale-105 shadow-md"
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Almanac Bar */}
      <div className="relative z-30 px-4 py-2.5 bg-[#18181B] flex items-center justify-between border-t border-white/10 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#dfb15b]" />
          <span className="font-mono text-[10px] uppercase text-zinc-400">NOCTURNAL GOOGLE MAP</span>
          <span className="font-mono text-[11px] text-emerald-400 font-semibold">Live Interactive Pins</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
          {properties.length} Active Coordinates
        </span>
      </div>
    </div>
  );
};
