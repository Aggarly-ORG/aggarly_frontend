import { AggarlyChatBridgeClient } from "./chatBridgeClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface HomeSanctuary {
  id: string;
  name: string;
  propertyType: string;
  categoryLabel: string;
  location: string;
  city: string;
  country: string;
  coordinates: string;
  bortleRating: string;
  tag: string;
  imageUrl: string;
  images: string[];
  rating: number;
  reviewsCount: number;
  description: string;
  keyAmenities: string[];
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  pricePerNight: number;
}

export interface HomeStats {
  totalResidences: number;
  topDestinations: number;
  averageRating: number;
  celestialVisibility: string;
}

export interface LunarEphemeris {
  phaseName: string;
  illuminationPct: number;
  description: string;
  optimalSkyConditions: string;
}

export class HomeClient {
  /**
   * Calculates clean, accurate lunar ephemeris without nonsensical pseudo-science.
   */
  static getLunarEphemeris(targetDate: Date = new Date()): LunarEphemeris {
    // Known reference new moon: January 11, 2024 at 11:57 UTC
    const refNewMoon = new Date(Date.UTC(2024, 0, 11, 11, 57, 0)).getTime();
    const synodicMonthMs = 29.53058770576 * 24 * 60 * 60 * 1000;
    const diff = targetDate.getTime() - refNewMoon;
    const phaseRatio = ((diff % synodicMonthMs) + synodicMonthMs) % synodicMonthMs / synodicMonthMs;
    const illumination = Math.round((0.5 * (1 - Math.cos(2 * Math.PI * phaseRatio))) * 100);

    let phaseName = "Waxing Crescent";
    let conditions = "Clear Dark Sky";

    if (phaseRatio < 0.03 || phaseRatio > 0.97) {
      phaseName = "New Moon";
      conditions = "Optimal Stargazing · Bortle Class 1-2";
    } else if (phaseRatio < 0.22) {
      phaseName = "Waxing Crescent";
      conditions = "Excellent Starlight Clarity";
    } else if (phaseRatio < 0.28) {
      phaseName = "First Quarter";
      conditions = "Crisp Lunar Silhouette";
    } else if (phaseRatio < 0.47) {
      phaseName = "Waxing Gibbous";
      conditions = "High Lunar Illumination";
    } else if (phaseRatio < 0.53) {
      phaseName = "Full Moon";
      conditions = "Radiant Lunar Landscape";
    } else if (phaseRatio < 0.72) {
      phaseName = "Waning Gibbous";
      conditions = "Late Night Horizon Skies";
    } else if (phaseRatio < 0.78) {
      phaseName = "Last Quarter";
      conditions = "Midnight Deep Sky Viewing";
    } else {
      phaseName = "Waning Crescent";
      conditions = "Early Dawn Constellations";
    }

    return {
      phaseName,
      illuminationPct: illumination,
      description: `${illumination}% Illuminated · ${phaseName}`,
      optimalSkyConditions: conditions,
    };
  }

