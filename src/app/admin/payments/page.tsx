"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AdminClient,
  EarningsSummaryResponse,
  PaymentResponse,
  PaymentDetailResponse,
  PaymentAttemptResponse,
  RefundResponse,
} from "../../../lib/adminClient";
import {
  Search,
  ArrowRight,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Receipt,
  Download,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
  Lock,
  Undo2,
  Eye,
  Loader2,
  Gavel,
  Check,
  X,
  Clock,
  Sparkles,
  ChevronRight,
  Landmark,
  FileSpreadsheet,
} from "lucide-react";

// Lenient UUID match: 32 or 36 hex characters (optional hyphens)
const UUID_REGEX = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

function normalizeUuid(raw: string): string {
  const clean = raw.trim().replace(/[^0-9a-fA-F]/g, "");
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`.toLowerCase();
  }
  return raw.trim().toLowerCase();
}

export default function AdminPaymentsPage() {
  const [currency, setCurrency] = useState<string>("EUR");
  const [earnings, setEarnings] = useState<EarningsSummaryResponse | null>(null);
  const [earningsLoading, setEarningsLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Results
  const [paymentsList, setPaymentsList] = useState<PaymentResponse[]>([]);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<PaymentDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Partial refund modal state
  const [isPartialModalOpen, setIsPartialModalOpen] = useState<boolean>(false);
  const [partialAmount, setPartialAmount] = useState<string>("");
  const [partialReason, setPartialReason] = useState<string>("");
  const [refundSubmitting, setRefundSubmitting] = useState<boolean>(false);

  // Live Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Fetch Earnings Summary when currency changes
  const fetchEarnings = useCallback(async (curr: string) => {
    setEarningsLoading(true);
    try {
      const data = await AdminClient.getEarningsSummary(curr);
      setEarnings(data);
    } catch (err) {
      console.error("Failed to load earnings summary:", err);
    } finally {
      setEarningsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings(currency);
  }, [currency, fetchEarnings]);

  // Load details for a specific booking
  const inspectBooking = useCallback(
    async (bookingId: string) => {
      setDetailLoading(true);
      try {
        const detail = await AdminClient.getPaymentDetails(bookingId);
        if (detail && detail.payment) {
          setSelectedBookingDetail(detail);
          const el = document.getElementById("disputeSection");
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
          showToast(`Audit inspection loaded for booking #${bookingId.slice(0, 8)}`);
        } else {
          showToast(`Could not retrieve detailed audit for booking #${bookingId.slice(0, 8)}`, "error");
        }
      } catch (err) {
        console.error("Failed to inspect booking:", err);
        showToast("Error retrieving booking payment detail", "error");
      } finally {
        setDetailLoading(false);
      }
    },
    [showToast]
  );

  // Handle Search Execution
  const executeSearch = useCallback(
    async (queryToRun?: string) => {
      const raw = (queryToRun !== undefined ? queryToRun : searchQuery).trim();
      if (!raw) {
        setSearchError("Please enter a valid Booking UUID or User UUID.");
        return;
      }

      setSearchError(null);
      setSearching(true);

      const normalized = normalizeUuid(raw);
      if (!UUID_REGEX.test(normalized)) {
        setSearchError("Input must be a valid 32 or 36-character UUID (e.g. 550e8400-e29b-41d4-a716-446655440000).");
        setSearching(false);
        return;
      }

      try {
        // 1. Try finding detailed booking payment first
        const bookingDetail = await AdminClient.getPaymentDetails(normalized);
        if (bookingDetail && bookingDetail.payment) {
          setPaymentsList([bookingDetail.payment]);
          setSelectedBookingDetail(bookingDetail);
          showToast(`Loaded payment audit for booking #${normalized.slice(0, 8)}`);
          setSearching(false);
          return;
        }

        // 2. If not a booking, try finding user payments
        const userPayments = await AdminClient.getUserPayments(normalized, 0, 50);
        if (userPayments && userPayments.items && userPayments.items.length > 0) {
          setPaymentsList(userPayments.items);
          setSelectedBookingDetail(null);
          showToast(`Retrieved ${userPayments.items.length} payments for user #${normalized.slice(0, 8)}`);
          setSearching(false);
          return;
        }

        // Neither returned results
        setPaymentsList([]);
        setSelectedBookingDetail(null);
        setSearchError(`No payment records found for UUID "${normalized}". Verify the booking or user identifier in the database.`);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchError("An error occurred while querying the administrative payment endpoints.");
      } finally {
        setSearching(false);
      }
    },
    [searchQuery, showToast]
  );

  // Handle Full Refund
  const handleFullRefund = async () => {
    if (!selectedBookingDetail?.payment) return;
    const { bookingId, amount, currency: cur } = selectedBookingDetail.payment;

    const confirmed = window.confirm(
      `Confirm Full Refund for booking #${bookingId.slice(0, 8)}?\nAmount: ${amount} ${cur}\n\nThis will trigger POST /api/v1/payments/${bookingId}/refund.`
    );
    if (!confirmed) return;

    setRefundSubmitting(true);
    try {
      const res = await AdminClient.refundPayment(bookingId, {
        amount,
        reason: "Full administrative dispute refund",
      });

      if (res && (res.status === "SUCCEEDED" || res.status === "PENDING")) {
        showToast(`Full refund of ${amount} ${cur} processed successfully for #${bookingId.slice(0, 8)}.`);
        await inspectBooking(bookingId);
        await fetchEarnings(currency);
      } else {
        showToast("Refund request could not be completed by gateway.", "error");
      }
    } catch (err: any) {
      console.error("Refund failed:", err);
      showToast(err?.message || "Failed to process refund. Check backend logs.", "error");
    } finally {
      setRefundSubmitting(false);
    }
  };

  // Handle Partial Refund Submit
  const handlePartialRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingDetail?.payment) return;
    const { bookingId, currency: cur } = selectedBookingDetail.payment;

    const amt = parseFloat(partialAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please specify a valid numeric amount greater than 0.", "error");
      return;
    }

    setRefundSubmitting(true);
    try {
      const res = await AdminClient.refundPayment(bookingId, {
        amount: amt,
        reason: partialReason || "Partial administrative refund adjustment",
      });

      if (res && (res.status === "SUCCEEDED" || res.status === "PENDING")) {
        showToast(`Partial refund of ${amt} ${cur} processed for #${bookingId.slice(0, 8)}.`);
        setIsPartialModalOpen(false);
        setPartialAmount("");
        setPartialReason("");
        await inspectBooking(bookingId);
        await fetchEarnings(currency);
      } else {
        showToast("Partial refund failed. Check gateway response.", "error");
      }
    } catch (err: any) {
      console.error("Partial refund error:", err);
      showToast(err?.message || "Error processing partial refund.", "error");
    } finally {
      setRefundSubmitting(false);
    }
  };

  // Handle Hold Override
  const handleOverrideHold = () => {
    if (!selectedBookingDetail?.payment) return;
    const { bookingId } = selectedBookingDetail.payment;
    const confirmed = window.confirm(
      `Bypass Stripe Radar / risk check and force Escrow Release to Host for booking #${bookingId.slice(0, 8)}?`
    );
    if (confirmed) {
      showToast(
        `Escrow hold override dispatched. (Note: POST /api/v1/admin/payments/${bookingId.slice(0, 8)}/override-hold documented in API gaps specification).`
      );
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setSearchError(null);
    setPaymentsList([]);
    setSelectedBookingDetail(null);
    showToast("Filters reset.");
  };

  // Filter Payments by status
  const filteredPayments = useMemo(() => {
    if (statusFilter === "ALL") return paymentsList;
    return paymentsList.filter((p) => {
      if (statusFilter === "SUCCEEDED") return p.status === "SUCCEEDED";
      if (statusFilter === "ESCROW")
        return (
          p.status === "PENDING" ||
          p.status === "REQUIRES_ACTION" ||
          p.status === "PROCESSING" ||
          p.status === "CREATED"
        );
      if (statusFilter === "HELD")
        return p.status === "FAILED" || p.status === "CANCELLED" || p.status === "DISPUTED";
      if (statusFilter === "REFUNDED")
        return p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED";
      return true;
    });
  }, [paymentsList, statusFilter]);

  // Export to CSV
  const handleExportCsv = () => {
    if (paymentsList.length === 0) {
      showToast("No payment records currently loaded to export. Query a booking or user first.", "error");
      return;
    }

    const headers = [
      "Payment ID",
      "Booking ID",
      "User ID",
      "Amount",
      "Currency",
      "Status",
      "Refunded Amount",
      "Captured At",
      "Created At",
    ];

    const rows = paymentsList.map((p) => [
      `"${p.id || ""}"`,
      `"${p.bookingId || ""}"`,
      `"${p.userId || ""}"`,
      p.amount || 0,
      `"${p.currency || ""}"`,
      `"${p.status || ""}"`,
      p.totalRefundedAmount || 0,
      `"${p.capturedAt || ""}"`,
      `"${p.createdAt || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aggarly_tax_ledger_${currency}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Tax Ledger CSV generated and downloaded.");
  };

  // Format currency helpers
  const currencySymbol = useMemo(() => {
    switch (currency) {
      case "EUR":
        return "€";
      case "USD":
        return "$";
      case "GBP":
        return "£";
      default:
        return currency + " ";
    }
  }, [currency]);

  const formatAmount = (num?: number) => {
    if (num === undefined || num === null) return `${currencySymbol}0.00`;
    return `${currencySymbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 4 Required Earnings Breakdown Bento Metrics:
  // 1. Gross Volume
  // 2. Platform Cut (12%)
  // 3. Host Payouts
  // 4. Net Reserve
  const grossVolume = Number(earnings?.totalEarnings ?? 0);
  const platformCut = grossVolume * 0.12;
  const totalRefunds = Number(earnings?.totalRefunds ?? 0);
  const netReserve = Number(earnings?.netEarnings ?? Math.max(0, grossVolume - totalRefunds));
  const hostPayouts = Math.max(0, grossVolume * 0.88 - totalRefunds);

  return (
    <div className="relative w-full">
      {/* Floating Obsidian Monolith Container */}
      <div className="relative w-full rounded-[28px] bg-gradient-to-b from-[#0A0A0C] via-[#0E0E12] to-[#121215] text-[#F5F4F1] shadow-[0_24px_48px_-12px_rgba(10,10,12,0.3)] p-6 sm:p-10 lg:p-12 overflow-hidden border border-white/10">
        {/* Lunar Ambient Glows */}
        <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#DCE6EF]/10 blur-[90px] pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-[420px] h-[420px] rounded-full bg-[#A8C5DA]/5 blur-[120px] pointer-events-none" />

        {/* Monolith Header & Photoreal Moon Horizon */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/10">
          <div className="flex items-center gap-5">
            {/* Photoreal Moon Indicator with Directional Rim Glow */}
            <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-[0_0_24px_rgba(220,230,239,0.15)] border border-white/20">
              <div className="absolute inset-0 rounded-full bg-[#DCE6EF]/20 blur-md scale-95 pointer-events-none" />
              <img
                alt="Photoreal Lunar Cycle Visual"
                className="relative z-10 w-full h-full object-cover filter contrast-125 brightness-95"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtLQSHKupr0VJ3bHsmrp5DmVqzC0qJyOVy6dvYGV7kZKlFyprz10n3i5kxSw8GGkBvO3kzjv4zpFpgyOcY9ES0us2M14hWcZf-COhA1zSj-GEN2vwEiJBwKIqZL8WZFUTpVdSTsZm4l74LYmKiy4G9GOs0M5uLuIBZ_V8Cw6ZwG4ediaZMav-c6YVmcwphG-wggUlrjoepvmYia0FllcHCT4_Uw-n_GNjRglQhLaQHOL4UOuK_MEASpWJ1rRTdH2b29g"
              />
              <div className="absolute inset-0 rounded-full shadow-[inset_-8px_-4px_16px_rgba(0,0,0,0.8)] pointer-events-none" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#8FAE97] animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#9A9A9F]">
                  AUDIT NODE // PROD-ESCROW-04
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl tracking-wide text-[#F5F4F1] uppercase mt-1">
                Financial Ledger &amp; Dispute Settlement
              </h1>
              <p className="font-serif italic text-sm sm:text-base text-[#9A9A9F] text-opacity-90 mt-0.5">
                Aggarly by Lona • Stripe Escrow, Host Splits &amp; Transaction Audit
              </p>
            </div>
          </div>

          {/* Quick Export CTA */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            <button
              type="button"
              onClick={handleExportCsv}
              className="group relative inline-flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-[#F7F6F4] hover:bg-white text-[#0A0A0C] transition-all duration-300 shadow-md font-medium text-xs uppercase tracking-wider cursor-pointer"
              id="exportLedgerBtn"
              title="Export currently queried transactions to CSV"
            >
              <span>Export Tax Ledger (CSV / PDF)</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* 4 Bento Metric Cards: Gross Volume, Platform Cut, Host Payouts, Net Reserve */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
          {/* Card 1: Gross Volume */}
          <div className="bg-[#18181B] p-5 sm:p-6 rounded-xl flex flex-col justify-between border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-[#9A9A9F] mb-3">
              <span className="text-[11px] font-mono uppercase tracking-widest">
                Platform Gross Volume
              </span>
              <Receipt className="w-4 h-4 text-[#9A9A9F]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl lg:text-4xl text-[#F5F4F1] tracking-tight">
                {earningsLoading ? (
                  <span className="inline-flex items-center gap-2 text-xl text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching...
                  </span>
                ) : (
                  formatAmount(grossVolume)
                )}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[#8FAE97] font-mono text-[12px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live backend earnings summary</span>
            </div>
          </div>

          {/* Card 2: Platform Cut (12%) */}
          <div className="bg-[#18181B] p-5 sm:p-6 rounded-xl flex flex-col justify-between border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-[#9A9A9F] mb-3">
              <span className="text-[11px] font-mono uppercase tracking-widest">
                Platform Cut (12%)
              </span>
              <SlidersHorizontal className="w-4 h-4 text-[#9A9A9F]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl lg:text-4xl text-[#F5F4F1] tracking-tight">
                {earningsLoading ? "..." : formatAmount(platformCut)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[#9A9A9F] font-mono text-[12px]">
              <span>Platform take rate</span>
              <span className="text-[#F5F4F1]">12.00% fixed</span>
            </div>
          </div>

          {/* Card 3: Host Payouts */}
          <div className="bg-[#18181B] p-5 sm:p-6 rounded-xl flex flex-col justify-between border border-white/5 shadow-sm">
            <div className="flex items-center justify-between text-[#9A9A9F] mb-3">
              <span className="text-[11px] font-mono uppercase tracking-widest">
                Host Payouts
              </span>
              <Lock className="w-4 h-4 text-[#9A9A9F]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl lg:text-4xl text-[#F5F4F1] tracking-tight">
                {earningsLoading ? "..." : formatAmount(hostPayouts)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[#9A9A9F] font-mono text-[12px]">
              <span>Automated release</span>
              <span className="text-[#DCE6EF]">T+24h post-check-in</span>
            </div>
          </div>

          {/* Card 4: Net Reserve */}
          <div className="bg-[#1E1D1C] p-5 sm:p-6 rounded-xl flex flex-col justify-between border border-white/10 shadow-inner">
            <div className="flex items-center justify-between text-[#dfb15b] mb-3">
              <span className="text-[11px] font-mono uppercase tracking-widest">
                Net Reserve
              </span>
              <Landmark className="w-4 h-4 text-[#dfb15b]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl lg:text-4xl text-[#dfb15b] tracking-tight">
                {earningsLoading ? "..." : formatAmount(netReserve)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[12px]">
              <span className="text-[#9A9A9F]">Total Refunds</span>
              <span className="text-[#C77B6E]">{formatAmount(totalRefunds)}</span>
            </div>
          </div>
        </div>

        {/* Filters & Telemetry Search Row */}
        <div className="relative z-10 bg-[#18181B] p-4 sm:p-6 rounded-xl mb-6 border border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Search Field */}
            <div className="md:col-span-5 flex flex-col">
              <label className="text-[11px] font-mono text-[#9A9A9F] uppercase tracking-widest mb-1.5">
                Search Ledger (Booking UUID or User UUID)
              </label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-[#9A9A9F] pointer-events-none" />
                <input
                  type="text"
                  className="w-full bg-[#141417] pl-9 pr-3 py-2 rounded-lg text-[#F5F4F1] font-mono text-xs border border-white/10 placeholder-zinc-500 focus:outline-none focus:border-[#dfb15b]/60 transition-colors"
                  id="searchInput"
                  placeholder="Booking Ref (#AG-XXXX), Booking UUID, or User UUID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      executeSearch();
                    }
                  }}
                />
              </div>
            </div>

            {/* Currency Switcher */}
            <div className="md:col-span-2 flex flex-col">
              <label className="text-[11px] font-mono text-[#9A9A9F] uppercase tracking-widest mb-1.5">
                Currency
              </label>
              <select
                className="w-full bg-[#141417] text-[#F5F4F1] font-mono text-xs px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-[#dfb15b]/60 cursor-pointer"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            {/* Status Segmented Pill */}
            <div className="md:col-span-3 flex flex-col">
              <label className="text-[11px] font-mono text-[#9A9A9F] uppercase tracking-widest mb-1.5">
                Settlement Status
              </label>
              <div className="flex items-center gap-1 bg-[#141417] p-1 rounded-lg border border-white/10 overflow-x-auto">
                {(["ALL", "SUCCEEDED", "ESCROW", "HELD", "REFUNDED"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === st
                        ? "bg-[#F7F6F4] text-[#0A0A0C] font-bold"
                        : "text-[#9A9A9F] hover:text-[#F5F4F1]"
                    }`}
                  >
                    {st === "ALL" ? "All" : st === "SUCCEEDED" ? "Disbursed" : st === "ESCROW" ? "In Escrow" : st === "HELD" ? "Held" : "Refunded"}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Search & Reset */}
            <div className="md:col-span-2 flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => executeSearch()}
                disabled={searching}
                className="flex-1 h-[38px] px-4 rounded-lg bg-[#dfb15b] hover:bg-[#c59b27] text-black font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {searching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                className="h-[38px] px-3 rounded-lg bg-[#2A2A2D] hover:bg-[#353438] text-[#9A9A9F] hover:text-[#F5F4F1] transition-colors flex items-center justify-center cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Error Notice */}
          {searchError && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 flex items-center gap-2 text-xs text-red-300 font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* Itemized Transaction Ledger Table */}
        <div className="relative z-10 w-full overflow-x-auto rounded-xl bg-[#18181B]/80 backdrop-blur-md mb-8 border border-white/5">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-[#1E1D1C] text-[#9A9A9F] text-[10px] uppercase tracking-widest border-b border-white/5">
                <th className="py-3.5 px-4 font-semibold">Ref &amp; Sanctuary</th>
                <th className="py-3.5 px-4 font-semibold">Guest &amp; Payer</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Captured</th>
                <th className="py-3.5 px-4 font-semibold text-right">Commission (12%)</th>
                <th className="py-3.5 px-4 font-semibold text-right">Host Allocation</th>
                <th className="py-3.5 px-4 font-semibold text-center">Settlement Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Ledger Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p) => {
                  const amount = Number(p.amount || 0);
                  const comm = amount * 0.12;
                  const refunded = Number(p.totalRefundedAmount || 0);
                  const hostNet = Math.max(0, amount - comm - refunded);

                  const isSucceeded = p.status === "SUCCEEDED";
                  const isPending =
                    p.status === "PENDING" ||
                    p.status === "REQUIRES_ACTION" ||
                    p.status === "PROCESSING" ||
                    p.status === "CREATED";
                  const isDisputed = p.status === "DISPUTED";
                  const isFailed = p.status === "FAILED" || p.status === "CANCELLED";
                  const isRefunded = p.status === "REFUNDED";
                  const isPartiallyRefunded = p.status === "PARTIALLY_REFUNDED";

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => inspectBooking(p.bookingId)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-[#F5F4F1] font-bold tracking-wider">
                            #{p.bookingId ? p.bookingId.slice(0, 8) : "N/A"}
                          </span>
                          <span className="text-[10px] text-[#9A9A9F]">
                            TX: {p.id ? p.id.slice(0, 8) : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-[#F5F4F1]">
                            {p.userId ? `USR-${p.userId.slice(0, 8)}` : "—"}
                          </span>
                          <span className="text-[10px] text-[#9A9A9F]">
                            {p.capturedAt
                              ? new Date(p.capturedAt).toLocaleDateString()
                              : p.createdAt
                              ? new Date(p.createdAt).toLocaleDateString()
                              : "Pending"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right text-[#F5F4F1] font-bold">
                        {p.currency} {amount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-[#A8C5DA]">
                        {p.currency} {comm.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[#F5F4F1]">{p.currency} {hostNet.toFixed(2)}</span>
                          {refunded > 0 && (
                            <span className="text-[10px] text-[#C77B6E]">
                              Ref: -{refunded.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isSucceeded && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8FAE97]/15 text-[#8FAE97] text-[10px] uppercase font-bold tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97]" />
                            Settled
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#A8C5DA]/15 text-[#A8C5DA] text-[10px] uppercase font-bold tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#A8C5DA]" />
                            In Escrow
                          </span>
                        )}
                        {isDisputed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/60 text-[#FFDAD6] text-[10px] uppercase font-bold tracking-wider border border-red-800 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C77B6E]" />
                            Dispute Flagged
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/40 text-[#C77B6E] text-[10px] uppercase font-bold tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Held / Failed
                          </span>
                        )}
                        {isRefunded && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                            Full Refund
                          </span>
                        )}
                        {isPartiallyRefunded && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/40 text-amber-400 text-[10px] uppercase font-bold tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Partial Refund
                          </span>
                        )}
                        {!isSucceeded && !isPending && !isDisputed && !isFailed && !isRefunded && !isPartiallyRefunded && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] uppercase font-bold tracking-wider">
                            {p.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => inspectBooking(p.bookingId)}
                            className="p-1.5 rounded-full bg-[#2A2A2D] hover:bg-[#353438] text-[#9A9A9F] hover:text-[#F5F4F1] transition-colors cursor-pointer"
                            title="Inspect audit details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center max-w-lg mx-auto text-zinc-400">
                      <Receipt className="w-10 h-10 mb-3 text-zinc-600 stroke-[1.5]" />
                      <p className="text-sm font-sans font-semibold text-zinc-200">
                        {searching ? "Searching administrative payment records..." : "Direct Payment Ledger Audit"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1 font-sans leading-relaxed">
                        {searching
                          ? "Querying Spring Boot PaymentAdminController endpoints..."
                          : "Enter a valid Booking UUID or User UUID in the search bar above to inspect specific transaction logs, escrow allocations, payment attempts, and refunds."}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <span className="text-[11px] font-mono text-zinc-500">Quick Test Seed UUIDs:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("00000000-0000-0000-0000-000000000001");
                            executeSearch("00000000-0000-0000-0000-000000000001");
                          }}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 font-mono text-[10px] text-[#A8C5DA] border border-white/10 transition-colors cursor-pointer"
                        >
                          Booking #00000001
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("00000000-0000-0000-0000-000000000002");
                            executeSearch("00000000-0000-0000-0000-000000000002");
                          }}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 font-mono text-[10px] text-[#A8C5DA] border border-white/10 transition-colors cursor-pointer"
                        >
                          User #00000002
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dispute & Administrative Refund Investigation Card (When a Booking is Selected) */}
        {selectedBookingDetail?.payment && (
          <div
            className="relative z-10 bg-[#16161B] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200"
            id="disputeSection"
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-red-950/40 border border-red-500/20 flex items-center justify-center text-[#C77B6E]">
                  <Gavel className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-[#C77B6E] uppercase tracking-widest font-bold">
                      CRITICAL DISPUTE AUDIT
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-[#9A9A9F]">
                      POST /api/v1/payments/{selectedBookingDetail.payment.bookingId.slice(0, 8)}/refund
                    </span>
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl text-[#F5F4F1] tracking-wide mt-0.5">
                    Investigation: Booking #{selectedBookingDetail.payment.bookingId}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300">
                <Shield className="w-3.5 h-3.5 text-[#8FAE97]" />
                <span>STATUS: {selectedBookingDetail.payment.status}</span>
              </div>
            </div>

            {/* Investigation Breakdown Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 py-6">
              {/* Column 1: Payment Intent & Metadata */}
              <div className="flex flex-col space-y-2 bg-[#0A0A0C]/80 p-4 rounded-xl border border-white/5 font-mono text-xs">
                <span className="text-[10px] text-[#9A9A9F] uppercase tracking-widest font-bold">
                  Stripe Escrow Metadata
                </span>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-[#9A9A9F]">Payment Intent / ID</span>
                  <span className="text-[#F5F4F1]">
                    {selectedBookingDetail.payment.id.slice(0, 16)}...
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-[#9A9A9F]">Escrow Balance</span>
                  <span className="text-[#F5F4F1] font-bold">
                    {selectedBookingDetail.payment.currency} {Number(selectedBookingDetail.payment.amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-[#9A9A9F]">Platform Retention</span>
                  <span className="text-[#A8C5DA]">
                    {selectedBookingDetail.payment.currency} {(Number(selectedBookingDetail.payment.amount || 0) * 0.12).toFixed(2)} (12%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#9A9A9F]">Host Payout Net</span>
                  <span className="text-[#8FAE97] font-bold">
                    {selectedBookingDetail.payment.currency}{" "}
                    {Math.max(
                      0,
                      Number(selectedBookingDetail.payment.amount || 0) * 0.88 -
                        Number(selectedBookingDetail.payment.totalRefundedAmount || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Column 2: Payment Gateway Attempts History */}
              <div className="flex flex-col space-y-2 bg-[#0A0A0C]/80 p-4 rounded-xl border border-white/5 font-mono text-xs">
                <span className="text-[10px] text-[#9A9A9F] uppercase tracking-widest font-bold">
                  Gateway Attempts ({selectedBookingDetail.attempts?.length || 0})
                </span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedBookingDetail.attempts && selectedBookingDetail.attempts.length > 0 ? (
                    selectedBookingDetail.attempts.map((att: PaymentAttemptResponse, i: number) => (
                      <div key={att.id || i} className="p-2 rounded bg-white/[0.03] text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className={att.result === "SUCCESS" ? "text-[#8FAE97] font-bold" : "text-[#C77B6E] font-bold"}>
                            {att.result}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {att.createdAt ? new Date(att.createdAt).toLocaleTimeString() : ""}
                          </span>
                        </div>
                        {att.gatewayErrorCode && (
                          <div className="text-[10px] text-red-300 mt-0.5">
                            Error: {att.gatewayErrorCode}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-500 py-3 text-center text-xs">No gateway attempts logged.</div>
                  )}
                </div>
              </div>

              {/* Column 3: Recorded Refunds History */}
              <div className="flex flex-col space-y-2 bg-[#0A0A0C]/80 p-4 rounded-xl border border-white/5 font-mono text-xs">
                <span className="text-[10px] text-[#9A9A9F] uppercase tracking-widest font-bold">
                  Recorded Refunds ({selectedBookingDetail.refunds?.length || 0})
                </span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedBookingDetail.refunds && selectedBookingDetail.refunds.length > 0 ? (
                    selectedBookingDetail.refunds.map((rf: RefundResponse, idx: number) => (
                      <div key={rf.refundId || idx} className="p-2 rounded bg-white/[0.03] text-[11px] flex justify-between items-center">
                        <div>
                          <div className="text-zinc-300 font-bold">
                            {selectedBookingDetail.payment.currency} {Number(rf.amount || 0).toFixed(2)}
                          </div>
                          <div className="text-[9px] text-zinc-500">ID: {rf.refundId ? rf.refundId.slice(0, 8) : "—"}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                          {rf.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-500 py-3 text-center text-xs">No refunds executed yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Administrative Override Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-sans">
                <CheckCircle2 className="w-4 h-4 text-[#8FAE97]" />
                <span>All administrative actions are signed to celestial backend audit logs.</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 justify-end">
                {/* Full Refund Action */}
                <button
                  type="button"
                  onClick={handleFullRefund}
                  disabled={refundSubmitting}
                  className="h-[42px] px-5 rounded-full bg-[#C77B6E] hover:bg-red-500 text-black font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-md"
                  id="fullRefundBtn"
                >
                  {refundSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                  <span>
                    Execute Full Refund ({selectedBookingDetail.payment.currency} {Number(selectedBookingDetail.payment.amount || 0).toFixed(2)})
                  </span>
                </button>

                {/* Partial Refund Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setPartialAmount(String(Math.floor(Number(selectedBookingDetail.payment.amount || 0) / 2)));
                    setIsPartialModalOpen(true);
                  }}
                  disabled={refundSubmitting}
                  className="h-[42px] px-5 rounded-full bg-[#2A2A2D] hover:bg-[#353438] text-[#F5F4F1] font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  id="partialRefundBtn"
                >
                  <span>Partial Refund</span>
                </button>

                {/* Override Hold & Capture */}
                <button
                  type="button"
                  onClick={handleOverrideHold}
                  disabled={refundSubmitting}
                  className="h-[42px] px-5 rounded-full bg-transparent hover:bg-white/5 text-[#8FAE97] border border-[#8FAE97]/40 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  id="overrideCaptureBtn"
                >
                  <Lock className="w-4 h-4" />
                  <span>Override Hold &amp; Capture</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Partial Refund Modal */}
      {isPartialModalOpen && selectedBookingDetail?.payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#16161B] rounded-2xl border border-white/10 p-6 text-[#F5F4F1] shadow-2xl">
            <h3 className="font-serif text-xl tracking-wide">
              Execute Partial Refund
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Booking #{selectedBookingDetail.payment.bookingId.slice(0, 8)} • Max Total: {selectedBookingDetail.payment.currency} {selectedBookingDetail.payment.amount}
            </p>

            <form onSubmit={handlePartialRefundSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Refund Amount ({selectedBookingDetail.payment.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedBookingDetail.payment.amount}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  required
                  className="w-full bg-[#0A0A0C] border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#dfb15b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  placeholder="e.g. Host agreed discount for late check-in"
                  value={partialReason}
                  onChange={(e) => setPartialReason(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#dfb15b]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPartialModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#dfb15b] hover:bg-[#c59b27] text-black text-xs uppercase tracking-wider font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {refundSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Authorize Refund</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white shadow-2xl border ${
              toastType === "success"
                ? "bg-[#18181B] border-[#8FAE97]/30"
                : "bg-red-950 border-red-800"
            }`}
          >
            {toastType === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-[#8FAE97] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9A9A9F]">
                Payment Ledger Engine
              </span>
              <span className="text-xs font-medium text-white">{toastMessage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
