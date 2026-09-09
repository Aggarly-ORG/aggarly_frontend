"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  HostClient, 
  HostPropertyItem, 
  HostBookingItem, 
  AvailabilitySlot, 
  PricingRuleItem, 
  CleaningTaskItem, 
  AmenityItem 
} from "@/lib/hostClient";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { LumenPropertyCoPilotDrawer } from "./copilot/LumenPropertyCoPilotDrawer";
import { AiCursorBeacon } from "./copilot/AiCursorBeacon";
import { AvailabilityCalendarStripCard } from "@/components/chat/cards/AvailabilityCalendarStripCard";
import { useChatContext } from "@/context/ChatContext";
import { useAppDispatch } from "@/store/hooks";
import { setPropertyCoPilotOpen } from "@/store/slices/uiSlice";
import {
  PropertyConversationClient,
  FastVisionAnalysisResult,
} from "@/lib/propertyConversationClient";
import { 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  User, 
  Bed, 
  Bath, 
  Users, 
  Check, 
  Loader2, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Info,
  Layers,
  Sparkle,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  UploadCloud
} from "lucide-react";

interface ManageSanctuaryViewProps {
  propertyId: string;
}

type TabType = "calendar" | "rates" | "amenities" | "photos" | "cleaning";

export const ManageSanctuaryView: React.FC<ManageSanctuaryViewProps> = ({ propertyId }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "calendar";

  const { initPropertyConversation, propertyConvId } = useChatContext();

  const [activeTab, setActiveTab] = useState<TabType>(
    ["calendar", "rates", "amenities", "photos", "cleaning"].includes(initialTab) ? initialTab : "calendar"
  );

  // Core Data States
  const [property, setProperty] = useState<HostPropertyItem | null>(null);

  // Continuously connect Lumen browser use with this propertyId so it is always found
  useEffect(() => {
    if (propertyId) {
      initPropertyConversation({
        propertyId,
        title: property?.title || "Sanctuary Management Console",
      });
    }
  }, [propertyId, property?.title, initPropertyConversation]);
  const [bookings, setBookings] = useState<HostBookingItem[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRuleItem[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTaskItem[]>([]);
  const [allAmenities, setAllAmenities] = useState<AmenityItem[]>([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  
  // Calendar States
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // Form & Modification States
  const [editableTitle, setEditableTitle] = useState<string>("");
  const [editableDescription, setEditableDescription] = useState<string>("");
  const [editableBasePrice, setEditableBasePrice] = useState<number>(0);
  const [editableWeekendPrice, setEditableWeekendPrice] = useState<number>(0);
  const [editableMaxGuests, setEditableMaxGuests] = useState<number>(1);
  const [editableBedrooms, setEditableBedrooms] = useState<number>(1);
  const [editableBathrooms, setEditableBathrooms] = useState<number>(1);
  const [editableCancellation, setEditableCancellation] = useState<string>("FLEXIBLE");

  // Status Action States
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isSavingChanges, setIsSavingChanges] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Lumen Vision & UI Commands Co-pilot States
  const [isAnalyzingVision, setIsAnalyzingVision] = useState<boolean>(false);
  const [currentAnalyzingName, setCurrentAnalyzingName] = useState<string | undefined>(undefined);
  const [visionAnalysisResults, setVisionAnalysisResults] = useState<FastVisionAnalysisResult[]>([]);

  // Date Blocking States (Direct Inline Console)
  const [blockStartDate, setBlockStartDate] = useState<string>("");
  const [blockEndDate, setBlockEndDate] = useState<string>("");
  const [blockReasonCategory, setBlockReasonCategory] = useState<string>("MAINTENANCE");
  const [blockNotes, setBlockNotes] = useState<string>("");
  const [blockModalError, setBlockModalError] = useState<string | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState<number>(0);
  const [isSubmittingBlock, setIsSubmittingBlock] = useState<boolean>(false);

  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState<boolean>(false);
  const [newRuleType, setNewRuleType] = useState<string>("SEASONAL");
  const [newRuleAdjustmentType, setNewRuleAdjustmentType] = useState<string>("FIXED_AMOUNT");
  const [newRuleAdjustmentValue, setNewRuleAdjustmentValue] = useState<number>(50);
  const [newRuleStartDate, setNewRuleStartDate] = useState<string>("");
  const [newRuleEndDate, setNewRuleEndDate] = useState<string>("");
  const [newRulePriority, setNewRulePriority] = useState<number>(1);
  const [isSubmittingRule, setIsSubmittingRule] = useState<boolean>(false);

  // Photo Management States
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoActionId, setPhotoActionId] = useState<string | null>(null);

  // Delete Sanctuary States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeletingProperty, setIsDeletingProperty] = useState<boolean>(false);

  // Helper for notification messages
  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // 1. Initial Property Data Fetch
  const loadPropertyData = useCallback(async () => {
    if (!propertyId) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const [propData, hostBookings, rules, cleaning, amenitiesList] = await Promise.all([
        HostClient.getPropertyById(propertyId),
        HostClient.getHostBookings(),
        HostClient.getPricingRules(propertyId),
        HostClient.getPropertyCleaningHistory(propertyId),
        HostClient.getAllAmenities(),
      ]);

      if (!propData) {
        setLoadError("Sanctuary listing could not be found or you do not possess curatorial authorization.");
        setIsLoading(false);
        return;
      }

      setProperty(propData);
      setEditableTitle(propData.title || "");
      setEditableDescription(propData.description || "");
      setEditableBasePrice(propData.basePricePerNight || 0);
      setEditableWeekendPrice(Math.round((propData.basePricePerNight || 0) * 1.15));
      setEditableMaxGuests(propData.maxGuests || 1);
      setEditableBedrooms(propData.bedrooms || 1);
      setEditableBathrooms(propData.bathrooms || 1);
      setEditableCancellation(propData.cancellationPolicy || "FLEXIBLE");
      
      const initialAmenityIds = (propData.amenities || []).map((a) => a.id);
      setSelectedAmenityIds(initialAmenityIds);

      setBookings(hostBookings || []);
      setPricingRules(rules || []);
      setCleaningTasks(cleaning || []);
      setAllAmenities(amenitiesList || []);
    } catch (err: any) {
      console.error("Error loading sanctuary console:", err);
      setLoadError("Failed to synchronize with Aggarly Host Core network.");
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadPropertyData();
  }, [loadPropertyData]);

  // 2. Fetch Availability for Current Month
  const fetchMonthAvailability = useCallback(async (date: Date) => {
    if (!propertyId) return;
    setIsLoadingSlots(true);

    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const fromStr = firstDay.toISOString().split("T")[0];
    const toStr = lastDay.toISOString().split("T")[0];

    try {
      const res = await HostClient.getAvailability(propertyId, fromStr, toStr);
      if (res && Array.isArray(res.slots)) {
        setAvailabilitySlots(res.slots);
      } else {
        setAvailabilitySlots([]);
      }
    } catch (err) {
      console.error("Failed to load month availability:", err);
      setAvailabilitySlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchMonthAvailability(currentDate);
  }, [fetchMonthAvailability, currentDate]);

  // Next / Previous Month Navigation
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Find incoming / active reservation for this property
  const activeReservation = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const propertyBookings = bookings.filter((b) => b.propertyId === propertyId);
    
    // Sort upcoming first: checkOut >= today, and status CONFIRMED or PENDING_PAYMENT
    const upcoming = propertyBookings
      .filter((b) => b.checkOut >= today && (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT"))
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    if (upcoming.length > 0) {
      return upcoming[0];
    }

    // Otherwise return most recent booking if exists
    return propertyBookings[0] || null;
  }, [bookings, propertyId]);

  // Toggle Listing Status (ACTIVE <-> INACTIVE)
  const handleToggleStatus = async () => {
    if (!property) return;
    setIsUpdatingStatus(true);
    const newStatus = property.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      const res = await HostClient.updateProperty(property.id, {
        status: newStatus,
      });

      if (res.success && res.property) {
        setProperty(res.property);
        showFeedback(
          "success", 
          newStatus === "ACTIVE" 
            ? "Sanctuary listing activated. Now receiving traveler inquiries." 
            : "Sanctuary listing paused in calibration mode."
        );
      } else {
        showFeedback("error", res.error || "Failed to update listing status.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Network error updating status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save General Changes
  const handleSaveChanges = async () => {
    if (!property) return;
    setIsSavingChanges(true);

    try {
      const res = await HostClient.updateProperty(property.id, {
        title: editableTitle,
        description: editableDescription,
        basePricePerNight: editableBasePrice,
        maxGuests: editableMaxGuests,
        bedrooms: editableBedrooms,
        bathrooms: editableBathrooms,
        cancellationPolicy: editableCancellation,
        amenityIds: selectedAmenityIds,
      });

      if (res.success && res.property) {
        setProperty(res.property);
        showFeedback("success", "Sanctuary parameters and pricing synchronized successfully.");
      } else {
        showFeedback("error", res.error || "Failed to save parameter updates.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to save changes.");
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Block Dates Submission
  const handleBlockDatesSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!blockStartDate) {
      const msg = "Please select dates on the calendar.";
      setBlockModalError(msg);
      showFeedback("error", msg);
      return;
    }

    let start = blockStartDate;
    let end = blockEndDate || blockStartDate;
    if (start === end) {
      const d = new Date(start);
      d.setDate(d.getDate() + 1);
      end = d.toISOString().split("T")[0];
    } else if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    setIsSubmittingBlock(true);
    setBlockModalError(null);
    try {
      const effectiveReason = blockNotes.trim()
        ? `${blockReasonCategory}: ${blockNotes.trim()}`
        : blockReasonCategory;

      const res = await HostClient.blockDates(propertyId, {
        startDate: start,
        endDate: end,
        reason: effectiveReason,
      });

      if (res.success) {
        showFeedback("success", `Dates successfully blocked: ${start} to ${end}`);
        setBlockStartDate("");
        setBlockEndDate("");
        setBlockNotes("");
        setBlockModalError(null);
        setCalendarRefreshKey((prev) => prev + 1);
        await fetchMonthAvailability(currentDate);
      } else {
        const errorMsg = res.error || "Could not block dates. Verify there is no conflicting confirmed booking.";
        setBlockModalError(errorMsg);
        showFeedback("error", errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to block dates.";
      setBlockModalError(errorMsg);
      showFeedback("error", errorMsg);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  // Create Pricing Rule
  const handleCreatePricingRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleStartDate || !newRuleEndDate) {
      showFeedback("error", "Please provide a valid date range for this pricing rule.");
      return;
    }

    setIsSubmittingRule(true);
    try {
      const success = await HostClient.createPricingRule(propertyId, {
        type: newRuleType,
        adjustmentType: newRuleAdjustmentType,
        adjustmentValue: newRuleAdjustmentValue,
        startDate: newRuleStartDate,
        endDate: newRuleEndDate,
        priority: newRulePriority,
      });

      if (success) {
        showFeedback("success", "Custom pricing rule created and activated.");
        setIsAddRuleModalOpen(false);
        setNewRuleStartDate("");
        setNewRuleEndDate("");
        const updatedRules = await HostClient.getPricingRules(propertyId);
        setPricingRules(updatedRules);
      } else {
        showFeedback("error", "Failed to create pricing rule. Please verify inputs.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Error submitting pricing rule.");
    } finally {
      setIsSubmittingRule(false);
    }
  };

  // Delete Pricing Rule
  const handleDeletePricingRule = async (ruleId: string) => {
    try {
      const success = await HostClient.deletePricingRule(propertyId, ruleId);
      if (success) {
        setPricingRules((prev) => prev.filter((r) => r.id !== ruleId));
        showFeedback("success", "Pricing rule removed.");
      } else {
        showFeedback("error", "Failed to delete pricing rule.");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to delete pricing rule.");
    }
  };

  // Toggle Amenity Checkbox
  const handleToggleAmenity = (id: string) => {
    setSelectedAmenityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Photo Management Handlers
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !property) return;

    setIsUploadingPhoto(true);
    try {
      let uploadCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadRes = await HostClient.uploadFile(file);
        if (uploadRes.success && uploadRes.key) {
          const isCover = (!property.images || property.images.length === 0) && uploadCount === 0;
          await HostClient.addPropertyImage(property.id, {
            objectKey: uploadRes.key,
            isCover,
          });
          uploadCount++;
        } else {
          showFeedback("error", uploadRes.error || "Failed to upload perspective image.");
        }
      }
      showFeedback("success", `${uploadCount} sanctuary perspective(s) uploaded and queued for vision analysis.`);
      await loadPropertyData();
    } catch (err: any) {
      showFeedback("error", err?.message || "Error uploading image.");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleSetCoverPhoto = async (imageId: string) => {
    if (!property) return;
    setPhotoActionId(imageId);
    try {
      const ok = await HostClient.setCoverImage(property.id, imageId);
      if (ok) {
        showFeedback("success", "Primary cover perspective updated.");
        await loadPropertyData();
      } else {
        showFeedback("error", "Failed to set cover image.");
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Error updating cover image.");
    } finally {
      setPhotoActionId(null);
    }
  };

  const handleDeletePhoto = async (imageId: string) => {
    if (!property) return;
    if (!window.confirm("Are you sure you wish to remove this perspective photograph?")) return;
    setPhotoActionId(imageId);
    try {
      const ok = await HostClient.deletePropertyImage(property.id, imageId);
      if (ok) {
        showFeedback("success", "Sanctuary perspective removed.");
        await loadPropertyData();
      } else {
        showFeedback("error", "Failed to remove perspective.");
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Error removing perspective.");
    } finally {
      setPhotoActionId(null);
    }
  };

  // Delete Sanctuary Handler
  const handleDeleteSanctuary = async () => {
    if (!property) return;
    setIsDeletingProperty(true);
    try {
      const ok = await HostClient.deleteProperty(property.id);
      if (ok) {
        showFeedback("success", "Sanctuary successfully archived and removed from portfolio.");
        setIsDeleteModalOpen(false);
        setTimeout(() => {
          router.push("/host");
        }, 1200);
      } else {
        showFeedback("error", "Failed to delete sanctuary. Please verify authorization.");
        setIsDeletingProperty(false);
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Network error deleting sanctuary.");
      setIsDeletingProperty(false);
    }
  };


  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas-outer flex flex-col justify-between">
        <LonaHeader />
        <main className="w-full pt-28 pb-20 flex-grow flex items-center justify-center">
          <div className="w-full max-w-[1560px] mx-auto px-4 lg:px-12">
            <div className="w-full bg-obsidian-base rounded-[28px] border border-hairline-on-dark p-12 text-center flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-state-success animate-spin" />
              <h2 className="font-headline-md text-headline-md text-text-on-dark-primary">
                Connecting to Sanctuary Telemetry
              </h2>
              <p className="font-body-sm text-text-on-dark-secondary">
                Synchronizing calendar availability, active reservations, and pricing matrix...
              </p>
            </div>
          </div>
        </main>
        <LonaFooter />
      </div>
    );
  }

  // Error State
  if (loadError || !property) {
    return (
      <div className="min-h-screen bg-canvas-outer flex flex-col justify-between">
        <LonaHeader />
        <main className="w-full pt-28 pb-20 flex-grow flex items-center justify-center">
          <div className="w-full max-w-[1560px] mx-auto px-4 lg:px-12">
            <div className="w-full bg-obsidian-base rounded-[28px] border border-state-error/40 p-12 text-center flex flex-col items-center justify-center gap-6">
              <AlertCircle className="w-12 h-12 text-state-error" />
              <div className="flex flex-col gap-2">
                <h2 className="font-headline-md text-headline-md text-text-on-dark-primary">
                  Sanctuary Access Unavailable
                </h2>
                <p className="font-body-sm text-text-on-dark-secondary max-w-md">
                  {loadError || "The requested property identifier is invalid or does not exist."}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/host"
                  className="px-6 py-2.5 rounded-full bg-text-on-dark-primary text-obsidian-base hover:bg-canvas-outer font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors"
                >
                  Return to Portfolio
                </Link>
                <button
                  onClick={loadPropertyData}
                  className="px-6 py-2.5 rounded-full border border-hairline-on-dark text-text-on-dark-primary hover:bg-obsidian-elevated font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Sync
                </button>
              </div>
            </div>
          </div>
        </main>
        <LonaFooter />
      </div>
    );
  }

  // Cover Image
  const coverImageObj = property.images?.find((img) => img.isCover) || property.images?.[0];
  const coverKeyOrUrl = coverImageObj?.objectKey || coverImageObj?.imageUrl || (coverImageObj as any)?.url || "";
  const resolvedCoverUrl = HostClient.resolveImageUrl(coverKeyOrUrl);

  // Address Line
  const fullAddress = [
    property.address?.street,
    property.address?.city,
    property.address?.state,
    property.address?.country,
  ]
    .filter(Boolean)
    .join(", ") || "Location unassigned";

  return (
    <div className="min-h-screen bg-canvas-outer text-text-on-light-primary antialiased flex flex-col justify-between">
      <LonaHeader />

      <main className="w-full pt-24 pb-16 flex-grow">
        <div className="w-full max-w-[1560px] mx-auto px-4 lg:px-12">
          
          {/* Feedback Toast */}
          {feedbackMessage && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                feedbackMessage.type === "success"
                  ? "bg-state-success/15 border-state-success/40 text-state-success"
                  : "bg-state-error/15 border-state-error/40 text-state-error"
              }`}
            >
              <div className="flex items-center gap-3">
                {feedbackMessage.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="font-body-sm font-medium">{feedbackMessage.text}</span>
              </div>
              <button
                onClick={() => setFeedbackMessage(null)}
                className="text-text-on-dark-secondary hover:text-text-on-dark-primary text-xs uppercase"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Monolithic Floating Dark Canvas Card */}
          <div className="w-full bg-gradient-to-b from-obsidian-base to-surface-container-lowest rounded-[28px] border border-hairline-on-dark shadow-[0_24px_48px_-12px_rgba(10,10,12,0.16),0_4px_16px_rgba(10,10,12,0.06)] p-6 sm:p-8 lg:p-12 text-text-on-dark-primary relative overflow-hidden">
            
            {/* Atmospheric Lunar Bloom Behind Content */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-tertiary-fixed-dim/10 blur-[110px] pointer-events-none" />
            <div className="absolute top-1/3 -left-20 w-80 h-80 rounded-full bg-secondary-container/15 blur-[90px] pointer-events-none" />

            {/* Header & Breadcrumbs */}
            <div className="flex flex-col gap-6 relative z-10 pb-8 border-b border-hairline-on-dark">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Left: Breadcrumbs & Titles */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm tracking-[0.18em]">
                    <Link href="/host" className="hover:text-text-on-dark-primary transition-colors">
                      HOST PORTFOLIO
                    </Link>
                    <span className="text-hairline-on-dark">/</span>
                    <span>SANCTUARIES</span>
                    <span className="text-hairline-on-dark">/</span>
                    <span className="text-text-on-dark-primary font-semibold truncate max-w-[280px] sm:max-w-md">
                      {property.title}
                    </span>
                  </div>

                  <h1 className="font-headline-xl text-headline-xl text-text-on-dark-primary tracking-wide uppercase">
                    {property.title}
                  </h1>

                  <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary">
                    {fullAddress}
                  </p>

                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2.5 mt-2">
                    {property.status === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-hairline-on-dark text-state-success font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse" />
                        Active Listing
                      </span>
                    ) : property.status === "INACTIVE" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-hairline-on-dark text-amber-400 font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Listing In Calibration
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-hairline-on-dark text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-on-dark-secondary" />
                        Draft Mode
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-hairline-on-dark text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-state-success" />
                      {property.propertyType}
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-hairline-on-dark text-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                      ★ {property.avgRating ? property.avgRating.toFixed(2) : "New Sanctuary"}
                      {property.reviewCount ? ` (${property.reviewCount})` : ""}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
                  <button
                    onClick={async () => {
                      dispatch(setPropertyCoPilotOpen(true));
                      if (propertyId) {
                        await initPropertyConversation({
                          propertyId,
                          title: property?.title || "Sanctuary Management Console",
                        });
                      }
                    }}
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 transition-all font-label-caps-sm text-label-caps-sm uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.15)] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>Lumen Co-pilot</span>
                    {propertyConvId && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Connected to Property" />
                    )}
                  </button>

                  <Link
                    href={`/properties/${property.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-hairline-on-dark text-text-on-dark-primary hover:bg-surface-container-high transition-colors font-label-caps-sm text-label-caps-sm uppercase tracking-wider"
                  >
                    <span>View Public Page</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={handleToggleStatus}
                    disabled={isUpdatingStatus}
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-hairline-on-dark text-text-on-dark-secondary hover:text-text-on-dark-primary hover:border-text-on-dark-secondary transition-colors font-label-caps-sm text-label-caps-sm uppercase tracking-wider disabled:opacity-50"
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : property.status === "ACTIVE" ? (
                      "Pause Listing"
                    ) : (
                      "Activate Listing"
                    )}
                  </button>

                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-state-error/40 text-state-error hover:bg-state-error/15 hover:border-state-error transition-colors font-label-caps-sm text-label-caps-sm uppercase tracking-wider"
                    title="Archive or Delete Sanctuary"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete Sanctuary</span>
                  </button>

                  <button
                    onClick={handleSaveChanges}
                    disabled={isSavingChanges}
                    type="button"
                    className="group inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-text-on-dark-primary text-obsidian-base hover:bg-canvas-outer transition-all font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] shadow-[0_4px_14px_rgba(245,244,241,0.15)] disabled:opacity-60"
                  >
                    {isSavingChanges ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Save Changes</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Primary Perspective Hero Banner */}
              {resolvedCoverUrl && (
                <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-hairline-on-dark bg-surface-container mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvedCoverUrl}
                    alt={property.title}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base/90 via-obsidian-base/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-obsidian-base/80 backdrop-blur-md border border-hairline-on-dark text-text-on-dark-primary font-label-caps-sm text-xs uppercase tracking-wider">
                        Primary Perspective
                      </span>
                      <span className="px-3 py-1 rounded-full bg-obsidian-base/80 backdrop-blur-md border border-hairline-on-dark text-text-on-dark-secondary font-data-tabular text-xs">
                        {property.images?.length || 0} Photographs Registered
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("photos")}
                      className="pointer-events-auto px-4 py-1.5 rounded-full bg-obsidian-base/90 hover:bg-surface-container border border-hairline-on-dark text-text-on-dark-primary font-label-caps-sm text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#dfb15b]" />
                      <span>Manage Imagery</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Tabs */}
              <nav className="flex items-center gap-2 sm:gap-6 overflow-x-auto pt-4 scrollbar-none border-t border-hairline-on-dark/60">
                <button
                  type="button"
                  onClick={() => setActiveTab("calendar")}
                  className={`whitespace-nowrap px-1 py-2 font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors ${
                    activeTab === "calendar"
                      ? "text-text-on-dark-primary border-b-2 border-text-on-dark-primary font-semibold"
                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary border-b-2 border-transparent"
                  }`}
                >
                  Overview & Calendar
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("rates")}
                  className={`whitespace-nowrap px-1 py-2 font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors ${
                    activeTab === "rates"
                      ? "text-text-on-dark-primary border-b-2 border-text-on-dark-primary font-semibold"
                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary border-b-2 border-transparent"
                  }`}
                >
                  Rates & Seasonality ({pricingRules.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("amenities")}
                  className={`whitespace-nowrap px-1 py-2 font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors ${
                    activeTab === "amenities"
                      ? "text-text-on-dark-primary border-b-2 border-text-on-dark-primary font-semibold"
                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary border-b-2 border-transparent"
                  }`}
                >
                  Amenities & Inventory ({selectedAmenityIds.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("photos")}
                  className={`whitespace-nowrap px-1 py-2 font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors ${
                    activeTab === "photos"
                      ? "text-text-on-dark-primary border-b-2 border-text-on-dark-primary font-semibold"
                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary border-b-2 border-transparent"
                  }`}
                >
                  Media & Photos ({property.images?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("cleaning")}
                  className={`whitespace-nowrap px-1 py-2 font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors ${
                    activeTab === "cleaning"
                      ? "text-text-on-dark-primary border-b-2 border-text-on-dark-primary font-semibold"
                      : "text-text-on-dark-secondary hover:text-text-on-dark-primary border-b-2 border-transparent"
                  }`}
                >
                  Maintenance & Cleaning ({cleaningTasks.length})
                </button>
              </nav>
            </div>

            {/* TAB CONTENT 1: OVERVIEW & CALENDAR */}
            {activeTab === "calendar" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pt-8 relative z-10">
                
                {/* Left Column: Active Reservation + Interactive Calendar (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col gap-8">
                  
                  {/* Active Reservation Monolith */}
                  <div className="rounded-2xl bg-surface-container-lowest border border-text-on-dark-primary/30 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.35)] relative overflow-hidden">
                    {activeReservation ? (
                      <>
                        <div className="absolute top-0 right-0 px-4 py-1.5 bg-obsidian-bubble rounded-bl-xl border-l border-b border-hairline-on-dark text-state-success font-label-caps-sm text-label-caps-sm uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse" />
                          {activeReservation.status === "CONFIRMED" ? "Confirmed Stay" : "Pending Payment"}
                        </div>

                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col">
                            <span className="text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-[0.14em]">
                              Active or Upcoming Resident
                            </span>
                            <h3 className="font-headline-md text-headline-md text-text-on-dark-primary mt-1">
                              Booking Ref #{activeReservation.id.slice(0, 8).toUpperCase()}
                            </h3>
                            <span className="text-secondary font-body-sm text-body-sm">
                              {activeReservation.guestCount} Adult Guests • Total Sanctuary Access
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-hairline-on-dark">
                            <div>
                              <span className="text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase">Check-In</span>
                              <p className="font-data-tabular text-data-tabular text-text-on-dark-primary mt-0.5">
                                {activeReservation.checkIn}
                              </p>
                              <span className="text-text-on-dark-secondary text-[11px]">16:00 Check-in</span>
                            </div>
                            <div>
                              <span className="text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase">Check-Out</span>
                              <p className="font-data-tabular text-data-tabular text-text-on-dark-primary mt-0.5">
                                {activeReservation.checkOut}
                              </p>
                              <span className="text-text-on-dark-secondary text-[11px]">11:00 Check-out</span>
                            </div>
                            <div>
                              <span className="text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase">Total Escrow</span>
                              <p className="font-data-tabular text-data-tabular text-text-on-dark-primary mt-0.5">
                                €{activeReservation.totalAmount.toLocaleString()} {activeReservation.currency || "EUR"}
                              </p>
                              <span className="text-state-success text-[11px]">Escrow Secured</span>
                            </div>
                            <div>
                              <span className="text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase">Status</span>
                              <p className="font-data-tabular text-data-tabular text-text-on-dark-primary mt-0.5 capitalize">
                                {activeReservation.status.replace("_", " ").toLowerCase()}
                              </p>
                              <span className="text-secondary text-[11px]">Lona Certified</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-obsidian-bubble border border-hairline-on-dark flex items-center justify-center text-text-on-dark-primary">
                                <Clock className="w-4 h-4 text-secondary" />
                              </div>
                              <span className="text-text-on-dark-secondary font-body-sm text-body-sm">
                                Standard turnover reset scheduled upon check-out
                              </span>
                            </div>

                            <Link
                              href="/chat"
                              className="px-4 py-1.5 rounded-full border border-hairline-on-dark hover:border-text-on-dark-primary font-label-caps-sm text-label-caps-sm text-text-on-dark-primary uppercase tracking-wider transition-colors"
                            >
                              Message Concierge
                            </Link>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
                        <Calendar className="w-8 h-8 text-text-on-dark-secondary" />
                        <div className="flex flex-col">
                          <h4 className="font-headline-md text-headline-md text-text-on-dark-primary">
                            No Active Reservations
                          </h4>
                          <p className="font-body-sm text-text-on-dark-secondary mt-1">
                            This sanctuary is currently open for incoming guest reservations.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                      {/* Sanctuary Availability & Interactive Celestial Calendar (Directly Embedded) */}
                      <div className="rounded-2xl bg-surface-container-lowest border border-hairline-on-dark p-4 sm:p-6 flex flex-col gap-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-hairline-on-dark">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <h2 className="font-headline-md text-headline-md text-text-on-dark-primary">
                                Sanctuary Availability & Calendar
                              </h2>
                              <p className="text-xs text-text-on-dark-secondary">
                                Click nights directly on the celestial calendar below to inspect availability or lock dates.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-data-tabular text-data-tabular text-secondary text-xs">
                              Base Rate: €{property.basePricePerNight} / Night
                            </span>
                          </div>
                        </div>

                        {/* DIRECT INTERACTIVE CELESTIAL CALENDAR STRIP */}
                        <div className="w-full">
                          <AvailabilityCalendarStripCard
                            className="max-w-none w-full shadow-none border-hairline-on-dark"
                            data={{
                              propertyId: property.id,
                              propertyTitle: property.title,
                              nightlyRate: property.basePricePerNight,
                            }}
                            isHostMode={true}
                            refreshKey={calendarRefreshKey}
                            initialCheckIn={blockStartDate || undefined}
                            initialCheckOut={blockEndDate || undefined}
                            onSelectDateRange={(start, end) => {
                              setBlockStartDate(start);
                              setBlockEndDate(end);
                              setBlockModalError(null);
                            }}
                          />
                        </div>

                        {/* DIRECT INLINE HOST DATE BLOCKING CONSOLE */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-hairline-on-dark flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-on-dark-primary">
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Direct Date Blocking Console</span>
                            </div>
                            {blockStartDate && (
                              <span className="text-[11px] text-amber-400 font-mono">
                                Selected: {blockStartDate} → {blockEndDate || blockStartDate}
                              </span>
                            )}
                          </div>

                          {blockModalError && (
                            <div className="p-3 rounded-xl bg-state-error/15 border border-state-error/30 flex items-start gap-2.5 text-xs text-state-error animate-in fade-in">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <div className="flex-1 leading-relaxed">
                                <strong className="font-semibold">Block Failed:</strong> {blockModalError}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            {/* Target Dates Display */}
                            <div className="md:col-span-4 flex flex-col gap-1">
                              <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                                Selected Dates
                              </label>
                              <div className="h-10 px-3 rounded-xl bg-surface-container-high border border-hairline-on-dark flex items-center justify-between text-xs font-data-tabular">
                                {blockStartDate ? (
                                  <span className="text-text-on-dark-primary truncate">
                                    <strong className="text-amber-300">{blockStartDate}</strong>
                                    <span className="text-text-on-dark-secondary mx-1">→</span>
                                    <strong className="text-amber-300">{blockEndDate || blockStartDate}</strong>
                                  </span>
                                ) : (
                                  <span className="text-text-on-dark-secondary italic text-[11px]">
                                    Click nights on calendar above
                                  </span>
                                )}
                                {blockStartDate && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBlockStartDate("");
                                      setBlockEndDate("");
                                      setBlockModalError(null);
                                    }}
                                    className="text-text-on-dark-secondary hover:text-text-on-dark-primary text-[10px] uppercase font-mono ml-2 underline cursor-pointer shrink-0"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Classification */}
                            <div className="md:col-span-3 flex flex-col gap-1">
                              <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                                Reason
                              </label>
                              <select
                                value={blockReasonCategory}
                                onChange={(e) => setBlockReasonCategory(e.target.value)}
                                className="h-10 px-2.5 rounded-xl bg-surface-container-high border border-hairline-on-dark text-xs text-text-on-dark-primary outline-none focus:border-amber-400"
                              >
                                <option value="MAINTENANCE">Maintenance & Upkeep</option>
                                <option value="HOST_BLOCKED">Owner Private Solitude</option>
                                <option value="BOOKED">External Reservation</option>
                              </select>
                            </div>

                            {/* Optional Notes */}
                            <div className="md:col-span-3 flex flex-col gap-1">
                              <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                                Note (Optional)
                              </label>
                              <input
                                type="text"
                                value={blockNotes}
                                onChange={(e) => setBlockNotes(e.target.value)}
                                placeholder="e.g. Renovation, Host stay"
                                className="h-10 px-3 rounded-xl bg-surface-container-high border border-hairline-on-dark text-xs text-text-on-dark-primary outline-none focus:border-amber-400 placeholder:text-stone-500"
                              />
                            </div>

                            {/* Action Button */}
                            <div className="md:col-span-2">
                              <button
                                type="button"
                                disabled={!blockStartDate || isSubmittingBlock}
                                onClick={() => handleBlockDatesSubmit()}
                                className="w-full h-10 px-3 rounded-xl bg-gradient-to-r from-[#dfb15b] to-[#c59b27] hover:from-[#f3cf7a] hover:to-[#dfb15b] text-[#0A0A0C] font-semibold font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(223,177,91,0.3)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {isSubmittingBlock ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Confirm Block</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                <div className="lg:col-span-5 flex flex-col gap-8">
                  
                  {/* Sanctuary Overview Card */}
                  <div className="rounded-2xl bg-surface-container-lowest border border-hairline-on-dark overflow-hidden">
                    <div className="relative h-56 w-full bg-surface-container">
                      {resolvedCoverUrl ? (
                        <img
                          src={resolvedCoverUrl}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-on-dark-secondary">
                          No Cover Image
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/30 to-transparent" />
                      <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                        <div>
                          <span className="font-label-caps-sm text-label-caps-sm text-secondary uppercase tracking-widest">
                            Sanctuary Snapshot
                          </span>
                          <h3 className="font-headline-md text-headline-md text-text-on-dark-primary">
                            {property.title}
                          </h3>
                        </div>
                        <span className="font-data-tabular text-data-tabular px-2.5 py-1 rounded-full bg-obsidian-base/80 border border-hairline-on-dark text-text-on-dark-primary">
                          {property.maxGuests} Guests Max
                        </span>
                      </div>
                    </div>

                    {/* Specs Matrix */}
                    <div className="p-6 flex flex-col gap-4">
                      <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider">
                        Inclusions & Specifications
                      </span>
                      <div className="grid grid-cols-2 gap-3 text-body-sm">
                        <div className="p-3 rounded-lg bg-surface-container-low border border-hairline-on-dark flex items-center gap-2.5">
                          <Bed className="w-4 h-4 text-secondary" />
                          <span className="text-text-on-dark-primary">{property.bedrooms} Bedrooms</span>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-container-low border border-hairline-on-dark flex items-center gap-2.5">
                          <Bath className="w-4 h-4 text-secondary" />
                          <span className="text-text-on-dark-primary">{property.bathrooms} Bathrooms</span>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-container-low border border-hairline-on-dark flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-secondary" />
                          <span className="text-text-on-dark-primary">{property.maxGuests} Max Capacity</span>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-container-low border border-hairline-on-dark flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-secondary" />
                          <span className="text-text-on-dark-primary">{property.cancellationPolicy} Policy</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operations & White-Glove Turnover Preview */}
                  <div className="rounded-2xl bg-surface-container-lowest border border-hairline-on-dark p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-headline-md text-headline-md text-text-on-dark-primary">
                        Curated Operations Staff
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab("cleaning")}
                        className="font-label-caps-sm text-label-caps-sm text-secondary hover:text-text-on-dark-primary uppercase tracking-wider"
                      >
                        All Tasks ({cleaningTasks.length}) →
                      </button>
                    </div>

                    {cleaningTasks.length > 0 ? (
                      <div className="flex flex-col divide-y divide-hairline-on-dark">
                        {cleaningTasks.slice(0, 3).map((task) => (
                          <div key={task.id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-surface-container-high border border-hairline-on-dark flex items-center justify-center font-label-caps-md text-text-on-dark-primary">
                                {task.cleanerName ? task.cleanerName.slice(0, 2).toUpperCase() : "WG"}
                              </div>
                              <div>
                                <h4 className="text-body-md font-medium text-text-on-dark-primary">
                                  {task.cleanerName || "White-Glove Squad"}
                                </h4>
                                <p className="font-body-sm text-body-sm text-text-on-dark-secondary">
                                  {task.taskType || "Turnover"} • {task.scheduledDate}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`font-data-tabular text-data-tabular ${
                                task.status === "COMPLETED"
                                  ? "text-state-success"
                                  : task.status === "IN_PROGRESS"
                                  ? "text-tertiary"
                                  : "text-text-on-dark-secondary"
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="font-body-sm text-text-on-dark-secondary py-4">
                        No scheduled turnover tasks for this sanctuary.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: RATES & SEASONALITY */}
            {activeTab === "rates" && (
              <div className="flex flex-col gap-10 pt-8 relative z-10">
                
                {/* Base Rates Matrix */}
                <div className="rounded-2xl bg-surface-container-lowest border border-hairline-on-dark p-6 sm:p-8 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-on-dark">
                    <div className="flex flex-col">
                      <h2 className="font-headline-md text-headline-md text-text-on-dark-primary">
                        Rates & Nightly Solitude Matrix
                      </h2>
                      <span className="text-text-on-dark-secondary font-body-sm text-body-sm">
                        Governs automated night-tier calculations and minimum stay parameters
                      </span>
                    </div>

                    <button
                      onClick={handleSaveChanges}
                      disabled={isSavingChanges}
                      className="px-6 py-2 rounded-full bg-text-on-dark-primary text-obsidian-base font-label-caps-sm text-label-caps-sm uppercase tracking-wider hover:bg-canvas-outer transition-colors flex items-center gap-2 self-start sm:self-auto"
                    >
                      {isSavingChanges ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Base Rates"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Base Nightly Rate */}
                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                        Base Nightly Rate (Mon–Thu)
                      </label>
                      <div className="flex items-center justify-between border-b border-hairline-on-dark focus-within:border-text-on-dark-primary h-11 transition-colors mt-1">
                        <input
                          type="number"
                          min="1"
                          value={editableBasePrice}
                          onChange={(e) => setEditableBasePrice(Number(e.target.value))}
                          className="bg-transparent font-data-tabular text-data-tabular text-text-on-dark-primary outline-none w-full"
                        />
                        <span className="text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm">EUR</span>
                      </div>
                    </div>

                    {/* Weekend Rate */}
                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                        Weekend Rate (Fri–Sun)
                      </label>
                      <div className="flex items-center justify-between border-b border-hairline-on-dark focus-within:border-text-on-dark-primary h-11 transition-colors mt-1">
                        <input
                          type="number"
                          min="1"
                          value={editableWeekendPrice}
                          onChange={(e) => setEditableWeekendPrice(Number(e.target.value))}
                          className="bg-transparent font-data-tabular text-data-tabular text-text-on-dark-primary outline-none w-full"
                        />
                        <span className="text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm">EUR</span>
                      </div>
                    </div>

                    {/* Max Guests */}
                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                        Maximum Guests Capacity
                      </label>
                      <div className="flex items-center justify-between border-b border-hairline-on-dark focus-within:border-text-on-dark-primary h-11 transition-colors mt-1">
                        <input
                          type="number"
                          min="1"
                          value={editableMaxGuests}
                          onChange={(e) => setEditableMaxGuests(Number(e.target.value))}
                          className="bg-transparent font-data-tabular text-data-tabular text-text-on-dark-primary outline-none w-full"
                        />
                        <Users className="w-4 h-4 text-text-on-dark-secondary" />
                      </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                        Cancellation Policy
                      </label>
                      <div className="flex items-center justify-between border-b border-hairline-on-dark focus-within:border-text-on-dark-primary h-11 transition-colors mt-1">
                        <select
                          value={editableCancellation}
                          onChange={(e) => setEditableCancellation(e.target.value)}
                          className="bg-transparent font-data-tabular text-data-tabular text-text-on-dark-primary outline-none w-full cursor-pointer"
                        >
                          <option value="FLEXIBLE" className="bg-obsidian-base text-text-on-dark-primary">
                            FLEXIBLE (Full refund 24h prior)
                          </option>
                          <option value="MODERATE" className="bg-obsidian-base text-text-on-dark-primary">
                            MODERATE (Full refund 5 days prior)
                          </option>
                          <option value="STRICT" className="bg-obsidian-base text-text-on-dark-primary">
                            STRICT (50% refund up to 7 days)
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Pricing Rules List */}
                <div className="rounded-2xl bg-surface-container-lowest border border-hairline-on-dark p-6 sm:p-8 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-on-dark">
                    <div className="flex flex-col">
                      <h2 className="font-headline-md text-headline-md text-text-on-dark-primary">
                        Active Pricing & Seasonality Rules
                      </h2>
                      <span className="text-text-on-dark-secondary font-body-sm text-body-sm">
                        Automated multipliers and fixed offsets for peak seasons, equinoxes, and holidays
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddRuleModalOpen(true)}
                      className="px-5 py-2 rounded-full border border-hairline-on-dark hover:border-text-on-dark-primary text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Create Pricing Rule
                    </button>
                  </div>

                  {pricingRules.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pricingRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-5 rounded-xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between gap-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col">
                              <span className="font-label-caps-sm text-[11px] text-tertiary-fixed uppercase tracking-wider">
                                {rule.type || rule.ruleType || "SEASONAL"}
                              </span>
                              <h4 className="font-headline-md text-[16px] text-text-on-dark-primary mt-0.5">
                                {rule.adjustmentType === "MULTIPLIER"
                                  ? `${((rule.adjustmentValue || rule.multiplier || 1) * 100).toFixed(0)}% Rate`
                                  : `+€${rule.adjustmentValue ?? rule.fixedPrice ?? 0} Nightly`}
                              </h4>
                            </div>
                            <button
                              onClick={() => handleDeletePricingRule(rule.id)}
                              className="text-text-on-dark-secondary hover:text-state-error p-1 transition-colors"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex flex-col text-xs text-text-on-dark-secondary gap-1 border-t border-hairline-on-dark/60 pt-3">
                            <div className="flex items-center justify-between">
                              <span>Window:</span>
                              <span className="font-data-tabular text-text-on-dark-primary">
                                {rule.startDate || "Continuous"} → {rule.endDate || "Ongoing"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Priority:</span>
                              <span className="font-data-tabular text-text-on-dark-primary">
                                {rule.priority ?? 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl bg-obsidian-elevated/40 border border-hairline-on-dark/60 text-center flex flex-col items-center justify-center gap-3">
                      <DollarSign className="w-8 h-8 text-text-on-dark-secondary" />
                      <p className="font-body-sm text-text-on-dark-secondary">
                        No custom pricing rules configured. This sanctuary operates purely on standard base and weekend rates.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: AMENITIES & INVENTORY */}
            {activeTab === "amenities" && (
              <div className="rounded-2xl bg-surface-container-lowest border border-hairline-on-dark p-6 sm:p-8 flex flex-col gap-6 pt-8 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-on-dark">
                  <div className="flex flex-col">
                    <h2 className="font-headline-md text-headline-md text-text-on-dark-primary">
                      Sanctuary Amenities & Curatorial Inclusions
                    </h2>
                    <span className="text-text-on-dark-secondary font-body-sm text-body-sm">
                      Select all architectural, wellness, and culinary equipment available to guests
                    </span>
                  </div>

                  <button
                    onClick={handleSaveChanges}
                    disabled={isSavingChanges}
                    className="px-6 py-2 rounded-full bg-text-on-dark-primary text-obsidian-base font-label-caps-sm text-label-caps-sm uppercase tracking-wider hover:bg-canvas-outer transition-colors flex items-center gap-2 self-start sm:self-auto"
                  >
                    {isSavingChanges ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Amenities"}
                  </button>
                </div>

                {allAmenities.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {allAmenities.map((amenity) => {
                      const isSelected = selectedAmenityIds.includes(amenity.id);
                      return (
                        <div
                          key={amenity.id}
                          id={`amenity-${amenity.id}`}
                          data-amenity-id={amenity.id}
                          data-lumen-amenity-id={amenity.id}
                          data-amenity-name={amenity.name}
                          role="checkbox"
                          aria-checked={isSelected ? "true" : "false"}
                          data-checked={isSelected ? "true" : "false"}
                          onClick={() => handleToggleAmenity(amenity.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-surface-container-high border-text-on-dark-primary/60 text-text-on-dark-primary shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                              : "bg-surface-container-low border-hairline-on-dark text-text-on-dark-secondary hover:border-text-on-dark-secondary"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-secondary" />
                            <span className="text-body-sm font-medium">{amenity.name}</span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-text-on-dark-primary border-text-on-dark-primary text-obsidian-base"
                                : "border-hairline-on-dark"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-on-dark-secondary">
                    No system amenities catalog loaded.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 4: MAINTENANCE & CLEANING */}
            {activeTab === "cleaning" && (
              <div className="rounded-2xl bg-surface-container-lowest border border-hairline-on-dark p-6 sm:p-8 flex flex-col gap-6 pt-8 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-on-dark">
                  <div className="flex flex-col">
                    <h2 className="font-headline-md text-headline-md text-text-on-dark-primary">
                      White-Glove Turnover & Inspection History
                    </h2>
                    <span className="text-text-on-dark-secondary font-body-sm text-body-sm">
                      Real-time cleaning records, linen turnover inspection status, and maintenance dispatch
                    </span>
                  </div>

                  <span className="font-data-tabular text-data-tabular px-3 py-1 rounded-full bg-surface-container-high border border-hairline-on-dark text-state-success self-start sm:self-auto">
                    {cleaningTasks.filter((t) => t.status === "COMPLETED").length} Completed • {cleaningTasks.length} Total
                  </span>
                </div>

                {cleaningTasks.length > 0 ? (
                  <div className="flex flex-col divide-y divide-hairline-on-dark">
                    {cleaningTasks.map((task) => (
                      <div key={task.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-container-high border border-hairline-on-dark flex items-center justify-center font-label-caps-md text-text-on-dark-primary">
                            {task.cleanerName ? task.cleanerName.slice(0, 2).toUpperCase() : "WG"}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h4 className="text-body-md font-medium text-text-on-dark-primary">
                                {task.cleanerName || "Assigned White-Glove Crew"}
                              </h4>
                              <span
                                className={`text-[10px] font-label-caps-sm px-2 py-0.5 rounded-full border uppercase ${
                                  task.status === "COMPLETED"
                                    ? "bg-state-success/15 border-state-success/30 text-state-success"
                                    : task.status === "IN_PROGRESS"
                                    ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                                    : "bg-surface-container border-hairline-on-dark text-text-on-dark-secondary"
                                }`}
                              >
                                {task.status}
                              </span>
                            </div>
                            <span className="font-body-sm text-body-sm text-text-on-dark-secondary">
                              Scheduled: {task.scheduledDate} {task.scheduledStartTime ? `at ${task.scheduledStartTime}` : ""} • Duration: {task.estimatedDurationMinutes || 120} mins
                            </span>
                            {task.notes && (
                              <p className="font-body-sm text-xs text-secondary mt-1 italic">
                                Note: {task.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className="font-label-caps-sm text-xs text-text-on-dark-secondary">
                            Task ID: #{task.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-obsidian-elevated/40 border border-hairline-on-dark/60 text-center flex flex-col items-center justify-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-text-on-dark-secondary" />
                    <p className="font-body-sm text-text-on-dark-secondary">
                      No cleaning history or scheduled turnover tasks currently logged for this sanctuary.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: MEDIA & PHOTOS */}
            {activeTab === "photos" && (
              <div className="rounded-2xl bg-surface-container-lowest border border-hairline-on-dark p-6 sm:p-8 flex flex-col gap-6 pt-8 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline-on-dark">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-headline-md text-headline-md text-text-on-dark-primary flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-state-success" />
                      Sanctuary Photographic Calibration
                    </h3>
                    <p className="font-body-sm text-xs text-text-on-dark-secondary max-w-xl">
                      Registered perspectives are automatically ingested by the Aggarly Vision Neural Pipeline for spatial composition, architectural tagging, and multimodal guest search.
                    </p>
                  </div>

                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-text-on-dark-primary text-obsidian-base hover:bg-canvas-outer transition-all font-label-caps-sm text-xs uppercase tracking-wider shadow-md">
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Add Perspectives</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        disabled={isUploadingPhoto}
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Photos Grid */}
                {(!property.images || property.images.length === 0) ? (
                  <div className="p-12 rounded-xl bg-obsidian-elevated border border-hairline-on-dark text-center flex flex-col items-center justify-center gap-3">
                    <ImageIcon className="w-10 h-10 text-text-on-dark-secondary" />
                    <h4 className="font-headline-md text-base text-text-on-dark-primary">No Perspectives Registered</h4>
                    <p className="font-body-sm text-xs text-text-on-dark-secondary max-w-md">
                      Upload photographs of living quarters, bedrooms, landscape panoramas, and architectural details.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {property.images.map((img) => {
                      const rawKey = img.objectKey || img.imageUrl || (img as any).url;
                      const imgUrl = HostClient.resolveImageUrl(rawKey);
                      const isActing = photoActionId === img.id;

                      return (
                        <div
                          key={img.id}
                          className="group relative rounded-xl bg-obsidian-elevated border border-hairline-on-dark overflow-hidden flex flex-col hover:border-text-on-dark-secondary/60 transition-all shadow-md"
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt="Sanctuary perspective"
                              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-75 group-hover:opacity-100 transition-opacity" />

                            {/* Cover Badge */}
                            {img.isCover ? (
                              <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-state-success/90 backdrop-blur-md text-obsidian-base font-label-caps-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>Primary Cover</span>
                              </div>
                            ) : (
                              <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-obsidian-base/80 backdrop-blur-md text-text-on-dark-secondary font-label-caps-sm text-[10px] uppercase tracking-wider">
                                Perspective
                              </div>
                            )}

                            {/* Actions overlay */}
                            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                              {!img.isCover && (
                                <button
                                  type="button"
                                  disabled={isActing}
                                  onClick={() => handleSetCoverPhoto(img.id)}
                                  className="px-2.5 py-1 rounded-lg bg-obsidian-base/90 hover:bg-obsidian-base text-text-on-dark-primary text-[11px] font-label-caps-sm uppercase tracking-wider border border-hairline-on-dark transition-colors flex items-center gap-1"
                                >
                                  {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-[#dfb15b]" />}
                                  <span>Make Cover</span>
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleDeletePhoto(img.id)}
                                className="ml-auto p-1.5 rounded-lg bg-obsidian-base/90 hover:bg-state-error/20 text-text-on-dark-secondary hover:text-state-error border border-hairline-on-dark transition-colors"
                                title="Remove photograph"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quick Status Footer inside Monolith Card */}
            <div className="mt-12 pt-6 border-t border-hairline-on-dark flex flex-col sm:flex-row items-center justify-between text-xs text-text-on-dark-secondary gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-state-success" />
                <span>All parameters and availability rules synchronize with the Lumen Host Concierge Network.</span>
              </div>
              <div className="font-data-tabular text-data-tabular">
                Sanctuary ID: <span className="text-text-on-dark-primary">{property.id}</span>
              </div>
            </div>

          </div>
        </div>
      </main>



      {/* CREATE PRICING RULE MODAL */}
      {isAddRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-obsidian-base border border-hairline-on-dark rounded-2xl p-6 flex flex-col gap-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-state-success" />
                <h3 className="font-headline-md text-headline-md text-text-on-dark-primary">
                  New Custom Pricing Rule
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRuleModalOpen(false)}
                className="text-text-on-dark-secondary hover:text-text-on-dark-primary"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePricingRule} className="flex flex-col gap-4">
              <div className="flex flex-col">
                <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase mb-1">
                  Rule Classification
                </label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value)}
                  className="bg-surface-container-high border border-hairline-on-dark rounded-lg px-3 py-2 text-text-on-dark-primary font-data-tabular outline-none"
                >
                  <option value="SEASONAL">SEASONAL (Peak Summer/Autumn Surge)</option>
                  <option value="WEEKEND">WEEKEND (High Solitude Demand)</option>
                  <option value="LENGTH_OF_STAY_DISCOUNT">LENGTH OF STAY (Extended Stays)</option>
                  <option value="EARLY_BIRD_DISCOUNT">EARLY BIRD (Advance Reservations)</option>
                  <option value="LAST_MINUTE_DISCOUNT">LAST MINUTE (Fill Near Slots)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase mb-1">
                    Adjustment Type
                  </label>
                  <select
                    value={newRuleAdjustmentType}
                    onChange={(e) => setNewRuleAdjustmentType(e.target.value)}
                    className="bg-surface-container-high border border-hairline-on-dark rounded-lg px-3 py-2 text-text-on-dark-primary font-data-tabular outline-none"
                  >
                    <option value="FIXED_AMOUNT">Fixed Euro (+/- EUR)</option>
                    <option value="MULTIPLIER">Multiplier Ratio (e.g. 1.25)</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newRuleAdjustmentValue}
                    onChange={(e) => setNewRuleAdjustmentValue(Number(e.target.value))}
                    className="bg-surface-container-high border border-hairline-on-dark rounded-lg px-3 py-2 text-text-on-dark-primary font-data-tabular outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newRuleStartDate}
                    onChange={(e) => setNewRuleStartDate(e.target.value)}
                    className="bg-surface-container-high border border-hairline-on-dark rounded-lg px-3 py-2 text-text-on-dark-primary font-data-tabular outline-none"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newRuleEndDate}
                    onChange={(e) => setNewRuleEndDate(e.target.value)}
                    className="bg-surface-container-high border border-hairline-on-dark rounded-lg px-3 py-2 text-text-on-dark-primary font-data-tabular outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase mb-1">
                  Evaluation Priority
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newRulePriority}
                  onChange={(e) => setNewRulePriority(Number(e.target.value))}
                  className="bg-surface-container-high border border-hairline-on-dark rounded-lg px-3 py-2 text-text-on-dark-primary font-data-tabular outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline-on-dark">
                <button
                  type="button"
                  onClick={() => setIsAddRuleModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-hairline-on-dark text-text-on-dark-secondary hover:text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRule}
                  className="px-6 py-2 rounded-full bg-text-on-dark-primary text-obsidian-base font-label-caps-sm text-label-caps-sm uppercase tracking-wider hover:bg-canvas-outer transition-colors flex items-center gap-2"
                >
                  {isSubmittingRule ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Pricing Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SANCTUARY CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-obsidian-base border border-state-error/40 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
              <div className="flex items-center gap-2 text-state-error">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-headline-md text-headline-md text-text-on-dark-primary">
                  Delete Sanctuary Listing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-text-on-dark-secondary hover:text-text-on-dark-primary"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="font-body-sm text-sm text-text-on-dark-secondary">
                Are you sure you wish to permanently delete and archive <strong className="text-text-on-dark-primary">{property.title}</strong>?
              </p>
              <div className="p-3.5 rounded-xl bg-state-error/10 border border-state-error/30 text-xs text-state-error leading-relaxed">
                This action will unpublish the listing from guest search, cancel calendar availability, remove its visual embeddings, and archive the sanctuary record.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline-on-dark">
              <button
                type="button"
                disabled={isDeletingProperty}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-full border border-hairline-on-dark text-text-on-dark-secondary hover:text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProperty}
                onClick={handleDeleteSanctuary}
                className="px-6 py-2 rounded-full bg-state-error text-white font-label-caps-sm text-label-caps-sm uppercase tracking-wider hover:bg-state-error/90 transition-colors flex items-center gap-2"
              >
                {isDeletingProperty ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Golden Animated AI Cursor Beacon */}
      {/* Golden Animated AI Cursor Beacon (Redux Driven) */}
      <AiCursorBeacon />

      {/* Collapsible Right Slide-out Drawer for Lumen Co-pilot */}
      <LumenPropertyCoPilotDrawer
        propertyId={propertyId}
        propertyTitle={property.title}
        analysisResults={visionAnalysisResults}
        isAnalyzing={isAnalyzingVision}
        currentAnalyzingName={currentAnalyzingName}
      />

      <LonaFooter />
    </div>
  );
};
