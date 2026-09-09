"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LonaHeader } from "../common/LonaHeader";
import { RealisticMoon } from "../auth/RealisticMoon";
import { 
  Sparkles, 
  Compass, 
  Moon, 
  Star, 
  MapPin, 
  ArrowRight, 
  Telescope, 
  Calendar,
  Users,
  Bed,
  Bath,
  RotateCw
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { HomeClient, HomeSanctuary, HomeStats, LunarEphemeris } from "../../lib/homeClient";

const CATEGORIES = [
  { id: "all", label: "All Retreats" },
  { id: "VILLA", label: "Villas & Estates" },
  { id: "HOUSE", label: "Monolithic Fincas" },
  { id: "CABIN", label: "Wilderness Observatories" },
  { id: "LOFT", label: "Horizon Lofts" },
  { id: "BOUTIQUE_HOTEL", label: "Boutique Sanctuaries" },
];

const PILLARS = [
  {
    num: "01",
    category: "Architecture",
    icon: <Moon className="w-4 h-4" />,
    title: "Celestial Retreats",
    desc: "Architectural sanctuaries designed for serenity, unpolluted nocturnal skies, and sublime acoustic privacy.",
  },
  {
    num: "02",
    category: "Intelligence",
    icon: <Sparkles className="w-4 h-4 text-[#dfb15b]" />,
    title: "Lumen Companion",
    desc: "An autonomous AI concierge that reveals rather than generates—illuminating bespoke itineraries tailored to astronomical conditions.",
  },
  {
    num: "03",
    category: "Horology",
    icon: <Calendar className="w-4 h-4" />,
    title: "Celestial Calendar",
    desc: "Synchronize your journey with planetary alignments, dark sky cycles, and meteor showers for pure nocturnal immersion.",
  },
];

export const GuestHomePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sanctuaries, setSanctuaries] = useState<HomeSanctuary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [stats, setStats] = useState<HomeStats>({
    totalResidences: 0,
    topDestinations: 12,
    averageRating: 4.96,
    celestialVisibility: "Bortle Class 1-2 Preserves",
  });
  const [ephemeris, setEphemeris] = useState<LunarEphemeris>({
    phaseName: "Waxing Gibbous",
    illuminationPct: 82,
    description: "82% Illuminated · Waxing Gibbous",
    optimalSkyConditions: "Clear Dark Sky Horizon",
  });

  useEffect(() => {
    setEphemeris(HomeClient.getLunarEphemeris());
    HomeClient.getInventoryStats().then(setStats);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    HomeClient.getFeaturedSanctuaries({
      type: selectedCategory === "all" ? undefined : selectedCategory,
      page: 0,
      size: 9,
    })
      .then((res) => {
        if (isMounted) {
          setSanctuaries(res.sanctuaries);
          setTotalCount(res.totalElements);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#09090b] flex flex-col font-sans selection:bg-[#dfb15b]/20 selection:text-[#09090b]">
      {/* 1. UNIFIED HEADER */}
      <LonaHeader />

      {/* 2. HERO CARD CONTAINER */}
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 my-4 md:my-6">
        <section className="relative overflow-hidden rounded-3xl bg-[#090c10] border border-white/10 text-white shadow-2xl py-14 px-6 sm:px-12 flex flex-col items-center text-center">
          {/* Ambient Lighting Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-black/80 pointer-events-none" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Hero Main Content */}
          <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
            {/* Realistic Moon Core Component */}
            <div className="relative mb-6 drop-shadow-[0_0_35px_rgba(255,255,255,0.18)]">
              <RealisticMoon size={210} />
            </div>

            {/* Illumination Badge */}
            <Badge
              variant="dark"
              className="mb-5 px-4 py-1.5 text-xs tracking-widest text-zinc-300 border-white/15 bg-white/5 backdrop-blur-md"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              {ephemeris.description}
            </Badge>

            {/* Editorial Headline */}
            <p className="text-xs font-semibold tracking-[0.25em] text-[#dfb15b] uppercase mb-2">
              Aggarly by Lona
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-white mb-4 leading-tight">
              Step Into The Quiet
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 font-light leading-relaxed max-w-lg mb-8">
              Architectural sanctuaries and solitary residences designed for contemplative luxury and pristine skies.
            </p>

            {/* CTAs with Shadcn Button */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="default"
                size="lg"
                className="bg-white text-black hover:bg-zinc-200 shadow-md font-semibold tracking-wider text-xs px-6"
                asChild
              >
                <Link href="/properties">
                  EXPLORE STAYS <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/25 text-white hover:bg-white/10 hover:border-white/40 tracking-wider text-xs px-6"
                asChild
              >
                <Link href="/chat">
                  <Sparkles className="w-4 h-4 mr-2 text-[#dfb15b]" />
                  MEET LUMEN AI
                </Link>
              </Button>
            </div>
          </div>

          {/* Bottom Astronomical Ephemeris Bar */}
          <div className="relative z-10 mt-12 pt-6 border-t border-white/10 w-full max-w-3xl flex flex-wrap items-center justify-around gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-wider text-[11px]">Tonight:</span>
              <span className="text-zinc-200 font-medium">{ephemeris.phaseName} ({ephemeris.illuminationPct}%)</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/15" />
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-wider text-[11px]">Celestial Visibility:</span>
              <span className="text-emerald-400 font-medium">{ephemeris.optimalSkyConditions}</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/15" />
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-wider text-[11px]">Curated Residences:</span>
              <span className="text-zinc-200 font-medium">{stats.totalResidences || totalCount} Active</span>
            </div>
          </div>
        </section>
      </div>

      {/* 3. THREE EDITORIAL PILLARS */}
      <section className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar) => (
            <Card
              key={pillar.num}
              className="bg-white/85 backdrop-blur-sm border-black/[0.06] rounded-2xl hover:shadow-lg transition-all duration-300"
            >
              <CardHeader className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                    <span>{pillar.num}</span> / <span>{pillar.category}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-zinc-800">
                    {pillar.icon}
                  </div>
                </div>
                <CardTitle className="text-base font-medium text-zinc-900">{pillar.title}</CardTitle>
                <CardDescription className="text-xs text-zinc-600 leading-relaxed mt-2">
                  {pillar.desc}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. CURATED RESIDENCES (REAL BACKEND DATA) */}
      <section className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 md:py-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#b08728] mb-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Curated Architectural Selection</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-zinc-950">
              Solitary Sanctuaries
            </h2>
          </div>
          <Button variant="link" asChild className="text-zinc-600 hover:text-black font-semibold text-xs tracking-wider uppercase p-0 h-auto">
            <Link href="/properties">
              View All {stats.totalResidences || totalCount} Retreats <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
            </Link>
          </Button>
        </div>

        {/* Interactive Category Filter Tabs */}
        <div className="mb-8 overflow-x-auto pb-2 scrollbar-none">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="bg-white border border-black/[0.08] p-1.5 shadow-sm rounded-full inline-flex flex-nowrap h-auto gap-1">
              {CATEGORIES.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="text-xs font-semibold tracking-wider uppercase rounded-full px-4 py-2 whitespace-nowrap"
                >
                  {cat.label}
                  {cat.id === selectedCategory && !isLoading ? ` (${sanctuaries.length})` : ""}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Loading State Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-black/[0.08] p-4 flex flex-col gap-4 animate-pulse"
              >
                <div className="aspect-[16/10] bg-zinc-200 rounded-xl w-full" />
                <div className="h-4 bg-zinc-200 rounded w-1/3" />
                <div className="h-6 bg-zinc-200 rounded w-3/4" />
                <div className="h-3 bg-zinc-100 rounded w-full" />
                <div className="h-10 bg-zinc-100 rounded-full mt-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sanctuaries.length === 0 && (
          <div className="py-16 px-6 text-center bg-white rounded-3xl border border-black/[0.06]">
            <Compass className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <h3 className="font-serif text-lg text-zinc-800 mb-1">No residences found in this collection</h3>
            <p className="text-xs text-zinc-500 mb-4 max-w-sm mx-auto">
              Select another architectural category or view all verified stays on our discovery page.
            </p>
            <Button variant="outline" size="sm" onClick={() => setSelectedCategory("all")}>
              Reset Category
            </Button>
          </div>
        )}

        {/* Real Sanctuaries Grid */}
        {!isLoading && sanctuaries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sanctuaries.map((sanctuary) => (
              <Card
                key={sanctuary.id}
                className="overflow-hidden rounded-2xl border-black/[0.08] hover:shadow-xl hover:border-black/20 transition-all duration-300 flex flex-col group bg-white"
              >
                {/* Photo Container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950">
                  <img
                    src={sanctuary.imageUrl}
                    alt={sanctuary.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Nightfall vignette gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <Badge variant="dark" className="bg-black/60 backdrop-blur-md text-white border-white/20 text-[10px] font-medium">
                      • {sanctuary.tag}
                    </Badge>
                    <Badge variant="luxe" className="bg-[#dfb15b] text-black border-transparent font-bold text-[10px]">
                      {sanctuary.bortleRating}
                    </Badge>
                  </div>

                  {/* Bottom Overlay: Location & Coordinates */}
                  <div className="absolute bottom-3 inset-x-3 flex items-end justify-between text-white text-xs">
                    <div className="flex items-center gap-1.5 font-medium truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#dfb15b] shrink-0" />
                      <span className="truncate">{sanctuary.location}</span>
                    </div>
                    <span className="text-[10px] text-zinc-300 shrink-0 font-mono">
                      {sanctuary.coordinates}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <CardContent className="p-6 flex flex-col flex-1">
                  {/* Category & Rating */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold tracking-wider text-[#b08728] uppercase">
                      {sanctuary.categoryLabel}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-semibold text-zinc-900">
                      <Star className="w-3.5 h-3.5 fill-[#dfb15b] text-[#dfb15b]" />
                      <span>{sanctuary.rating.toFixed(2)}</span>
                      <span className="text-zinc-400 font-normal text-[11px]">({sanctuary.reviewsCount})</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-lg font-normal text-zinc-900 mb-2 leading-snug group-hover:text-black">
                    <Link href={`/properties/${sanctuary.id}`} className="hover:underline">
                      {sanctuary.name}
                    </Link>
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2 mb-4">
                    {sanctuary.description}
                  </p>

                  {/* Capacity & Specs Row */}
                  <div className="flex items-center gap-3 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/80 rounded-xl p-2.5 mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{sanctuary.maxGuests} Guests</span>
                    </div>
                    <span className="text-zinc-300">•</span>
                    <div className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{sanctuary.bedrooms} Suites</span>
                    </div>
                    <span className="text-zinc-300">•</span>
                    <div className="flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{sanctuary.bathrooms} Baths</span>
                    </div>
                  </div>

                  {/* Key Amenities Tag Row */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {sanctuary.keyAmenities.slice(0, 3).map((amenity) => (
                      <Badge
                        key={amenity}
                        variant="secondary"
                        className="text-[10px] bg-black/[0.04] text-zinc-700 border-none font-normal"
                      >
                        {amenity}
                      </Badge>
                    ))}
                  </div>

                  {/* Footer: Price & Reservation CTA */}
                  <div className="mt-auto pt-4 border-t border-black/[0.06] flex items-center justify-between">
                    <div>
                      <span className="font-serif text-xl font-bold text-zinc-950">€{sanctuary.pricePerNight}</span>
                      <span className="text-xs text-zinc-500 font-normal"> / night</span>
                    </div>
                    <Button variant="default" size="sm" asChild className="rounded-full text-xs font-semibold px-4 tracking-wider">
                      <Link href={`/properties/${sanctuary.id}`}>
                        VIEW SANCTUARY →
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 5. EDITORIAL MANIFESTO QUOTE */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <blockquote className="font-serif text-xl sm:text-2xl md:text-3xl text-zinc-800 italic leading-snug mb-4">
          &ldquo;We do not seek escape from the world, but quiet communion with its oldest celestial companion.&rdquo;
        </blockquote>
        <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase">
          The Aggarly Manifesto · Edition IV
        </p>
      </section>

      {/* 6. EDITORIAL FOOTER */}
      <footer className="w-full border-t border-black/[0.08] bg-white py-8 mt-auto">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            © 2026 Aggarly by Lona. &nbsp;·&nbsp; Celestial Architectural Solitude
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-zinc-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-900 transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-zinc-900 transition-colors">Support</Link>
            <Link href="/moon-phase" className="hover:text-zinc-900 transition-colors">Lunar Almanac</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
