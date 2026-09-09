"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { LonaHeader } from "../../components/common/LonaHeader";
import {
  PropertySearchClient,
  DisplayProperty,
  AmenityItem,
  PropertySearchFilters,
} from "../../lib/propertySearchClient";
import { WishlistClient } from "../../lib/wishlistClient";
import { GoogleLocationClient, LocationSuggestion } from "../../lib/googleLocationClient";
import { NocturnalGoogleMap } from "../../components/properties/NocturnalGoogleMap";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Camera,
  ArrowRight,
  SlidersHorizontal,
  Grid,
  Map as MapIcon,
  Star,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  X,
  Sparkles,
  Upload,
  Telescope,
  Check,
  Bed,
  Bath,
  RotateCw,
  Locate,
  Loader2,
} from "lucide-react";

// Curated Category Pills for Top Navigation
const CATEGORIES = [
  { id: "all", label: "All Retreats" },
  { id: "VILLA", label: "Villas & Estates" },
  { id: "HOUSE", label: "Monolithic Fincas" },
  { id: "CABIN", label: "Wilderness Observatories" },
  { id: "LOFT", label: "Horizon Lofts" },
  { id: "APARTMENT", label: "Cliffside Suites" },
  { id: "STUDIO", label: "Minimalist Studios" },
  { id: "CHALET", label: "Alpine Chalets" },
  { id: "TOWNHOUSE", label: "Historic Townhouses" },
  { id: "ROOM", label: "Private Suites" },
  { id: "OTHER", label: "Unique Dwellings" },
];

// All Backend Property Types for the Multi-Select Filter Suite
const ALL_PROPERTY_TYPES = [
  { id: "VILLA", label: "Villa / Estate" },
  { id: "HOUSE", label: "Finca / House" },
  { id: "APARTMENT", label: "Apartment / Suite" },
  { id: "CABIN", label: "Cabin / Observatory" },
  { id: "LOFT", label: "Horizon Loft" },
  { id: "STUDIO", label: "Architectural Studio" },
  { id: "CHALET", label: "Alpine Chalet" },
  { id: "TOWNHOUSE", label: "Townhouse" },
  { id: "ROOM", label: "Private Room" },
  { id: "OTHER", label: "Other Sanctuary" },
];

