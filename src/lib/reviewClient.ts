import { AuthClient } from "./authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface CreateReviewPayload {
  propertyId: string;
  bookingId: string;
  rating: number; // 1-5
  comment: string;
  cleanlinessRating?: number; // 1-5
  accuracyRating?: number; // 1-5
  checkInRating?: number; // 1-5
  communicationRating?: number; // 1-5
  locationRating?: number; // 1-5
  valueRating?: number; // 1-5
}

export interface ReviewResponseItem {
  id: string;
  propertyId: string;
  bookingId: string;
  guestId: string;
  guestName?: string;
  rating: number;
  comment: string;
  cleanlinessRating?: number;
  accuracyRating?: number;
  checkInRating?: number;
  communicationRating?: number;
  locationRating?: number;
  valueRating?: number;
  createdAt: string;
}

export interface RatingSummaryResponse {
  propertyId: string;
  averageRating: number;
  totalReviews: number;
  cleanlinessAvg?: number;
  accuracyAvg?: number;
  checkInAvg?: number;
  communicationAvg?: number;
  locationAvg?: number;
  valueAvg?: number;
  ratingDistribution?: Record<number, number>;
}

export class ReviewClient {
  private static async authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = AuthClient.getAccessToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      const refreshed = await AuthClient.refreshSession();
      if (refreshed) {
        const newToken = AuthClient.getAccessToken();
        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`);
        }
        return fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    return response;
  }

  // Submit review
  static async submitReview(payload: CreateReviewPayload): Promise<{
    success: boolean;
    review?: ReviewResponseItem;
    error?: string;
  }> {
    try {
      const res = await this.authFetch("/api/v1/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.message || "Failed to submit review. You must have a completed stay.",
        };
      }
      return { success: true, review: data.data };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error submitting review" };
    }
  }

  // Get user bookings eligible for review
  static async getCompletedBookings(): Promise<Array<{
    id: string;
    propertyId: string;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: number;
  }>> {
    try {
      const res = await this.authFetch("/api/v1/bookings");
      if (!res.ok) return [];
      const data = await res.json();
      const bookings = data.data || [];
      // Any confirmed or completed booking
      return bookings.filter((b: any) => b.status === "COMPLETED" || b.status === "CONFIRMED");
    } catch (e) {
      return [];
    }
  }

  // Get reviews for a property
  static async getPropertyReviews(propertyId: string, page = 0, size = 10): Promise<ReviewResponseItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/properties/${propertyId}/reviews?page=${page}&size=${size}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  // Get property rating summary
  static async getPropertyRatingSummary(propertyId: string): Promise<RatingSummaryResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/properties/${propertyId}/rating-summary`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch (e) {
      return null;
    }
  }

  // Get all reviews for the current authenticated host across all sanctuaries
  static async getHostReviews(filter?: string): Promise<HostReviewItemDto[]> {
    try {
      const query = filter ? `?filter=${encodeURIComponent(filter)}` : "";
      const res = await this.authFetch(`/api/v1/reviews/host${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : (data.data?.content || []);
    } catch (e) {
      console.error("[ReviewClient.getHostReviews] Error:", e);
      return [];
    }
  }

  // Submit curator reply to review
  static async replyToReview(
    reviewId: string,
    responseComment: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.authFetch(`/api/v1/reviews/${reviewId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: responseComment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return { success: false, error: data?.message || "Failed to publish response" };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || "Network error replying to review" };
    }
  }
}

export interface HostReviewItemDto {
  id: string;
  propertyId: string;
  propertyTitle: string;
  guestId: string;
  guestName: string;
  guestInitials?: string;
  rating: number;
  comment: string;
  stayDates: string;
  isFeatured?: boolean;
  cleanlinessRating?: number;
  accuracyRating?: number;
  quietudeRating?: number;
  opticsRating?: number;
  checkInRating?: number;
  communicationRating?: number;
  curatorResponse?: {
    text: string;
    respondedAt: string;
    curatorName: string;
  } | null;
  createdAt: string;
}

