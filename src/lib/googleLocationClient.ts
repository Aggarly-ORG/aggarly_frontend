/**
 * Aggarly Google & Geocoding Location Client
 * Provides Google Places Autocomplete integration, GPS Geolocation,
 * Reverse Geocoding, and curated luxury sanctuary destinations.
 */

export interface LocationSuggestion {
  id: string;
  title: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  formattedAddress: string;
  type: "city" | "country" | "point_of_interest" | "current_location";
}

// Curated luxury sanctuary destinations matching Aggarly's Balearic & Iberian portfolio
const CURATED_DESTINATIONS: LocationSuggestion[] = [
  {
    id: "dest-ibiza",
    title: "Ibiza",
    city: "Ibiza",
    state: "Balearic Islands",
    country: "Spain",
    latitude: 38.9067,
    longitude: 1.4206,
    formattedAddress: "Ibiza, Balearic Islands, Spain",
    type: "city",
  },
  {
    id: "dest-mallorca",
    title: "Mallorca (Palma & Santanyí)",
    city: "Mallorca",
    state: "Balearic Islands",
    country: "Spain",
    latitude: 39.6953,
    longitude: 3.0176,
    formattedAddress: "Mallorca, Balearic Islands, Spain",
    type: "city",
  },
  {
    id: "dest-menorca",
    title: "Menorca (Cala Morell)",
    city: "Menorca",
    state: "Balearic Islands",
    country: "Spain",
    latitude: 39.9496,
    longitude: 4.1105,
    formattedAddress: "Menorca, Balearic Islands, Spain",
    type: "city",
  },
  {
    id: "dest-formentera",
    title: "Formentera (Cap de Barbaria)",
    city: "Formentera",
    state: "Balearic Islands",
    country: "Spain",
    latitude: 38.6812,
    longitude: 1.4552,
    formattedAddress: "Formentera, Balearic Islands, Spain",
    type: "city",
  },
  {
    id: "dest-comporta",
    title: "Comporta & Melides",
    city: "Comporta",
    state: "Alentejo",
    country: "Portugal",
    latitude: 38.3807,
    longitude: -8.7845,
    formattedAddress: "Comporta, Alentejo, Portugal",
    type: "city",
  },
  {
    id: "dest-costa-brava",
    title: "Costa Brava (Cadaqués)",
    city: "Cadaqués",
    state: "Catalonia",
    country: "Spain",
    latitude: 42.2887,
    longitude: 3.2778,
    formattedAddress: "Cadaqués, Costa Brava, Spain",
    type: "city",
  },
  {
    id: "dest-andalucia",
    title: "Andalucía (Ronda & Zahara)",
    city: "Ronda",
    state: "Andalusia",
    country: "Spain",
    latitude: 36.7462,
    longitude: -5.1612,
    formattedAddress: "Ronda, Andalusia, Spain",
    type: "city",
  },
  {
    id: "dest-santorini",
    title: "Santorini (Oia & Imerovigli)",
    city: "Santorini",
    state: "Cyclades",
    country: "Greece",
    latitude: 36.3932,
    longitude: 25.4615,
    formattedAddress: "Santorini, Cyclades, Greece",
    type: "city",
  },
];

export class GoogleLocationClient {
  private static googleMapsLoaded = false;
  private static autocompleteService: any = null;
  private static placesService: any = null;