export default function PropertiesPage() {
  // Properties Feed & Infinite Scroll Slicing
  const [properties, setProperties] = useState<DisplayProperty[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(true);
  const [totalResidences, setTotalResidences] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"split" | "grid">("split");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Search parameters
  const [destination, setDestination] = useState<string>("");
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [guests, setGuests] = useState<number>(2);
  const [suites, setSuites] = useState<number>(1);
  const [baths, setBaths] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"avgRating" | "basePricePerNight" | "createdAt">("avgRating");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");

  // Advanced Filters Modal State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  const [amenitySearchQuery, setAmenitySearchQuery] = useState<string>("");
  const [allAmenities, setAllAmenities] = useState<AmenityItem[]>([]);

  // Visual AI Photo Search Modal State
  const [isPhotoSearchOpen, setIsPhotoSearchOpen] = useState<boolean>(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoPrompt, setPhotoPrompt] = useState<string>("");
  const [isPhotoSearching, setIsPhotoSearching] = useState<boolean>(false);
  const [photoSearchActive, setPhotoSearchActive] = useState<boolean>(false);

  // Google Location & Geolocation Autocomplete State
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const locationInputRef = useRef<HTMLDivElement>(null);

  // Popover controls
  const [isGuestPopoverOpen, setIsGuestPopoverOpen] = useState<boolean>(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState<boolean>(false);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());

  // Infinite Scroll Sentinel Ref
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load amenities and Google Maps JS SDK once on mount
  useEffect(() => {
    PropertySearchClient.getAmenities().then(setAllAmenities);
    GoogleLocationClient.initGoogleMaps().catch(() => {});
  }, []);

  // Debounced location suggestions via Google Places Autocomplete
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const results = await GoogleLocationClient.searchLocations(destination);
        if (active) setLocationSuggestions(results);
      } catch (e) {
        // ignore
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [destination]);

  // Click outside to close location dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(e.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // GPS Geolocation Handler
  const handleGpsLocation = async () => {
    setIsLocatingGps(true);
    try {
      const loc = await GoogleLocationClient.getCurrentLocation();
      if (loc) {
        const dest = loc.city ? `${loc.city}, ${loc.country}` : loc.title;
        setDestination(dest);
        setIsLocationDropdownOpen(false);
      }
    } catch (e) {
      console.warn("[PropertiesPage] GPS lookup failed:", e);
    } finally {
      setIsLocatingGps(false);
    }
  };

  // Location item selection
  const handleSelectLocation = (loc: LocationSuggestion) => {
    const dest = loc.city ? `${loc.city}${loc.country ? `, ${loc.country}` : ""}` : loc.title;
    setDestination(dest);
    setIsLocationDropdownOpen(false);
  };

  // Build current filter parameters object
  const buildCurrentFilters = useCallback(
    (pageNumber: number): PropertySearchFilters => {
      let typesToSend: string[] | undefined = undefined;
      if (selectedPropertyTypes.length > 0) {
        typesToSend = selectedPropertyTypes;
      } else if (selectedCategory !== "all") {
        typesToSend = [selectedCategory];
      }

      return {
        destination: destination.trim() || undefined,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        guests: guests > 0 ? guests : undefined,
        bedrooms: suites > 0 ? suites : undefined,
        bathrooms: baths > 0 ? baths : undefined,
        minPrice,
        maxPrice,
        propertyTypes: typesToSend,
        amenityIds: selectedAmenityIds.length > 0 ? selectedAmenityIds : undefined,
        sortBy,
        sortDirection,
        page: pageNumber,
        size: 10, // 10 by 10 batch scraping
      };
    },
    [
      destination,
      checkIn,
      checkOut,
      guests,
      suites,
      baths,
      minPrice,
      maxPrice,
      selectedPropertyTypes,
      selectedCategory,
      selectedAmenityIds,
      sortBy,
      sortDirection,
    ]
  );

  // Execute Search (Initial or full filter reset)
  const executeSearch = useCallback(
    async (resetPage: boolean = true) => {
      setIsLoading(true);
      setPhotoSearchActive(false);
      try {
        const filters = buildCurrentFilters(0);
        const result = await PropertySearchClient.search(filters);
        setProperties(result.properties);
        setTotalResidences(result.totalElements ?? result.properties.length);
        setCurrentPage(0);
        setHasNext(result.hasNext);
        if (result.properties.length > 0) {
          setSelectedPropertyId(result.properties[0].id);
        } else {
          setSelectedPropertyId(null);
        }
      } catch (e) {
        console.warn("Failed to load properties:", e);
      } finally {
        setIsLoading(false);
      }
    },
    [buildCurrentFilters]
  );

  // Fetch Next Slice for Infinite Scroll (10 by 10 Scraping)
  const loadNextSlice = useCallback(async () => {
    if (!hasNext || isLoading || isLoadingMore || photoSearchActive) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const filters = buildCurrentFilters(nextPage);
      const result = await PropertySearchClient.search(filters);

      if (result.properties.length > 0) {
        setProperties((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = result.properties.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
        setCurrentPage(nextPage);
        setHasNext(result.hasNext);
        if (result.totalElements) {
          setTotalResidences(result.totalElements);
        }
      } else {
        setHasNext(false);
      }
    } catch (err) {
      console.warn("Failed to load next slice of properties:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNext, isLoading, isLoadingMore, photoSearchActive, currentPage, buildCurrentFilters]);

  // Infinite Scroll Observer triggering next 10 items
  useEffect(() => {
    if (!sentinelRef.current || !hasNext || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextSlice();
        }
      },
      { rootMargin: "350px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNext, isLoading, loadNextSlice]);

  // Trigger search on Category / Sort change
  useEffect(() => {
    executeSearch(true);
  }, [selectedCategory, sortBy, sortDirection]);

  // Wishlist handler
  const handleToggleWishlist = async (propertyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isSaved = savedPropertyIds.has(propertyId);
    if (isSaved) {
      const ok = await WishlistClient.removeProperty(propertyId);
      if (ok) {
        setSavedPropertyIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
      }
    } else {
      const ok = await WishlistClient.addProperty(propertyId);
      if (ok) {
        setSavedPropertyIds((prev) => new Set(prev).add(propertyId));
      }
    }
  };

  // Handle Photo Search submission
  const handleExecutePhotoSearch = async () => {
    if (!photoFile && !photoPrompt.trim()) return;
    setIsPhotoSearching(true);
    try {
      let results: DisplayProperty[] = [];
      if (photoFile) {
        results = await PropertySearchClient.searchByPhoto(photoFile, {
          textQuery: photoPrompt.trim() || undefined,
          city: destination.trim() || undefined,
          minGuests: guests > 0 ? guests : undefined,
          maxPrice: maxPrice,
        });
      } else if (photoPrompt.trim()) {
        results = await PropertySearchClient.searchByVisualPrompt(photoPrompt.trim());
      }

      setProperties(results);
      setTotalResidences(results.length);
      setHasNext(false);
      setCurrentPage(0);
      setPhotoSearchActive(true);
      setIsPhotoSearchOpen(false);
      if (results.length > 0) {
        setSelectedPropertyId(results[0].id);
      }
    } catch (err) {
      console.warn("Visual search error:", err);
    } finally {
      setIsPhotoSearching(false);
    }
  };

  // Active highlighted property for Map & Cards
  const activeProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || properties[0] || null;
  }, [properties, selectedPropertyId]);

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (minPrice || maxPrice) count++;
    if (selectedPropertyTypes.length > 0) count += selectedPropertyTypes.length;
    else if (selectedCategory !== "all") count++;
    if (selectedAmenityIds.length > 0) count += selectedAmenityIds.length;
    if (suites > 1 || baths > 1) count++;
    if (destination.trim()) count++;
    return count;
  }, [minPrice, maxPrice, selectedPropertyTypes, selectedCategory, selectedAmenityIds, suites, baths, destination]);

  // Filtered amenities matching search query in modal
  const filteredAmenities = useMemo(() => {
    if (!amenitySearchQuery.trim()) return allAmenities;
    const q = amenitySearchQuery.toLowerCase();
    return allAmenities.filter((a) => a.name.toLowerCase().includes(q));
  }, [allAmenities, amenitySearchQuery]);

  return (
    <div className="bg-[#EFEEEC] min-h-screen text-[#151415] font-sans selection:bg-[#1f1f22] selection:text-white">
      {/* 1. Global Navigation Header */}
      <LonaHeader />

      {/* Main Container */}
      <main className="w-full pt-20 md:pt-24 pb-16">
        <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10">
          
          {/* Top Meta Status Strip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 pb-3 border-b border-[#DEDCD8]/80 text-xs text-[#8A8884]">
            <div className="flex items-center gap-2 flex-wrap font-mono uppercase tracking-widest text-[11px]">
              <span className="font-semibold text-[#151415]">Collection No. 04</span>
              <span>•</span>
              <span>Architectural Solitude</span>
              <span>•</span>
              <span className="font-semibold text-[#151415]">{totalResidences} Verified Residences</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px]">Bortle Sky Class 1–2 Preserves</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* 2. Architectural Omnibar Search Suite */}
          <section className="mt-4 relative w-full rounded-2xl bg-[#0A0A0C] p-2 sm:p-3 shadow-2xl border border-white/10 text-white">
            {/* Celestial Glow */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#DCE6EF] rounded-full blur-3xl opacity-15 pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-1">
              
              {/* Destination Input with Google Places Autocomplete */}
              <div
                ref={locationInputRef}
                className="flex-1 px-4 py-2 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10 relative"
              >
                <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  Destination / Sanctuary
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-[#dfb15b] shrink-0" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setIsLocationDropdownOpen(true);
                    }}
                    onFocus={() => setIsLocationDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsLocationDropdownOpen(false);
                        executeSearch(true);
                      }
                    }}
                    placeholder="Search city, region, or sanctuary..."
                    className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                  {destination ? (
                    <button
                      onClick={() => {
                        setDestination("");
                        setIsLocationDropdownOpen(false);
                      }}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGpsLocation}
                      disabled={isLocatingGps}
                      title="Use Current Location (GPS)"
                      className="text-zinc-400 hover:text-[#dfb15b] transition-colors p-1"
                    >
                      {isLocatingGps ? (
                        <RotateCw className="w-3.5 h-3.5 animate-spin text-[#dfb15b]" />
                      ) : (
                        <Locate className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Google Places Autocomplete Dropdown */}
                {isLocationDropdownOpen && locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 p-2 bg-[#18181B] rounded-2xl border border-white/15 shadow-2xl max-h-60 overflow-y-auto">
                    {locationSuggestions.map((loc) => (
                      <div
                        key={loc.id}
                        onClick={() => handleSelectLocation(loc)}
                        className="p-2.5 rounded-xl hover:bg-white/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#dfb15b] shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-white">{loc.title}</span>
                            {loc.country && (
                              <span className="text-zinc-400 text-[11px] ml-1.5">• {loc.country}</span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 shrink-0">
                          {loc.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Celestial Calendar Window */}
              <div className="flex-1 px-4 py-2 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10 relative">
                <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  Celestial Calendar
                </label>
                <div
                  onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                  className="flex items-center justify-between mt-1 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-200">
                      {checkIn ? `${checkIn} ${checkOut ? `→ ${checkOut}` : ""}` : "Select Stay Window"}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                    1 Month View
                  </span>
                </div>

                {/* Date Selection Popover */}
                {isDatePopoverOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 p-4 bg-[#18181B] rounded-2xl border border-white/15 shadow-2xl w-80">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                        Stay Window
                      </span>
                      <button onClick={() => setIsDatePopoverOpen(false)} className="text-zinc-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-zinc-400 mb-1">Check-in Date</label>
                        <input
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">Check-out Date</label>
                        <input
                          type="date"
                          value={checkOut}
                          min={checkIn}
                          onChange={(e) => setCheckOut(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCheckIn("");
                            setCheckOut("");
                          }}
                          className="text-zinc-400 hover:text-white text-xs px-2 py-1"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDatePopoverOpen(false)}
                          className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-full"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Guests & Suites Popover */}
              <div className="flex-1 px-4 py-2 flex flex-col justify-center relative">
                <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  Guests & Suites
                </label>
                <div
                  onClick={() => setIsGuestPopoverOpen(!isGuestPopoverOpen)}
                  className="flex items-center justify-between mt-1 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-200">
                      {guests} Guests, {suites} Suites, {baths} Baths
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </div>

                {/* Guest Popover */}
                {isGuestPopoverOpen && (
                  <div className="absolute top-full left-0 mt-2 z-50 p-4 bg-[#18181B] rounded-2xl border border-white/15 shadow-2xl w-72">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                        Capacity & Rooms
                      </span>
                      <button onClick={() => setIsGuestPopoverOpen(false)} className="text-zinc-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Guests</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGuests(Math.max(1, guests - 1))}
                            className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono">{guests}</span>
                          <button
                            type="button"
                            onClick={() => setGuests(guests + 1)}
                            className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Bedrooms / Suites</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSuites(Math.max(1, suites - 1))}
                            className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono">{suites}</span>
                          <button
                            type="button"
                            onClick={() => setSuites(suites + 1)}
                            className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300">Bathrooms</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setBaths(Math.max(1, baths - 1))}
                            className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono">{baths}</span>
                          <button
                            type="button"
                            onClick={() => setBaths(baths + 1)}
                            className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsGuestPopoverOpen(false)}
                        className="w-full mt-2 bg-white text-black font-semibold py-1.5 rounded-full text-xs"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* CTAs: Visual AI & Find Sanctuary */}
              <div className="flex items-center gap-2 p-1">
                {/* Search with Photo (Visual AI) Button */}
                <button
                  type="button"
                  onClick={() => setIsPhotoSearchOpen(true)}
                  className="h-11 px-4 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-all flex items-center gap-2 border border-white/10"
                  title="Search by Architectural Photo Mood"
                >
                  <Camera className="w-4 h-4 text-[#dfb15b]" />
                  <span className="font-mono text-[11px] uppercase tracking-wider hidden xl:inline">Style AI</span>
                </button>

                {/* Find Sanctuary Button */}
                <button
                  type="button"
                  onClick={() => executeSearch(true)}
                  className="h-11 px-6 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs tracking-wider uppercase transition-all duration-300 flex items-center gap-2 shadow-lg group"
                >
                  <span>Find Sanctuary</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>

            </div>
          </section>

          {/* Photo Search Alert / Reset Banner */}
          {photoSearchActive && (
            <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="font-semibold">Visual Similarity Match Results</span>
                <span className="text-amber-800">• Filtered by architectural contours and lighting</span>
              </div>
              <button
                onClick={() => {
                  setPhotoSearchActive(false);
                  executeSearch(true);
                }}
                className="font-mono text-[11px] uppercase tracking-wider text-amber-800 hover:text-amber-950 underline"
              >
                Reset Standard Search
              </button>
            </div>
          )}

          {/* 3. Category Filter Pills & Controls Bar */}
          <section className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedPropertyTypes([]);
                    }}
                    className={`px-4 py-2 rounded-full font-mono text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-[#151415] text-white shadow-sm font-semibold"
                        : "bg-white/80 hover:bg-white text-[#151415] border border-[#DEDCD8]"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Controls: Filters count & Split/Grid toggles */}
            <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
              {/* Filters Trigger with Active Count */}
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white text-[#151415] font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-[#DEDCD8] shadow-sm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#dfb15b]" />
                <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}</span>
              </button>

              {/* View Mode Segmented Switch */}
              <div className="flex items-center p-1 rounded-full bg-white/90 border border-[#DEDCD8] shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("split")}
                  className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    viewMode === "split"
                      ? "bg-[#0A0A0C] text-white"
                      : "text-[#8A8884] hover:text-[#151415]"
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Split Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    viewMode === "grid"
                      ? "bg-[#0A0A0C] text-white"
                      : "text-[#8A8884] hover:text-[#151415]"
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full Grid</span>
                </button>
              </div>
            </div>
          </section>

          {/* 4. Main Dynamic Area: Multi-Column Feed + Sticky Nocturnal Google Map */}
          <section className="mt-4">
            <div className={`grid grid-cols-1 ${viewMode === "split" ? "lg:grid-cols-12 gap-6" : "grid-cols-1"} items-start`}>
              
              {/* LEFT AREA: RETREATS FEED */}
              <div className={`${viewMode === "split" ? "lg:col-span-7" : "w-full"} flex flex-col gap-6`}>
                
                {/* Feed Subheader & Sorting */}
                <div className="flex items-baseline justify-between pt-1 pb-1">
                  <div>
                    <h1 className="font-serif text-2xl text-[#151415] tracking-tight">
                      {photoSearchActive ? "Visual Match Selection" : "Solitary Sanctuaries"}
                    </h1>
                    <p className="text-xs text-[#8A8884] mt-0.5">
                      {totalResidences} residences tuned for serenity & celestial visibility
                    </p>
                  </div>

                  {/* Sort Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[#8A8884] uppercase">SORT:</span>
                    <select
                      value={`${sortBy}_${sortDirection}`}
                      onChange={(e) => {
                        const [field, dir] = e.target.value.split("_");
                        setSortBy(field as any);
                        setSortDirection(dir as any);
                      }}
                      className="bg-transparent font-mono text-[11px] uppercase tracking-wider text-[#151415] font-semibold border-none focus:outline-none cursor-pointer"
                    >
                      <option value="avgRating_DESC">Curator's Choice (Rating)</option>
                      <option value="basePricePerNight_ASC">Price: Low to High</option>
                      <option value="basePricePerNight_DESC">Price: High to Low</option>
                      <option value="createdAt_DESC">Newest Residences</option>
                    </select>
                  </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="rounded-2xl bg-white border border-[#DEDCD8] p-4 flex flex-col gap-3 animate-pulse">
                        <div className="aspect-[4/3] bg-zinc-200 rounded-xl" />
                        <div className="h-4 bg-zinc-200 rounded w-1/3" />
                        <div className="h-6 bg-zinc-200 rounded w-3/4" />
                        <div className="h-4 bg-zinc-100 rounded w-full" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && properties.length === 0 && (
                  <div className="p-12 text-center bg-white rounded-3xl border border-[#DEDCD8] shadow-sm">
                    <Telescope className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <h3 className="font-serif text-lg text-zinc-900 mb-1">No residences matching your inquiry</h3>
                    <p className="text-xs text-zinc-500 mb-4 max-w-sm mx-auto">
                      Try broadening your search destination or clearing filter constraints to discover verified sanctuaries.
                    </p>
                    <button
                      onClick={() => {
                        setDestination("");
                        setSelectedCategory("all");
                        setSelectedPropertyTypes([]);
                        setMinPrice(undefined);
                        setMaxPrice(undefined);
                        setSelectedAmenityIds([]);
                        executeSearch(true);
                      }}
                      className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold uppercase tracking-wider"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}

                {/* HERO SPOTLIGHT CARD (First Property) */}
                {!isLoading && properties.length > 0 && (
                  <article
                    onClick={() => setSelectedPropertyId(properties[0].id)}
                    className={`group relative rounded-3xl bg-[#0A0A0C] text-white overflow-hidden shadow-2xl border transition-all duration-300 cursor-pointer ${
                      selectedPropertyId === properties[0].id
                        ? "border-[#dfb15b] ring-1 ring-[#dfb15b]"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-1 p-2 bg-[#18181B]">
                      {/* Primary Photo */}
                      <div className="md:col-span-2 relative aspect-[16/10] md:aspect-auto md:h-72 rounded-2xl overflow-hidden">
                        <img
                          src={properties[0].coverImage}
                          alt={properties[0].title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                        
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                          <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-white font-mono text-[9px] uppercase tracking-widest flex items-center gap-1.5 border border-white/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {properties[0].typeBadge}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-[#dfb15b]/90 text-black font-mono text-[9px] font-bold uppercase tracking-wider">
                            Sanctuary Spotlight
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleToggleWishlist(properties[0].id, e)}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md hover:bg-black text-white flex items-center justify-center transition-colors border border-white/20 z-10"
                        >
                          {savedPropertyIds.has(properties[0].id) ? (
                            <BookmarkCheck className="w-4 h-4 text-[#dfb15b]" />
                          ) : (
                            <Bookmark className="w-4 h-4 text-white" />
                          )}
                        </button>

                        {/* Location Overlay */}
                        <div className="absolute bottom-3 left-3 z-10">
                          <span className="font-mono text-xs text-zinc-300 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#dfb15b]" />
                            {properties[0].location}
                          </span>
                        </div>
                      </div>

                      {/* Secondary Photo Stack */}
                      <div className="hidden md:grid grid-rows-2 gap-1 rounded-2xl overflow-hidden">
                        <div className="relative h-full overflow-hidden bg-zinc-800">
                          <img
                            src={properties[0].images[1] || properties[0].coverImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="relative h-full overflow-hidden bg-zinc-800">
                          <img
                            src={properties[0].images[2] || properties[0].coverImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 font-mono text-[#dfb15b]">
                            <Star className="w-3.5 h-3.5 fill-[#dfb15b]" />
                            <span className="text-white font-semibold">{properties[0].rating.toFixed(2)}</span>
                            <span className="text-zinc-400">({properties[0].reviewCount} reviews)</span>
                          </div>
                          <span className="text-zinc-500">•</span>
                          <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
                            Verified Preservation
                          </span>
                        </div>
                      </div>

                      <h2 className="font-serif text-xl sm:text-2xl text-white group-hover:text-amber-200 transition-colors">
                        {properties[0].title}
                      </h2>

                      {/* Micro Specs */}
                      <div className="grid grid-cols-4 gap-2 py-2 bg-[#18181B]/80 rounded-xl px-3 border border-white/10 text-center">
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] text-zinc-400 uppercase">Capacity</span>
                          <span className="font-mono text-xs text-white font-medium">{properties[0].maxGuests} Guests</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] text-zinc-400 uppercase">Suites</span>
                          <span className="font-mono text-xs text-white font-medium">{properties[0].bedrooms} Bedrooms</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] text-zinc-400 uppercase">Baths</span>
                          <span className="font-mono text-xs text-white font-medium">{properties[0].bathrooms} Baths</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] text-zinc-400 uppercase">Sky Quality</span>
                          <span className="font-mono text-xs text-emerald-400 font-medium">{properties[0].bortleRating}</span>
                        </div>
                      </div>

                      {/* Footer: Price & Explore */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-serif text-2xl font-semibold text-white">€{properties[0].nightlyPrice}</span>
                          <span className="text-xs text-zinc-400">/ night</span>
                        </div>
                        <Link
                          href={`/properties/${properties[0].id}`}
                          className="h-9 px-4 rounded-full bg-white hover:bg-zinc-200 text-black font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md font-semibold"
                        >
                          <span>Explore Sanctuary</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                )}

                {/* Grid of Remaining Retreats */}
                {!isLoading && properties.length > 1 && (
                  <div className={`grid grid-cols-1 ${viewMode === "split" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"} gap-4`}>
                    {properties.slice(1).map((property) => {
                      const isSelected = selectedPropertyId === property.id;
                      return (
                        <article
                          key={property.id}
                          onClick={() => setSelectedPropertyId(property.id)}
                          className={`group relative rounded-2xl bg-[#0A0A0C] text-white overflow-hidden shadow-xl border flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                            isSelected
                              ? "border-[#dfb15b] ring-1 ring-[#dfb15b]"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <div>
                            {/* Photo */}
                            <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#18181B]">
                              <img
                                src={property.coverImage}
                                alt={property.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                              
                              <div className="absolute top-2.5 left-2.5 z-10">
                                <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md font-mono text-[9px] uppercase tracking-wider border border-white/10">
                                  {property.typeBadge}
                                </span>
                              </div>

                              <button
                                onClick={(e) => handleToggleWishlist(property.id, e)}
                                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md hover:bg-black text-white flex items-center justify-center transition-colors border border-white/15 z-10"
                              >
                                {savedPropertyIds.has(property.id) ? (
                                  <BookmarkCheck className="w-3.5 h-3.5 text-[#dfb15b]" />
                                ) : (
                                  <Bookmark className="w-3.5 h-3.5 text-white" />
                                )}
                              </button>

                              {property.visualScore && (
                                <div className="absolute bottom-2 left-2.5 z-10">
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-black font-mono font-bold text-[9px] uppercase">
                                    {property.visualScore}% Visual Match
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="p-4 flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-400">
                                <span className="font-mono flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-[#dfb15b] text-[#dfb15b]" />
                                  <strong className="text-white font-medium">{property.rating.toFixed(2)}</strong> ({property.reviewCount})
                                </span>
                                <span className="truncate">{property.location}</span>
                              </div>

                              <h3 className="font-serif text-[16px] leading-snug text-white group-hover:text-amber-200 transition-colors line-clamp-2">
                                {property.title}
                              </h3>

                              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                {property.description}
                              </p>

                              {/* Specs Tags */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-300 font-mono text-[9px]">
                                  {property.maxGuests} Guests • {property.bedrooms} Suites
                                </span>
                                {property.amenities[0] && (
                                  <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-300 font-mono text-[9px]">
                                    {property.amenities[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className="p-4 pt-2 border-t border-white/10 flex items-center justify-between">
                            <div>
                              <span className="font-serif text-lg font-semibold text-white">€{property.nightlyPrice}</span>
                              <span className="text-[11px] text-zinc-400"> / night</span>
                            </div>
                            <Link
                              href={`/properties/${property.id}`}
                              className="h-8 px-3.5 rounded-full bg-white/10 hover:bg-white hover:text-black text-white font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all border border-white/15"
                            >
                              <span>Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* 10-BY-10 INFINITE SCROLL SENTINEL & STATUS */}
                <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2.5 font-mono text-xs text-[#151415] bg-white px-5 py-2.5 rounded-full border border-[#DEDCD8] shadow-md animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-[#dfb15b]" />
                      <span>Discovering next 10 sanctuaries...</span>
                    </div>
                  )}
                  {!hasNext && properties.length > 0 && !isLoading && (
                    <div className="font-mono text-[10px] text-[#8A8884] uppercase tracking-widest py-4 border-t border-[#DEDCD8]/60 w-full text-center">
                      — All {properties.length} Verified Sanctuaries Discovered —
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT AREA: REAL INTERACTIVE NOCTURNAL GOOGLE MAP */}
              {viewMode === "split" && (
                <div className="hidden lg:flex lg:col-span-5 sticky top-24 h-[calc(100vh-120px)] flex-col">
                  <NocturnalGoogleMap
                    properties={properties}
                    selectedPropertyId={selectedPropertyId}
                    onSelectProperty={(id) => {
                      setSelectedPropertyId(id);
                      // Scroll corresponding card into view
                      const el = document.getElementById(`property-${id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  />
                </div>
              )}

            </div>
          </section>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. VISUAL AI / PHOTO SEARCH MODAL */}
      {/* ========================================================================= */}
      {isPhotoSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#121216] border border-white/15 text-white shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#dfb15b]" />
                <h3 className="font-serif text-lg text-white">Visual AI Architecture Search</h3>
              </div>
              <button
                onClick={() => {
                  setIsPhotoSearchOpen(false);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-zinc-400 leading-relaxed">
                Upload any photograph or architectural render to discover solitary residences with matching contours, materials, and nocturnal lighting.
              </p>

              {/* Upload Dropzone */}
              <div className="relative border-2 border-dashed border-white/20 hover:border-[#dfb15b] rounded-2xl p-6 text-center transition-colors cursor-pointer bg-black/40">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPhotoFile(f);
                      setPhotoPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {photoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={photoPreview} alt="Upload preview" className="h-32 object-contain rounded-lg shadow-md" />
                    <span className="font-mono text-[10px] text-emerald-400">Photo selected ({photoFile?.name})</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-zinc-400 mb-1" />
                    <span className="font-semibold text-white">Drag & drop photo or browse</span>
                    <span className="text-zinc-500 text-[11px]">Supports PNG, JPG, WEBP</span>
                  </div>
                )}
              </div>

              {/* Aesthetic Prompt Refinement */}
              <div>
                <label className="block text-zinc-400 font-mono text-[10px] uppercase mb-1">
                  Aesthetic Prompt / Style Constraints (Optional)
                </label>
                <input
                  type="text"
                  value={photoPrompt}
                  onChange={(e) => setPhotoPrompt(e.target.value)}
                  placeholder="e.g. minimalist limestone cliffside villa with infinity pool at dusk"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[#dfb15b]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsPhotoSearchOpen(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white font-mono text-[11px] uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPhotoSearching || (!photoFile && !photoPrompt.trim())}
                  onClick={handleExecutePhotoSearch}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs tracking-wider uppercase flex items-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {isPhotoSearching ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Aesthetics...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#dfb15b]" />
                      <span>Search with Vision AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. COMPREHENSIVE FILTERS SUITE (MATCHING ALL BACKEND CRITERIA) */}
      {/* ========================================================================= */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-[#DEDCD8] text-[#151415] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#DEDCD8]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#dfb15b]" />
                <h3 className="font-serif text-xl font-medium">Curator's Filter Suite</h3>
              </div>
              <button onClick={() => setIsFilterModalOpen(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-6 text-xs">
              
              {/* Destination & Location */}
              <div>
                <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Destination / Region
                </h4>
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-300 bg-zinc-50">
                  <MapPin className="w-4 h-4 text-[#dfb15b]" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ibiza, Mallorca, Spain, Portugal, Greece..."
                    className="w-full bg-transparent text-sm text-[#151415] placeholder-zinc-400 focus:outline-none"
                  />
                  {destination && (
                    <button onClick={() => setDestination("")} className="text-zinc-400 hover:text-black">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Nightly Price Range */}
              <div>
                <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Nightly Tariff Range (€)
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-zinc-500 mb-1 text-[11px]">Minimum Price (€)</label>
                    <input
                      type="number"
                      placeholder="e.g. 250"
                      value={minPrice || ""}
                      onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black font-mono"
                    />
                  </div>
                  <span className="text-zinc-400 mt-5">—</span>
                  <div className="flex-1">
                    <label className="block text-zinc-500 mb-1 text-[11px]">Maximum Price (€)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1800"
                      value={maxPrice || ""}
                      onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black font-mono"
                    />
                  </div>
                </div>

                {/* Quick Price Preset Chips */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {[
                    { label: "All Prices", min: undefined, max: undefined },
                    { label: "< €500", min: undefined, max: 500 },
                    { label: "€500 – €1,000", min: 500, max: 1000 },
                    { label: "€1,000 – €2,500", min: 1000, max: 2500 },
                    { label: "> €2,500", min: 2500, max: undefined },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMinPrice(p.min);
                        setMaxPrice(p.max);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono text-[10px]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity Specs: Guests, Bedrooms, Bathrooms */}
              <div>
                <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Space & Capacity Specs
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Guests */}
                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase">Min Guests</span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        className="w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center font-mono hover:bg-zinc-100"
                      >
                        -
                      </button>
                      <span className="font-mono font-semibold text-sm">{guests}</span>
                      <button
                        type="button"
                        onClick={() => setGuests(guests + 1)}
                        className="w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center font-mono hover:bg-zinc-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Bedrooms */}
                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase">Min Bedrooms</span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSuites(Math.max(1, suites - 1))}
                        className="w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center font-mono hover:bg-zinc-100"
                      >
                        -
                      </button>
                      <span className="font-mono font-semibold text-sm">{suites}</span>
                      <button
                        type="button"
                        onClick={() => setSuites(suites + 1)}
                        className="w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center font-mono hover:bg-zinc-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase">Min Bathrooms</span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setBaths(Math.max(1, baths - 1))}
                        className="w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center font-mono hover:bg-zinc-100"
                      >
                        -
                      </button>
                      <span className="font-mono font-semibold text-sm">{baths}</span>
                      <button
                        type="button"
                        onClick={() => setBaths(baths + 1)}
                        className="w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center font-mono hover:bg-zinc-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Architectural Property Types (Multi-Select) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                    Architectural Types ({selectedPropertyTypes.length} Selected)
                  </h4>
                  {selectedPropertyTypes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPropertyTypes([])}
                      className="text-[10px] font-mono text-zinc-500 hover:text-black uppercase underline"
                    >
                      Clear Types
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_PROPERTY_TYPES.map((type) => {
                    const isChecked = selectedPropertyTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setSelectedPropertyTypes((prev) =>
                            isChecked ? prev.filter((t) => t !== type.id) : [...prev, type.id]
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-center font-mono text-[11px] uppercase transition-all flex items-center justify-center gap-1.5 ${
                          isChecked
                            ? "bg-black text-white border-black font-semibold shadow-sm"
                            : "bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-200"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-[#dfb15b]" />}
                        <span>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amenities (Loaded dynamically from Backend GET /api/v1/amenities) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                    Sanctuary Amenities ({selectedAmenityIds.length} Selected / {allAmenities.length} Total)
                  </h4>
                  {selectedAmenityIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAmenityIds([])}
                      className="text-[10px] font-mono text-zinc-500 hover:text-black uppercase underline"
                    >
                      Clear Amenities
                    </button>
                  )}
                </div>

                {/* Amenity Search Input */}
                <input
                  type="text"
                  value={amenitySearchQuery}
                  onChange={(e) => setAmenitySearchQuery(e.target.value)}
                  placeholder="Filter amenities (e.g. Pool, Wi-Fi, Kitchen, View)..."
                  className="w-full mb-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                />

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredAmenities.map((amenity) => {
                    const isChecked = selectedAmenityIds.includes(amenity.id);
                    return (
                      <label
                        key={amenity.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition-colors ${
                          isChecked
                            ? "bg-zinc-100 border-black text-black font-medium"
                            : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedAmenityIds((prev) =>
                              isChecked ? prev.filter((id) => id !== amenity.id) : [...prev, amenity.id]
                            );
                          }}
                          className="accent-black w-4 h-4 rounded"
                        />
                        <span className="truncate text-[11px]">{amenity.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#DEDCD8]">
                <button
                  type="button"
                  onClick={() => {
                    setDestination("");
                    setMinPrice(undefined);
                    setMaxPrice(undefined);
                    setSelectedPropertyTypes([]);
                    setSelectedAmenityIds([]);
                    setSelectedCategory("all");
                    setGuests(2);
                    setSuites(1);
                    setBaths(1);
                  }}
                  className="font-mono text-xs uppercase tracking-wider text-zinc-500 hover:text-black"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterModalOpen(false);
                    executeSearch(true);
                  }}
                  className="px-6 py-2.5 rounded-full bg-black hover:bg-zinc-800 text-white font-semibold text-xs tracking-wider uppercase shadow-lg flex items-center gap-2"
                >
                  <span>Apply Filters</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Global Editorial Footer */}
      <footer className="w-full bg-[#EFEEEC] border-t border-[#DEDCD8] py-8 mt-12">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8A8884]">
          <div>
            © 2026 AGGARLY BY LONA. ALL RIGHTS RESERVED. &nbsp;•&nbsp; CELESTIAL ARCHITECTURAL SOLITUDE
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-wider">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-black transition-colors">Support</Link>
            <Link href="/moon-phase" className="hover:text-black transition-colors">Astrological Almanac</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