  /**
   * Format image object key or URL to full accessible URL
   */
  static formatImageUrl(key?: string): string {
    if (!key || !key.trim()) {
      return "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80";
    }
    const clean = key.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return clean;
    }
    return `${API_BASE_URL}/api/v1/storage/files/view?key=${encodeURIComponent(clean)}`;
  }

  /**
   * Fetches curated sanctuaries from backend for home page showcases.
   */
  static async getFeaturedSanctuaries(params?: {
    type?: string;
    page?: number;
    size?: number;
  }): Promise<{ sanctuaries: HomeSanctuary[]; totalElements: number }> {
    try {
      const q = new URLSearchParams();
      q.set("page", String(params?.page || 0));
      q.set("size", String(params?.size || 12));
      q.set("sort", "avgRating,desc");

      if (params?.type && params.type !== "all") {
        q.set("propertyType.propertyTypes", params.type.toUpperCase());
      }

      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/properties/search?${q.toString()}`);
      if (!res.ok) {
        return { sanctuaries: [], totalElements: 0 };
      }

      const json = await res.json();
      const rawList = Array.isArray(json.data) ? json.data : (json.data?.content || []);
      const totalElements = json.pagination?.totalElements || json.data?.totalElements || rawList.length;

      const sanctuaries: HomeSanctuary[] = rawList.map((p: any) => {
        const rawImages: any[] = p.images || [];
        const coverObj = rawImages.find((img: any) => img.isCover) || rawImages[0];
        const coverUrl = HomeClient.formatImageUrl(coverObj?.objectKey);
        const allImages = rawImages.map((img: any) => HomeClient.formatImageUrl(img.objectKey));

        const city = p.address?.city || "Sanctuary";
        const country = p.address?.country || "Spain";
        const lat = p.latitude != null ? Number(p.latitude).toFixed(2) : "";
        const lng = p.longitude != null ? Number(p.longitude).toFixed(2) : "";
        const coords = lat && lng ? `${lat}°N ${lng}°E` : "Celestial Preserve";

        const amenitiesList = Array.isArray(p.amenities)
          ? p.amenities.map((a: any) => a.name || a).filter(Boolean)
          : [];

        const typeStr = (p.propertyType || "VILLA").toUpperCase();
        let categoryLabel = "Architectural Villa";
        if (typeStr === "HOUSE") categoryLabel = "Monolithic Finca";
        else if (typeStr === "CABIN") categoryLabel = "Wilderness Observatory";
        else if (typeStr === "LOFT") categoryLabel = "Zenith Horizon Loft";
        else if (typeStr === "BOUTIQUE_HOTEL") categoryLabel = "Boutique Sanctuary";
        else if (typeStr === "APARTMENT") categoryLabel = "Cliffside Residence";

        return {
          id: p.id,
          name: p.title || "Curated Retreat",
          propertyType: typeStr,
          categoryLabel,
          location: `${city}, ${country}`,
          city,
          country,
          coordinates: coords,
          bortleRating: "Bortle Class 1-2",
          tag: "Verified Sanctuary",
          imageUrl: coverUrl,
          images: allImages.length > 0 ? allImages : [coverUrl],
          rating: Number(p.avgRating ?? 0),
          reviewsCount: Number(p.reviewCount ?? 0),
          description: p.description || "Architectural sanctuary designed for serenity and astronomical immersion.",
          keyAmenities: amenitiesList,
          bedrooms: Number(p.bedrooms ?? 1),
          bathrooms: Number(p.bathrooms ?? 1),
          maxGuests: Number(p.maxGuests ?? 1),
          pricePerNight: Number(p.basePricePerNight ?? 0),
        };
      });

      return { sanctuaries, totalElements };
    } catch (err) {
      console.warn("[HomeClient] Failed to load sanctuaries from backend:", err);
      return { sanctuaries: [], totalElements: 0 };
    }
  }

  /**
   * Fetches overall inventory stats for header ephemeris bar dynamically from backend.
   */
  static async getInventoryStats(): Promise<HomeStats> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/properties/search?page=0&size=50`);
      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json.data) ? json.data : (json.data?.content || []);
        const total = json.pagination?.totalElements || json.data?.totalElements || rawList.length || 0;
        
        const cities = new Set(rawList.map((p: any) => p.address?.city).filter(Boolean));
        const ratings = rawList.map((p: any) => Number(p.avgRating)).filter((r: number) => r > 0);
        const avg = ratings.length > 0
          ? Number((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(2))
          : 0;

        return {
          totalResidences: total,
          topDestinations: cities.size > 0 ? cities.size : (total > 0 ? 1 : 0),
          averageRating: avg,
          celestialVisibility: "Bortle Class 1-2 Preserves",
        };
      }
    } catch (e) {
      // ignore
    }
    return {
      totalResidences: 0,
      topDestinations: 0,
      averageRating: 0,
      celestialVisibility: "Bortle Class 1-2 Preserves",
    };
  }
}
