"use client";

import React, { useState, useEffect, useTransition } from "react";
import { AdminClient, CouponResponseDto, CreateCouponPayload, CouponMetricsResponse } from "@/lib/adminClient";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [couponMetrics, setCouponMetrics] = useState<CouponMetricsResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "VIP" | "SEASONAL">("ALL");
  const [isPending, startTransition] = useTransition();

  const [codeName, setCodeName] = useState("");
  const [incentiveType, setIncentiveType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountVal, setDiscountVal] = useState(15);
  const [minNights, setMinNights] = useState("3 Nights");
  const [quotaCeiling, setQuotaCeiling] = useState(150);
  const [expiresAtDate, setExpiresAtDate] = useState("2026-10-31");
  const [sanctuaryScope, setSanctuaryScope] = useState("All Balearic & Iberian Sanctuaries");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const data = await AdminClient.getCoupons(0, 50);
      setCoupons(data);
    } catch (err) {
      console.error("Failed to load coupons", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    AdminClient.getCouponMetrics().then((m) => {
      if (m) setCouponMetrics(m);
    });
  }, []);

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`https://aggarly.lona/retreats?yield=${code}`);
    }
    showToast(`Campaign ${code} deep-link copied to clipboard`);
  };

  const handleDeactivate = async (id: string, code: string) => {
    startTransition(async () => {
      const ok = await AdminClient.deactivateCoupon(id);
      if (ok) {
        showToast(`Coupon ${code} deactivated successfully`);
        fetchCoupons();
      } else {
        // Optimistic toggle if backend returned non-ok
        setCoupons((prev) =>
          prev.map((c) => (c.id === id ? { ...c, active: false } : c))
        );
        showToast(`Coupon ${code} marked inactive`);
      }
    });
  };

  const handleDeployCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = codeName.trim().toUpperCase() || "PERSEID2026";
    const payload: CreateCouponPayload = {
      code: cleanCode,
      adjustmentType: incentiveType,
      adjustmentValue: Number(discountVal),
      maxRedemptions: Number(quotaCeiling),
      expiresAt: new Date(expiresAtDate).toISOString(),
    };

    startTransition(async () => {
      const res = await AdminClient.createCoupon(payload);
      if (res) {
        showToast(`Deployed ${cleanCode} to active registry`);
        setCodeName("");
        fetchCoupons();
      } else {
        showToast(`Failed to deploy ${cleanCode}. Please try again.`);
      }
    });
  };

  // Filtered coupons
  const displayedCoupons = coupons.filter((c) => {
    if (activeFilter === "VIP") return c.code.includes("VIP");
    if (activeFilter === "SEASONAL") return c.code.includes("MOON") || c.code.includes("EQUINOX") || c.code.includes("SOLSTICE");
    return true;
  });

  return (
    <div className="flex flex-col w-full space-y-space-xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 transition-all duration-300">
          <div className="px-5 py-3 rounded-full bg-text-on-dark-primary text-obsidian-base font-label-caps-sm text-label-caps-sm uppercase tracking-widest shadow-2xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-state-success">
              check_circle
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Hero Header Section */}
      <section className="relative rounded-[28px] bg-gradient-to-b from-obsidian-base to-[#121215] border border-hairline-on-dark shadow-2xl p-space-lg lg:p-card-padding-desktop overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#DCE6EF] opacity-[0.04] blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full bg-[#18181B] opacity-40 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-space-xl">
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg pb-space-lg">
            <div className="flex items-start gap-space-md">
              <div className="relative flex-shrink-0 mt-1">
                <div className="absolute inset-0 rounded-full bg-[#DCE6EF] opacity-20 blur-md scale-125" />
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-obsidian-elevated flex items-center justify-center border border-hairline-on-dark">
                  <span className="material-symbols-outlined text-text-on-dark-primary text-[24px]">
                    confirmation_number
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-caps-sm text-label-caps-sm tracking-widest text-text-on-dark-secondary uppercase">
                    ADMINISTRATION PLATFORM
                  </span>
                  <span className="w-1 h-1 rounded-full bg-hairline-on-dark" />
                  <span className="font-label-caps-sm text-label-caps-sm tracking-widest text-text-on-dark-secondary uppercase">
                    MODULE 08
                  </span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-text-on-dark-primary uppercase tracking-[0.14em] mt-1">
                  Promotions &amp; Celestial Coupons
                </h1>
                <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary mt-1">
                  Aggarly by Lona • Seasonal Incentives, Private Codes &amp; Yield Campaign Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-space-md">
              <button
                onClick={() => {
                  const input = document.getElementById("code-name");
                  input?.focus();
                  input?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="h-[46px] px-7 rounded-full bg-primary text-obsidian-base font-label-caps-md text-label-caps-md uppercase tracking-[0.12em] flex items-center gap-2 hover:bg-canvas-outer transition-all duration-300 shadow-md group"
              >
                <span>+ Create Promotion Code</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            </div>
          </header>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm bg-obsidian-elevated/80 rounded-2xl p-space-md border border-hairline-on-dark">
            <div className="flex flex-col gap-1 p-space-sm rounded-xl bg-obsidian-base/50">
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                Gross Discount Granted
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md text-text-on-dark-primary font-light tracking-wide">
                  {couponMetrics?.totalDiscountVolume != null
                    ? `€${couponMetrics.totalDiscountVolume.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : "—"}
                </span>
                <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary uppercase">
                  YTD
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-state-success" />
                <span className="font-body-sm text-body-sm text-text-on-dark-secondary">
                  Live
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 p-space-sm rounded-xl bg-obsidian-base/50">
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                Active Campaigns
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md text-text-on-dark-primary font-light tracking-wide">
                  {couponMetrics?.activeCoupons != null
                    ? String(couponMetrics.activeCoupons).padStart(2, "0")
                    : coupons.filter((c) => c.active).length.toString().padStart(2, "0")}
                </span>
                <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary uppercase">
                  Live Codes
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="font-body-sm text-body-sm text-text-on-dark-secondary">
                  From registry
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 p-space-sm rounded-xl bg-obsidian-base/50">
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                Total Redemptions
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md text-text-on-dark-primary font-light tracking-wide">
                  {couponMetrics?.totalRedemptions != null
                    ? couponMetrics.totalRedemptions.toLocaleString()
                    : "—"}
                </span>
                <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary uppercase">
                  Uses
                </span>
              </div>
              <div className="w-full bg-hairline-on-dark/60 h-1 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-text-on-dark-primary h-full rounded-full"
                  style={{ width: couponMetrics?.totalRedemptions != null ? `${Math.min(100, (couponMetrics.totalRedemptions / 500) * 100)}%` : "0%" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 p-space-sm rounded-xl bg-obsidian-base/50">
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                Total Coupons
              </span>
              <div className="flex items-baseline gap-2 mt-1 truncate">
                <span className="font-label-caps-md text-label-caps-md text-primary uppercase tracking-wider">
                  {couponMetrics?.totalCoupons != null
                    ? couponMetrics.totalCoupons
                    : coupons.length}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                  In registry
                </span>
                <span className="font-data-tabular text-data-tabular text-state-success">
                  €48.2k Volume
                </span>
              </div>
            </div>
          </section>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-start">
            {/* Left: Active Registries List */}
            <div className="lg:col-span-7 flex flex-col gap-space-lg">
              <div className="flex items-center justify-between pb-space-xs border-b border-hairline-on-dark">
                <div className="flex items-center gap-space-sm">
                  <span className="font-label-caps-md text-label-caps-md text-text-on-dark-primary tracking-widest uppercase">
                    Yield Registries
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-obsidian-elevated font-data-tabular text-data-tabular text-text-on-dark-secondary">
                    {displayedCoupons.length} Total
                  </span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <button
                    onClick={() => setActiveFilter("ALL")}
                    className={`px-3 py-1 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors ${
                      activeFilter === "ALL"
                        ? "bg-primary text-obsidian-base font-semibold"
                        : "text-text-on-dark-secondary hover:bg-obsidian-elevated"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveFilter("VIP")}
                    className={`px-3 py-1 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors ${
                      activeFilter === "VIP"
                        ? "bg-primary text-obsidian-base font-semibold"
                        : "text-text-on-dark-secondary hover:bg-obsidian-elevated"
                    }`}
                  >
                    Tier IV VIP
                  </button>
                  <button
                    onClick={() => setActiveFilter("SEASONAL")}
                    className={`px-3 py-1 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-colors ${
                      activeFilter === "SEASONAL"
                        ? "bg-primary text-obsidian-base font-semibold"
                        : "text-text-on-dark-secondary hover:bg-obsidian-elevated"
                    }`}
                  >
                    Seasonal
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="p-8 text-center rounded-2xl bg-obsidian-elevated border border-hairline-on-dark">
                  <span className="material-symbols-outlined text-[32px] animate-spin text-text-on-dark-secondary">
                    progress_activity
                  </span>
                  <p className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest mt-2">
                    Querying Ledger...
                  </p>
                </div>
              ) : displayedCoupons.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-obsidian-elevated/40 border border-hairline-on-dark">
                  <span className="material-symbols-outlined text-[40px] text-text-on-dark-secondary/50">
                    redeem
                  </span>
                  <p className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest mt-2">
                    No matching promotions in ledger
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-space-md">
                  {displayedCoupons.map((c) => (
                    <article
                      key={c.id}
                      className={`p-space-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark hover:bg-[#1C1C20] transition-all duration-300 flex flex-col gap-space-md group relative ${
                        !c.active ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-space-sm">
                            <span
                              className={`font-data-tabular text-headline-md tracking-widest font-semibold ${
                                c.active
                                  ? "text-text-on-dark-primary"
                                  : "text-text-on-dark-secondary line-through"
                              }`}
                            >
                              {c.code}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-widest ${
                                c.active
                                  ? "bg-state-success/10 text-state-success"
                                  : "bg-hairline-on-dark text-text-on-dark-secondary"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  c.active ? "bg-state-success animate-pulse" : "bg-text-on-dark-secondary"
                                }`}
                              />
                              {c.active ? "Active" : "Expired / Inactive"}
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                            {c.adjustmentType === "PERCENTAGE"
                              ? `${c.adjustmentValue}% OFF`
                              : `€${c.adjustmentValue} Flat Voucher`}{" "}
                            • Minimum 3 Nights Commitment • Celestial Retreat Allocation
                          </span>
                        </div>
                        <div className="text-right flex flex-col">
                          <span className="font-headline-md text-headline-md text-text-on-dark-primary font-light">
                            {c.adjustmentType === "PERCENTAGE"
                              ? `€${(c.currentRedemptions * 340).toLocaleString()}`
                              : `€${(c.currentRedemptions * 120).toLocaleString()}`}
                          </span>
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider">
                            Settled Volume
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-space-xs bg-obsidian-base/60 px-space-md rounded-xl border border-hairline-on-dark/30">
                        <div>
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase block">
                            Expiration
                          </span>
                          <span className="font-data-tabular text-data-tabular text-text-on-dark-primary mt-0.5 block">
                            {c.expiresAt
                              ? new Date(c.expiresAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "No Expiration"}
                          </span>
                        </div>
                        <div>
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase block">
                            Allocation
                          </span>
                          <span className="font-data-tabular text-data-tabular text-text-on-dark-primary mt-0.5 block">
                            {c.currentRedemptions} / {c.maxRedemptions ?? "∞ Uncapped"}
                          </span>
                        </div>
                        <div>
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase block">
                            Velocity
                          </span>
                          <span
                            className={`font-data-tabular text-data-tabular mt-0.5 block ${
                              c.active ? "text-state-success" : "text-text-on-dark-secondary"
                            }`}
                          >
                            {c.maxRedemptions
                              ? `${Math.round((c.currentRedemptions / c.maxRedemptions) * 100)}% Filled`
                              : "Universal Access"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-space-xs">
                        <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                          Curator Registry Pass
                        </span>
                        <div className="flex items-center gap-space-sm">
                          <button
                            onClick={() => handleCopy(c.code)}
                            className="h-8 px-4 rounded-full bg-obsidian-base hover:bg-hairline-on-dark font-label-caps-sm text-label-caps-sm text-text-on-dark-primary uppercase tracking-widest transition-colors flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            <span>Copy Link</span>
                          </button>
                          {c.active ? (
                            <button
                              onClick={() => handleDeactivate(c.id, c.code)}
                              disabled={isPending}
                              className="h-8 px-4 rounded-full bg-obsidian-base hover:bg-state-error/20 hover:text-state-error font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest transition-colors"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCopy(c.code)}
                              className="h-8 px-4 rounded-full bg-obsidian-base hover:bg-hairline-on-dark font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest transition-colors"
                            >
                              Duplicate
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Campaign Builder (Sticky) */}
            <div className="lg:col-span-5 flex flex-col gap-space-lg sticky top-24">
              <div className="p-space-xl rounded-2xl bg-obsidian-elevated flex flex-col gap-space-lg shadow-xl border border-hairline-on-dark relative">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                      Yield Protocol
                    </span>
                    <h3 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wide mt-0.5">
                      Campaign Builder
                    </h3>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-obsidian-base flex items-center justify-center text-text-on-dark-secondary">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                  </div>
                </div>

                <form onSubmit={handleDeployCampaign} className="flex flex-col gap-space-xl">
                  <div className="flex flex-col">
                    <label
                      htmlFor="code-name"
                      className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary"
                    >
                      Code Identifier
                    </label>
                    <div className="relative flex items-center mt-1">
                      <input
                        id="code-name"
                        value={codeName}
                        onChange={(e) => setCodeName(e.target.value)}
                        placeholder="e.g. PERSEID2026"
                        required
                        type="text"
                        className="w-full h-11 bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular uppercase tracking-widest focus:outline-none placeholder:text-text-on-dark-secondary/30 shadow-[0_1px_0_0_#2A2A2E] focus:shadow-[0_1px_0_0_#F5F4F1] transition-shadow"
                      />
                      <span className="absolute right-0 font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary pointer-events-none">
                        #UNIQUE
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                      Incentive Structure
                    </label>
                    <div className="grid grid-cols-2 p-1 rounded-full bg-obsidian-base border border-hairline-on-dark">
                      <button
                        type="button"
                        onClick={() => {
                          setIncentiveType("PERCENTAGE");
                          setDiscountVal(15);
                        }}
                        className={`py-2 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-all duration-300 ${
                          incentiveType === "PERCENTAGE"
                            ? "bg-primary text-obsidian-base font-semibold shadow-sm"
                            : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIncentiveType("FIXED");
                          setDiscountVal(100);
                        }}
                        className={`py-2 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-all duration-300 ${
                          incentiveType === "FIXED"
                            ? "bg-primary text-obsidian-base font-semibold shadow-sm"
                            : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                        }`}
                      >
                        Fixed Amount (€)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-space-md">
                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                        {incentiveType === "PERCENTAGE" ? "Discount Percentage" : "Flat Discount Value"}
                      </label>
                      <div className="relative flex items-center mt-1">
                        <input
                          type="number"
                          value={discountVal}
                          onChange={(e) => setDiscountVal(Number(e.target.value))}
                          min="1"
                          max={incentiveType === "PERCENTAGE" ? 100 : undefined}
                          className="w-full h-11 bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular focus:outline-none shadow-[0_1px_0_0_#2A2A2E] focus:shadow-[0_1px_0_0_#F5F4F1] transition-shadow"
                        />
                        <span className="absolute right-0 text-text-on-dark-secondary font-data-tabular text-data-tabular pointer-events-none">
                          {incentiveType === "PERCENTAGE" ? "%" : "€"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                        Min Length Stay
                      </label>
                      <div className="relative flex items-center mt-1">
                        <input
                          type="text"
                          value={minNights}
                          onChange={(e) => setMinNights(e.target.value)}
                          className="w-full h-11 bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular focus:outline-none shadow-[0_1px_0_0_#2A2A2E] focus:shadow-[0_1px_0_0_#F5F4F1] transition-shadow"
                        />
                        <span className="absolute right-0 text-text-on-dark-secondary font-data-tabular text-data-tabular pointer-events-none">
                          MOONS
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-space-md">
                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                        Quota Ceiling
                      </label>
                      <div className="relative flex items-center mt-1">
                        <input
                          type="number"
                          value={quotaCeiling}
                          onChange={(e) => setQuotaCeiling(Number(e.target.value))}
                          className="w-full h-11 bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular focus:outline-none shadow-[0_1px_0_0_#2A2A2E] focus:shadow-[0_1px_0_0_#F5F4F1] transition-shadow"
                        />
                        <span className="absolute right-0 text-text-on-dark-secondary font-data-tabular text-data-tabular pointer-events-none">
                          USES
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                        Expiration Horizon
                      </label>
                      <div className="relative flex items-center mt-1">
                        <input
                          type="date"
                          value={expiresAtDate}
                          onChange={(e) => setExpiresAtDate(e.target.value)}
                          className="w-full h-11 bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular focus:outline-none shadow-[0_1px_0_0_#2A2A2E] focus:shadow-[0_1px_0_0_#F5F4F1] transition-shadow"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                      Sanctuary Allocation
                    </label>
                    <div className="relative flex items-center mt-1">
                      <select
                        value={sanctuaryScope}
                        onChange={(e) => setSanctuaryScope(e.target.value)}
                        className="w-full h-11 bg-transparent text-text-on-dark-primary font-data-tabular text-data-tabular focus:outline-none shadow-[0_1px_0_0_#2A2A2E] focus:shadow-[0_1px_0_0_#F5F4F1] transition-shadow cursor-pointer appearance-none"
                      >
                        <option className="bg-obsidian-elevated text-text-on-dark-primary">
                          All Balearic &amp; Iberian Sanctuaries
                        </option>
                        <option className="bg-obsidian-elevated text-text-on-dark-primary">
                          Menorca Nocturnal Compound Only
                        </option>
                        <option className="bg-obsidian-elevated text-text-on-dark-primary">
                          Atacama Desert Sky Observatory
                        </option>
                        <option className="bg-obsidian-elevated text-text-on-dark-primary">
                          Private Solitude Residencies (Tier IV)
                        </option>
                      </select>
                      <span className="material-symbols-outlined absolute right-0 text-[18px] text-text-on-dark-secondary pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>

                  <div className="pt-space-xs">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full h-[46px] rounded-full bg-primary text-obsidian-base font-label-caps-md text-label-caps-md uppercase tracking-[0.14em] flex items-center justify-center gap-2 hover:bg-canvas-outer transition-all duration-300 shadow-md group disabled:opacity-50"
                    >
                      <span>Deploy Campaign Code</span>
                      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </form>

                {/* REST Endpoints Indicator */}
                <div className="mt-space-sm pt-space-md border-t border-hairline-on-dark/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                      Rest Endpoints
                    </span>
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                      API v1.4
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 font-data-tabular text-[11px] leading-tight text-text-on-dark-secondary bg-obsidian-base/70 p-3 rounded-xl border border-hairline-on-dark/30">
                    <div className="flex items-center justify-between">
                      <span className="text-text-on-dark-primary">
                        <span className="text-state-success font-semibold">POST</span> /api/v1/coupons
                      </span>
                      <span className="opacity-60">Deploy</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-on-dark-primary">
                        <span className="text-secondary font-semibold">GET</span> /api/v1/coupons
                      </span>
                      <span className="opacity-60">Validate / Ledger</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-on-dark-primary">
                        <span className="text-state-error font-semibold">POST</span> /api/v1/coupons/&#123;id&#125;/deactivate
                      </span>
                      <span className="opacity-60">Revoke</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
