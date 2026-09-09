export type MessageSenderType = "USER" | "LUMEN" | "HOST" | "SYSTEM";

export type MessageContentType =
  | "TEXT"
  | "IMAGE"
  | "DOCUMENT"
  | "ACTION_CARD"
  | "TOOL_RESULT"
  | "SYSTEM";

export type LumenBlockType =
  | "text"
  | "property"
  | "property_list"
  | "availability"
  | "booking"
  | "booking_status"
  | "price_breakdown"
  | "payment"
  | "payment_prompt"
  | "payment_status"
  | "actions"
  | "action_card"
  | "confirmation"
  | "confirmation_required"
  | "warning"
  | "error"
  | "html"
  | "html_block"
  | "iframe"
  | "embed"
  | "webview"
  | "scheduled_task"
  | "scheduled_task_list"
  | "schedule"
  | "execution_plan"
  | "execution"
  | "execution_steps"
  | "activity"
  | "activity_steps"
  | "thought"
  | "thoughts"
  | "tool_execution"
  | "steps"
  | "vision_search_results"
  | "vision_results"
  | "ui_command"
  | "ui_command_result"
  | "vision_analysis"
  | "page_snapshot_ack"
  | (string & {});

export interface LumenActionInput {
  name: string;
  type?: "text" | "textarea" | "number" | "date" | "select";
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
}

export interface LumenActionItem {
  label: string;
  action?: string;
  parameters?: Record<string, any>;
  arguments?: Record<string, any>;
  requiresInput?: boolean;
  inputs?: LumenActionInput[];
  style?: "primary" | "secondary" | "danger";
}

export interface LumenResponseBlock {
  type: LumenBlockType;
  content?: string;
  data?: Record<string, any>;
  items?: Array<LumenActionItem | Record<string, any>>;
}

export interface LumenAgentResponse {
  version: "1";
  blocks: LumenResponseBlock[];
}

export interface PropertySnippet {
  id: string;
  title: string;
  location: string;
  nightlyPrice: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  features: string[];
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  datesAvailable?: string;
  matchReason?: string;
  description?: string;
  hostName?: string;
  hostAvatar?: string;
  isSuperhost?: boolean;
}

export interface PropertyCompareData {
  title: string;
  subtitle: string;
  properties: {
    id: string;
    title: string;
    location: string;
    nightlyPrice: number;
    rating: number;
    imageUrl: string;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    poolType: string;
    seaDistance: string;
    cancellationPolicy: string;
    chefAvailable: boolean;
  }[];
}

export interface BlockedDateRange {
  start: string;
  end: string;
  reason?: string;
}

export interface AvailabilityCalendarData {
  propertyId: string;
  propertyTitle?: string;
  summary?: string;
  monthName?: string;
  year?: number;
  nightlyRate?: number;
  blockedDates?: BlockedDateRange[];
  bookedDates?: number[];
  selectedDates?: [number, number];
  minimumStayNights?: number;
}

export interface SavedCard {
  id: string;
  brand: "visa" | "mastercard" | "amex";
  last4: string;
  expiry: string;
  isDefault?: boolean;
  cardholderName?: string;
}

export interface PaymentPromptData {
  id?: string;
  bookingRef?: string;
  bookingId?: string;
  propertyTitle?: string;
  datesSummary?: string;
  guestSummary?: string;
  totalAmount: number;
  currency: string;
  clientSecret?: string;
  paymentIntentId?: string;
  depositOptionAvailable?: boolean;
  savedCards?: SavedCard[];
  status?: "PENDING" | "PAID" | "FAILED" | "REQUIRES_ACTION" | "CREATED" | "COMPLETED" | "SUCCEEDED" | string;
}

export interface PrivateChefExperienceData {
  chefName: string;
  chefTitle: string;
  chefAvatar: string;
  experienceTitle: string;
  description: string;
  menuCourses: { course: string; dish: string }[];
  price: number;
  currency: string;
  guestCount: number;
  dietaryOptions: string[];
  status: "PENDING" | "CONFIRMED";
}

export interface BookingTimelineData {
  bookingId: string;
  propertyTitle: string;
  location: string;
  thumbnailUrl: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  guestCount: string;
  accessCode: string;
  hostName: string;
  hostPhone: string;
  currentStep: "HELD" | "AUTHORIZED" | "CHECKIN_READY" | "COMPLETED";
}

export interface CancellationPolicyData {
  tier: "FLEXIBLE" | "MODERATE" | "STRICT";
  title: string;
  fullRefundCutoff: string;
  halfRefundCutoff: string;
  policyNotes: string[];
}

export interface WeatherForecastData {
  location: string;
  seaTemperature: string;
  generalAdvice: string;
  days: {
    day: string;
    date: string;
    condition: "sunny" | "partly-cloudy" | "breezy" | "clear";
    tempHigh: number;
    tempLow: number;
    uvIndex: number;
  }[];
}

export interface SupportFaqData {
  topic: string;
  items: {
    question: string;
    answer: string;
  }[];
}

export interface AgentThoughtProcessData {
  intent: string;
  toolsInvoked: {
    toolName: string;
    executionTimeMs: number;
    status: "SUCCESS" | "CACHED" | "GATE_TRIGGERED";
    summary: string;
  }[];
  totalLatencyMs: number;
}

export interface ConfirmationCardData {
  id: string;
  token: string;
  actionType: "BOOKING" | "CANCELLATION" | "PAYMENT" | "HOST_INQUIRY";
  title: string;
  propertyTitle: string;
  dateRange: string;
  guestSummary: string;
  totalPrice: number;
  currency: string;
  status: "PENDING" | "CONFIRMED" | "DISMISSED";
  details?: {
    nightlyRate: number;
    nights: number;
    cleaningFee: number;
    serviceFee: number;
  };
}

