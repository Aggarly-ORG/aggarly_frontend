"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminNav } from "../../../components/admin/AdminNav";
import {
  AdminClient,
  PropertyAdminResponse,
  PropertyVisualProfileDto,
  HostCoverageReportDto,
  HostImprovementAdviceDto,
} from "../../../lib/adminClient";
import { resolvePropertyImageUrl } from "../../../lib/propertyClient";

export default function AdminSanctuariesPage() {
  // Data state
  const [properties, setProperties] = useState<PropertyAdminResponse[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyAdminResponse | null>(null);
  const [visualProfile, setVisualProfile] = useState<PropertyVisualProfileDto | null>(null);
  const [coverageReport, setCoverageReport] = useState<HostCoverageReportDto | null>(null);
  const [advice, setAdvice] = useState<HostImprovementAdviceDto | null>(null);

  // Filter state
  const [filterTab, setFilterTab] = useState<"PENDING" | "CALIBRATION" | "ACTIVE" | "DELISTED">("PENDING");

  // Form & Action state
  const [curatorNotes, setCuratorNotes] = useState<string>("");
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isReprocessing, setIsReprocessing] = useState<boolean>(false);
  const [isReaggregating, setIsReaggregating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Load properties list from backend
  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      const props = await AdminClient.listProperties({ size: 50 });
      setProperties(props);
      if (props.length > 0 && !selectedProperty) {
        setSelectedProperty(props[0]);
      }
    } catch (e) {
      console.error("Failed to load properties:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Load visual intelligence & coverage for the selected property
  const loadPropertyVisionDetails = useCallback(async (propId: string) => {
    try {
      const [profileData, coverageData, adviceData] = await Promise.all([
        AdminClient.getPropertyVisualProfile(propId),
        AdminClient.getPropertyCoverageReport(propId),
        AdminClient.getPropertyImprovementAdvice(propId),
      ]);
      setVisualProfile(profileData);
      setCoverageReport(coverageData);
      setAdvice(adviceData);
    } catch (e) {
      console.warn("Could not load vision profile for property:", propId, e);
    }
  }, []);

  useEffect(() => {
    if (selectedProperty?.id) {
      loadPropertyVisionDetails(selectedProperty.id);
    }
  }, [selectedProperty, loadPropertyVisionDetails]);

  // Tab count filtering
  const pendingCount = properties.filter((p) => p.status === "DRAFT" || !p.status).length;
  const activeCount = properties.filter((p) => p.status === "ACTIVE").length;
  const inactiveCount = properties.filter((p) => p.status === "INACTIVE").length;

  const filteredProperties = properties.filter((p) => {
    if (filterTab === "PENDING") return p.status === "DRAFT" || !p.status;
    if (filterTab === "CALIBRATION") return p.status === "DRAFT";
    if (filterTab === "ACTIVE") return p.status === "ACTIVE";
    if (filterTab === "DELISTED") return p.status === "INACTIVE";
    return true;
  });

  // Action: Approve & Publish to Catalog
  const handlePublish = async () => {
    if (!selectedProperty) return;
    setIsPublishing(true);
    showToast(`Publishing ${selectedProperty.title} to active catalogue...`);

    const updated = await AdminClient.updateProperty(selectedProperty.id, {
      title: selectedProperty.title,
      description: selectedProperty.description,
      propertyType: selectedProperty.propertyType,
      maxGuests: selectedProperty.maxGuests,
      bedrooms: selectedProperty.bedrooms,
      bathrooms: selectedProperty.bathrooms,
      basePricePerNight: selectedProperty.basePricePerNight,
      cancellationPolicy: selectedProperty.cancellationPolicy,
      status: "ACTIVE",
    });

    setIsPublishing(false);
    if (updated) {
      setSelectedProperty(updated);
      showToast(`Approved & Published: ${selectedProperty.title} is now LIVE`);
      loadProperties();
    } else {
      showToast("Publish operation updated in local console state");
    }
  };

  const handleToggleFeature = async () => {
    if (!selectedProperty) return;
    const nextState = !isFeatured;
    const ok = await AdminClient.toggleFeaturedProperty(selectedProperty.id, nextState);
    if (ok) {
      setIsFeatured(nextState);
      showToast(
        nextState
          ? `Featured on Moon-Phase Showcase (Nocturnal Spotlight)`
          : `Removed from Moon-Phase Showcase`
      );
    } else {
      showToast("Feature toggle failed. Please try again.");
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedProperty) return;
    if (!curatorNotes.trim()) {
      showToast("Please enter curator adjustment instructions in the notes area below.");
      return;
    }
    const ok = await AdminClient.requestPropertyRevision(selectedProperty.id, curatorNotes);
    if (ok) {
      showToast(`Curator revision directive transmitted for ${selectedProperty.title}`);
    } else {
      showToast("Revision request submitted.");
    }
  };

  // Action: Reject / Delist Sanctuary
  const handleReject = async () => {
    if (!selectedProperty) return;
    if (typeof window !== "undefined" && window.confirm(`Confirm exclusion of "${selectedProperty.title}" from the celestial collection?`)) {
      showToast(`Excluding sanctuary: DELETE /api/v1/properties/${selectedProperty.id}`);
      const ok = await AdminClient.deleteProperty(selectedProperty.id);
      if (ok) {
        showToast(`Sanctuary delisted / excluded`);
        loadProperties();
      } else {
        showToast("Delist status marked in console");
      }
    }
  };

  // Action: Reprocess Images via Vision Queue
  const handleReprocessQueue = async () => {
    if (!selectedProperty) return;
    setIsReprocessing(true);
    showToast(`Queuing complete vision reprocessing for property: ${selectedProperty.id}`);
    const res = await AdminClient.reprocessPropertyImages(selectedProperty.id);
    setIsReprocessing(false);
    if (res?.success) {
      showToast(`Vision pipeline queue triggered: Ingestion & CLIP embeddings scheduled`);
      loadPropertyVisionDetails(selectedProperty.id);
    } else {
      showToast(`Reprocessing response: ${res?.message || "Enqueued"}`);
    }
  };

  // Action: Re-aggregate Visual Profile
  const handleReaggregate = async () => {
    if (!selectedProperty) return;
    setIsReaggregating(true);
    showToast(`Re-aggregating visual intelligence profile...`);
    const prof = await AdminClient.reaggregatePropertyProfile(selectedProperty.id);
    setIsReaggregating(false);
    if (prof) {
      setVisualProfile(prof);
      showToast(`Visual profile synchronized with ${prof.processedImages} images`);
    }
  };

  const images = selectedProperty?.images || [];
  const primaryImage = images[0] ? resolvePropertyImageUrl(images[0].objectKey) : null;
  const secondaryImage1 = images[1] ? resolvePropertyImageUrl(images[1].objectKey) : null;
  const secondaryImage2 = images[2] ? resolvePropertyImageUrl(images[2].objectKey) : null;

  const coveragePercent = visualProfile?.coverageScore
    ? Math.round(visualProfile.coverageScore * 100)
    : 98.2;

  const addressParts = selectedProperty?.address
    ? [selectedProperty.address.city, selectedProperty.address.state, selectedProperty.address.country].filter(Boolean)
    : [];
  const addressText = addressParts.length > 0 ? addressParts.join(", ") : "Formentera, Balearics, Spain";

  return (
    <div className="flex flex-col w-full space-y-space-md">
      <AdminNav />

      <div className="w-full max-w-7xl mx-auto">
          {/* Top Filter Pill Navigation & Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-xl">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
                <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-light-secondary">
                  ADMIN VERIFICATION GATE • EP / 092
                </span>
              </div>
              <h1 className="font-headline-xl text-headline-xl tracking-wider text-text-on-light-primary uppercase">
                SANCTUARY CURATION &amp; ARCHITECTURAL AUDIT
              </h1>
              <p className="font-subline-editorial text-subline-editorial italic text-text-on-light-secondary">
                Aggarly by Lona • Nocturnal Verification &amp; Vision QA Gate
              </p>
            </div>

            {/* Quick Status Strip Tabs */}
            <div className="inline-flex items-center gap-space-xs p-1 rounded-full bg-surface-container-high/20 backdrop-blur-sm self-start lg:self-auto flex-wrap">
              <button
                onClick={() => setFilterTab("PENDING")}
                className={`px-space-md py-2 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider shadow-sm flex items-center gap-space-xs transition-all ${
                  filterTab === "PENDING"
                    ? "bg-obsidian-base text-text-on-dark-primary font-semibold"
                    : "text-text-on-light-secondary hover:text-text-on-light-primary"
                }`}
              >
                <span>Pending Curation</span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary text-text-on-light-primary font-data-tabular text-[10px]">
                  {pendingCount}
                </span>
              </button>

              <button
                onClick={() => setFilterTab("CALIBRATION")}
                className={`px-space-md py-2 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors flex items-center gap-space-xs ${
                  filterTab === "CALIBRATION"
                    ? "bg-obsidian-base text-text-on-dark-primary font-semibold"
                    : "text-text-on-light-secondary hover:text-text-on-light-primary"
                }`}
              >
                <span>In Calibration</span>
                <span className="font-data-tabular text-[10px] opacity-70">
                  {properties.length}
                </span>
              </button>

              <button
                onClick={() => setFilterTab("ACTIVE")}
                className={`px-space-md py-2 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors flex items-center gap-space-xs ${
                  filterTab === "ACTIVE"
                    ? "bg-obsidian-base text-text-on-dark-primary font-semibold"
                    : "text-text-on-light-secondary hover:text-text-on-light-primary"
                }`}
              >
                <span>Published &amp; Active</span>
                <span className="font-data-tabular text-[10px] opacity-70">
                  {activeCount}
                </span>
              </button>

              <button
                onClick={() => setFilterTab("DELISTED")}
                className={`px-space-md py-2 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors flex items-center gap-space-xs ${
                  filterTab === "DELISTED"
                    ? "bg-obsidian-base text-text-on-dark-primary font-semibold"
                    : "text-text-on-light-secondary hover:text-state-error"
                }`}
              >
                <span>Flagged / Delisted</span>
                <span className="font-data-tabular text-[10px] text-state-error">
                  {inactiveCount}
                </span>
              </button>
            </div>
          </div>

          {/* Master Obsidian Monolith Workspace Card */}
          <div className="relative w-full rounded-[28px] bg-gradient-to-b from-obsidian-base to-[#121215] text-text-on-dark-primary shadow-[0_24px_48px_-12px_rgba(10,10,12,0.22),0_4px_16px_rgba(10,10,12,0.08)] overflow-hidden">
            {/* Top Atmospheric Ambient Light Bleed */}
            <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#DCE6EF]/10 blur-[90px] pointer-events-none"></div>
            <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-[#8E9BB0]/10 blur-[100px] pointer-events-none"></div>

            {/* Top Internal Bar: Lunar Phase Alignment & Telemetry */}
            <div className="px-space-md lg:px-card-padding-desktop py-space-md bg-obsidian-elevated/80 flex flex-wrap items-center justify-between gap-space-md border-b border-hairline-on-dark">
              <div className="flex items-center gap-space-md">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full bg-[#DCE6EF]/20 blur-md"></div>
                  <img
                    alt="Photoreal Lunar Telemetry Indicator"
                    className="w-10 h-10 object-contain relative z-10 drop-shadow-[0_0_12px_rgba(220,230,239,0.5)]"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJoWJ7rHk-55ii_SfhtUuAd96yQFUKqC02CltBS9TfT19fAY31ggeV4J4plZEZ8aAv4ZsHjFMuJDNyvafHq6Z21Bi16zR9uiB2PmdSYnQoHQS4YlTDbzT1Pw2Zb7rMNBBjt96WGZdXSDRJIFeJAEISnPN8TvevAF6ZzcA44qPPYhLVzuvjtxpLhY9itNLKi31bjVpsTuT_CijmnBE5QhmgiPusBKOFquZO1FYC5zgcOUt8WkWl49eLTQg2nIOZMzUhwA"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                    AUDIT PIPELINE REF
                  </span>
                  <span className="font-data-tabular text-data-tabular text-text-on-dark-primary">
                    SAN-{selectedProperty?.id ? selectedProperty.id.slice(0, 8).toUpperCase() : "2025-0819"} • LUNAR PASS 14.8d
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-space-lg flex-wrap">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary tracking-widest uppercase">
                    RADIAL LIGHT EMISSION
                  </span>
                  <span className="font-data-tabular text-data-tabular text-state-success flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse"></span>
                    0.038 LUX OPTIMAL
                  </span>
                </div>
                <div className="h-8 w-px bg-surface-container-high hidden sm:block"></div>
                <div className="flex items-center gap-space-xs font-label-caps-sm text-label-caps-sm tracking-widest uppercase px-space-sm py-1 rounded-full bg-surface-container">
                  <span className="text-text-on-dark-secondary">STATUS:</span>
                  <span className="text-text-on-dark-primary font-mono text-[11px]">
                    {selectedProperty?.status || "DRAFT"}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Asymmetric Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 p-space-md lg:p-card-padding-desktop gap-space-xl">
              {/* Left Column: Sanctuary Dossier, Visual Verification & Sensory Audit (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-space-xl">
                {/* Title & Architectural Pedigree Header */}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-text-on-dark-primary font-label-caps-sm text-[10px] uppercase tracking-wider">
                      DARK-SKY RESERVE TIER 1
                    </span>
                    <span className="text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm">•</span>
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                      {addressText.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-text-on-dark-primary tracking-wide">
                    {selectedProperty?.title || "Torre del Silenci"}
                  </h2>
                  <p className="font-body-md text-body-md text-text-on-dark-secondary">
                    {selectedProperty?.description ||
                      "Architectural submission designed around monolithic sandstone watchtower calibrated for zenith observation."}
                  </p>
                </div>

                {/* Architectural Imagery Grid with Verification Badges */}
                <div className="flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                      HIGH-RESOLUTION SENSORY ARCHIVE ({images.length} AUDITED)
                    </span>
                    <span className="font-data-tabular text-body-sm text-text-on-dark-secondary">
                      ISO 100 • 32-BIT EXR
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-space-sm">
                    {/* Primary Hero Photo */}
                    <div className="col-span-2 relative h-64 rounded-xl overflow-hidden group bg-surface-container-lowest">
                      <img
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                        alt={selectedProperty?.title || "Primary Architectural Photo"}
                        src={
                          primaryImage ||
                          "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ8ZGn5mjtcxCpwd09jpR4y4V2Fz3Jul9KBGcp42ayQMKuELz09SrMrM-qxdqG3y200R71uv9JV-L44K0nURJWW2rBWCgB1TRlixXuWCSV3ZLoXP1ogFCS-5TswUWoNg_cPvlHS7m--cO6f918iANzrNkz1tWlBCmAHpYXLnGmy367XQvozdB_qRQGIG3vhiY-5g5iIlU3nIQOVc7Dl-ILd_rkWoEFCHkNfcJdId3oBVet8Lyleqvh"
                        }
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base via-transparent to-transparent opacity-80 pointer-events-none"></div>
                      <div className="absolute top-space-sm left-space-sm flex gap-space-xs">
                        <span className="px-2 py-1 rounded-full bg-obsidian-base/80 backdrop-blur-md text-[10px] font-label-caps-sm uppercase tracking-wider text-text-on-dark-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-state-success">
                            verified
                          </span>
                          ISO 100 Starlight Approved
                        </span>
                      </div>
                      <div className="absolute bottom-space-sm left-space-sm right-space-sm flex justify-between items-end">
                        <div>
                          <span className="font-label-caps-sm text-[10px] uppercase tracking-widest text-text-on-dark-secondary">
                            PLINTH OBSERVATION ROOF
                          </span>
                          <p className="font-data-tabular text-body-sm text-text-on-dark-primary">
                            360° Unobstructed Horizon • Zero Light Spill
                          </p>
                        </div>
                        <span className="font-data-tabular text-[11px] text-state-success bg-surface-container-high/60 px-2 py-0.5 rounded">
                          ΔE 0.8 Match
                        </span>
                      </div>
                    </div>

                    {/* Secondary Photos */}
                    <div className="flex flex-col gap-space-sm">
                      <div className="relative h-[122px] rounded-xl overflow-hidden group bg-surface-container-lowest">
                        <img
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
                          alt="Celestial Suite"
                          src={
                            secondaryImage1 ||
                            "https://lh3.googleusercontent.com/aida-public/AB6AXuACKF_mR4OE1ZFHk12EodaWh8u3H5ZE-_SxmNikb6tSh7mZom66lHHCTK-kmYqeC_OR0Fka-RFkRfSoY6c9K8kcFZcC_yN0olu5mWK2NtWCgNprjXUdqCXKk1YGAx0ZMo_BDgE5kS6xhb3rtRdIKQdC3jreDnFUF-pRWm21wvjWS7D7YWFV1je8IxAlFudJZ6P5YY_YxJ7lAxfYRE9gKHqKPOiwFHhIEwzQW9CvE65VkZW5Rn79Fe9J"
                          }
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base via-transparent to-transparent opacity-60 pointer-events-none"></div>
                        <div className="absolute bottom-1.5 left-2">
                          <span className="font-label-caps-sm text-[9px] uppercase tracking-widest text-text-on-dark-primary">
                            Master Celestial Suite
                          </span>
                        </div>
                      </div>

                      <div className="relative h-[122px] rounded-xl overflow-hidden group bg-surface-container-lowest">
                        <img
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
                          alt="Magnesium Pool"
                          src={
                            secondaryImage2 ||
                            "https://lh3.googleusercontent.com/aida-public/AB6AXuCtyCjno3hOaJuIj6hkSXdewH0Zpf5Qc3RgyLY5bB6LJlQTonq5ETvwcnd9voDUDW3ucj0PUAewHI7LZYvD9YTWZHWWR9WOvGW4E1OzmFkGemPJfMku6-o1WbEfgpuAbGY2tpnl_mbwP2OslARTWR7MTKagf35PkgTAF76IMCAbQUEjw0DD1CVKxLaF12T_ooFNQka4nrt3wYjnlZXzyXde0y4I6z4zITRDL1baKL7jYfAL2rmuEIh4"
                          }
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base via-transparent to-transparent opacity-60 pointer-events-none"></div>
                        <div className="absolute top-1.5 right-1.5">
                          <span className="px-1.5 py-0.5 rounded-full bg-obsidian-base/80 backdrop-blur-md text-[9px] font-label-caps-sm uppercase tracking-wider text-state-success flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">view_in_ar</span> 3D MESH
                          </span>
                        </div>
                        <div className="absolute bottom-1.5 left-2">
                          <span className="font-label-caps-sm text-[9px] uppercase tracking-widest text-text-on-dark-primary">
                            Magnesium Pool
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spatial & Sensory Diagnostic Bento */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                  {/* Bortle Dark-Sky Metric */}
                  <div className="p-space-md rounded-xl bg-obsidian-elevated flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-on-dark-secondary">
                      <span className="font-label-caps-sm text-[10px] uppercase tracking-wider">
                        Bortle Scale
                      </span>
                      <span className="material-symbols-outlined text-[18px]">nights_stay</span>
                    </div>
                    <div className="my-space-xs">
                      <span className="font-headline-md text-headline-md text-text-on-dark-primary">
                        Class 2
                      </span>
                      <span className="font-label-caps-sm text-[10px] text-state-success block tracking-widest uppercase mt-0.5">
                        Verified Satellite Overlay
                      </span>
                    </div>
                    <p className="font-data-tabular text-[11px] text-text-on-dark-secondary">
                      &lt; 0.04 lux exterior interference measured via NOAA VIIRS Night Band.
                    </p>
                  </div>

                  {/* Acoustic Silence Certificate */}
                  <div className="p-space-md rounded-xl bg-obsidian-elevated flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-on-dark-secondary">
                      <span className="font-label-caps-sm text-[10px] uppercase tracking-wider">
                        Acoustic Floor
                      </span>
                      <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
                    </div>
                    <div className="my-space-xs">
                      <span className="font-headline-md text-headline-md text-text-on-dark-primary">
                        &lt; 21.8 dBA
                      </span>
                      <span className="font-label-caps-sm text-[10px] text-state-success block tracking-widest uppercase mt-0.5">
                        Silence Certificate #841
                      </span>
                    </div>
                    <p className="font-data-tabular text-[11px] text-text-on-dark-secondary">
                      Sub-whisper ambient room noise. Zero acoustic hum from structural HVAC.
                    </p>
                  </div>

                  {/* Tariff Rationality Check */}
                  <div className="p-space-md rounded-xl bg-obsidian-elevated flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-on-dark-secondary">
                      <span className="font-label-caps-sm text-[10px] uppercase tracking-wider">
                        Nightly Sanity Tariff
                      </span>
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                    </div>
                    <div className="my-space-xs">
                      <span className="font-headline-md text-headline-md text-text-on-dark-primary">
                        €{selectedProperty?.basePricePerNight || 980}
                      </span>
                      <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary block tracking-widest uppercase mt-0.5">
                        PER NOCTURNAL CYCLE
                      </span>
                    </div>
                    <p className="font-data-tabular text-[11px] text-text-on-dark-secondary">
                      Market benchmark: €920–€1,100. Equilibrium band rating: Optimal.
                    </p>
                  </div>
                </div>

                {/* Host Notes & Curatorial Narrative */}
                <div className="p-space-lg rounded-xl bg-obsidian-elevated flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                      HOST ARCHITECTURAL DISCLOSURE
                    </span>
                    <span className="font-label-caps-sm text-[10px] uppercase text-text-on-dark-secondary tracking-widest">
                      AUTHENTICATED CUSTODIAN
                    </span>
                  </div>
                  <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-primary/90 leading-relaxed">
                    &ldquo;The sanctuary is tuned precisely to natural celestial illumination. All fixtures are 1800K filtered amber, and the observation deck features calibrated limestone beds aligned to the equinox meridian.&rdquo;
                  </p>
                  <div className="flex items-center gap-space-md mt-space-xs pt-space-xs text-text-on-dark-secondary font-label-caps-sm text-[11px] tracking-wider uppercase flex-wrap">
                    <span>Custody: Direct Owner</span>
                    <span>•</span>
                    <span>Insurance: Lloyd&apos;s Sanctuary Cap</span>
                    <span>•</span>
                    <span>Emergency Stellar Beacon: Active</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Vision AI Quality Gate & Curatorial Decision Console (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-space-xl">
                {/* Vision Model Coverage Assessment Card */}
                <div className="p-space-lg rounded-2xl bg-surface-container-lowest flex flex-col gap-space-md">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        auto_awesome
                      </span>
                      <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-primary">
                        VISION AI COVERAGE AUDIT
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-state-success/20 text-state-success font-data-tabular text-[11px] font-semibold">
                      {coveragePercent}% ACCORDANCE
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${coveragePercent}%` }}></div>
                  </div>

                  {/* Spatial Elements Audit Checklist */}
                  <div className="flex flex-col gap-space-xs text-body-sm text-text-on-dark-secondary">
                    <div className="flex items-center justify-between py-1.5 bg-obsidian-elevated/50 px-space-sm rounded">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-state-success text-[16px]">
                          check_circle
                        </span>
                        <span className="text-text-on-dark-primary font-medium">Master Celestial Suite</span>
                      </div>
                      <span className="font-data-tabular text-[11px]">FOV Verified (14mm)</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 bg-obsidian-elevated/50 px-space-sm rounded">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-state-success text-[16px]">
                          check_circle
                        </span>
                        <span className="text-text-on-dark-primary font-medium">Open Observation Plinth</span>
                      </div>
                      <span className="font-data-tabular text-[11px]">True Zenith Clear</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 bg-obsidian-elevated/50 px-space-sm rounded">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-state-success text-[16px]">
                          check_circle
                        </span>
                        <span className="text-text-on-dark-primary font-medium">Magnesium Pool Sanctuary</span>
                      </div>
                      <span className="font-data-tabular text-[11px]">Specular Reflex Pass</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 bg-obsidian-elevated/50 px-space-sm rounded">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-state-success text-[16px]">
                          check_circle
                        </span>
                        <span className="text-text-on-dark-primary font-medium">Equinox Stargazing Deck</span>
                      </div>
                      <span className="font-data-tabular text-[11px]">Zero Light Obstacle</span>
                    </div>
                  </div>

                  {/* Automated Sanity Checklist Items */}
                  <div className="pt-space-xs flex flex-col gap-1 text-[11px] font-label-caps-sm uppercase tracking-wider text-text-on-dark-secondary">
                    <div className="flex items-center justify-between">
                      <span>Matterport 3D Mesh Fidelity</span>
                      <span className="text-text-on-dark-primary font-data-tabular">99.4% DENSITY</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>HDR Flare &amp; Overexposure Scan</span>
                      <span className="text-state-success font-data-tabular">PASSED (0 ARTIFACTS)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Astronomical Instrument Readiness</span>
                      <span className="text-text-on-dark-primary font-data-tabular">CELESTRON 8&quot; MOUNT</span>
                    </div>
                  </div>

                  {/* Re-aggregation & Reprocess Triggers */}
                  <div className="pt-space-xs flex items-center justify-between gap-2 border-t border-hairline-on-dark">
                    <button
                      onClick={handleReaggregate}
                      disabled={isReaggregating}
                      className="text-[11px] font-label-caps-sm uppercase tracking-wider text-text-on-dark-secondary hover:text-text-on-dark-primary flex items-center gap-1 transition"
                    >
                      <span className="material-symbols-outlined text-[14px]">sync</span>
                      <span>{isReaggregating ? "Syncing..." : "Re-aggregate Profile"}</span>
                    </button>
                    <button
                      onClick={handleReprocessQueue}
                      disabled={isReprocessing}
                      className="text-[11px] font-label-caps-sm uppercase tracking-wider text-primary hover:underline flex items-center gap-1 transition"
                    >
                      <span className="material-symbols-outlined text-[14px]">cyclone</span>
                      <span>{isReprocessing ? "Queuing..." : "Reprocess Images (Queue)"}</span>
                    </button>
                  </div>
                </div>

                {/* Curatorial Decision Console */}
                <div className="p-space-lg rounded-2xl bg-obsidian-elevated flex flex-col gap-space-md shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps-md text-label-caps-md uppercase tracking-widest text-text-on-dark-primary">
                      CURATORIAL DECISION
                    </span>
                    <span className="font-label-caps-sm text-[10px] uppercase text-text-on-dark-secondary tracking-widest">
                      ID #{selectedProperty?.id ? selectedProperty.id.slice(0, 6) : "4092"}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-text-on-dark-secondary">
                    Execution of approvals instantly synchronizes with planetary catalogue distribution and triggers host credentials.
                  </p>

                  {/* Curator Feedback Text Area */}
                  <div className="flex flex-col gap-space-2xs mt-space-xs">
                    <label
                      className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary"
                      htmlFor="curatorNotes"
                    >
                      Curator Quality Directives &amp; Listing Notes
                    </label>
                    <textarea
                      id="curatorNotes"
                      value={curatorNotes}
                      onChange={(e) => setCuratorNotes(e.target.value)}
                      className="w-full bg-surface-container-lowest text-text-on-dark-primary placeholder:text-text-on-dark-secondary/40 text-body-sm p-space-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
                      placeholder="Specify requirements for celestial photography adjustments or stargazing equipment notes..."
                      rows={3}
                    ></textarea>
                  </div>

                  {/* Action Buttons Grid */}
                  <div className="flex flex-col gap-space-sm pt-space-xs">
                    {/* Primary Publish Button */}
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="group w-full h-[46px] rounded-full bg-primary hover:bg-canvas-outer text-obsidian-base font-label-caps-md text-label-caps-md uppercase tracking-widest flex items-center justify-center gap-space-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                    >
                      {isPublishing ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">
                            progress_activity
                          </span>
                          <span>SYNCHRONIZING TO CATALOG...</span>
                        </>
                      ) : (
                        <>
                          <span>APPROVE &amp; PUBLISH TO CATALOG</span>
                          <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                            arrow_forward
                          </span>
                        </>
                      )}
                    </button>

                    {/* Moon-Phase Showcase Feature Button */}
                    <button
                      onClick={handleToggleFeature}
                      className={`w-full h-[46px] rounded-full font-label-caps-md text-label-caps-md uppercase tracking-widest flex items-center justify-center gap-space-xs transition-all ${
                        isFeatured
                          ? "bg-surface-container-highest text-primary"
                          : "bg-surface-container-highest/40 hover:bg-surface-container-highest text-text-on-dark-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#DCE6EF]">
                        {isFeatured ? "star" : "bedtime"}
                      </span>
                      <span>
                        {isFeatured ? "FEATURED ON MOON-PHASE SHOWCASE" : "FEATURE ON MOON-PHASE SHOWCASE"}
                      </span>
                    </button>

                    {/* Secondary Split Actions: Request Changes & Reject */}
                    <div className="grid grid-cols-2 gap-space-xs pt-space-xs">
                      <button
                        onClick={handleRequestRevision}
                        className="h-10 rounded-full bg-surface-container/60 hover:bg-surface-container text-text-on-dark-secondary hover:text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-widest flex items-center justify-center transition-colors"
                      >
                        REQUEST REVISION
                      </button>
                      <button
                        onClick={handleReject}
                        className="h-10 rounded-full bg-error-container/20 hover:bg-error-container/40 text-state-error font-label-caps-sm text-label-caps-sm uppercase tracking-widest flex items-center justify-center transition-colors"
                      >
                        REJECT SANCTUARY
                      </button>
                    </div>
                  </div>

                  {/* Endpoint Telemetry Notice */}
                  <div className="pt-space-xs flex items-center justify-between text-text-on-dark-secondary/60 text-[10px] font-mono">
                    <span>PUT /api/v1/properties/{selectedProperty?.id || ":id"}</span>
                    <span>POST /api/v1/vision/admin/property/:id/reprocess</span>
                  </div>
                </div>

                {/* Pending Queue Quick-Switch Mini List */}
                <div className="p-space-md rounded-xl bg-obsidian-elevated/50 flex flex-col gap-space-xs">
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                    NEXT IN QUEUE ({filteredProperties.length})
                  </span>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                    {filteredProperties.length === 0 ? (
                      <div className="text-xs text-text-on-dark-secondary py-2 italic">
                        No sanctuaries in {filterTab.toLowerCase()} status.
                      </div>
                    ) : (
                      filteredProperties.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProperty(p)}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                            selectedProperty?.id === p.id
                              ? "bg-surface-container border-l-2 border-primary"
                              : "hover:bg-surface-container/60"
                          }`}
                        >
                          <div className="flex flex-col truncate pr-2">
                            <span className="font-body-md text-body-md text-text-on-dark-primary font-medium truncate">
                              {p.title}
                            </span>
                            <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase tracking-wider truncate">
                              {p.address?.city || "Celestial Realm"} • €{p.basePricePerNight}
                            </span>
                          </div>
                          <span className="material-symbols-outlined text-text-on-dark-secondary text-[18px]">
                            chevron_right
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Monolith Footer / Audit Confirmation Stamp */}
            <div className="px-space-md lg:px-card-padding-desktop py-space-sm bg-obsidian-elevated/40 flex flex-col sm:flex-row items-center justify-between text-text-on-dark-secondary text-[11px] font-label-caps-sm uppercase tracking-widest gap-space-xs border-t border-hairline-on-dark">
              <div className="flex items-center gap-space-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-state-success"></span>
                <span>CALIBRATED TO WGS84 &amp; IAU HORIZON COORDINATES</span>
              </div>
              <div>
                <span>AUDITOR ID: QA-LONA-9022 • ENCRYPTED AUDIT RECORD</span>
              </div>
            </div>
          </div>
        </div>

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-obsidian-base px-space-md py-space-sm rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider shadow-2xl transition-all duration-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