  /**
   * Initializes Google Maps JavaScript API with Places library if an API key is provided
   */
  static async initGoogleMaps(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if ((window as any).google?.maps?.places) {
      this.googleMapsLoaded = true;
      this.autocompleteService = new (window as any).google.maps.places.AutocompleteService();
      return true;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return false;

    return new Promise((resolve) => {
      const existingScript = document.getElementById("google-maps-script");
      if (existingScript) {
        if ((window as any).google?.maps?.places) {
          this.googleMapsLoaded = true;
          this.autocompleteService = new (window as any).google.maps.places.AutocompleteService();
          resolve(true);
          return;
        }
        existingScript.addEventListener("load", () => {
          this.googleMapsLoaded = true;
          this.autocompleteService = new (window as any).google.maps.places.AutocompleteService();
          resolve(true);
        });
        return;
      }

      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.googleMapsLoaded = true;
        this.autocompleteService = new (window as any).google.maps.places.AutocompleteService();
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  /**
   * Search for locations via Google Places or curated geographical index
   */
  static async searchLocations(query: string): Promise<LocationSuggestion[]> {
    const q = query.trim().toLowerCase();
    if (!q) return CURATED_DESTINATIONS.slice(0, 5);

    // 1. Check Google Places Autocomplete if loaded
    if (this.googleMapsLoaded && this.autocompleteService) {
      try {
        const predictions = await new Promise<any[]>((resolve) => {
          this.autocompleteService.getPlacePredictions(
            {
              input: query,
              types: ["(regions)"],
            },
            (results: any[], status: any) => {
              if (status === "OK" && results) {
                resolve(results);
              } else {
                resolve([]);
              }
            }
          );
        });

        if (predictions.length > 0) {
          return predictions.map((pred: any) => {
            const mainText = pred.structured_formatting?.main_text || pred.description;
            const secondaryText = pred.structured_formatting?.secondary_text || "";
            const parts = secondaryText.split(",").map((s: string) => s.trim());
            const country = parts[parts.length - 1] || "";
            return {
              id: pred.place_id,
              title: mainText,
              city: mainText,
              state: parts[0] || undefined,
              country,
              formattedAddress: pred.description,
              type: "city",
            };
          });
        }
      } catch (e) {
        console.warn("[GoogleLocationClient] Google Places Autocomplete error:", e);
      }
    }

    // 2. Search curated sanctuaries list
    const matchedCurated = CURATED_DESTINATIONS.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        d.formattedAddress.toLowerCase().includes(q)
    );

    if (matchedCurated.length > 0) {
      return matchedCurated;
    }

    // 3. Fallback: Query OpenStreetMap Nominatim for live global geocoding
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => {
            const city =
              item.address?.city ||
              item.address?.town ||
              item.address?.village ||
              item.address?.county ||
              item.name ||
              "";
            const country = item.address?.country || "";
            const state = item.address?.state || "";
            return {
              id: String(item.place_id || Math.random()),
              title: item.display_name.split(",")[0],
              city,
              state,
              country,
              latitude: Number(item.lat),
              longitude: Number(item.lon),
              formattedAddress: [city, state, country].filter(Boolean).join(", "),
              type: "city",
            };
          });
        }
      }
    } catch (err) {
      console.warn("[GoogleLocationClient] OpenStreetMap geocoding fallback error:", err);
    }

    return CURATED_DESTINATIONS.slice(0, 3);
  }

  /**
   * Get user's current GPS location and reverse-geocode to city and country
   */
  static async getCurrentLocation(): Promise<LocationSuggestion | null> {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // Reverse geocode via Nominatim
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
              { headers: { "Accept-Language": "en" } }
            );
            if (res.ok) {
              const data = await res.json();
              const city =
                data.address?.city ||
                data.address?.town ||
                data.address?.village ||
                data.address?.county ||
                "Current Area";
              const country = data.address?.country || "Spain";
              const state = data.address?.state || "";

              resolve({
                id: "current-gps-location",
                title: `${city}, ${country}`,
                city,
                state,
                country,
                latitude: lat,
                longitude: lng,
                formattedAddress: `${city}, ${country}`,
                type: "current_location",
              });
              return;
            }
          } catch (e) {
            console.warn("[GoogleLocationClient] Reverse geocode error:", e);
          }

          resolve({
            id: "current-gps-location",
            title: "Current Location",
            city: "Current Location",
            country: "Spain",
            latitude: lat,
            longitude: lng,
            formattedAddress: "Current Location",
            type: "current_location",
          });
        },
        (err) => {
          console.warn("[GoogleLocationClient] Geolocation access error:", err);
          resolve(null);
        },
        { timeout: 8000 }
      );
    });
  }

  /**
   * Parse user destination input into clean city and country filters
   */
  static parseDestination(raw: string): { city?: string; country?: string } {
    const clean = raw.trim();
    if (!clean) return {};

    if (clean.includes(",")) {
      const parts = clean.split(",");
      return {
        city: parts[0]?.trim() || undefined,
        country: parts[1]?.trim() || undefined,
      };
    }

    return { city: clean };
  }
}
