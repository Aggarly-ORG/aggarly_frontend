import { AggarlyChatBridgeClient } from "./chatBridgeClient";
import { PropertyClient } from "./propertyClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface AmenityItem {
  id: string;
  name: string;
  category?: string;
  icon?: string;
}

export interface PropertySearchFilters {
  destination?: string;
  city?: string;
  country?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyTypes?: string[];
  propertyType?: string;
  amenityIds?: string[];
  sortBy?: "avgRating" | "basePricePerNight" | "createdAt" | string;
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export interface DisplayProperty {
  id: string;
  title: string;
  propertyType: string;
  typeBadge: string;
  location: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  nightlyPrice: number;
  rating: number;
  reviewCount: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
  coverImage: string;
  images: string[];
  amenities: string[];
  visualScore?: number;
  matchedScenes?: string[];
  visualExplanation?: string;
  bortleRating?: string;
}

export interface SearchResultPayload {
  properties: DisplayProperty[];
  hasNext: boolean;
  currentPage: number;
  totalElements?: number;
  totalPages?: number;
}

export class PropertySearchClient {
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

  static mapBackendProperty(p: any): DisplayProperty {
    const rawImages: any[] = p.images || [];
    const coverObj = rawImages.find((img: any) => img.isCover) || rawImages[0];
    const coverImage = PropertySearchClient.formatImageUrl(coverObj?.objectKey);
    const images = rawImages.map((img: any) => PropertySearchClient.formatImageUrl(img.objectKey));

    const city = p.address?.city || "";
    const country = p.address?.country || "";
    const loc = [city, country].filter(Boolean).join(", ") || "Mediterranean Sanctuary";

    const rawType = (p.propertyType || "VILLA").toUpperCase();
    let typeBadge = "ARCHITECTURAL VILLA";
    if (rawType === "HOUSE") typeBadge = "MONOLITHIC FINCA";
    else if (rawType === "CABIN") typeBadge = "DARK SKY CABIN";
    else if (rawType === "LOFT") typeBadge = "HORIZON LOFT";
    else if (rawType === "BOUTIQUE_HOTEL") typeBadge = "BOUTIQUE ESTATE";
    else if (rawType === "APARTMENT") typeBadge = "CLIFFSIDE SUITE";

    const amenitiesList = Array.isArray(p.amenities)
      ? p.amenities.map((a: any) => a.name || a.title || a).filter(Boolean)
      : [];

    return {
      id: p.id,
      title: p.title || "Curated Solitary Sanctuary",
      propertyType: rawType,
      typeBadge,
      location: loc,
      city,
      country,
      latitude: Number(p.latitude ?? 0),
      longitude: Number(p.longitude ?? 0),
      nightlyPrice: Number(p.basePricePerNight ?? 0),
      rating: Number(p.avgRating ?? 0),
      reviewCount: Number(p.reviewCount ?? 0),
      maxGuests: Number(p.maxGuests ?? 1),
      bedrooms: Number(p.bedrooms ?? 1),
      bathrooms: Number(p.bathrooms ?? 1),
      description: p.description || "Sublime solitude with celestial visibility and uninterrupted horizon perspectives.",
      coverImage,
      images: images.length > 0 ? images : [coverImage],
      amenities: amenitiesList,
      bortleRating: "Bortle Class 1–2",
    };
  }

