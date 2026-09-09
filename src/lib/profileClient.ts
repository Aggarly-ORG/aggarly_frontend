import { AuthClient } from "./authClient";
import { PropertyClient, resolvePropertyImageUrl } from "./propertyClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface ProfileData {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  roles: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  createdAt?: string;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface ProfileBooking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  propertyCountry: string;
  propertyImage: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestCount: number;
  status: string;
  totalAmount: number;
  currency: string;
  isUpcoming: boolean;
}

export interface ProfileWishlistItem {
  id: string;
  wishlistId: string;
  propertyId: string;
  title: string;
  city: string;
  country: string;
  imageUrl: string;
  pricePerNight: number;
  currency: string;
  rating?: number;
  addedAt: string;
}

export interface ProfileReview {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProfilePreference {
  key: string;
  value: string;
  label?: string;
}

export class ProfileClient {
  private static getHeaders(contentType: string | null = "application/json"): HeadersInit {
    const token = AuthClient.getToken();
    const headers: Record<string, string> = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     1. USER PROFILE IDENTITY (/api/v1/users/me)
     ───────────────────────────────────────────────────────────────────────── */

  static async getMyProfile(): Promise<ProfileData> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to retrieve profile: HTTP ${res.status}`);
    }

    const json = await res.json();
    const data = json?.data || json;

    return {
      id: data.id,
      email: data.email || "",
      username: data.username || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      displayName: data.displayName || "",
      phone: data.phone || "",
      avatarUrl: data.avatarUrl ? resolvePropertyImageUrl(data.avatarUrl) : "",
      bio: data.bio || "",
      roles: Array.isArray(data.roles) ? data.roles : ["USER"],
      emailVerified: Boolean(data.emailVerified),
      phoneVerified: Boolean(data.phoneVerified),
      mfaEnabled: Boolean(data.mfaEnabled),
      createdAt: data.createdAt || "",
    };
  }

  static async updateProfile(update: ProfileUpdateRequest): Promise<ProfileData> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(update),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.message || "Failed to update profile");
    }

    const data = json?.data || json;
    return {
      id: data.id,
      email: data.email || "",
      username: data.username || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      displayName: data.displayName || "",
      phone: data.phone || "",
      avatarUrl: data.avatarUrl ? resolvePropertyImageUrl(data.avatarUrl) : "",
      bio: data.bio || "",
      roles: Array.isArray(data.roles) ? data.roles : ["USER"],
      emailVerified: Boolean(data.emailVerified),
      phoneVerified: Boolean(data.phoneVerified),
      mfaEnabled: Boolean(data.mfaEnabled),
      createdAt: data.createdAt || "",
    };
  }

  static async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const token = AuthClient.getToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/avatar`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.message || "Failed to upload avatar");
    }
    const rawUrl = json?.data?.avatarUrl || json?.avatarUrl || "";
    return resolvePropertyImageUrl(rawUrl);
  }

  static async removeAvatar(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/avatar`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || "Failed to remove avatar");
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     2. GUEST BOOKINGS & STAYS (/api/v1/bookings)
     ───────────────────────────────────────────────────────────────────────── */

  static async getMyBookings(): Promise<ProfileBooking[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return [];

      const json = await res.json();
      const rawList = json?.data || json;
      if (!Array.isArray(rawList)) return [];

      const todayStr = new Date().toISOString().split("T")[0];

      // Enrich bookings with property details
      const enriched: ProfileBooking[] = await Promise.all(
        rawList.map(async (item: any) => {
          const checkIn = item.checkIn || "";
          const checkOut = item.checkOut || "";
          let nights = 1;
          if (checkIn && checkOut) {
            const dIn = new Date(checkIn).getTime();
            const dOut = new Date(checkOut).getTime();
            const diffDays = Math.round((dOut - dIn) / (1000 * 60 * 60 * 24));
            nights = diffDays > 0 ? diffDays : 1;
          }

          const isCancelled = (item.status || "").toUpperCase() === "CANCELLED";
          const isCompleted = (item.status || "").toUpperCase() === "COMPLETED";
          const isUpcoming = !isCancelled && !isCompleted && (checkOut ? checkOut >= todayStr : true);

          // Attempt to fetch property details
          let title = item.propertyTitle || "Sanctuary Retreat";
          let city = item.propertyCity || "";
          let country = item.propertyCountry || "";
          let image = "";

          if (item.propertyId) {
            try {
              const propDetail = await PropertyClient.getPropertyById(String(item.propertyId));
              if (propDetail?.data) {
                title = propDetail.data.title || title;
                city = propDetail.data.address?.city || city;
                country = propDetail.data.address?.country || country;
                const coverImg = propDetail.data.images?.find((img: any) => img.isCover) || propDetail.data.images?.[0];
                image = coverImg?.url || "";
              }
            } catch {
              // Ignore single property lookup failures
            }
          }

          return {
            id: String(item.id),
            propertyId: String(item.propertyId || ""),
            propertyTitle: title,
            propertyCity: city,
            propertyCountry: country,
            propertyImage: image,
            checkIn,
            checkOut,
            nights,
            guestCount: Number(item.guestCount) || 1,
            status: (item.status || "CONFIRMED").toUpperCase(),
            totalAmount: Number(item.totalAmount) || 0,
            currency: item.currency || "EUR",
            isUpcoming,
          };
        })
      );

      return enriched;
    } catch (e) {
      console.warn("[ProfileClient] getMyBookings failed:", e);
      return [];
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     3. WISHLISTS & SAVED RETREATS (/api/v1/wishlists)
     ───────────────────────────────────────────────────────────────────────── */

  static async getMySavedRetreats(): Promise<ProfileWishlistItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/wishlists`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return [];

      const json = await res.json();
      const rawLists = json?.data || json;
      if (!Array.isArray(rawLists)) return [];

      const items: ProfileWishlistItem[] = [];

      // Since GET /api/v1/wishlists returns wishlists with items: null,
      // fetch each wishlist individually via GET /api/v1/wishlists/{id}
      await Promise.all(
        rawLists.map(async (wl: any) => {
          if (!wl?.id) return;
          try {
            const detailRes = await fetch(`${API_BASE_URL}/api/v1/wishlists/${wl.id}`, {
              method: "GET",
              headers: this.getHeaders(),
            });
            if (!detailRes.ok) return;
            const detailJson = await detailRes.json();
            const detailWl = detailJson?.data || detailJson;
            const wlItems = Array.isArray(detailWl?.items) ? detailWl.items : [];

            for (const item of wlItems) {
              const prop = item.property || {};
              const rawImages = Array.isArray(prop.images) ? prop.images : [];
              const coverImg = rawImages.find((img: any) => img.isCover) || rawImages[0];
              const imgKey = coverImg?.objectKey || coverImg?.url || "";

              items.push({
                id: String(item.id),
                wishlistId: String(wl.id),
                propertyId: String(item.propertyId || prop.id || ""),
                title: prop.title || "Sanctuary",
                city: prop.address?.city || "",
                country: prop.address?.country || "",
                imageUrl: resolvePropertyImageUrl(imgKey),
                pricePerNight: Number(prop.basePricePerNight) || 0,
                currency: prop.currency || "EUR",
                rating: prop.avgRating ? Number(prop.avgRating) : undefined,
                addedAt: item.addedAt || "",
              });
            }
          } catch (err) {
            console.warn(`[ProfileClient] Failed to load items for wishlist ${wl.id}:`, err);
          }
        })
      );

      return items;
    } catch (e) {
      console.warn("[ProfileClient] getMySavedRetreats failed:", e);
      return [];
    }
  }

  static async removeSavedRetreat(wishlistId: string, propertyId: string): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/wishlists/${encodeURIComponent(wishlistId)}/properties/${encodeURIComponent(propertyId)}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      }
    );

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || "Failed to remove retreat from wishlist");
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     4. GUEST REVIEWS AUTHORED BY USER (/api/v1/reviews/me)
     ───────────────────────────────────────────────────────────────────────── */

  static async getMyReviews(): Promise<ProfileReview[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reviews/me`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return [];

      const json = await res.json();
      const pageData = json?.data || json;
      const list = Array.isArray(pageData)
        ? pageData
        : Array.isArray(pageData?.content)
        ? pageData.content
        : [];

      // Concurrently fetch property title for each review if available
      const enriched: ProfileReview[] = await Promise.all(
        list.map(async (r: any) => {
          let title = "Sanctuary";
          if (r.propertyId) {
            try {
              const p = await PropertyClient.getPropertyById(String(r.propertyId));
              if (p?.data?.title) title = p.data.title;
            } catch {
              // ignore
            }
          }
          return {
            id: String(r.id),
            propertyId: String(r.propertyId || ""),
            propertyTitle: title,
            rating: Number(r.rating) || 5,
            comment: r.comment || "",
            createdAt: r.createdAt || "",
          };
        })
      );

      return enriched;
    } catch (e) {
      console.warn("[ProfileClient] getMyReviews failed:", e);
      return [];
    }
  }

  static async deleteReview(reviewId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || "Failed to delete review");
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     5. LUMEN AI MEMORIES / TRAVEL PREFERENCES (/api/v1/ai/memory)
     ───────────────────────────────────────────────────────────────────────── */

  static async getMyPreferences(): Promise<ProfilePreference[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ai/memory`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return [];

      const json = await res.json();
      const raw = json?.data || json;
      if (!Array.isArray(raw)) return [];

      return raw
        .map((item: any) => ({
          key: item.memoryKey || item.key || "",
          value: item.memoryValue || item.value || "",
          label: item.label || item.key || "",
        }))
        .filter((m) => m.key);
    } catch (e) {
      console.warn("[ProfileClient] getMyPreferences failed:", e);
      return [];
    }
  }

  static async savePreference(key: string, value: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/memory`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        memoryKey: key.trim(),
        memoryValue: value.trim(),
        key: key.trim(),
        value: value.trim(),
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || "Failed to save travel preference");
    }
  }

  static async deletePreference(key: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/memory/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || "Failed to delete travel preference");
    }
  }
}
