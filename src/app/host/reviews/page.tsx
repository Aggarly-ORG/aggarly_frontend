"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { ReviewClient, HostReviewItemDto } from "@/lib/reviewClient";

export default function HostReviewsPage() {
  const [reviews, setReviews] = useState<HostReviewItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "awaiting" | "featured">("awaiting");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const remote = await ReviewClient.getHostReviews();
        if (remote) {
          setReviews(remote);
        }
      } catch (err) {
        console.error("Host reviews load error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const handleReplyChange = (reviewId: string, val: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: val }));
  };

  const handleSuggestReplyWithAI = (reviewId: string, guestName: string) => {
    const aiSuggestion = `Dear ${guestName}, thank you deeply for your curatorial feedback and for choosing our sanctuary for your nocturnal journey. We strive to maintain absolute stillness and celestial purity for all our residents. We would be delighted to welcome you back for your next solstice.`;
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: aiSuggestion }));
    showToast("Lumen AI drafted a poetic response");
  };

  const handlePublishReply = (reviewId: string) => {
    const text = replyDrafts[reviewId];
    if (!text || !text.trim()) {
      showToast("Please enter a response first");
      return;
    }

    startTransition(async () => {
      await ReviewClient.replyToReview(reviewId, text);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                curatorResponse: {
                  text,
                  respondedAt: new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                  curatorName: "Host Curator",
                },
              }
            : r
        )
      );
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });
      showToast("Curatorial response published publicly");
    });
  };

  const filteredReviews = reviews.filter((r) => {
    if (activeTab === "awaiting") return !r.curatorResponse;
    if (activeTab === "featured") return !!r.isFeatured;
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
          {/* Main Monolithic Obsidian Island Container */}
          <div className="w-full max-w-6xl rounded-[28px] bg-gradient-to-b from-obsidian-base via-[#0E0E12] to-[#121215] text-text-on-dark-primary shadow-2xl border border-hairline-on-dark p-card-padding-mobile lg:p-card-padding-desktop flex flex-col gap-space-2xl relative overflow-hidden">
            {/* Ambient Moonlight Glow */}
            <div className="absolute -top-32 -left-20 w-96 h-96 bg-[#DCE6EF] opacity-[0.07] blur-[90px] rounded-full pointer-events-none" />
            <div className="absolute top-1/3 -right-36 w-80 h-80 bg-[#B8D3EB] opacity-[0.04] blur-[100px] rounded-full pointer-events-none" />

            {/* Editorial Header & Summary Rating Badge */}
            <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-space-lg relative z-10 pb-space-lg border-b border-hairline-on-dark">
              <div className="flex items-start gap-space-md">
                <div className="relative shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-obsidian-elevated border border-hairline-on-dark shadow-[0_0_24px_rgba(220,230,239,0.22)]">
                  <span className="material-symbols-outlined text-text-on-dark-primary text-[24px]">
                    star
                  </span>
                </div>
                <div className="flex flex-col gap-space-2xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-[0.2em] text-text-on-dark-secondary">
                      Curatorial Ledger
                    </span>
                    <span className="w-1 h-1 rounded-full bg-text-on-dark-secondary/50" />
                    <span className="font-data-tabular text-data-tabular text-secondary uppercase">
                      Sanctuary Host ID #7402
                    </span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg tracking-[0.14em] uppercase text-text-on-dark-primary leading-tight">
                    Guest Reviews &amp; Curatorial Responses
                  </h1>
                  <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary">
                    Aggarly by Lona • Reputation Ledger, Sub-Category Scores &amp; Public Feedback
                  </p>
                </div>
              </div>

              {/* Summary Rating Badge */}
              <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0 self-start">
                <div className="flex items-center gap-space-xs px-space-md py-2.5 rounded-full bg-obsidian-elevated/90 border border-hairline-on-dark backdrop-blur-md shadow-sm">
                  <span className="font-headline-md text-headline-md tracking-wider text-text-on-dark-primary leading-none">
                    4.96
                  </span>
                  <span className="font-data-tabular text-data-tabular text-state-success">★</span>
                  <span className="w-1 h-3 bg-hairline-on-dark/60 rounded-full mx-0.5" />
                  <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                    {reviews.length} Verified Residencies
                  </span>
                </div>
                <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary/60 text-xs px-2">
                  99.2% Pristine Observational Solitude Rating
                </span>
              </div>
            </header>

            {/* Curatorial Sub-Category Rating Matrix */}
            <section className="flex flex-col gap-space-md bg-obsidian-elevated/40 border border-hairline-on-dark rounded-2xl p-space-lg backdrop-blur-sm relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-text-on-dark-secondary">
                    tune
                  </span>
                  <h2 className="font-label-caps-md text-label-caps-md uppercase tracking-[0.15em] text-text-on-dark-primary">
                    Curatorial Calibration Matrix
                  </h2>
                </div>
                <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary uppercase text-xs">
                  Equinox Cycle Assessment
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-space-xl gap-y-space-md pt-space-xs">
                <div className="flex flex-col gap-1.5 p-space-sm rounded-xl bg-obsidian-base/60 border border-hairline-on-dark/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-body-sm text-body-sm text-text-on-dark-primary">
                      Cleanliness &amp; Sanctuary Calibration
                    </span>
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-primary font-semibold">
                      4.98 ★
                    </span>
                  </div>
                  <div className="w-full bg-hairline-on-dark/50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-secondary to-primary h-full rounded-full" style={{ width: "99.6%" }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 p-space-sm rounded-xl bg-obsidian-base/60 border border-hairline-on-dark/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-body-sm text-body-sm text-text-on-dark-primary">
                      Architectural Serenity &amp; Design
                    </span>
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-primary font-semibold">
                      5.00 ★
                    </span>
                  </div>
                  <div className="w-full bg-hairline-on-dark/50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-secondary to-primary h-full rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 p-space-sm rounded-xl bg-obsidian-base/60 border border-hairline-on-dark/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-body-sm text-body-sm text-text-on-dark-primary">
                      Nighttime Quietude &amp; Solitude
                    </span>
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-primary font-semibold">
                      4.95 ★
                    </span>
                  </div>
                  <div className="w-full bg-hairline-on-dark/50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-secondary to-primary h-full rounded-full" style={{ width: "99.0%" }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 p-space-sm rounded-xl bg-obsidian-base/60 border border-hairline-on-dark/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-body-sm text-body-sm text-text-on-dark-primary">
                      Optics &amp; Instruments Performance
                    </span>
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-primary font-semibold">
                      4.92 ★
                    </span>
                  </div>
                  <div className="w-full bg-hairline-on-dark/50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-secondary to-primary h-full rounded-full" style={{ width: "98.4%" }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 p-space-sm rounded-xl bg-obsidian-base/60 border border-hairline-on-dark/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-body-sm text-body-sm text-text-on-dark-primary">
                      Check-in &amp; Keyless Vault Access
                    </span>
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-primary font-semibold">
                      4.97 ★
                    </span>
                  </div>
                  <div className="w-full bg-hairline-on-dark/50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-secondary to-primary h-full rounded-full" style={{ width: "99.4%" }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 p-space-sm rounded-xl bg-obsidian-base/60 border border-hairline-on-dark/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-body-sm text-body-sm text-text-on-dark-primary">
                      Curator Communication
                    </span>
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-primary font-semibold">
                      4.96 ★
                    </span>
                  </div>
                  <div className="w-full bg-hairline-on-dark/50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-secondary to-primary h-full rounded-full" style={{ width: "99.2%" }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Reviews List & Public Response Workbench */}
            <section className="flex flex-col gap-space-xl relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
                <div className="inline-flex p-1 bg-obsidian-elevated border border-hairline-on-dark rounded-full shadow-inner">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-space-md py-1.5 rounded-full font-label-caps-md text-label-caps-md uppercase tracking-wider transition-all duration-200 ${
                      activeTab === "all"
                        ? "bg-canvas-outer text-obsidian-base font-semibold shadow-sm"
                        : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                    }`}
                  >
                    All Reviews ({reviews.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("awaiting")}
                    className={`px-space-md py-1.5 rounded-full font-label-caps-md text-label-caps-md uppercase tracking-wider transition-all duration-200 ${
                      activeTab === "awaiting"
                        ? "bg-canvas-outer text-obsidian-base font-semibold shadow-sm"
                        : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                    }`}
                  >
                    Awaiting Response ({reviews.filter((r) => !r.curatorResponse).length})
                  </button>
                  <button
                    onClick={() => setActiveTab("featured")}
                    className={`px-space-md py-1.5 rounded-full font-label-caps-md text-label-caps-md uppercase tracking-wider transition-all duration-200 ${
                      activeTab === "featured"
                        ? "bg-canvas-outer text-obsidian-base font-semibold shadow-sm"
                        : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                    }`}
                  >
                    Featured in Catalog ({reviews.filter((r) => r.isFeatured).length})
                  </button>
                </div>

                <div className="flex items-center gap-space-xs text-text-on-dark-secondary">
                  <span className="material-symbols-outlined text-[18px]">swap_vert</span>
                  <span className="font-data-tabular text-data-tabular uppercase tracking-wider">
                    Sort: Solitude Recency
                  </span>
                </div>
              </div>

              <div className="space-y-space-lg">
                {loading ? (
                  <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest text-xs">
                      Synchronizing resident reviews and evaluations...
                    </span>
                  </div>
                ) : filteredReviews.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-obsidian-elevated/40 border border-hairline-on-dark">
                    <span className="material-symbols-outlined text-[40px] text-text-on-dark-secondary">
                      rate_review
                    </span>
                    <p className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest mt-2">
                      No reviews in this category
                    </p>
                  </div>
                ) : (
                  filteredReviews.map((rev) => (
                    <article
                      key={rev.id}
                      className="p-space-lg rounded-2xl bg-obsidian-elevated border border-hairline-on-dark flex flex-col gap-space-md hover:bg-[#16161A] transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-md pb-space-sm border-b border-hairline-on-dark/60">
                        <div className="flex items-center gap-space-md">
                          <div className="w-10 h-10 rounded-full bg-obsidian-bubble border border-hairline-on-dark flex items-center justify-center font-headline-md text-text-on-dark-primary">
                            {rev.guestInitials || rev.guestName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-headline-md text-base text-text-on-dark-primary">
                              {rev.guestName}
                            </span>
                            <span className="font-data-tabular text-xs text-text-on-dark-secondary">
                              {rev.stayDates} • {rev.propertyTitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-headline-md text-lg text-text-on-dark-primary">
                            {rev.rating.toFixed(1)}
                          </span>
                          <span className="text-state-success text-sm">★</span>
                        </div>
                      </div>

                      {/* Review Comment */}
                      <p className="font-body-md text-text-on-dark-primary leading-relaxed">
                        &ldquo;{rev.comment}&rdquo;
                      </p>

                      {/* Curator Response or Response Workbench */}
                      {rev.curatorResponse ? (
                        <div className="p-space-md rounded-xl bg-obsidian-base/80 border-l-2 border-primary space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider">
                              Public Response by {rev.curatorResponse.curatorName}
                            </span>
                            <span className="font-data-tabular text-text-on-dark-secondary">
                              {rev.curatorResponse.respondedAt}
                            </span>
                          </div>
                          <p className="font-body-sm text-text-on-dark-primary italic">
                            {rev.curatorResponse.text}
                          </p>
                        </div>
                      ) : (
                        <div className="p-space-md rounded-xl bg-obsidian-base/90 border border-hairline-on-dark space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-dark-secondary">
                              Curator Public Reply Workbench
                            </span>
                            <button
                              onClick={() => handleSuggestReplyWithAI(rev.id, rev.guestName)}
                              className="font-label-caps-sm text-[11px] uppercase tracking-wider text-state-success hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                              <span>Draft with Lumen AI</span>
                            </button>
                          </div>

                          <textarea
                            rows={3}
                            value={replyDrafts[rev.id] || ""}
                            onChange={(e) => handleReplyChange(rev.id, e.target.value)}
                            placeholder="Compose a public reply to this resident review..."
                            className="w-full bg-obsidian-elevated/60 border border-hairline-on-dark rounded-lg p-3 text-body-sm text-text-on-dark-primary focus:outline-none focus:border-text-on-dark-primary transition-colors resize-none placeholder:text-text-on-dark-secondary/40 font-body-sm"
                          />

                          <div className="flex justify-end">
                            <button
                              onClick={() => handlePublishReply(rev.id)}
                              disabled={isPending}
                              className="px-6 h-9 rounded-full bg-primary text-obsidian-base font-label-caps-sm text-label-caps-sm uppercase tracking-wider font-semibold hover:bg-canvas-outer transition-colors"
                            >
                              Publish Response
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <LonaFooter />
    </div>
  );
}
