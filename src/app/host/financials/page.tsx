"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import {
  HostClient,
  HostFinancialsSummaryDto,
  SettlementLedgerItemDto,
  TaxStatementDto,
} from "@/lib/hostClient";

const INITIAL_SUMMARY: HostFinancialsSummaryDto = {
  grossBookingVolume: 0,
  netHostEarnings: 0,
  pendingEscrow: 0,
  disbursedYtd: 0,
  currency: "EUR",
  takeRatePercentage: 12.0,
  bankAccountMasked: "Verified Payout Account",
  nextScheduledPayoutDate: "No pending payout",
  nextScheduledPayoutAmount: 0,
};

export default function HostFinancialsPage() {
  const [summary, setSummary] = useState<HostFinancialsSummaryDto>(INITIAL_SUMMARY);
  const [ledger, setLedger] = useState<SettlementLedgerItemDto[]>([]);
  const [taxStatements, setTaxStatements] = useState<TaxStatementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sanctuaryFilter, setSanctuaryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DISBURSED" | "ESCROW">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const loadFinancials = async () => {
      try {
        setLoading(true);
        const [sumRes, ledgRes, taxRes] = await Promise.all([
          HostClient.getHostFinancialsSummary(),
          HostClient.getHostSettlementLedger(),
          HostClient.getTaxStatements(),
        ]);
        if (sumRes) setSummary(sumRes);
        if (ledgRes) setLedger(ledgRes);
        if (taxRes) setTaxStatements(taxRes);
      } catch (err) {
        console.error("Host financials load error", err);
      } finally {
        setLoading(false);
      }
    };
    loadFinancials();
  }, []);

  const filteredLedger = ledger.filter((item) => {
    if (sanctuaryFilter !== "all" && !item.sanctuaryTitle.toLowerCase().includes(sanctuaryFilter.toLowerCase())) {
      return false;
    }
    if (statusFilter === "DISBURSED" && item.status !== "DISBURSED") return false;
    if (statusFilter === "ESCROW" && item.status !== "IN_ESCROW" && item.status !== "ESCROW_SECURED") return false;
    return true;
  });

  return (
    <div className="bg-canvas-outer min-h-screen flex flex-col justify-between text-text-on-light-primary selection:bg-surface-container selection:text-text-on-dark-primary">
      <LonaHeader />

      <main className="w-full pt-20 bg-canvas-outer min-h-[calc(100vh-80px)] flex flex-col justify-center">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-8 right-8 z-50 transition-all duration-300">
            <div className="px-5 py-3 rounded-full bg-text-on-dark-primary text-obsidian-base font-label-caps-sm uppercase tracking-widest shadow-2xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-state-success">check_circle</span>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col w-full py-space-xl px-card-margin-mobile lg:px-card-margin-desktop items-center">
          {/* Monolithic Obsidian Island Container */}
          <div className="w-full max-w-6xl rounded-[28px] bg-gradient-to-b from-obsidian-base to-[#121215] shadow-2xl p-card-padding-mobile lg:p-card-padding-desktop flex flex-col gap-space-2xl relative overflow-hidden text-text-on-dark-primary border border-hairline-on-dark">
            {/* Directional Lunar Glow Bleed */}
            <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#DCE6EF]/10 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-[#DCE6EF]/5 blur-3xl pointer-events-none" />

            {/* Header Section */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg relative z-10">
              <div className="flex items-start gap-space-md">
                <div className="relative shrink-0 w-11 h-11 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#DCE6EF]/20 blur-md scale-125" />
                  <div className="relative z-10 w-11 h-11 rounded-full bg-obsidian-elevated flex items-center justify-center border border-hairline-on-dark">
                    <span className="material-symbols-outlined text-text-on-dark-primary text-[22px]">
                      account_balance_wallet
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                      TREASURY &amp; DISBURSEMENTS
                    </span>
                    <span className="text-hairline-on-dark text-xs">•</span>
                    <span className="font-data-tabular text-[11px] text-state-success uppercase tracking-wider">
                      STRIPE CONNECT REALTIME
                    </span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg tracking-wider text-text-on-dark-primary mt-1">
                    FINANCIALS, PAYOUTS &amp; DISBURSEMENTS
                  </h1>
                  <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary mt-0.5">
                    Aggarly by Lona • Stripe Connect Escrow, Host Splits &amp; Accounting Ledgers
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-space-sm pt-2 lg:pt-0">
                <button
                  onClick={() => showToast("Exporting tax ledger CSV/PDF bundle...")}
                  className="group flex items-center justify-center gap-space-xs px-space-lg h-[46px] rounded-full bg-[#F7F6F4] text-obsidian-base font-label-caps-md text-label-caps-md uppercase tracking-wider hover:bg-canvas-outer transition-all duration-300"
                  type="button"
                >
                  <span>EXPORT TAX LEDGER (CSV/PDF)</span>
                  <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
                <button
                  onClick={() => showToast("Opening Stripe Connect onboarding dashboard...")}
                  className="flex items-center justify-center gap-space-xs px-space-md h-[46px] rounded-full bg-obsidian-elevated border border-hairline-on-dark text-text-on-dark-primary font-label-caps-md text-label-caps-md uppercase tracking-wider hover:bg-surface-container-high transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px] text-text-on-dark-secondary">
                    settings
                  </span>
                  <span>STRIPE CONNECT</span>
                </button>
              </div>
            </header>

            {/* KPI Summary Row */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md relative z-10">
              <div className="flex flex-col justify-between p-space-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider">
                    Gross Booking Volume
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-on-dark-secondary">
                    pie_chart
                  </span>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-md text-headline-md tracking-wider text-text-on-dark-primary">
                    €{summary.grossBookingVolume.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-space-2xs mt-1">
                    <span className="material-symbols-outlined text-[15px] text-state-success">arrow_upward</span>
                    <span className="font-data-tabular text-data-tabular text-state-success">+14.2%</span>
                    <span className="font-body-sm text-body-sm text-text-on-dark-secondary ml-1">
                      vs previous cycle
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between p-space-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider">
                    Net Host Earnings
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-on-dark-secondary">
                    account_balance_wallet
                  </span>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-md text-headline-md tracking-wider text-text-on-dark-primary">
                    €{summary.netHostEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-space-2xs mt-1">
                    <span className="font-body-sm text-body-sm text-text-on-dark-secondary">
                      Take rate ({summary.takeRatePercentage}%) deducted
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between p-space-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider">
                    Pending Escrow
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-on-dark-secondary">
                    hourglass_top
                  </span>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-md text-headline-md tracking-wider text-text-on-dark-primary">
                    €{summary.pendingEscrow.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-space-2xs mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DCE6EF]" />
                    <span className="font-body-sm text-body-sm text-text-on-dark-secondary">
                      Auto-disburse T+24h post check-in
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between p-space-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider">
                    Disbursed YTD
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-on-dark-secondary">
                    check_circle
                  </span>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-md text-headline-md tracking-wider text-text-on-dark-primary">
                    €{summary.disbursedYtd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-space-2xs mt-1">
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                      {summary.bankAccountMasked || "Santander IBAN •••• 4912"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Stripe Connect Status Banner */}
            <section className="p-space-lg rounded-2xl bg-[#141418] border border-hairline-on-dark relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-obsidian-elevated border border-hairline-on-dark flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-text-on-dark-primary text-[24px]">
                    verified_user
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="font-label-caps-md text-label-caps-md uppercase tracking-wider text-text-on-dark-primary">
                      Lona Sanctuaries SL
                    </span>
                    <span className="px-space-xs py-0.5 rounded-full bg-state-success/10 text-state-success font-label-caps-sm text-label-caps-sm uppercase">
                      Active &amp; Verified
                    </span>
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                      acct_1Nx8829Aggarly
                    </span>
                  </div>
                  <div className="flex items-center gap-space-md text-text-on-dark-secondary mt-1 flex-wrap">
                    <div className="flex items-center gap-space-2xs">
                      <span className="font-label-caps-sm text-label-caps-sm uppercase">Schedule:</span>
                      <span className="font-data-tabular text-data-tabular text-text-on-dark-primary">
                        Daily Rolling (T+1)
                      </span>
                    </div>
                    <span className="text-hairline-on-dark text-xs">•</span>
                    <div className="flex items-center gap-space-2xs">
                      <span className="font-label-caps-sm text-label-caps-sm uppercase">Next Scheduled:</span>
                      <span className="font-data-tabular text-data-tabular text-[#DCE6EF]">
                        €4,020.00 arriving tomorrow
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-space-sm self-end lg:self-center shrink-0">
                <button
                  onClick={() => showToast("Bank accounts modal opened")}
                  className="px-space-md h-10 rounded-full bg-obsidian-elevated border border-hairline-on-dark text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider hover:bg-surface-container-high transition-colors"
                  type="button"
                >
                  Manage Bank Accounts
                </button>
                <button
                  onClick={() => showToast("Redirecting to Stripe Express portal...")}
                  className="px-space-md h-10 rounded-full bg-obsidian-elevated border border-hairline-on-dark text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider hover:bg-surface-container-high flex items-center gap-1 transition-colors"
                  type="button"
                >
                  <span>Stripe Express</span>
                  <span className="material-symbols-outlined text-[16px] text-text-on-dark-secondary">
                    open_in_new
                  </span>
                </button>
              </div>
            </section>

            {/* Itemized Booking Settlement Ledger */}
            <section className="flex flex-col gap-space-lg relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs border-b border-hairline-on-dark">
                <div>
                  <h2 className="font-headline-md text-headline-md tracking-wider text-text-on-dark-primary">
                    SETTLEMENT LEDGER
                  </h2>
                  <p className="font-body-sm text-body-sm text-text-on-dark-secondary">
                    Per-stay host breakdown, tax remittances, and escrow clearance logs
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-space-sm">
                  {/* Sanctuary Filter */}
                  <div className="flex items-center gap-2 px-space-sm py-1.5 rounded-full bg-obsidian-elevated border border-hairline-on-dark text-text-on-dark-primary">
                    <span className="material-symbols-outlined text-[18px] text-text-on-dark-secondary">
                      location_city
                    </span>
                    <select
                      value={sanctuaryFilter}
                      onChange={(e) => setSanctuaryFilter(e.target.value)}
                      className="bg-transparent font-label-caps-sm text-label-caps-sm uppercase tracking-wider text-text-on-dark-primary focus:outline-none cursor-pointer"
                    >
                      <option className="bg-obsidian-base" value="all">
                        All Sanctuaries
                      </option>
                      <option className="bg-obsidian-base" value="cala">
                        Casa Cala Salada
                      </option>
                      <option className="bg-obsidian-base" value="finca">
                        Finca Sa Rota
                      </option>
                      <option className="bg-obsidian-base" value="vedra">
                        Villa Es Vedrà Horizon
                      </option>
                    </select>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center p-1 rounded-full bg-obsidian-elevated border border-hairline-on-dark">
                    <button
                      onClick={() => setStatusFilter("ALL")}
                      className={`px-space-sm py-1 rounded-full font-label-caps-sm text-label-caps-sm uppercase transition-colors ${
                        statusFilter === "ALL"
                          ? "bg-[#F7F6F4] text-obsidian-base font-semibold"
                          : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                      }`}
                      type="button"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter("DISBURSED")}
                      className={`px-space-sm py-1 rounded-full font-label-caps-sm text-label-caps-sm uppercase transition-colors ${
                        statusFilter === "DISBURSED"
                          ? "bg-[#F7F6F4] text-obsidian-base font-semibold"
                          : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                      }`}
                      type="button"
                    >
                      Disbursed
                    </button>
                    <button
                      onClick={() => setStatusFilter("ESCROW")}
                      className={`px-space-sm py-1 rounded-full font-label-caps-sm text-label-caps-sm uppercase transition-colors ${
                        statusFilter === "ESCROW"
                          ? "bg-[#F7F6F4] text-obsidian-base font-semibold"
                          : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                      }`}
                      type="button"
                    >
                      In Escrow
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-space-sm">
                {loading ? (
                  <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest text-xs">
                      Synchronizing settlement ledger with banking network...
                    </span>
                  </div>
                ) : filteredLedger.length === 0 ? (
                  <div className="py-14 flex flex-col items-center justify-center text-center p-8 border border-hairline-on-dark/40 rounded-2xl bg-obsidian-elevated/40">
                    <span className="material-symbols-outlined text-[40px] text-text-on-dark-secondary mb-3">account_balance_wallet</span>
                    <h3 className="font-headline-md text-text-on-dark-primary uppercase tracking-wider mb-2">
                      No Settlement Records
                    </h3>
                    <p className="font-body-md text-text-on-dark-secondary max-w-md text-sm">
                      No disbursements or escrow holds recorded under this filter. As guest stays conclude, payout settlements will appear here.
                    </p>
                  </div>
                ) : (
                  filteredLedger.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-space-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col lg:flex-row lg:items-center justify-between gap-space-md hover:bg-surface-container-high/40 transition-colors"
                    >
                      <div className="flex items-start gap-space-md">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              entry.status === "DISBURSED"
                                ? "text-state-success"
                                : "text-tertiary-fixed"
                            }`}
                          >
                            {entry.status === "DISBURSED" ? "verified" : "lock_clock"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-space-sm">
                            <span className="font-headline-md text-[18px] text-text-on-dark-primary">
                              {entry.sanctuaryTitle}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-label-caps-sm text-[10px] uppercase tracking-widest ${
                                entry.status === "DISBURSED"
                                  ? "bg-surface-container text-state-success"
                                  : "bg-surface-container text-tertiary-fixed"
                              }`}
                            >
                              {entry.status === "DISBURSED"
                                ? "DISBURSED"
                                : entry.status === "ESCROW_SECURED"
                                ? "ESCROW SECURED"
                                : "IN ESCROW"}
                            </span>
                          </div>
                          <div className="flex items-center gap-space-xs text-text-on-dark-secondary mt-1 flex-wrap">
                            <span className="font-body-sm text-body-sm text-text-on-dark-primary">
                              {entry.guestName}
                            </span>
                            <span className="text-hairline-on-dark text-xs">•</span>
                            <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                              {entry.stayDates}
                            </span>
                            <span className="text-hairline-on-dark text-xs">•</span>
                            <span className="font-data-tabular text-data-tabular text-[#DCE6EF]">
                              {entry.releaseDate || entry.paymentMethodMasked || "Escrow Guarded"}
                            </span>
                          </div>
                        </div>
                      </div>

                    <div className="flex items-center justify-between lg:justify-end gap-space-xl">
                      <div className="grid grid-cols-3 gap-space-lg text-right">
                        <div>
                          <div className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase">
                            Gross
                          </div>
                          <div className="font-data-tabular text-data-tabular text-text-on-dark-primary">
                            €{entry.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase">
                            Take Rate (12%)
                          </div>
                          <div className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                            -€{entry.takeRateAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase">
                            Net Payout
                          </div>
                          <div className="font-data-tabular text-data-tabular text-[#F5F4F1] font-semibold">
                            €{entry.netPayout.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => showToast(`Receipt generated for ${entry.sanctuaryTitle}`)}
                        aria-label="Download Receipt"
                        className="p-space-xs rounded-full bg-surface-container hover:bg-surface-container-high text-text-on-dark-secondary hover:text-text-on-dark-primary transition-colors"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

            {/* Tax & Deductions Summary Panel */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg relative z-10">
              <div className="lg:col-span-2 p-space-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[20px] text-text-on-dark-secondary">
                        account_balance
                      </span>
                      <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider text-text-on-dark-secondary">
                        Tax Collection &amp; Remittance
                      </span>
                    </div>
                    <span className="font-data-tabular text-data-tabular text-state-success uppercase">
                      AUTOMATICALLY REMITTED
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md tracking-wider text-text-on-dark-primary mt-space-sm">
                    Balearic Eco-Solitude Municipal Levy
                  </h3>
                  <p className="font-body-md text-body-md text-text-on-dark-secondary mt-1">
                    Complies with the Autonomous Government of the Balearic Islands decree on sustainable retreat spaces. Taxes are collected directly from guest invoices at checkout and automatically remitted via Aggarly Tax Agent credentials.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-t border-hairline-on-dark/40">
                  <div>
                    <div className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                      Levy Collected YTD
                    </div>
                    <div className="font-headline-md text-headline-md text-text-on-dark-primary mt-0.5">
                      €1,120.00
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <button
                      onClick={() => showToast("Downloaded Modelo 036 Certificate")}
                      className="px-space-md h-10 rounded-full bg-surface-container text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider hover:bg-surface-container-high transition-colors"
                      type="button"
                    >
                      Tax Certificate (Modelo 036)
                    </button>
                  </div>
                </div>
              </div>

              {/* Monthly Statements Download Card */}
              <div className="p-space-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[20px] text-text-on-dark-secondary">
                      folder
                    </span>
                    <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-wider text-text-on-dark-secondary">
                      Accounting Statements
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md tracking-wider text-text-on-dark-primary mt-space-sm">
                    Monthly Ledgers
                  </h3>
                  <p className="font-body-sm text-body-sm text-text-on-dark-secondary mt-1">
                    Certified statements with embedded cryptographic proof for corporate accounting filings.
                  </p>
                </div>
                <div className="flex flex-col gap-space-xs mt-space-md">
                  {taxStatements.length > 0 ? (
                    taxStatements.map((ts) => (
                      <div key={ts.id} className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
                        <span className="font-data-tabular text-data-tabular text-text-on-dark-primary">
                          {ts.statementType} {ts.taxYear}
                        </span>
                        <a
                          href={ts.downloadUrl || "#"}
                          onClick={(e) => {
                            if (!ts.downloadUrl) {
                              e.preventDefault();
                              showToast(`Certificate ${ts.certificateRef} generated`);
                            }
                          }}
                          className="font-label-caps-sm text-label-caps-sm text-[#DCE6EF] hover:underline uppercase flex items-center gap-1"
                        >
                          <span>PDF</span>
                          <span className="material-symbols-outlined text-[14px]">download</span>
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-text-on-dark-secondary font-body-sm">
                      No tax statements generated yet for the current fiscal cycle.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Technical Synchronization Status & Legal Notice */}
            <footer className="pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md text-text-on-dark-secondary text-body-sm relative z-10 border-t border-hairline-on-dark">
              <div className="flex items-center gap-space-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse" />
                <span className="font-data-tabular text-[12px] text-text-on-dark-secondary">
                  Ledger synced with Stripe Settlement Engine • Block #892,109 Verified
                </span>
              </div>
              <div className="font-label-caps-sm text-[11px] uppercase tracking-widest text-text-on-dark-secondary">
                Escrow protected under EU Payment Services Directive (PSD2)
              </div>
            </footer>
          </div>
        </div>
      </main>

      <LonaFooter />
    </div>
  );
}