  /**
   * Search properties via backend Spring Boot Specification API.
   */
  static async search(filters: PropertySearchFilters): Promise<SearchResultPayload> {
    try {
      const q = new URLSearchParams();
      const page = filters.page || 0;
      const size = filters.size || 10;
      q.set("page", String(page));
      q.set("size", String(size));

      if (filters.sortBy) {
        const dir = (filters.sortDirection || "DESC").toLowerCase();
        q.set("sort", `${filters.sortBy},${dir}`);
      } else {
        q.set("sort", "avgRating,desc");
      }

      if (filters.city) {
        q.set("location.city", filters.city.trim());
      }
      if (filters.country) {
        q.set("location.country", filters.country.trim());
      }
      if (!filters.city && !filters.country && filters.destination && filters.destination.trim()) {
        const dest = filters.destination.trim();
        if (dest.includes(",")) {
          const parts = dest.split(",");
          if (parts[0]) q.set("location.city", parts[0].trim());
          if (parts[1]) q.set("location.country", parts[1].trim());
        } else {
          q.set("location.city", dest);
        }
      }

      if (filters.minPrice != null && filters.minPrice > 0) {
        q.set("pricing.minPrice", String(filters.minPrice));
      }
      if (filters.maxPrice != null && filters.maxPrice > 0) {
        q.set("pricing.maxPrice", String(filters.maxPrice));
      }

      if (filters.guests != null && filters.guests > 0) {
        q.set("capacity.guests", String(filters.guests));
      }
      if (filters.bedrooms != null && filters.bedrooms > 0) {
        q.set("capacity.minBedrooms", String(filters.bedrooms));
      }
      if (filters.bathrooms != null && filters.bathrooms > 0) {
        q.set("capacity.minBathrooms", String(filters.bathrooms));
      }

      if (filters.propertyTypes && filters.propertyTypes.length > 0) {
        filters.propertyTypes.forEach((t) => q.append("propertyType.propertyTypes", t.toUpperCase()));
      } else if (filters.propertyType && filters.propertyType !== "all") {
        q.set("propertyType.propertyTypes", filters.propertyType.toUpperCase());
      }

      if (filters.amenityIds && filters.amenityIds.length > 0) {
        filters.amenityIds.forEach((id) => q.append("amenities.amenityIds", id));
        q.set("amenities.amenityMatchType", "CONTAINS");
      }

      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/properties/search?${q.toString()}`);
      if (!res.ok) {
        return { properties: [], hasNext: false, currentPage: page };
      }

      const json = await res.json();
      const rawList = Array.isArray(json.data) ? json.data : (json.data?.content || []);
      const hasNext = Boolean(json.meta?.hasNext ?? (rawList.length >= size));
      const totalElements = json.meta?.totalElements || rawList.length;
      const totalPages = json.meta?.totalPages || 1;

      const properties = rawList.map(PropertySearchClient.mapBackendProperty);

      return {
        properties,
        hasNext,
        currentPage: page,
        totalElements,
        totalPages,
      };
    } catch (err) {
      console.warn("[PropertySearchClient] Search error:", err);
      return { properties: [], hasNext: false, currentPage: 0 };
    }
  }

  /**
   * Search properties by uploading a photo to backend Vision AI.
   */
  static async searchByPhoto(
    file: File,
    options?: {
      textQuery?: string;
      city?: string;
      country?: string;
      minGuests?: number;
      maxPrice?: number;
    }
  ): Promise<DisplayProperty[]> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (options?.textQuery) formData.append("textQuery", options.textQuery);
      if (options?.city) formData.append("city", options.city);
      if (options?.country) formData.append("country", options.country);
      if (options?.minGuests) formData.append("minGuests", String(options.minGuests));
      if (options?.maxPrice) formData.append("maxPricePerNight", String(options.maxPrice));
      formData.append("pageSize", "12");

      const token = AggarlyChatBridgeClient.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/vision/search/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        console.warn("[PropertySearchClient] Vision upload returned status", res.status);
        return [];
      }

      const json = await res.json();
      const results: any[] = json.data?.results || [];

      const enriched = await Promise.allSettled(
        results.map(async (r: any) => {
          try {
            if (r.propertyId) {
              const { data } = await PropertyClient.getPropertyById(r.propertyId);
              const cover = data.images[0]?.url || PropertySearchClient.formatImageUrl(r.bestMatchImageUrl);
              return {
                id: data.id,
                title: data.title || r.title || "Curated Sanctuary",
                propertyType: data.propertyType || "VILLA",
                typeBadge: r.bestMatchSceneType ? r.bestMatchSceneType.replace(/_/g, " ") : "VISUAL MATCH",
                location: data.address.formattedAddress || [r.city, r.country].filter(Boolean).join(", ") || "Sanctuary",
                city: data.address.city || r.city || "",
                country: data.address.country || r.country || "",
                latitude: data.latitude,
                longitude: data.longitude,
                nightlyPrice: data.basePricePerNight || Number(r.pricePerNight || 0),
                rating: data.reviewSummary?.avgRating ?? 0,
                reviewCount: data.reviewSummary?.totalReviews ?? 0,
                maxGuests: data.maxGuests,
                bedrooms: data.bedrooms,
                bathrooms: data.bathrooms,
                description: data.description || r.visualExplanation || "",
                coverImage: cover,
                images: data.images.length > 0 ? data.images.map((img) => img.url) : [cover],
                amenities: data.amenities.map((a) => a.name),
                visualScore: Math.round((r.finalScore || r.visualSimilarityScore || 0.88) * 100),
                matchedScenes: r.matchedStyleTags || [],
                visualExplanation: r.visualExplanation,
                bortleRating: data.latitude !== 0 ? "Bortle Class 1–2" : undefined,
              } as DisplayProperty;
            }
          } catch (e) {
            // fallback gracefully without Math.random
          }

          const cover = PropertySearchClient.formatImageUrl(r.bestMatchImageUrl);
          const city = r.city || "";
          const country = r.country || "";
          const loc = [city, country].filter(Boolean).join(", ") || "Visual Match";

          return {
            id: r.propertyId || "",
            title: r.title || "Visually Harmonious Sanctuary",
            propertyType: "VILLA",
            typeBadge: r.bestMatchSceneType ? r.bestMatchSceneType.replace(/_/g, " ") : "VISUAL MATCH",
            location: loc,
            city,
            country,
            latitude: Number(r.latitude ?? 0),
            longitude: Number(r.longitude ?? 0),
            nightlyPrice: Number(r.pricePerNight ?? 0),
            rating: Number(r.rating ?? 0),
            reviewCount: Number(r.reviewCount ?? 0),
            maxGuests: Number(r.maxGuests ?? 1),
            bedrooms: Number(r.bedrooms ?? 1),
            bathrooms: Number(r.bathrooms ?? 1),
            description: r.visualExplanation || "Visually matched architecture reflecting the requested contours, lighting, and palette.",
            coverImage: cover,
            images: [cover],
            amenities: r.matchedFeatures || [],
            visualScore: Math.round((r.finalScore || r.visualSimilarityScore || 0.88) * 100),
            matchedScenes: r.matchedStyleTags || [],
            visualExplanation: r.visualExplanation,
            bortleRating: "Bortle Class 1",
          } as DisplayProperty;
        })
      );

      return enriched
        .map((res) => (res.status === "fulfilled" ? res.value : null))
        .filter(Boolean) as DisplayProperty[];
    } catch (err) {
      console.warn("[PropertySearchClient] Photo upload search failed:", err);
      return [];
    }
  }

  /**
   * Search visually by natural language semantic aesthetic description.
   */
  static async searchByVisualPrompt(query: string): Promise<DisplayProperty[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/vision/search/text`, {
        method: "POST",
        body: JSON.stringify({
          query,
          pageSize: 12,
        }),
      });

      if (!res.ok) return [];
      const json = await res.json();
      const results: any[] = json.data?.results || [];

      const enriched = await Promise.allSettled(
        results.map(async (r: any) => {
          try {
            if (r.propertyId) {
              const { data } = await PropertyClient.getPropertyById(r.propertyId);
              const cover = data.images[0]?.url || PropertySearchClient.formatImageUrl(r.bestMatchImageUrl);
              return {
                id: data.id,
                title: data.title || r.title || "Curated Sanctuary",
                propertyType: data.propertyType || "VILLA",
                typeBadge: r.bestMatchSceneType ? r.bestMatchSceneType.replace(/_/g, " ") : "AESTHETIC MATCH",
                location: data.address.formattedAddress || [r.city, r.country].filter(Boolean).join(", ") || "Sanctuary",
                city: data.address.city || r.city || "",
                country: data.address.country || r.country || "",
                latitude: data.latitude,
                longitude: data.longitude,
                nightlyPrice: data.basePricePerNight || Number(r.pricePerNight || 0),
                rating: data.reviewSummary?.avgRating ?? 0,
                reviewCount: data.reviewSummary?.totalReviews ?? 0,
                maxGuests: data.maxGuests,
                bedrooms: data.bedrooms,
                bathrooms: data.bathrooms,
                description: data.description || r.visualExplanation || "",
                coverImage: cover,
                images: data.images.length > 0 ? data.images.map((img) => img.url) : [cover],
                amenities: data.amenities.map((a) => a.name),
                visualScore: Math.round((r.finalScore || 0.9) * 100),
                matchedScenes: r.matchedStyleTags || [],
                visualExplanation: r.visualExplanation,
                bortleRating: data.latitude !== 0 ? "Bortle Class 1–2" : undefined,
              } as DisplayProperty;
            }
          } catch (e) {
            // fallback gracefully without Math.random
          }

          const cover = PropertySearchClient.formatImageUrl(r.bestMatchImageUrl);
          const city = r.city || "";
          const country = r.country || "";
          const loc = [city, country].filter(Boolean).join(", ") || "Visual Match";

          return {
            id: r.propertyId || "",
            title: r.title || "Curated Architectural Retreat",
            propertyType: "VILLA",
            typeBadge: r.bestMatchSceneType ? r.bestMatchSceneType.replace(/_/g, " ") : "AESTHETIC MATCH",
            location: loc,
            city,
            country,
            latitude: Number(r.latitude ?? 0),
            longitude: Number(r.longitude ?? 0),
            nightlyPrice: Number(r.pricePerNight ?? 0),
            rating: Number(r.rating ?? 0),
            reviewCount: Number(r.reviewCount ?? 0),
            maxGuests: Number(r.maxGuests ?? 1),
            bedrooms: Number(r.bedrooms ?? 1),
            bathrooms: Number(r.bathrooms ?? 1),
            description: r.visualExplanation || "Architectural sanctuary matching your aesthetic prompt.",
            coverImage: cover,
            images: [cover],
            amenities: r.matchedFeatures || [],
            visualScore: Math.round((r.finalScore || 0.9) * 100),
            bortleRating: "Bortle Class 1",
          } as DisplayProperty;
        })
      );

      return enriched
        .map((res) => (res.status === "fulfilled" ? res.value : null))
        .filter(Boolean) as DisplayProperty[];
    } catch (err) {
      console.warn("[PropertySearchClient] Visual prompt search failed:", err);
      return [];
    }
  }

  /**
   * Retrieve all amenities from the backend.
   */
  static async getAmenities(): Promise<AmenityItem[]> {
    try {
      const res = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/amenities`);
      if (res.ok) {
        const json = await res.json();
        return Array.isArray(json.data) ? json.data : [];
      }
    } catch (e) {
      // ignore
    }
    return [];
  }
}
