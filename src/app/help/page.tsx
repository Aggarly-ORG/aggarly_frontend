"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { HelpClient, HelpArticleResponse } from "@/lib/helpClient";

export default function HelpCenterPage() {
  const [articles, setArticles] = useState<HelpArticleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [signalMessage, setSignalMessage] = useState("");
  const [signalRef, setSignalRef] = useState("");
  const [isSubmittingSignal, setIsSubmittingSignal] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function loadArticles() {
      setLoading(true);
      try {
        const data = await HelpClient.getArticles(searchQuery, selectedCategory || undefined);
        setArticles(data);
        if (data.length > 0 && !expandedFaq) {
          setExpandedFaq(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load help articles:", err);
      } finally {
        setLoading(false);
      }
    }
    loadArticles();
  }, [searchQuery, selectedCategory]);

  const filteredArticles = articles.filter((art) => {
    const matchesCategory = !selectedCategory || art.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSendSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signalMessage.trim()) return;
    setIsSubmittingSignal(true);
    try {
      const res = await HelpClient.transmitSignal({
        situationType: "EMERGENCY_ACCESS",
        description: signalMessage,
        residencyRef: signalRef || undefined,
      });
      setShowSignalModal(false);
      setSignalMessage("");
      setSignalRef("");
      showToast("Priority nocturnal signal dispatched to lead curator on duty.");
    } catch {
      showToast("Could not transmit signal. Please reach out to operations desk directly.");
    } finally {
      setIsSubmittingSignal(false);
    }
  };

  return (
    <div className="bg-[#EFEEEC] min-h-screen text-[#151415] selection:bg-[#1f1f22] selection:text-[#F5F4F1] flex flex-col justify-between">
      <LonaHeader />

      <main className="w-full pt-20 pb-16 flex flex-col justify-center">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-14 py-8 md:py-12">
          {/* Monolithic Obsidian Island Shell */}
          <div className="relative w-full rounded-[28px] bg-gradient-to-b from-[#0A0A0C] via-[#131316] to-[#0A0A0C] p-6 sm:p-10 lg:p-14 shadow-[0_24px_60px_-15px_rgba(10,10,12,0.45),0_6px_24px_rgba(10,10,12,0.18)] overflow-hidden text-[#F5F4F1] border border-[#2A2A2E]/50">
            {/* Ambient Lunar Glow Blooms */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[540px] h-[540px] bg-[#DCE6EF] rounded-full blur-[110px] opacity-[0.14] pointer-events-none" />
            <div className="absolute top-1/4 -right-40 w-96 h-96 bg-[#9A9A9F] rounded-full blur-[140px] opacity-[0.06] pointer-events-none" />

            {/* Header Block */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
              <div className="relative mb-6 group">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-transparent via-[#DCE6EF]/25 to-transparent blur-xl transition-all duration-700 group-hover:scale-105" />
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-[#1E293B] via-[#475569] to-[#F1F5F9] shadow-[14px_4px_28px_rgba(220,230,239,0.30),0_0_24px_rgba(0,0,0,0.8)] relative z-10 flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined text-5xl md:text-6xl text-white">
                    help_center
                  </span>
                </div>
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#1f1f22]/90 backdrop-blur-md border border-[#2A2A2E]">
                  <span className="font-mono text-[10px] text-[#9A9A9F] uppercase tracking-widest">
                    LUNAR RETREAT PROTOCOL
                  </span>
                </div>
              </div>

              <h1 className="font-serif text-3xl md:text-5xl text-[#F5F4F1] uppercase tracking-[0.16em] mb-2 leading-tight">
                Help Center &amp; Sanctuary Support
              </h1>
              <p className="font-serif text-sm md:text-base text-[#9A9A9F] italic max-w-2xl font-light">
                Aggarly by Lona • Nocturnal Protocols, Stargazing Etiquette &amp; Curatorial Assistance
              </p>

              {/* Atmospheric Search Terminal */}
              <div className="w-full mt-8 relative">
                <div className="relative flex items-center bg-[#18181B] rounded-full transition-all duration-300 focus-within:ring-1 focus-within:ring-white/40 shadow-inner border border-[#2A2A2E]">
                  <span className="material-symbols-outlined text-[#9A9A9F] pl-4 text-[20px]">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search knowledge base: e.g. telescope collimation, Bortle dark-sky covenants, cancellation tiers..."
                    className="w-full bg-transparent py-3.5 px-3 text-xs sm:text-sm text-[#F5F4F1] placeholder:text-[#9A9A9F]/50 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="pr-4 text-[#9A9A9F] hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Category Navigation Cards (4 Columns) */}
            <div className="relative z-10 mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category 1 */}
              <div
                onClick={() => setSelectedCategory(selectedCategory === "logistics" ? null : "logistics")}
                className={`group p-6 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between border ${
                  selectedCategory === "logistics"
                    ? "bg-[#1f1f22] border-white/40"
                    : "bg-[#1b1b1e] border-[#2A2A2E]/50 hover:bg-[#18181B]"
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-full bg-[#1f1f22] flex items-center justify-center mb-4 text-[#F5F4F1] group-hover:scale-110 transition-transform border border-[#2A2A2E]">
                    <span className="material-symbols-outlined text-[20px]">key</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#9A9A9F] uppercase tracking-widest block mb-1">
                    01 / LOGISTICS
                  </span>
                  <h3 className="text-xs font-semibold text-[#F5F4F1] uppercase tracking-wider mb-1">
                    Stays &amp; Check-In
                  </h3>
                  <p className="text-xs text-[#9A9A9F] line-clamp-2 leading-relaxed">
                    Keyless vault PINs, precise arrival windows, secluded cove access &amp; subterranean private parking.
                  </p>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-[#9A9A9F] group-hover:text-[#F5F4F1] transition-colors border-t border-[#2A2A2E]/40">
                  <span className="font-mono text-[11px] uppercase tracking-wider">Logistics Desk</span>
                  <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </div>

              {/* Category 2 */}
              <div
                onClick={() => setSelectedCategory(selectedCategory === "stellar" ? null : "stellar")}
                className={`group p-6 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between border ${
                  selectedCategory === "stellar"
                    ? "bg-[#1f1f22] border-white/40"
                    : "bg-[#1b1b1e] border-[#2A2A2E]/50 hover:bg-[#18181B]"
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-full bg-[#1f1f22] flex items-center justify-center mb-4 text-[#F5F4F1] group-hover:scale-110 transition-transform border border-[#2A2A2E]">
                    <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#9A9A9F] uppercase tracking-widest block mb-1">
                    02 / STELLAR
                  </span>
                  <h3 className="text-xs font-semibold text-[#F5F4F1] uppercase tracking-wider mb-1">
                    Astronomical Protocols
                  </h3>
                  <p className="text-xs text-[#9A9A9F] line-clamp-2 leading-relaxed">
                    Dark-sky light covenants, telescope collimation etiquette, zenith tracking &amp; lunar calibrations.
                  </p>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-[#9A9A9F] group-hover:text-[#F5F4F1] transition-colors border-t border-[#2A2A2E]/40">
                  <span className="font-mono text-[11px] uppercase tracking-wider">Optics Guide</span>
                  <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </div>

              {/* Category 3 */}
              <div
                onClick={() => setSelectedCategory(selectedCategory === "financials" ? null : "financials")}
                className={`group p-6 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between border ${
                  selectedCategory === "financials"
                    ? "bg-[#1f1f22] border-white/40"
                    : "bg-[#1b1b1e] border-[#2A2A2E]/50 hover:bg-[#18181B]"
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-full bg-[#1f1f22] flex items-center justify-center mb-4 text-[#F5F4F1] group-hover:scale-110 transition-transform border border-[#2A2A2E]">
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#9A9A9F] uppercase tracking-widest block mb-1">
                    03 / FINANCIALS
                  </span>
                  <h3 className="text-xs font-semibold text-[#F5F4F1] uppercase tracking-wider mb-1">
                    Escrow &amp; Cancellation
                  </h3>
                  <p className="text-xs text-[#9A9A9F] line-clamp-2 leading-relaxed">
                    Sovereign multi-sig escrow, 7-day complimentary re-alignment, automated VAT receipt dispatch.
                  </p>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-[#9A9A9F] group-hover:text-[#F5F4F1] transition-colors border-t border-[#2A2A2E]/40">
                  <span className="font-mono text-[11px] uppercase tracking-wider">Escrow Rules</span>
                  <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </div>

              {/* Category 4 */}
              <div
                onClick={() => setSelectedCategory(selectedCategory === "concierge" ? null : "concierge")}
                className={`group p-6 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between border ${
                  selectedCategory === "concierge"
                    ? "bg-[#1f1f22] border-white/40"
                    : "bg-[#1b1b1e] border-[#2A2A2E]/50 hover:bg-[#18181B]"
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-full bg-[#1f1f22] flex items-center justify-center mb-4 text-[#F5F4F1] group-hover:scale-110 transition-transform border border-[#2A2A2E]">
                    <span className="material-symbols-outlined text-[20px]">support_agent</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#9A9A9F] uppercase tracking-widest block mb-1">
                    04 / CONCIERGE
                  </span>
                  <h3 className="text-xs font-semibold text-[#F5F4F1] uppercase tracking-wider mb-1">
                    Nocturnal Assistance
                  </h3>
                  <p className="text-xs text-[#9A9A9F] line-clamp-2 leading-relaxed">
                    Direct curator dispatches, private tender moorings, bespoke stargazing provender.
                  </p>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-[#9A9A9F] group-hover:text-[#F5F4F1] transition-colors border-t border-[#2A2A2E]/40">
                  <span className="font-mono text-[11px] uppercase tracking-wider">Curator Desk</span>
                  <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>

            {/* Accordion FAQ Section */}
            <div className="relative z-10 mt-12">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#2A2A2E]/40">
                <h2 className="font-serif text-xl md:text-2xl text-[#F5F4F1] uppercase tracking-wider">
                  Frequently Asked Solitary Questions
                </h2>
                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="text-[11px] font-semibold uppercase tracking-widest text-[#8FAE97] hover:underline"
                  >
                    Reset Filter ({selectedCategory})
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="p-8 text-center text-xs text-[#9A9A9F]">
                    Retrieving sanctuary knowledge base...
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <div className="rounded-xl bg-[#1b1b1e] border border-[#2A2A2E]/60 p-8 text-center text-xs text-[#9A9A9F]">
                    No nocturnal knowledge articles found matching your criteria.
                  </div>
                ) : (
                  filteredArticles.map((art) => {
                    const isExpanded = expandedFaq === art.id;
                    return (
                      <div
                        key={art.id}
                        className="rounded-xl bg-[#1b1b1e] border border-[#2A2A2E]/60 overflow-hidden transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(isExpanded ? null : art.id)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left gap-4 hover:bg-[#1f1f22] transition-colors"
                        >
                          <span className="font-serif text-sm sm:text-base text-[#F5F4F1] font-medium tracking-wide">
                            {art.title}
                          </span>
                          <span
                            className={`material-symbols-outlined text-[20px] text-[#9A9A9F] transition-transform duration-300 ${
                              isExpanded ? "rotate-180 text-white" : ""
                            }`}
                          >
                            expand_more
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#9A9A9F] leading-relaxed border-t border-[#2A2A2E]/40 font-light animate-in fade-in duration-200 whitespace-pre-line">
                            {art.content}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Nocturnal Emergency Signal Dock */}
            <div className="relative z-10 mt-12 rounded-2xl bg-[#18181B] border border-[#2A2A2E] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 flex items-center justify-center text-[#ffb4ab] flex-shrink-0">
                  <span className="material-symbols-outlined text-[24px]">crisis_alert</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-ping" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#ffb4ab]">
                      NOCTURNAL EMERGENCY SIGNAL • ACTIVE 24/7
                    </span>
                  </div>
                  <h3 className="font-serif text-base sm:text-lg text-[#F5F4F1] mt-1">
                    Immediate Sanctuary Custody &amp; Gate Escalation
                  </h3>
                  <p className="text-xs text-[#9A9A9F] mt-0.5 max-w-xl">
                    Locked out during dark hours, keyless pad battery alert, or telescope instrument recalibration needed?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setShowSignalModal(true)}
                  className="w-full md:w-auto px-6 py-3 rounded-full bg-[#ffb4ab] text-[#690005] hover:bg-[#ffdad6] text-xs font-semibold uppercase tracking-widest transition-all font-mono"
                >
                  Send Direct Signal
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: DIRECT NOCTURNAL SIGNAL */}
      {showSignalModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0C]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0e0e11] border border-[#2A2A2E] rounded-2xl p-6 sm:p-8 text-[#F5F4F1] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2E]">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#ffb4ab]">
                  PRIORITY TRANSMISSION
                </span>
                <h3 className="font-serif text-xl tracking-wide uppercase mt-0.5">Emergency Signal</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSignalModal(false)}
                className="text-[#9A9A9F] hover:text-[#F5F4F1]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSendSignal} className="py-6 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F] block mb-1">
                  Residency Reference or Sanctuary
                </label>
                <input
                  type="text"
                  value={signalRef}
                  onChange={(e) => setSignalRef(e.target.value)}
                  placeholder="e.g. AG-8829-IBZ (Casa Cala Salada)"
                  className="w-full bg-[#18181B] border border-[#2A2A2E] rounded-xl px-4 py-2.5 text-xs text-[#F5F4F1] focus:outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest text-[#9A9A9F] block mb-1">
                  Urgent Situation Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={signalMessage}
                  onChange={(e) => setSignalMessage(e.target.value)}
                  placeholder="Describe access obstruction, smart lock error code, or nocturnal emergency..."
                  className="w-full bg-[#18181B] border border-[#2A2A2E] rounded-xl p-3 text-xs text-[#F5F4F1] focus:outline-none focus:border-white/40 placeholder:text-[#9A9A9F]/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSignalModal(false)}
                  className="px-5 py-2 rounded-full bg-[#2a2a2d] text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSignal}
                  className="px-5 py-2 rounded-full bg-[#ffb4ab] text-[#690005] font-mono text-xs font-semibold uppercase tracking-widest hover:bg-[#ffdad6] disabled:opacity-50"
                >
                  {isSubmittingSignal ? "Transmitting..." : "Transmit Signal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-[#18181B] border border-[#2A2A2E] text-white shadow-2xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <LonaFooter />
    </div>
  );
}
