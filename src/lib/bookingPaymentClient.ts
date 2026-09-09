import { AuthClient } from "./authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface PriceLineItem {
  label: string;
  amount: number;
}

export interface PriceQuoteResponse {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  basePrice: number;
  lineItems: PriceLineItem[];
  total: number;
}

export interface BookingResponse {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  status: string;
  totalAmount: number;
  currency: string;
  clientSecret?: string;
}

export interface CreateBookingPayload {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  couponCode?: string;
}

export interface UserPaymentMethodItem {
  id: string;
  stripePaymentMethodId: string;
  cardBrand: string;
  lastFour: string;
  expMonth: number;
  expYear: number;
  cardholderName?: string;
  isDefault?: boolean;
}

export interface SavePaymentMethodPayload {
  stripePaymentMethodId: string;
  cardBrand: string;
  lastFour: string;
  expMonth: number;
  expYear: number;
  cardholderName?: string;
  isDefault?: boolean;
}

export class BookingPaymentClient {
  private static getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
    const token = AuthClient.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    };
  }

  /**
   * Fetch dynamic price breakdown from Spring Boot PriceQuoteController
   * GET /api/v1/properties/{propertyId}/quote?checkIn=...&checkOut=...
   */
  static async getPriceQuote(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    couponCode?: string
  ): Promise<PriceQuoteResponse | null> {
    if (!propertyId || !checkIn || !checkOut) return null;

    try {
      const url = new URL(`${API_BASE_URL}/api/v1/properties/${propertyId}/quote`);
      url.searchParams.set("checkIn", checkIn);
      url.searchParams.set("checkOut", checkOut);
      if (couponCode) url.searchParams.set("couponCode", couponCode);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        console.warn("[BookingPaymentClient] getPriceQuote error status:", res.status);
        return null;
      }

      const json = await res.json();
      const data = json?.data || json;
      if (!data) return null;

      return {
        propertyId: data.propertyId || propertyId,
        checkIn: data.checkIn || checkIn,
        checkOut: data.checkOut || checkOut,
        basePrice: Number(data.basePrice || 0),
        lineItems: Array.isArray(data.lineItems)
          ? data.lineItems.map((item: any) => ({
              label: item.label || "Service charge",
              amount: Number(item.amount || 0),
            }))
          : [],
        total: Number(data.total || 0),
      };
    } catch (e) {
      console.warn("[BookingPaymentClient] getPriceQuote network exception:", e);
      return null;
    }
  }

  /**
   * Create a new reservation with Spring Boot BookingController
   * POST /api/v1/bookings
   */
  static async createBooking(payload: CreateBookingPayload): Promise<BookingResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/bookings`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        propertyId: payload.propertyId,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        guestCount: payload.guestCount,
        couponCode: payload.couponCode || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `Booking creation failed with status ${res.status}` }));
      throw new Error(err?.message || err?.error || `Booking failed with status ${res.status}`);
    }

    const json = await res.json();
    const data = json?.data || json;

    return {
      id: data.id,
      propertyId: data.propertyId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guestCount: data.guestCount,
      status: data.status,
      totalAmount: Number(data.totalAmount || 0),
      currency: data.currency || "EUR",
      clientSecret: data.clientSecret,
    };
  }

  /**
   * Fetch booking details by ID
   * GET /api/v1/bookings/{bookingId}
   */
  static async getBooking(bookingId: string): Promise<BookingResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return null;
      const json = await res.json();
      const data = json?.data || json;
      return {
        id: data.id,
        propertyId: data.propertyId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guestCount: data.guestCount,
        status: data.status,
        totalAmount: Number(data.totalAmount || 0),
        currency: data.currency || "EUR",
        clientSecret: data.clientSecret,
      };
    } catch (e) {
      console.warn("[BookingPaymentClient] getBooking error:", e);
      return null;
    }
  }

  /**
   * Confirm booking payment with payment method ID
   * POST /api/v1/payments/{bookingId}/confirm
   */
  static async confirmPayment(
    bookingId: string,
    paymentMethodId: string
  ): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/payments/${bookingId}/confirm`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ paymentMethodId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `Payment confirmation error: ${res.status}` }));
      throw new Error(err?.message || "Payment authorization could not be confirmed");
    }

    const json = await res.json();
    const data = json?.data || json;
    return {
      status: data?.status || "SUCCEEDED",
    };
  }

  /**
   * Get current payment status for booking
   * GET /api/v1/payments/{bookingId}/status
   */
  static async getPaymentStatus(bookingId: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/payments/${bookingId}/status`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return null;
      const json = await res.json();
      const data = json?.data || json;
      return data?.status || data?.paymentStatus || null;
    } catch (e) {
      console.warn("[BookingPaymentClient] getPaymentStatus error:", e);
      return null;
    }
  }

  /**
   * Get user's saved payment methods from UserPaymentMethodController
   * GET /api/v1/user/payment-methods
   */
  static async getUserPaymentMethods(): Promise<UserPaymentMethodItem[]> {
    const token = AuthClient.getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/payment-methods`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return [];
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

      return list.map((item: any) => ({
        id: item.id || item.stripePaymentMethodId,
        stripePaymentMethodId: item.stripePaymentMethodId || item.id,
        cardBrand: item.cardBrand || item.brand || "visa",
        lastFour: item.lastFour || item.last4 || "4242",
        expMonth: Number(item.expMonth || 12),
        expYear: Number(item.expYear || 28),
        cardholderName: item.cardholderName || "Verified Guest",
        isDefault: Boolean(item.isDefault),
      }));
    } catch (e) {
      console.warn("[BookingPaymentClient] getUserPaymentMethods error:", e);
      return [];
    }
  }

  /**
   * Save a new payment method for authenticated user
   * POST /api/v1/user/payment-methods
   */
  static async saveUserPaymentMethod(data: SavePaymentMethodPayload): Promise<any> {
    const token = AuthClient.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/payment-methods`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        console.warn("[BookingPaymentClient] saveUserPaymentMethod status:", res.status);
        return null;
      }

      return await res.json();
    } catch (e) {
      console.warn("[BookingPaymentClient] saveUserPaymentMethod error:", e);
      return null;
    }
  }

  /**
   * Delete saved payment method
   * DELETE /api/v1/user/payment-methods/{id}
   */
  static async deleteUserPaymentMethod(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/user/payment-methods/${id}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (e) {
      console.warn("[BookingPaymentClient] deleteUserPaymentMethod error:", e);
      return false;
    }
  }

  /**
   * Fetch current authenticated guest's bookings
   * GET /api/v1/bookings/me
   */
  static async getMyBookings(): Promise<BookingResponse[]> {
    const token = AuthClient.getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/me`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        console.warn("[BookingPaymentClient] getMyBookings status:", res.status);
        return [];
      }

      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      return list.map((b: any) => ({
        id: b.id,
        propertyId: b.propertyId,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        guestCount: Number(b.guestCount || 1),
        status: b.status || "CONFIRMED",
        totalAmount: Number(b.totalAmount || 0),
        currency: b.currency || "EUR",
        clientSecret: b.clientSecret,
      }));
    } catch (e) {
      console.warn("[BookingPaymentClient] getMyBookings network error:", e);
      return [];
    }
  }

  /**
   * Cancel booking
   * POST /api/v1/bookings/{bookingId}/cancel
   */
  static async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (e) {
      console.warn("[BookingPaymentClient] cancelBooking error:", e);
      return false;
    }
  }

  static async getBookingDossier(bookingId: string): Promise<ArrivalDossierResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}/dossier`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json || null;
    } catch (e) {
      console.warn("[BookingPaymentClient] getBookingDossier error:", e);
      return null;
    }
  }

  static async getBookingInvoice(bookingId: string): Promise<BookingInvoiceResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}/invoice`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json || null;
    } catch (e) {
      console.warn("[BookingPaymentClient] getBookingInvoice error:", e);
      return null;
    }
  }

  static getCalendarIcsUrl(bookingId: string): string {
    return `${API_BASE_URL}/api/v1/bookings/${bookingId}/calendar.ics`;
  }

  static async sendResidentMessage(bookingId: string, message: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}/message`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ message }),
      });
      return res.ok;
    } catch (e) {
      console.warn("[BookingPaymentClient] sendResidentMessage error:", e);
      return false;
    }
  }

  static async getCancellationQuote(bookingId: string): Promise<CancellationQuoteResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}/cancellation-quote`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json || null;
    } catch (e) {
      console.warn("[BookingPaymentClient] getCancellationQuote error:", e);
      return null;
    }
  }
}

export interface ArrivalDossierResponse {
  bookingId: string;
  propertyId: string;
  sanctuaryTitle: string;
  guestName: string;
  checkInDate: string;
  checkInWindow: string;
  checkOutDate: string;
  checkOutWindow: string;
  vaultPin: string;
  wifiSsid: string;
  wifiPasskey: string;
  latitude?: number;
  longitude?: number;
  arrivalCadenceInstructions?: string;
  parkingProtocols?: string;
  telescopeCalibrationStatus?: string;
}

export interface BookingInvoiceResponse {
  invoiceNumber: string;
  bookingId: string;
  sanctuaryTitle: string;
  guestName: string;
  guestEmail: string;
  issueDate: string;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  subtotal: number;
  vatRatePercentage: number;
  vatAmount: number;
  touristTax: number;
  cleaningFee: number;
  totalAmount: number;
  currency: string;
  escrowStatus: string;
  paymentMethodMasked?: string;
  transactionRef?: string;
}

export interface CancellationQuoteResponse {
  bookingId: string;
  totalPaid: number;
  cancellationFee: number;
  refundAmount: number;
  policyTier: string;
  currency: string;
}

