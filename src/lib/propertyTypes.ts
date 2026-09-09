export interface PropertyAddress {
  street?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  formattedAddress?: string;
}

export interface PropertyImageTourItem {
  id: string;
  url: string;
  caption?: string;
  roomCategory: "ALL" | "LIVING" | "BEDROOM" | "KITCHEN" | "OUTDOOR" | "BATHROOM" | "VIEW";
  displayOrder: number;
  isCover?: boolean;
  aiLighting?: string;
  aiSpatialTags?: string[];
}

export interface PropertyAmenity {
  id: string;
  name: string;
  category: "ESSENTIALS" | "LUXURY" | "WORKSPACE" | "OUTDOOR" | "KITCHEN" | "SAFETY";
  iconName?: string;
  description?: string;
  isHighlight?: boolean;
}

export interface PropertyHost {
  id: string;
  name: string;
  avatarUrl: string;
  isSuperhost: boolean;
  joinedYear: number;
  reviewCount: number;
  rating: number;
  responseRate: string;
  responseTime: string;
  bio?: string;
  coHosts?: Array<{ name: string; avatarUrl: string }>;
}

export interface PropertyRoomSleep {
  id: string;
  roomName: string;
  bedType: string;
  bedCount: number;
  imageUrl?: string;
  description?: string;
}

export interface PropertyReview {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar: string;
  authorCountry: string;
  stayDate: string;
  stayDuration?: string;
  rating: number;
  content: string;
  hostReply?: string;
}

export interface PropertyReviewSummary {
  avgRating: number;
  totalReviews: number;
  cleanliness: number;
  accuracy: number;
  communication: number;
  location: number;
  checkIn: number;
  value: number;
}

export interface PropertyDetail {
  id: string;
  title: string;
  description: string;
  propertyType: "VILLA" | "APARTMENT" | "BOUTIQUE_HOTEL" | "ESTATE" | "PENTHOUSE" | "CHALET";
  spaceType: "ENTIRE_PLACE" | "PRIVATE_ROOM" | "HOTEL_ROOM";
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePricePerNight: number;
  currency: string;
  cleaningFee: number;
  serviceFeePercent: number;
  cancellationPolicy: "FLEXIBLE" | "MODERATE" | "STRICT";
  latitude: number;
  longitude: number;
  address: PropertyAddress;
  host: PropertyHost;
  images: PropertyImageTourItem[];
  amenities: PropertyAmenity[];
  rooms: PropertyRoomSleep[];
  reviewSummary: PropertyReviewSummary;
  reviews: PropertyReview[];
  houseRules: {
    checkInTime: string;
    checkOutTime: string;
    selfCheckIn: boolean;
    selfCheckInMethod?: string;
    smokingAllowed: boolean;
    petsAllowed: boolean;
    partiesAllowed: boolean;
    quietHours?: string;
  };
  nearbyLandmarks: Array<{
    name: string;
    distance: string;
    travelTime: string;
    type: "BEACH" | "AIRPORT" | "DINING" | "CULTURE" | "NATURE";
  }>;
  blockedDates?: Array<{
    start: string;
    end: string;
    reason?: string;
  }>;
}
