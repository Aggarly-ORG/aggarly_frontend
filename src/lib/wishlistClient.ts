import { AuthClient } from "./authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface WishlistDto {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  itemCount: number;
  items?: Array<{
    id: string;
    wishlistId: string;
    propertyId: string;
    property?: any;
    addedAt: string;
  }>;
  createdAt: string;
}

export class WishlistClient {
  private static getHeaders(): HeadersInit {
    const token = AuthClient.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Check if a property is in any wishlist belonging to the logged-in user.
   * Calls GET /api/v1/wishlists/check?propertyId=...
   */
  static async isSaved(propertyId: string): Promise<boolean> {
    const token = AuthClient.getToken();
    if (!token || !propertyId) return false;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/wishlists/check?propertyId=${encodeURIComponent(propertyId)}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!res.ok) return false;
      const json = await res.json().catch(() => null);
      if (json && typeof json.data === "boolean") {
        return json.data;
      }
      return false;
    } catch (e) {
      console.warn("[WishlistClient] isSaved check failed:", e);
      return false;
    }
  }

  /**
   * Get all wishlists for the authenticated user.
   * Calls GET /api/v1/wishlists
   */
  static async getMyWishlists(): Promise<WishlistDto[]> {
    const token = AuthClient.getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/wishlists`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return [];
      const json = await res.json().catch(() => null);
      const list = json?.data ?? json;
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.warn("[WishlistClient] getMyWishlists failed:", e);
      return [];
    }
  }

  /**
   * Get all wishlists with fully populated items.
   */
  static async getMyWishlistsWithItems(): Promise<WishlistDto[]> {
    const lists = await this.getMyWishlists();
    if (lists.length === 0) return [];

    const detailed = await Promise.all(
      lists.map(async (wl) => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/wishlists/${wl.id}`, {
            method: "GET",
            headers: this.getHeaders(),
          });
          if (!res.ok) return wl;
          const json = await res.json().catch(() => null);
          return json?.data ?? json ?? wl;
        } catch {
          return wl;
        }
      })
    );
    return detailed;
  }

  /**
   * Retrieve the primary wishlist or create one if none exists.
   */
  static async getOrCreateDefaultWishlist(): Promise<WishlistDto | null> {
    const token = AuthClient.getToken();
    if (!token) return null;

    try {
      const wishlists = await this.getMyWishlists();
      if (wishlists.length > 0) {
        return wishlists[0];
      }

      // Create default wishlist collection
      const res = await fetch(`${API_BASE_URL}/api/v1/wishlists`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: "Saved Retreats",
          description: "My curated collection of saved sanctuaries and retreats",
          isPublic: false,
        }),
      });

      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      return json?.data ?? json;
    } catch (e) {
      console.warn("[WishlistClient] getOrCreateDefaultWishlist failed:", e);
      return null;
    }
  }

  /**
   * Add a property to the user's wishlist on the backend.
   * Calls POST /api/v1/wishlists/{wishlistId}/properties
   */
  static async addProperty(propertyId: string): Promise<boolean> {
    const token = AuthClient.getToken();
    if (!token || !propertyId) return false;

    try {
      const wishlist = await this.getOrCreateDefaultWishlist();
      if (!wishlist?.id) return false;

      const res = await fetch(`${API_BASE_URL}/api/v1/wishlists/${wishlist.id}/properties`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ propertyId }),
      });

      if (res.status === 201 || res.ok) {
        return true;
      }

      // Handle duplicate item response gracefully (already saved)
      if (res.status === 409) {
        return true;
      }

      return false;
    } catch (e) {
      console.warn("[WishlistClient] addProperty failed:", e);
      return false;
    }
  }

  /**
   * Remove a property from user's wishlists on the backend.
   * Calls DELETE /api/v1/wishlists/properties/{propertyId} (all wishlists)
   * with fallback to DELETE /api/v1/wishlists/{wishlistId}/properties/{propertyId}
   */
  static async removeProperty(propertyId: string): Promise<boolean> {
    const token = AuthClient.getToken();
    if (!token || !propertyId) return false;

    try {
      // 1. Direct bulk remove endpoint across all wishlists of user
      const bulkRes = await fetch(
        `${API_BASE_URL}/api/v1/wishlists/properties/${encodeURIComponent(propertyId)}`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
        }
      );

      if (bulkRes.ok) {
        return true;
      }

      // 2. Fallback to removing from individual wishlists
      const wishlists = await this.getMyWishlists();
      if (wishlists.length === 0) return true;

      let anySuccess = false;
      for (const wl of wishlists) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/v1/wishlists/${wl.id}/properties/${encodeURIComponent(propertyId)}`,
            {
              method: "DELETE",
              headers: this.getHeaders(),
            }
          );
          if (res.ok) anySuccess = true;
        } catch {
          // ignore individual failure
        }
      }
      return anySuccess;
    } catch (e) {
      console.warn("[WishlistClient] removeProperty failed:", e);
      return false;
    }
  }

  /**
   * Toggle save state for a property and return the new saved boolean state.
   */
  static async toggleSave(propertyId: string, currentlySaved: boolean): Promise<boolean> {
    if (currentlySaved) {
      await this.removeProperty(propertyId);
      return false;
    } else {
      const added = await this.addProperty(propertyId);
      return added;
    }
  }

  /**
   * Create a new named wishlist collection
   * POST /api/v1/wishlists
   */
  static async createWishlist(
    nameOrPayload: string | { name: string; description?: string; isPublic?: boolean },
    description?: string,
    isPublic?: boolean
  ): Promise<WishlistDto | null> {
    const token = AuthClient.getToken();
    if (!token) return null;

    const name = typeof nameOrPayload === "string" ? nameOrPayload : nameOrPayload.name;
    const desc = typeof nameOrPayload === "string" ? description || "" : nameOrPayload.description || "";
    const pub = typeof nameOrPayload === "string" ? Boolean(isPublic) : Boolean(nameOrPayload.isPublic);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/wishlists`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          name,
          description: desc,
          isPublic: pub,
        }),
      });

      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      return json?.data ?? json;
    } catch (e) {
      console.warn("[WishlistClient] createWishlist failed:", e);
      return null;
    }
  }
}