export interface MemoryConsentData {
  id: string;
  memoryKey: string;
  memoryValue: string;
  label: string;
  category: "TRAVEL_STYLE" | "PETS" | "AMENITIES" | "BUDGET" | "DIETARY";
  status: "PENDING" | "REMEMBERED" | "DISMISSED";
}

export interface ActivityStep {
  id: string;
  conversationId?: string;
  activityType?: "TOOL_START" | "TOOL_END" | "AGENT_START" | "AGENT_END" | string;
  agentName?: string;
  toolName?: string;
  friendlyTitle: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  durationMs?: number | null;
  inputSummary?: string | null;
  resultSummary?: string | null;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  senderName: string;
  senderAvatar?: string;
  content: string; // Plain narrative text extracted from text blocks or raw string
  quoteHeader?: string;
  timestamp: string;
  type: MessageContentType;

  imageAttachmentUrl?: string; // Staged or uploaded photo for Vision Search
  imageAttachmentName?: string;
  imageAttachmentSize?: number;

  blocks?: LumenResponseBlock[]; // Ordered UI presentation blocks
  activitySteps?: ActivityStep[]; // Completed tool & activity execution history

  // Vision Search direct accessor
  visionSearchResults?: VisionSearchResultItem[];

  // Legacy / Direct accessor fields for cards
  propertyResults?: PropertySnippet[];
  propertyShowcase?: PropertySnippet;
  propertyCompare?: PropertyCompareData;
  availabilityCalendar?: AvailabilityCalendarData;
  paymentPrompt?: PaymentPromptData;
  privateChef?: PrivateChefExperienceData;
  bookingTimeline?: BookingTimelineData;
  cancellationPolicy?: CancellationPolicyData;
  weatherForecast?: WeatherForecastData;
  supportFaq?: SupportFaqData;
  thoughtProcess?: AgentThoughtProcessData;
  priceBreakdown?: {
    title: string;
    items: { label: string; amount: number }[];
    total: number;
    currency: string;
  };
  confirmationCard?: ConfirmationCardData;
  memoryConsent?: MemoryConsentData;
  isThinking?: boolean;
  thinkingCaption?: string;
  quickActions?: LumenActionItem[];
  metadata?: any;
  metadataJson?: string;
}

export interface Conversation {
  id: string;
  type: "LUMEN" | "HOST_INQUIRY" | "DIRECT" | "BOOKING_INQUIRY" | "SUPPORT" | "AI_CONCIERGE";
  title: string;
  subtitle: string;
  avatarUrl?: string;
  isLumen?: boolean;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  status: "ACTIVE" | "DATES_CONFIRMED" | "COMPLETED" | "ARCHIVED";
  location?: string;
  property?: {
    id: string;
    title: string;
    location: string;
    thumbnailUrl: string;
    stayDates: string;
    guestCount: string;
    statusBadge: string;
  };
  host?: {
    id?: string;
    name: string;
    avatarUrl: string;
    isSuperhost: boolean;
    responseTime: string;
  };
  participant?: {
    id: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
  };
}

export interface UserProfileSummary {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
}

export interface UserMemoryItem {
  id: string;
  key: string;
  value: string;
  label: string;
  category: string;
  createdAt: string;
}

export interface ScheduledTaskCardData {
  id?: string;
  taskId?: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED" | string;
  triggerType: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "INTERVAL" | "EVENT" | "EVENT_OFFSET" | string;
  timezone?: string;
  nextExecutionAt?: string;
  lastExecutionAt?: string;
  retryCount?: number;
  triggerConfig?: Record<string, any>;
  plan?: Record<string, any>;
  message?: string;
}

export interface VisionSearchResultItem {
  propertyId: string;
  title: string;
  city: string;
  country: string;
  pricePerNight: number;
  maxGuests?: number;
  finalScore: number;
  visualSimilarityScore: number;
  descriptionMatchScore?: number;
  bestMatchImageId?: string;
  bestMatchImageUrl?: string;
  bestMatchSceneType?: string;
  visualExplanation?: string;
  matchedFeatures?: string[];
  matchedStyleTags?: string[];
  coverageScore?: number;
}

export interface VisionSearchBlockData {
  queryImagePreviewUrl?: string;
  textQuery?: string;
  totalFound?: number;
  results: VisionSearchResultItem[];
}

export type UiCommandType =
  | "CLICK"
  | "TYPE"
  | "SCROLL_TO"
  | "NAVIGATE"
  | "FILL_FORM"
  | "TOGGLE_CHECKBOX"
  | "SELECT"
  | "WAIT"
  | "CLICK_AMENITY"
  | "UPDATE_FIELD"
  | "SUGGEST_CONTENT";

export interface UiCommand {
  type: UiCommandType;
  target: string;
  value?: string | number | boolean;
  description?: string;
  delayMs?: number;
}

export interface PageSnapshotField {
  id: string;
  name: string;
  type: string;
  label?: string;
  value?: string;
  placeholder?: string;
}

export interface PageSnapshotButton {
  id?: string;
  text: string;
  selector: string;
}

export interface PageSnapshotCheckbox {
  id: string;
  name?: string;
  dataAmenityId?: string;
  dataAmenityName?: string;
  checked: boolean;
  label?: string;
}

export interface PageSnapshotTab {
  id?: string;
  text: string;
  isActive: boolean;
  selector?: string;
}

export interface PageSnapshotSection {
  id?: string;
  heading: string;
}

export interface PageSnapshot {
  url: string;
  pathname: string;
  fields: PageSnapshotField[];
  buttons: PageSnapshotButton[];
  checkboxes: PageSnapshotCheckbox[];
  tabs: PageSnapshotTab[];
  sections: PageSnapshotSection[];
}
