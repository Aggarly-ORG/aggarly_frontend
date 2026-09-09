"use client";

import React, { useState, useEffect, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  HostClient,
  AmenityItem,
  HostPropertyItem,
} from "../../lib/hostClient";
import { LonaHeader } from "../common/LonaHeader";
import { AiCursorBeacon } from "./copilot/AiCursorBeacon";
import { LumenPropertyCoPilotDrawer } from "./copilot/LumenPropertyCoPilotDrawer";
import { useAppDispatch } from "@/store/hooks";
import { enqueueUiCommands } from "@/store/slices/chatSlice";
import { setPropertyCoPilotOpen } from "@/store/slices/uiSlice";
import {
  PropertyConversationClient,
  FastVisionAnalysisResult,
} from "@/lib/propertyConversationClient";
import {
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  Home,
  Building2,
  TreePine,
  Hotel,
  Layers,
  ShieldCheck,
  Sparkles,
  Plus,
  Minus,
  MapPin,
  Bed,
  Bath,
  Users,
  RotateCw,
  Check,
  AlertCircle,
  MoveLeft,
  MoveRight,
  Eye,
} from "lucide-react";

type PropertyTypeEnum =
  | "VILLA"
  | "APARTMENT"
  | "HOUSE"
  | "CABIN"
  | "LOFT"
  | "BOUTIQUE_HOTEL";

type CancellationPolicyEnum = "FLEXIBLE" | "MODERATE" | "STRICT";

interface StagedImage {
  key: string;
  url: string;
  isCover: boolean;
  name: string;
  sizeBytes?: number;
}

const PROPERTY_TYPES: {
  type: PropertyTypeEnum;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    type: "VILLA",
    label: "Architectural Villa",
    description: "Private monolithic estate with dedicated exterior grounds and solitude.",
    icon: Home,
  },
  {
    type: "APARTMENT",
    label: "Modern Residence",
    description: "Curated urban retreat or coastal sanctuary with panoramic elevation.",
    icon: Building2,
  },
  {
    type: "HOUSE",
    label: "Contemporary House",
    description: "Standalone architectural dwelling harmonized with natural surroundings.",
    icon: Layers,
  },
  {
    type: "CABIN",
    label: "Alpine / Forest Pavilion",
    description: "Secluded sanctuary embedded within woodland or mountain topography.",
    icon: TreePine,
  },
  {
    type: "LOFT",
    label: "Industrial Atelier",
    description: "Expansive high-ceiling space with raw materials and curated lighting.",
    icon: Building2,
  },
  {
    type: "BOUTIQUE_HOTEL",
    label: "Curated Suites",
    description: "Accredited hospitality enclave with dedicated concierge services.",
    icon: Hotel,
  },
];

const CANCELLATION_POLICIES: {
  policy: CancellationPolicyEnum;
  title: string;
  summary: string;
  badge: string;
}[] = [
  {
    policy: "FLEXIBLE",
    title: "Flexible Sanctuary Policy",
    summary: "Full refund permitted up to 24 hours prior to scheduled residency arrival. High liquidity for accredited guests.",
    badge: "24h Window",
  },
  {
    policy: "MODERATE",
    title: "Moderate Solitude Policy (Recommended)",
    summary: "Full refund up to 5 days prior to arrival. 50% refund thereafter up to 24h before check-in.",
    badge: "5-Day Window",
  },
  {
    policy: "STRICT",
    title: "Strict Curatorial Policy",
    summary: "Full refund within 48 hours of booking if arrival is 14+ days away. 50% refund up to 7 days prior; non-refundable thereafter.",
    badge: "7-Day Window",
  },
];

export const AddSanctuaryWizard: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const fileInputId = useId();

  // Wizard Stage (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Real Amenities from Backend
  const [availableAmenities, setAvailableAmenities] = useState<AmenityItem[]>([]);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState<boolean>(true);
  const [amenitySearchQuery, setAmenitySearchQuery] = useState<string>("");

  // Form State: Step 1 (Identity & Location)
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [propertyType, setPropertyType] = useState<PropertyTypeEnum>("VILLA");
  const [street, setStreet] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [stateRegion, setStateRegion] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [country, setCountry] = useState<string>("Spain");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");

  // Form State: Step 2 (Capacity & Amenities)
  const [maxGuests, setMaxGuests] = useState<number>(4);
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);

  // Form State: Step 3 (Media & Assets)
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [spatialTourUrl, setSpatialTourUrl] = useState<string>("");
  const [bortleSkyClass, setBortleSkyClass] = useState<string>("2");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Form State: Step 4 (Tariffs & Policies)
  const [basePricePerNight, setBasePricePerNight] = useState<number | string>(420);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicyEnum>("MODERATE");

  // Form State: Step 5 & Submission
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [createdProperty, setCreatedProperty] = useState<HostPropertyItem | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Lumen Vision Perception & UI Commands Agent
  const dispatch = useAppDispatch();
  const draftPropertyIdRef = React.useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "draft-" + Date.now()
  );
  const [isAnalyzingVision, setIsAnalyzingVision] = useState<boolean>(false);
  const [currentAnalyzingName, setCurrentAnalyzingName] = useState<string | undefined>(undefined);
  const [visionAnalysisResults, setVisionAnalysisResults] = useState<FastVisionAnalysisResult[]>([]);

  // Fetch real amenities from HostClient
  useEffect(() => {
    let isMounted = true;
    async function loadAmenities() {
      setIsLoadingAmenities(true);
      try {
        const amenities = await HostClient.getAllAmenities();
        if (isMounted) {
          setAvailableAmenities(amenities);
        }
      } catch (err) {
        console.error("Failed to load real amenities:", err);
      } finally {
        if (isMounted) {
          setIsLoadingAmenities(false);
        }
      }
    }
    loadAmenities();
    return () => {
      isMounted = false;
    };
  }, []);

  // Validation Logic per step
  const validateStep = (stepNumber: number): boolean => {
    const errors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!title.trim()) {
        errors.title = "Sanctuary title is required.";
      } else if (title.trim().length < 5) {
        errors.title = "Title must be at least 5 characters.";
      } else if (title.trim().length > 255) {
        errors.title = "Title cannot exceed 255 characters.";
      }

      if (!description.trim()) {
        errors.description = "Curatorial description is required.";
      } else if (description.trim().length < 20) {
        errors.description = `Description must be at least 20 characters (currently ${description.trim().length}).`;
      }

      if (!street.trim()) {
        errors.street = "Street address is required.";
      }
      if (!city.trim()) {
        errors.city = "City or municipality is required.";
      }
      if (!country.trim()) {
        errors.country = "Country is required.";
      }

      if (latitude && isNaN(Number(latitude))) {
        errors.latitude = "Latitude must be a valid decimal number.";
      }
      if (longitude && isNaN(Number(longitude))) {
        errors.longitude = "Longitude must be a valid decimal number.";
      }
    }

    if (stepNumber === 2) {
      if (maxGuests < 1) {
        errors.maxGuests = "Capacity must accommodate at least 1 resident.";
      }
      if (bedrooms < 0) {
        errors.bedrooms = "Bedrooms count cannot be negative.";
      }
      if (bathrooms < 0) {
        errors.bathrooms = "Bathrooms count cannot be negative.";
      }
    }

    if (stepNumber === 3) {
      if (stagedImages.length === 0) {
        errors.images = "Please stage at least one high-resolution photograph.";
      }
    }

    if (stepNumber === 4) {
      const priceNum = Number(basePricePerNight);
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.basePricePerNight = "Base tariff must be greater than €0 per night.";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Next Step Action
  const handleSaveAndContinue = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Previous Step Action
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Direct Step Jump (only if already visited or step 1)
  const handleStepJump = (targetStep: number) => {
    if (targetStep < currentStep || completedSteps.has(targetStep - 1)) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Toggle Amenity Selection
  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenityIds((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  // File Upload Handling with real HostClient.uploadFile
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploadingFiles(true);
    setUploadStatus(`Ingesting ${files.length} photography asset${files.length > 1 ? "s" : ""} to storage vault...`);
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next.images;
      return next;
    });

    const newlyStaged: StagedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus(`Uploading (${i + 1}/${files.length}): ${file.name}...`);
      try {
        const uploadRes = await HostClient.uploadFile(file);
        if (uploadRes.success && uploadRes.key) {
          const resolvedUrl = HostClient.resolveImageUrl(uploadRes.key);
          newlyStaged.push({
            key: uploadRes.key,
            url: resolvedUrl,
            isCover: stagedImages.length === 0 && newlyStaged.length === 0,
            name: file.name,
            sizeBytes: file.size,
          });
        } else {
          console.error("Upload failed for file:", file.name, uploadRes.error);
        }
      } catch (err) {
        console.error("Exception uploading file:", file.name, err);
      }
    }

    if (newlyStaged.length > 0) {
      setStagedImages((prev) => {
        const combined = [...prev, ...newlyStaged];
        // Ensure exactly one cover image exists
        const hasCover = combined.some((img) => img.isCover);
        if (!hasCover && combined.length > 0) {
          combined[0].isCover = true;
        }
        return combined;
      });

      // Auto-open Lumen Co-pilot to display real-time vision perception
      dispatch(setPropertyCoPilotOpen(true));

      // Sequentially perceive each newly uploaded photo photo-by-photo
      (async () => {
        for (let idx = 0; idx < newlyStaged.length; idx++) {
          const item = newlyStaged[idx];
          setIsAnalyzingVision(true);
          setCurrentAnalyzingName(item.name);

          try {
            const conv = await PropertyConversationClient.getOrCreatePropertyConversation({
              draftId: draftPropertyIdRef.current,
              title: title || "New Sanctuary Draft",
            });
            const convId = conv.id;

            const analysis = await PropertyConversationClient.fastAnalyzeImage({
              conversationId: convId,
              imageKey: item.key,
              imageUrl: item.url,
              draftId: draftPropertyIdRef.current,
              fileName: item.name,
              displayOrder: stagedImages.length + idx,
            });

            setVisionAnalysisResults((prev) => [...prev, analysis]);

            // Enqueue UI Agent commands into Redux queue
            if (analysis.uiCommands && analysis.uiCommands.length > 0) {
              dispatch(enqueueUiCommands(analysis.uiCommands));
            }
          } catch (visionErr) {
            console.warn("Lumen fast vision error for", item.name, visionErr);
          } finally {
            setIsAnalyzingVision(false);
            setCurrentAnalyzingName(undefined);
          }
        }
      })();
    }

    setIsUploadingFiles(false);
    setUploadStatus("");
  };

  // Set Cover Image
  const setCoverImage = (index: number) => {
    setStagedImages((prev) => {
      return prev.map((img, idx) => ({
        ...img,
        isCover: idx === index,
      }));
    });
  };

  // Move Image Order
  const moveImage = (index: number, direction: "left" | "right") => {
    setStagedImages((prev) => {
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Remove Image
  const removeImage = (index: number) => {
    setStagedImages((prev) => {
      const removed = prev[index];
      const remaining = prev.filter((_, idx) => idx !== index);
      if (removed.isCover && remaining.length > 0) {
        remaining[0].isCover = true;
      }
      return remaining;
    });
  };

  // Publish Sanctuary Action
  const handlePublishSanctuary = async () => {
    // Comprehensive validation across all steps
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep(3)) {
      setCurrentStep(3);
      return;
    }
    if (!validateStep(4)) {
      setCurrentStep(4);
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      // Re-order imageKeys so cover photo is always the first key
      const orderedKeys = [...stagedImages]
        .sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0))
        .map((img) => img.key);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        propertyType,
        maxGuests: Number(maxGuests),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        basePricePerNight: Number(basePricePerNight),
        cancellationPolicy,
        latitude: latitude.trim() ? Number(latitude) : undefined,
        longitude: longitude.trim() ? Number(longitude) : undefined,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: stateRegion.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          zipCode: postalCode.trim() || undefined,
          country: country.trim(),
        },
        amenityIds: selectedAmenityIds.length > 0 ? selectedAmenityIds : undefined,
        imageKeys: orderedKeys,
      };

      const res = await HostClient.createProperty(payload);

      if (res.success && res.property) {
        setCreatedProperty(res.property);
        setCompletedSteps(new Set([1, 2, 3, 4, 5]));
      } else {
        setPublishError(res.error || "Failed to publish architectural sanctuary to vault.");
      }
    } catch (err: any) {
      setPublishError(err?.message || "An unexpected error occurred during sanctuary ingestion.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Filtered amenities for search query
  const filteredAmenities = availableAmenities.filter((amenity) => {
    if (!amenitySearchQuery.trim()) return true;
    return amenity.name.toLowerCase().includes(amenitySearchQuery.toLowerCase());
  });

  // Format currency helper
  const formatCurrency = (amount: number | string) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-canvas-outer text-[#151415] flex flex-col selection:bg-obsidian-base selection:text-text-on-dark-primary">
      {/* Top Header */}
      <LonaHeader />

      {/* Main Sanctuary Ingestion Studio */}
      <main className="w-full flex-grow pt-4 sm:pt-6 pb-24 px-3 sm:px-6 lg:px-10 xl:px-12">
        <div className="w-full max-w-[1560px] mx-auto flex flex-col">
          {/* Monolithic Dark Card Canvas */}
          <div className="w-full bg-obsidian-base rounded-[28px] p-6 sm:p-8 lg:p-12 border border-hairline-on-dark text-text-on-dark-primary relative overflow-hidden shadow-[0_24px_48px_-12px_rgba(10,10,12,0.12),0_4px_16px_rgba(10,10,12,0.04)]">
            {/* Atmospheric Lunar Glows */}
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#dae4ed] opacity-[0.06] blur-[64px] pointer-events-none" />
            <div className="absolute top-1/2 -left-48 w-80 h-80 rounded-full bg-[#dae4ed] opacity-[0.03] blur-[80px] pointer-events-none" />

            {/* Top Wizard Breadcrumb & Identity Header */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-hairline-on-dark/60">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-obsidian-elevated text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-[0.14em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-state-success" />
                    Host Sanctuary Ingestion
                  </span>
                  <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                    Ref. SANCT-CURATE-{new Date().getFullYear()}
                  </span>
                  <Link
                    href="/host"
                    className="inline-flex items-center gap-1 text-xs text-text-on-dark-secondary hover:text-white transition-colors ml-auto sm:ml-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Portfolio
                  </Link>
                </div>

                <h1 className="font-headline-xl text-2xl sm:text-3xl lg:text-4xl text-text-on-dark-primary tracking-wider uppercase font-serif">
                  Curate a New Architectural Sanctuary
                </h1>

                <p className="font-subline-editorial text-sm sm:text-base text-text-on-dark-secondary italic mt-1 font-serif">
                  Aggarly by Lona • Host Accreditation &amp; Listing Creation
                </p>
              </div>

              {/* Quick Action: Vault Telemetry */}
              <div className="hidden lg:flex items-center gap-3 text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm">
                <span className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
                <span>REAL-TIME CURATOR TELEMETRY</span>
              </div>
            </div>

            {/* Step Progress Tracker (5-Stage Horizontal Monolith) */}
            <div className="relative z-10 w-full my-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { id: 1, num: "01", label: "Identity & Location" },
                  { id: 2, num: "02", label: "Capacity & Suites" },
                  { id: 3, num: "03", label: "Media & Photography" },
                  { id: 4, num: "04", label: "Tariffs & Policies" },
                  { id: 5, num: "05", label: "Review & Publish" },
                ].map((st) => {
                  const isActive = currentStep === st.id;
                  const isCompleted = completedSteps.has(st.id);
                  const isAccessible = st.id < currentStep || completedSteps.has(st.id - 1);

                  return (
                    <button
                      key={st.id}
                      id={`step-tab-${st.id}`}
                      data-wizard-step={st.id}
                      data-step-name={st.label}
                      data-lumen-action={`step-${st.id}`}
                      role="tab"
                      data-active={isActive ? "true" : "false"}
                      aria-selected={isActive}
                      type="button"
                      disabled={!isAccessible}
                      onClick={() => handleStepJump(st.id)}
                      className={`flex flex-col gap-2 p-3.5 rounded-xl text-left transition-all border ${
                        isActive
                          ? "bg-obsidian-bubble border-white/40 shadow-[0_0_24px_rgba(220,230,239,0.09)]"
                          : isCompleted
                          ? "bg-obsidian-elevated border-hairline-on-dark hover:border-state-success/60 cursor-pointer"
                          : "bg-obsidian-elevated/50 border-hairline-on-dark/40 opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-data-tabular text-data-tabular ${
                            isActive
                              ? "text-white font-bold"
                              : isCompleted
                              ? "text-state-success font-medium"
                              : "text-text-on-dark-secondary"
                          }`}
                        >
                          {st.num}
                        </span>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-state-success" />
                        ) : isActive ? (
                          <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-text-on-dark-secondary" />
                        )}
                      </div>
                      <span
                        className={`font-label-caps-sm text-xs truncate uppercase tracking-wider ${
                          isActive
                            ? "text-white font-semibold"
                            : isCompleted
                            ? "text-text-on-dark-primary"
                            : "text-text-on-dark-secondary"
                        }`}
                      >
                        {st.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Success Modal Overlay (If Published) */}
            {createdProperty && (
              <div className="relative z-20 my-8 p-8 sm:p-10 rounded-2xl bg-obsidian-elevated border border-state-success text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-state-success/20 text-state-success flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-9 h-9 text-state-success" />
                </div>
                <span className="font-label-caps-sm text-label-caps-sm text-state-success uppercase tracking-widest">
                  Accreditation Confirmed
                </span>
                <h2 className="font-headline-xl text-2xl sm:text-3xl text-text-on-dark-primary font-serif uppercase tracking-wider mt-2 mb-3">
                  Sanctuary Ingestion Successful
                </h2>
                <p className="font-body-md text-text-on-dark-secondary max-w-xl mx-auto mb-6">
                  &ldquo;{createdProperty.title}&rdquo; has been calibrated and committed to the Aggarly sanctuary catalog. You can now configure dynamic pricing rules, manage cleaning turnover schedules, or observe guest arrivals.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href={`/host/manage/${createdProperty.id}`}
                    className="h-11 px-8 rounded-full bg-white text-obsidian-base font-semibold hover:bg-canvas-outer transition-colors inline-flex items-center gap-2 shadow-lg"
                  >
                    <span>Manage Sanctuary Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/host"
                    className="h-11 px-6 rounded-full bg-obsidian-bubble text-white hover:bg-obsidian-elevated transition-colors border border-hairline-on-dark inline-flex items-center gap-2"
                  >
                    <span>Return to Portfolio</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {publishError && (
              <div className="relative z-10 mb-6 p-4 rounded-xl bg-red-950/40 border border-state-error text-state-error flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <span className="font-semibold block">Publication Issue:</span>
                  <span>{publishError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPublishError(null)}
                  className="text-xs uppercase hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Stage Body Container */}
            {!createdProperty && (
              <div className="relative z-10 flex flex-col gap-8">
                {/* ------------------------------------------------------------- */}
                {/* STAGE 1: Identity & Location */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 1 && (
                  <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    {/* Step Title Monograph */}
                    <div className="p-5 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-white">
                          <Home className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-headline-md text-xl sm:text-2xl text-text-on-dark-primary font-serif uppercase tracking-wide">
                            Identity &amp; Topographic Location
                          </h2>
                          <p className="font-body-md text-sm sm:text-base text-text-on-dark-secondary mt-1 max-w-3xl">
                            Establish the sanctuary&apos;s architectural identity and exact coordinates. All properties undergo rigorous editorial accreditation.
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-full bg-surface-container-lowest text-xs font-data-tabular text-text-on-dark-secondary self-start md:self-auto">
                        Stage 01 of 05
                      </span>
                    </div>

                    {/* Form Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left: Sanctuary Details (7 cols) */}
                      <div className="lg:col-span-7 flex flex-col gap-6">
                        {/* Title */}
                        <div className="flex flex-col gap-2">
                          <label className="font-label-caps-sm text-xs text-text-on-dark-secondary uppercase tracking-wider flex items-center justify-between">
                            <span>Sanctuary Listing Title *</span>
                            <span className="font-data-tabular text-[11px] text-text-on-dark-secondary">
                              {title.length} / 255 chars
                            </span>
                          </label>
                          <input
                            id="title"
                            name="title"
                            data-lumen-field="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Villa Cala Salada — Architectural Brutalist Solitude"
                            className={`w-full h-12 px-4 rounded-xl bg-surface-container-lowest border text-white placeholder:text-text-on-dark-secondary/50 focus:outline-none transition-colors ${
                              validationErrors.title
                                ? "border-state-error focus:border-state-error"
                                : "border-hairline-on-dark focus:border-white"
                            }`}
                          />
                          {validationErrors.title && (
                            <span className="text-xs text-state-error mt-0.5">{validationErrors.title}</span>
                          )}
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-2">
                          <label className="font-label-caps-sm text-xs text-text-on-dark-secondary uppercase tracking-wider flex items-center justify-between">
                            <span>Curatorial Monograph &amp; Architectural Description *</span>
                            <span
                              className={`font-data-tabular text-[11px] ${
                                description.trim().length >= 20 ? "text-state-success" : "text-text-on-dark-secondary"
                              }`}
                            >
                              {description.trim().length} / min 20 chars
                            </span>
                          </label>
                          <textarea
                            id="description"
                            name="description"
                            data-lumen-field="description"
                            rows={5}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detail the brutalist geometry, natural lighting orientations, acoustic sound floor, materiality (travertine, raw oak, obsidian basalt), and surrounding topography..."
                            className={`w-full p-4 rounded-xl bg-surface-container-lowest border text-white placeholder:text-text-on-dark-secondary/50 focus:outline-none transition-colors resize-y ${
                              validationErrors.description
                                ? "border-state-error focus:border-state-error"
                                : "border-hairline-on-dark focus:border-white"
                            }`}
                          />
                          {validationErrors.description && (
                            <span className="text-xs text-state-error mt-0.5">{validationErrors.description}</span>
                          )}
                        </div>

                        {/* Property Type Selector */}
                        <div className="flex flex-col gap-3">
                          <label className="font-label-caps-sm text-xs text-text-on-dark-secondary uppercase tracking-wider">
                            Architectural Typology *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {PROPERTY_TYPES.map((pt) => {
                              const isSelected = propertyType === pt.type;
                              const Icon = pt.icon;
                              return (
                                <button
                                  key={pt.type}
                                  type="button"
                                  onClick={() => setPropertyType(pt.type)}
                                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                                    isSelected
                                      ? "bg-obsidian-bubble border-white text-white shadow-md"
                                      : "bg-obsidian-elevated border-hairline-on-dark text-text-on-dark-secondary hover:border-white/30"
                                  }`}
                                >
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "bg-white text-obsidian-base"
                                        : "bg-surface-container-high text-white"
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-semibold text-white uppercase tracking-wide">
                                      {pt.label}
                                    </span>
                                    <span className="text-xs text-text-on-dark-secondary line-clamp-2 mt-0.5">
                                      {pt.description}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Address & Coordinates (5 cols) */}
                      <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col gap-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-hairline-on-dark/60">
                            <MapPin className="w-4 h-4 text-state-success" />
                            <h3 className="font-label-caps-md text-xs uppercase tracking-wider text-white">
                              Physical Geography &amp; Address
                            </h3>
                          </div>

                          {/* Street */}
                          <div className="flex flex-col gap-1.5">
                            <label className="font-label-caps-sm text-[11px] text-text-on-dark-secondary uppercase">
                              Street &amp; Way Number *
                            </label>
                            <input
                              id="street"
                              name="street"
                              data-lumen-field="street"
                              type="text"
                              value={street}
                              onChange={(e) => setStreet(e.target.value)}
                              placeholder="e.g. Camí de Cala Salada, 14"
                              className={`w-full h-11 px-3.5 rounded-lg bg-surface-container-lowest border text-sm text-white placeholder:text-text-on-dark-secondary/40 focus:outline-none ${
                                validationErrors.street ? "border-state-error" : "border-hairline-on-dark focus:border-white"
                              }`}
                            />
                            {validationErrors.street && (
                              <span className="text-[11px] text-state-error">{validationErrors.street}</span>
                            )}
                          </div>

                          {/* City & State Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="font-label-caps-sm text-[11px] text-text-on-dark-secondary uppercase">
                                City / Municipality *
                              </label>
                              <input
                                id="city"
                                name="city"
                                data-lumen-field="city"
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Sant Antoni"
                                className={`w-full h-11 px-3.5 rounded-lg bg-surface-container-lowest border text-sm text-white placeholder:text-text-on-dark-secondary/40 focus:outline-none ${
                                  validationErrors.city ? "border-state-error" : "border-hairline-on-dark focus:border-white"
                                }`}
                              />
                              {validationErrors.city && (
                                <span className="text-[11px] text-state-error">{validationErrors.city}</span>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-label-caps-sm text-[11px] text-text-on-dark-secondary uppercase">
                                State / Province
                              </label>
                              <input
                                id="stateRegion"
                                name="stateRegion"
                                data-lumen-field="stateRegion"
                                type="text"
                                value={stateRegion}
                                onChange={(e) => setStateRegion(e.target.value)}
                                placeholder="Balearic Islands"
                                className="w-full h-11 px-3.5 rounded-lg bg-surface-container-lowest border border-hairline-on-dark text-sm text-white placeholder:text-text-on-dark-secondary/40 focus:outline-none focus:border-white"
                              />
                            </div>
                          </div>

                          {/* Postal Code & Country */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="font-label-caps-sm text-[11px] text-text-on-dark-secondary uppercase">
                                Postal Code
                              </label>
                              <input
                                id="postalCode"
                                name="postalCode"
                                data-lumen-field="postalCode"
                                type="text"
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                placeholder="07820"
                                className="w-full h-11 px-3.5 rounded-lg bg-surface-container-lowest border border-hairline-on-dark text-sm text-white placeholder:text-text-on-dark-secondary/40 focus:outline-none focus:border-white"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="font-label-caps-sm text-[11px] text-text-on-dark-secondary uppercase">
                                Country *
                              </label>
                              <input
                                id="country"
                                name="country"
                                data-lumen-field="country"
                                type="text"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="Spain"
                                className={`w-full h-11 px-3.5 rounded-lg bg-surface-container-lowest border text-sm text-white placeholder:text-text-on-dark-secondary/40 focus:outline-none ${
                                  validationErrors.country ? "border-state-error" : "border-hairline-on-dark focus:border-white"
                                }`}
                              />
                              {validationErrors.country && (
                                <span className="text-[11px] text-state-error">{validationErrors.country}</span>
                              )}
                            </div>
                          </div>

                          {/* Solar / Celestial Coordinates */}
                          <div className="pt-3 border-t border-hairline-on-dark/50 flex flex-col gap-2">
                            <span className="font-label-caps-sm text-[11px] text-text-on-dark-secondary uppercase flex items-center justify-between">
                              <span>Celestial Coordinates (Optional)</span>
                              <span className="text-[10px] text-state-success">Solar/Lunar Calibration</span>
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                placeholder="Latitude (e.g. 39.0094)"
                                className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest border border-hairline-on-dark text-xs text-white font-data-tabular placeholder:text-text-on-dark-secondary/40 focus:outline-none focus:border-white"
                              />
                              <input
                                type="text"
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                                placeholder="Longitude (e.g. 1.2986)"
                                className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest border border-hairline-on-dark text-xs text-white font-data-tabular placeholder:text-text-on-dark-secondary/40 focus:outline-none focus:border-white"
                              />
                            </div>
                            {(validationErrors.latitude || validationErrors.longitude) && (
                              <span className="text-[11px] text-state-error">
                                {validationErrors.latitude || validationErrors.longitude}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* STAGE 2: Capacity & Amenities */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 2 && (
                  <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    {/* Step Title Monograph */}
                    <div className="p-5 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-white">
                          <Bed className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-headline-md text-xl sm:text-2xl text-text-on-dark-primary font-serif uppercase tracking-wide">
                            Capacity, Suites &amp; In-House Amenities
                          </h2>
                          <p className="font-body-md text-sm sm:text-base text-text-on-dark-secondary mt-1 max-w-3xl">
                            Configure guest accommodations and select verified amenities loaded directly from the Aggarly catalog.
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-full bg-surface-container-lowest text-xs font-data-tabular text-text-on-dark-secondary self-start md:self-auto">
                        Stage 02 of 05
                      </span>
                    </div>

                    {/* Stepper Counters for Capacity */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {/* Max Guests */}
                      <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                          <span className="font-label-caps-md text-xs uppercase tracking-wider text-white">
                            Max Guest Capacity
                          </span>
                          <Users className="w-4 h-4 text-text-on-dark-secondary" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-headline-xl text-3xl font-data-tabular text-white">
                            {maxGuests}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setMaxGuests((prev) => Math.max(1, prev - 1))}
                              className="w-10 h-10 rounded-full bg-surface-container-lowest border border-hairline-on-dark hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMaxGuests((prev) => prev + 1)}
                              className="w-10 h-10 rounded-full bg-surface-container-lowest border border-hairline-on-dark hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <span className="text-xs text-text-on-dark-secondary">
                          Residency limit strictly adhered to for privacy.
                        </span>
                      </div>

                      {/* Bedrooms */}
                      <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                          <span className="font-label-caps-md text-xs uppercase tracking-wider text-white">
                            Bedrooms &amp; Suites
                          </span>
                          <Bed className="w-4 h-4 text-text-on-dark-secondary" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-headline-xl text-3xl font-data-tabular text-white">
                            {bedrooms}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setBedrooms((prev) => Math.max(0, prev - 1))}
                              className="w-10 h-10 rounded-full bg-surface-container-lowest border border-hairline-on-dark hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setBedrooms((prev) => prev + 1)}
                              className="w-10 h-10 rounded-full bg-surface-container-lowest border border-hairline-on-dark hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <span className="text-xs text-text-on-dark-secondary">
                          Dedicated private sleeping chambers.
                        </span>
                      </div>

                      {/* Bathrooms */}
                      <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                          <span className="font-label-caps-md text-xs uppercase tracking-wider text-white">
                            Bathrooms / En-Suites
                          </span>
                          <Bath className="w-4 h-4 text-text-on-dark-secondary" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-headline-xl text-3xl font-data-tabular text-white">
                            {bathrooms}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setBathrooms((prev) => Math.max(0, prev - 1))}
                              className="w-10 h-10 rounded-full bg-surface-container-lowest border border-hairline-on-dark hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setBathrooms((prev) => prev + 1)}
                              className="w-10 h-10 rounded-full bg-surface-container-lowest border border-hairline-on-dark hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <span className="text-xs text-text-on-dark-secondary">
                          Full and secondary powder facilities.
                        </span>
                      </div>
                    </div>

                    {/* Amenities Directory Section */}
                    <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-headline-md text-lg text-white font-serif uppercase tracking-wide">
                            Verified Sanctuary Amenities
                          </h3>
                          <p className="font-body-sm text-xs text-text-on-dark-secondary mt-0.5">
                            {selectedAmenityIds.length} of {availableAmenities.length} amenities selected from backend catalog
                          </p>
                        </div>
                        {/* Search amenity */}
                        <input
                          type="text"
                          value={amenitySearchQuery}
                          onChange={(e) => setAmenitySearchQuery(e.target.value)}
                          placeholder="Filter amenities..."
                          className="h-9 px-3 rounded-full bg-surface-container-lowest border border-hairline-on-dark text-xs text-white placeholder:text-text-on-dark-secondary/50 focus:outline-none focus:border-white max-w-xs"
                        />
                      </div>

                      {isLoadingAmenities ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-on-dark-secondary">
                          <RotateCw className="w-6 h-6 animate-spin text-state-success" />
                          <span className="text-xs font-data-tabular">Loading amenities directory...</span>
                        </div>
                      ) : filteredAmenities.length === 0 ? (
                        <div className="py-8 text-center text-text-on-dark-secondary text-sm">
                          {availableAmenities.length === 0
                            ? "No amenities found in catalog."
                            : "No amenities matching filter."}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto pr-1">
                          {filteredAmenities.map((amenity) => {
                            const isChecked = selectedAmenityIds.includes(amenity.id);
                            return (
                              <button
                                key={amenity.id}
                                id={`amenity-${amenity.id}`}
                                data-amenity-id={amenity.id}
                                data-lumen-amenity-id={amenity.id}
                                data-amenity-name={amenity.name}
                                role="checkbox"
                                aria-checked={isChecked ? "true" : "false"}
                                data-checked={isChecked ? "true" : "false"}
                                type="button"
                                onClick={() => toggleAmenity(amenity.id)}
                                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                  isChecked
                                    ? "bg-obsidian-bubble border-white/80 text-white shadow-sm"
                                    : "bg-surface-container-lowest border-hairline-on-dark text-text-on-dark-secondary hover:border-white/40"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <span className="w-2 h-2 rounded-full shrink-0 bg-state-success" />
                                  <span className="text-xs font-medium truncate uppercase tracking-wider">
                                    {amenity.name}
                                  </span>
                                </div>
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                    isChecked
                                      ? "bg-state-success border-state-success text-obsidian-base"
                                      : "border-hairline-on-dark bg-transparent"
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* STAGE 3: Media & High-Resolution Photography */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 3 && (
                  <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    {/* Section Instruction Monograph */}
                    <div className="p-5 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-white">
                          <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-headline-md text-xl sm:text-2xl text-text-on-dark-primary font-serif uppercase tracking-wide">
                            High-Resolution Photography &amp; Spatial Assets
                          </h2>
                          <p className="font-body-md text-sm sm:text-base text-text-on-dark-secondary mt-1 max-w-3xl">
                            Upload editorial photography capturing brutalist architecture and nocturnal atmosphere. Files are stored directly in the active cloud vault. Minimum 1 perspective required.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start md:self-auto bg-surface-container-lowest px-4 py-2 rounded-full">
                        <span className="font-label-caps-sm text-xs text-text-on-dark-secondary uppercase">
                          Staged Plates:
                        </span>
                        <span className="font-data-tabular text-xs text-state-success font-semibold">
                          {stagedImages.length}
                        </span>
                      </div>
                    </div>

                    {/* Staged Photography Grid */}
                    {stagedImages.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Large Primary Hero Slot (7 Cols) */}
                        {(() => {
                          const heroIndex = stagedImages.findIndex((img) => img.isCover);
                          const heroImg = heroIndex >= 0 ? stagedImages[heroIndex] : stagedImages[0];
                          const activeIndex = heroIndex >= 0 ? heroIndex : 0;

                          return (
                            <div className="lg:col-span-7 flex flex-col gap-3 group relative">
                              <div className="relative w-full h-[320px] sm:h-[400px] rounded-2xl overflow-hidden bg-surface-container-lowest border border-hairline-on-dark">
                                <img
                                  src={heroImg.url}
                                  alt={heroImg.name}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base via-transparent to-transparent opacity-80" />

                                {/* Badges */}
                                <div className="absolute top-4 left-4 flex items-center gap-2">
                                  <span className="px-3 py-1.5 rounded-full bg-obsidian-base/90 text-white font-label-caps-sm text-xs uppercase tracking-[0.14em] shadow-lg border border-white/20">
                                    Primary Hero Cover
                                  </span>
                                  <span className="px-2.5 py-1.5 rounded-full bg-obsidian-base/80 text-state-success font-label-caps-sm text-xs flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Vault Active
                                  </span>
                                </div>

                                {/* Title & Actions */}
                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4">
                                  <div className="truncate">
                                    <span className="font-headline-md text-base sm:text-lg text-white block truncate">
                                      {heroImg.name}
                                    </span>
                                    <span className="font-data-tabular text-xs text-text-on-dark-secondary">
                                      Storage Key: {heroImg.key.substring(0, 24)}...
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeImage(activeIndex)}
                                    className="p-2 rounded-full bg-red-950/80 text-red-300 hover:bg-red-900 transition-colors cursor-pointer"
                                    title="Remove Hero Image"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <span className="text-[11px] text-text-on-dark-secondary uppercase tracking-wider px-1">
                                Primary display plate presented on catalog search cards &amp; residency hero.
                              </span>
                            </div>
                          );
                        })()}

                        {/* Supporting Gallery Perspectives (5 Cols Grid) */}
                        <div className="lg:col-span-5 grid grid-cols-2 gap-4 max-h-[430px] overflow-y-auto pr-1">
                          {stagedImages.map((img, idx) => {
                            return (
                              <div
                                key={img.key + idx}
                                className={`relative h-[190px] rounded-xl overflow-hidden bg-surface-container-lowest border group ${
                                  img.isCover ? "border-state-success ring-1 ring-state-success" : "border-hairline-on-dark"
                                }`}
                              >
                                <img
                                  src={img.url}
                                  alt={img.name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base/90 via-transparent to-transparent opacity-80" />

                                {/* Order & Cover indicator */}
                                <div className="absolute top-2 left-2 flex items-center gap-1">
                                  <span className="px-2 py-0.5 rounded bg-obsidian-base/80 text-[10px] font-data-tabular text-white">
                                    0{idx + 1}
                                  </span>
                                  {img.isCover && (
                                    <span className="px-1.5 py-0.5 rounded bg-state-success text-[10px] text-obsidian-base font-semibold">
                                      Cover
                                    </span>
                                  )}
                                </div>

                                {/* Floating control buttons */}
                                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1">
                                  {!img.isCover && (
                                    <button
                                      type="button"
                                      onClick={() => setCoverImage(idx)}
                                      className="px-2 py-1 rounded bg-obsidian-base/90 text-white text-[10px] uppercase tracking-wider hover:bg-white hover:text-obsidian-base transition-colors cursor-pointer"
                                    >
                                      Make Cover
                                    </button>
                                  )}
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => moveImage(idx, "left")}
                                      className="p-1 rounded bg-obsidian-base/80 text-text-on-dark-secondary hover:text-white disabled:opacity-30 cursor-pointer"
                                      title="Move Left"
                                    >
                                      <MoveLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === stagedImages.length - 1}
                                      onClick={() => moveImage(idx, "right")}
                                      className="p-1 rounded bg-obsidian-base/80 text-text-on-dark-secondary hover:text-white disabled:opacity-30 cursor-pointer"
                                      title="Move Right"
                                    >
                                      <MoveRight className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeImage(idx)}
                                      className="p-1 rounded bg-obsidian-base/80 text-red-400 hover:text-red-200 cursor-pointer"
                                      title="Remove image"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Drag and Drop Asset Vault Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        handleFileUpload(e.dataTransfer.files);
                      }}
                      className={`w-full p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer group ${
                        isDragOver
                          ? "border-state-success bg-obsidian-elevated"
                          : "border-hairline-on-dark bg-surface-container-lowest/60 hover:bg-obsidian-elevated/80"
                      }`}
                      onClick={() => {
                        const el = document.getElementById(fileInputId);
                        if (el) el.click();
                      }}
                    >
                      <input
                        id={fileInputId}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files)}
                      />

                      <div className="w-14 h-14 rounded-full bg-obsidian-elevated flex items-center justify-center text-text-on-dark-secondary group-hover:text-white group-hover:scale-110 transition-all mb-3 border border-hairline-on-dark">
                        {isUploadingFiles ? (
                          <RotateCw className="w-7 h-7 animate-spin text-state-success" />
                        ) : (
                          <UploadCloud className="w-7 h-7" />
                        )}
                      </div>

                      <span className="font-headline-md text-lg sm:text-xl text-text-on-dark-primary uppercase tracking-wider mb-1 font-serif">
                        {isUploadingFiles ? uploadStatus : "+ Drop High-Resolution Photography Assets"}
                      </span>

                      <p className="font-body-sm text-xs sm:text-sm text-text-on-dark-secondary max-w-md">
                        Supports JPEG, PNG, WEBP • Architectural orientation preserved • Uploads directly to backend storage endpoint.
                      </p>

                      <div className="flex items-center gap-4 mt-4">
                        <span className="px-3 py-1 rounded-full bg-obsidian-base text-text-on-dark-secondary font-data-tabular text-xs">
                          {stagedImages.length} Plates Staged
                        </span>
                        <span className="px-3 py-1 rounded-full bg-obsidian-base text-text-on-dark-secondary font-data-tabular text-xs">
                          Select Files from Device
                        </span>
                      </div>
                    </div>

                    {validationErrors.images && (
                      <div className="p-3 rounded-xl bg-red-950/40 border border-state-error text-state-error text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{validationErrors.images}</span>
                      </div>
                    )}

                    {/* Spatial & 3D Tour & Bortle Scale (Preserving Template 3 Aesthetics) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Spatial / Matterport Embed */}
                      <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-state-success" />
                          <span className="font-label-caps-md text-xs text-white uppercase tracking-wide">
                            3D Spatial Walkthrough / Matterport
                          </span>
                        </div>
                        <p className="text-xs text-text-on-dark-secondary">
                          Optional immersive 3D digital twin or spatial tour stream endpoint for guests.
                        </p>
                        <input
                          type="text"
                          value={spatialTourUrl}
                          onChange={(e) => setSpatialTourUrl(e.target.value)}
                          placeholder="https://my.matterport.com/show/?m=..."
                          className="w-full h-11 px-3.5 rounded-lg bg-surface-container-lowest border border-hairline-on-dark text-xs text-white placeholder:text-text-on-dark-secondary/40 focus:outline-none focus:border-white font-data-tabular"
                        />
                      </div>

                      {/* Bortle Sky Class */}
                      <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-state-success" />
                          <span className="font-label-caps-md text-xs text-white uppercase tracking-wide">
                            Nocturnal Darkness &amp; Sky Quality
                          </span>
                        </div>
                        <p className="text-xs text-text-on-dark-secondary">
                          Bortle Scale rating for astrotourism and moon-phase stargazing solitude.
                        </p>
                        <select
                          value={bortleSkyClass}
                          onChange={(e) => setBortleSkyClass(e.target.value)}
                          className="w-full h-11 px-3.5 rounded-lg bg-surface-container-lowest border border-hairline-on-dark text-xs text-white focus:outline-none focus:border-white font-data-tabular cursor-pointer"
                        >
                          <option value="1">Class 1 — Pristine Dark-Sky Site (Zero Artificial Light)</option>
                          <option value="2">Class 2 — Typical Truly Dark Site (Ibiza North West Coastline)</option>
                          <option value="3">Class 3 — Rural Sky with Milky Way Structural Detail</option>
                          <option value="4">Class 4 — Rural/Suburban Transition Sky</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* STAGE 4: Tariffs & Cancellation Policies */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 4 && (
                  <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    {/* Step Title Monograph */}
                    <div className="p-5 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-white">
                          <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-headline-md text-xl sm:text-2xl text-text-on-dark-primary font-serif uppercase tracking-wide">
                            Tariffs &amp; Curatorial Cancellation Policies
                          </h2>
                          <p className="font-body-md text-sm sm:text-base text-text-on-dark-secondary mt-1 max-w-3xl">
                            Set your foundational nightly rate in EUR and choose an authentic cancellation policy for visiting residents.
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-full bg-surface-container-lowest text-xs font-data-tabular text-text-on-dark-secondary self-start md:self-auto">
                        Stage 04 of 05
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left: Base Nightly Tariff (5 cols) */}
                      <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="p-6 sm:p-8 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col gap-5">
                          <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark/60">
                            <span className="font-label-caps-md text-xs uppercase tracking-wider text-white">
                              Base Nightly Tariff *
                            </span>
                            <span className="font-label-caps-sm text-[10px] text-state-success uppercase px-2 py-0.5 rounded bg-surface-container-high">
                              EUR (€)
                            </span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-xs text-text-on-dark-secondary">
                              Enter the foundational rate per night before custom weekend or seasonal rules.
                            </label>
                            <div className="relative flex items-center">
                              <span className="absolute left-4 text-2xl font-serif text-text-on-dark-secondary">
                                €
                              </span>
                              <input
                                id="basePrice"
                                name="basePrice"
                                data-lumen-field="basePrice"
                                type="number"
                                min="1"
                                value={basePricePerNight}
                                onChange={(e) => setBasePricePerNight(e.target.value)}
                                className={`w-full h-16 pl-10 pr-4 rounded-xl bg-surface-container-lowest border text-3xl font-data-tabular text-white focus:outline-none transition-colors ${
                                  validationErrors.basePricePerNight
                                    ? "border-state-error focus:border-state-error"
                                    : "border-hairline-on-dark focus:border-white"
                                }`}
                              />
                            </div>
                            {validationErrors.basePricePerNight && (
                              <span className="text-xs text-state-error">{validationErrors.basePricePerNight}</span>
                            )}
                          </div>

                          <div className="p-4 rounded-xl bg-surface-container-lowest flex flex-col gap-2 text-xs text-text-on-dark-secondary">
                            <div className="flex items-center justify-between">
                              <span>Gross Resident Rate:</span>
                              <span className="font-data-tabular text-white font-medium">
                                {formatCurrency(basePricePerNight)} / night
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Estimated 7-Night Stay:</span>
                              <span className="font-data-tabular text-white font-medium">
                                {formatCurrency(Number(basePricePerNight) * 7)}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-on-dark-secondary/70 pt-2 border-t border-hairline-on-dark/40">
                              Dynamic multipliers (weekend premiums, high season rates) can be configured immediately in your Management Console.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Cancellation Policy Selection (7 cols) */}
                      <div className="lg:col-span-7 flex flex-col gap-4">
                        <label className="font-label-caps-sm text-xs text-text-on-dark-secondary uppercase tracking-wider">
                          Cancellation Terms &amp; Refund Windows *
                        </label>

                        <div className="flex flex-col gap-3">
                          {CANCELLATION_POLICIES.map((cp) => {
                            const isSelected = cancellationPolicy === cp.policy;
                            return (
                              <button
                                key={cp.policy}
                                type="button"
                                onClick={() => setCancellationPolicy(cp.policy)}
                                className={`p-5 rounded-2xl border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-obsidian-bubble border-white text-white shadow-md"
                                    : "bg-obsidian-elevated border-hairline-on-dark text-text-on-dark-secondary hover:border-white/30"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                      isSelected
                                        ? "border-white bg-white text-obsidian-base"
                                        : "border-hairline-on-dark bg-transparent"
                                    }`}
                                  >
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-obsidian-base" />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-white uppercase tracking-wider">
                                      {cp.title}
                                    </span>
                                    <span className="text-xs text-text-on-dark-secondary mt-1 max-w-lg">
                                      {cp.summary}
                                    </span>
                                  </div>
                                </div>
                                <span className="self-start sm:self-center px-3 py-1 rounded-full bg-surface-container-high text-[11px] font-data-tabular uppercase text-text-on-dark-primary shrink-0">
                                  {cp.badge}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* STAGE 5: Review & Publish */}
                {/* ------------------------------------------------------------- */}
                {currentStep === 5 && (
                  <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    {/* Step Title Monograph */}
                    <div className="p-5 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-white">
                          <CheckCircle2 className="w-5 h-5 text-state-success" />
                        </div>
                        <div>
                          <h2 className="font-headline-md text-xl sm:text-2xl text-text-on-dark-primary font-serif uppercase tracking-wide">
                            Curatorial Review &amp; Official Ingestion
                          </h2>
                          <p className="font-body-md text-sm sm:text-base text-text-on-dark-secondary mt-1 max-w-3xl">
                            Review all entered architectural specifications, amenities, and photography plates before committing this retreat to the Aggarly sanctuary network.
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-full bg-state-success/20 text-xs font-data-tabular text-state-success font-semibold self-start md:self-auto">
                        Ready for Accreditation
                      </span>
                    </div>

                    {/* Monograph Summary Card */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Hero Cover + Metadata (7 cols) */}
                      <div className="lg:col-span-7 flex flex-col gap-6">
                        {/* Primary Image Preview */}
                        <div className="relative w-full h-[280px] sm:h-[340px] rounded-2xl overflow-hidden bg-surface-container-lowest border border-hairline-on-dark">
                          {stagedImages.length > 0 ? (
                            <img
                              src={
                                stagedImages.find((img) => img.isCover)?.url || stagedImages[0]?.url
                              }
                              alt="Sanctuary Master Plate"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-on-dark-secondary">
                              No image staged
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base via-transparent to-transparent opacity-90" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <span className="px-2.5 py-1 rounded bg-obsidian-base/80 text-[11px] uppercase tracking-wider text-state-success font-semibold inline-block mb-1">
                              {propertyType.replace("_", " ")}
                            </span>
                            <h3 className="font-headline-md text-xl sm:text-2xl text-white font-serif uppercase">
                              {title || "Untitled Sanctuary"}
                            </h3>
                            <span className="text-xs text-text-on-dark-secondary font-data-tabular flex items-center gap-1 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-state-success" />
                              {street}, {city}, {country}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col gap-2">
                          <span className="font-label-caps-sm text-xs uppercase tracking-wider text-text-on-dark-secondary">
                            Curatorial Overview
                          </span>
                          <p className="text-sm text-text-on-dark-primary/90 whitespace-pre-line leading-relaxed">
                            {description || "No description provided."}
                          </p>
                        </div>

                        {/* Selected Amenities Chips */}
                        <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col gap-3">
                          <span className="font-label-caps-sm text-xs uppercase tracking-wider text-text-on-dark-secondary">
                            Accredited Amenities ({selectedAmenityIds.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {selectedAmenityIds.length === 0 ? (
                              <span className="text-xs text-text-on-dark-secondary italic">
                                No specific amenities selected.
                              </span>
                            ) : (
                              selectedAmenityIds.map((id) => {
                                const item = availableAmenities.find((a) => a.id === id);
                                return (
                                  <span
                                    key={id}
                                    className="px-3 py-1 rounded-full bg-surface-container-high text-xs font-medium text-white uppercase tracking-wider border border-hairline-on-dark"
                                  >
                                    {item?.name || id}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Summary Specifications (5 cols) */}
                      <div className="lg:col-span-5 flex flex-col gap-6">
                        {/* Tariffs & Policies Monograph */}
                        <div className="p-6 rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col gap-5">
                          <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark/60">
                            <span className="font-label-caps-md text-xs uppercase tracking-wider text-white">
                              Tariff &amp; Policy Monograph
                            </span>
                            <span className="font-headline-md text-lg text-state-success font-data-tabular">
                              {formatCurrency(basePricePerNight)} / night
                            </span>
                          </div>

                          <div className="flex flex-col gap-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-text-on-dark-secondary">Cancellation Policy:</span>
                              <span className="text-white font-semibold uppercase font-data-tabular">
                                {cancellationPolicy}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-text-on-dark-secondary">Capacity:</span>
                              <span className="text-white font-data-tabular">
                                {maxGuests} Residents
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-text-on-dark-secondary">Bedrooms / Suites:</span>
                              <span className="text-white font-data-tabular">
                                {bedrooms} Rooms
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-text-on-dark-secondary">Bathrooms:</span>
                              <span className="text-white font-data-tabular">
                                {bathrooms} Baths
                              </span>
                            </div>
                            {latitude && (
                              <div className="flex items-center justify-between">
                                <span className="text-text-on-dark-secondary">Coordinates:</span>
                                <span className="text-white font-data-tabular text-xs">
                                  {latitude}, {longitude}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Photos Thumbnail Strip */}
                          <div className="pt-3 border-t border-hairline-on-dark/60 flex flex-col gap-2">
                            <span className="font-label-caps-sm text-xs uppercase text-text-on-dark-secondary">
                              Staged Plates ({stagedImages.length})
                            </span>
                            <div className="flex items-center gap-2 overflow-x-auto py-1">
                              {stagedImages.map((img, idx) => (
                                <img
                                  key={img.key + idx}
                                  src={img.url}
                                  alt={img.name}
                                  className="w-12 h-12 rounded-lg object-cover border border-hairline-on-dark shrink-0"
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Direct Final CTA Card */}
                        <div className="p-6 rounded-2xl bg-obsidian-bubble border border-white/40 flex flex-col gap-4 text-center">
                          <Sparkles className="w-6 h-6 text-state-success mx-auto" />
                          <h4 className="font-headline-md text-lg text-white font-serif uppercase tracking-wider">
                            Ready to Commit Sanctuary?
                          </h4>
                          <p className="text-xs text-text-on-dark-secondary leading-relaxed">
                            Once published, your retreat will be instantly mapped to your Host Portfolio where calendar slots and custom pricing rules can be fine-tuned.
                          </p>

                          <button
                            type="button"
                            disabled={isPublishing}
                            onClick={handlePublishSanctuary}
                            className="w-full h-12 rounded-full bg-white text-obsidian-base font-semibold uppercase tracking-wider text-xs hover:bg-canvas-outer transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg cursor-pointer"
                          >
                            {isPublishing ? (
                              <>
                                <RotateCw className="w-4 h-4 animate-spin text-obsidian-base" />
                                <span>Ingesting to Vault...</span>
                              </>
                            ) : (
                              <>
                                <span>Publish Sanctuary to Aggarly</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* WIZARD CONTROLS & PERSISTENCE BAR */}
                {/* ------------------------------------------------------------- */}
                <div className="pt-6 border-t border-hairline-on-dark/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Previous Step Button */}
                  <button
                    id="btn-prev-step"
                    data-action="prev-step"
                    data-lumen-action="prev-step"
                    type="button"
                    disabled={currentStep === 1 || isPublishing}
                    onClick={handlePreviousStep}
                    className="w-full sm:w-auto h-11 px-7 rounded-full bg-transparent text-text-on-dark-primary hover:bg-obsidian-elevated font-label-caps-md text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 border border-hairline-on-dark disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous Step
                  </button>

                  {/* Centered Telemetry Status */}
                  <div className="flex items-center gap-2 font-label-caps-sm text-xs text-text-on-dark-secondary uppercase">
                    <CheckCircle2 className="w-4 h-4 text-state-success" />
                    <span>DRAFT PREPARED • REAL-TIME VALIDATED</span>
                  </div>

                  {/* Forward Action CTA */}
                  {currentStep < 5 ? (
                    <button
                      id="btn-next-step"
                      data-action="next-step"
                      data-lumen-action="next-step"
                      type="button"
                      onClick={handleSaveAndContinue}
                      className="group w-full sm:w-auto h-11 px-8 rounded-full bg-white text-obsidian-base hover:bg-canvas-outer font-label-caps-md text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,255,255,0.15)] font-semibold cursor-pointer"
                    >
                      <span>
                        Save &amp; Continue to{" "}
                        {currentStep === 1
                          ? "Capacity"
                          : currentStep === 2
                          ? "Photography"
                          : currentStep === 3
                          ? "Tariffs"
                          : "Review"}
                      </span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  ) : (
                    <button
                      id="btn-publish-sanctuary"
                      data-action="publish-sanctuary"
                      data-lumen-action="publish-sanctuary"
                      type="button"
                      disabled={isPublishing}
                      onClick={handlePublishSanctuary}
                      className="group w-full sm:w-auto h-11 px-8 rounded-full bg-state-success text-obsidian-base hover:bg-state-success/90 font-label-caps-md text-xs uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isPublishing ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin text-obsidian-base" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <span>Publish Sanctuary</span>
                          <Sparkles className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-canvas-outer border-t border-hairline-on-light py-10 mt-auto">
        <div className="w-full max-w-[1560px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary text-center md:text-left tracking-[0.14em]">
            &copy; {new Date().getFullYear()} AGGARLY BY LONA. ALL RIGHTS RESERVED. CELESTIAL ARCHITECTURAL SOLITUDE
          </div>
          <div className="flex items-center gap-6">
            <Link
              className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary hover:text-text-on-light-primary uppercase transition-colors"
              href="/privacy"
            >
              Privacy
            </Link>
            <Link
              className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary hover:text-text-on-light-primary uppercase transition-colors"
              href="/terms"
            >
              Terms
            </Link>
            <Link
              className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary hover:text-text-on-light-primary uppercase transition-colors"
              href="/support"
            >
              Support
            </Link>
            <Link
              className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary hover:text-text-on-light-primary uppercase transition-colors"
              href="/host"
            >
              Curator Portal
            </Link>
          </div>
        </div>
      </footer>

      {/* Golden Animated AI Cursor Beacon (Redux Driven) */}
      <AiCursorBeacon />

      {/* Collapsible Right Slide-out Drawer for Lumen Co-pilot */}
      <LumenPropertyCoPilotDrawer
        propertyId={createdProperty?.id}
        draftId={draftPropertyIdRef.current}
        propertyTitle={title || "New Sanctuary Draft"}
        wizardStep={currentStep}
        analysisResults={visionAnalysisResults}
        isAnalyzing={isAnalyzingVision}
        currentAnalyzingName={currentAnalyzingName}
        onUploadPhotos={handleFileUpload}
      />
    </div>
  );
};
export default AddSanctuaryWizard;
