"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { WishlistClient, WishlistDto } from "@/lib/wishlistClient";

interface CuratedSanctuaryCard {
  id: string;
  propertyId: string;
  title: string;
  location: string;
  bortleClass: string;
  rating: number;
  reviewCount: number;
  telescopeAmenity: string;
  pricePerNight: number;
  imageUrl: string;
}




export default function GuestWishlistsPage() {
  const [collections, setCollections] = useState<{ name: string; count: number; description: string; items: CuratedSanctuaryCard[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCollectionIdx, setActiveCollectionIdx] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const loadWishlists = async () => {
      setLoading(true);
      try {
        const remoteLists = await WishlistClient.getMyWishlistsWithItems();
        if (remoteLists) {
          const mapped = remoteLists.map((wl) => ({
            name: wl.name,
            count: wl.itemCount || (wl.items ? wl.items.length : 0),
            description: wl.description || "Curated collection of saved sanctuaries.",
            items: (wl.items || []).map((it, idx) => ({
              id: it.id || `item-${idx}`,
              propertyId: it.propertyId || "",
              title: it.property?.title || "Saved Sanctuary",
              location: it.property?.location || "SANCTUARY",
              bortleClass: "BORTLE CLASS 2",
              rating: it.property?.rating ?? 0,
              reviewCount: it.property?.reviewCount ?? 0,
              telescopeAmenity: "",
              pricePerNight: it.property?.basePricePerNight || 0,
              imageUrl: it.property?.thumbnailUrl || "",
            })),
          }));
          setCollections(mapped);
        }
      } catch (err) {
        console.error("Wishlists fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    loadWishlists();
  }, []);

  const activeCollection = collections[activeCollectionIdx] || collections[0];

  const handleRemoveSanctuary = (propertyId: string, title: string) => {
    startTransition(async () => {
      setCollections((prev) =>
        prev.map((col, idx) =>
          idx === activeCollectionIdx
            ? {
                ...col,
                items: col.items.filter((item) => item.propertyId !== propertyId),
                count: Math.max(0, col.count - 1),
              }
            : col
        )
      );
      showToast(`Removed ${title} from ${activeCollection.name}`);
    });
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    startTransition(async () => {
      await WishlistClient.createWishlist(newCollectionName, newCollectionDesc, false);
      const newCol = {
        name: newCollectionName.trim(),
        count: 0,
        description: newCollectionDesc.trim() || "Private board of curated sanctuaries.",
        items: [],
      };
      setCollections((prev) => [...prev, newCol]);
      setActiveCollectionIdx(collections.length);
      setIsCreateModalOpen(false);
      setNewCollectionName("");
      setNewCollectionDesc("");
      showToast(`Created collection "${newCollectionName}"`);
    });
  };

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

        <div className="w-full max-w-7xl mx-auto px-card-margin-mobile lg:px-card-margin-desktop py-space-xl lg:py-space-2xl">
          {/* Central Floating Obsidian Monolith */}
          <div className="relative w-full rounded-[28px] bg-gradient-to-b from-obsidian-base to-[#121215] shadow-2xl border border-hairline-on-dark p-card-padding-mobile lg:p-card-padding-desktop overflow-hidden text-text-on-dark-primary">
            {/* Directional Glow Bleed */}
            <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#DCE6EF]/10 blur-[90px] pointer-events-none" />
            <div className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full bg-[#DCE6EF]/5 blur-[120px] pointer-events-none" />

            {/* Header Section */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg pb-space-xl border-b border-hairline-on-dark">
              <div className="flex items-start sm:items-center gap-space-md">
                <div className="relative shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-obsidian-elevated border border-hairline-on-dark shadow-[0_0_24px_rgba(220,230,239,0.25)]">
                  <span className="material-symbols-outlined text-text-on-dark-primary text-[22px]">
                    bookmarks
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-[0.2em] text-[#C9CDD2]">
                      CURATED ARCHIVE
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-[#8FAE97]" />
                    <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary tracking-widest uppercase">
                      SYNODIC CYCLE 11
                    </span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg tracking-[0.14em] uppercase text-text-on-dark-primary mt-0.5">
                    SAVED SANCTUARIES &amp; COLLECTIONS
                  </h1>
                  <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary mt-1">
                    Aggarly by Lona • Curated Nocturnal Wishlists, Solitude Escapes &amp; Shared Boards
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-space-md self-start lg:self-center">
                <button
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                    }
                    showToast("Board share link copied to clipboard");
                  }}
                  className="flex items-center gap-space-xs px-4 py-2.5 rounded-full bg-obsidian-elevated hover:bg-[#202024] border border-hairline-on-dark text-text-on-dark-secondary hover:text-text-on-dark-primary transition-all duration-300"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  <span className="font-label-caps-md text-label-caps-md uppercase tracking-wider">
                    Share Board
                  </span>
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="group flex items-center gap-space-xs px-6 py-2.5 rounded-full bg-[#F7F6F4] text-[#0A0A0C] hover:bg-canvas-outer transition-all duration-300 shadow-md font-semibold"
                >
                  <span className="font-label-caps-md text-label-caps-md uppercase tracking-[0.14em]">
                    + Create New Collection
                  </span>
                  <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>

            {/* Collection Selector Tabs */}
            <div className="relative z-10 py-space-md">
              <div className="flex items-center gap-space-xs overflow-x-auto pb-2 scrollbar-none">
                {collections.map((col, idx) => (
                  <button
                    key={col.name}
                    onClick={() => setActiveCollectionIdx(idx)}
                    className={`shrink-0 px-5 py-2.5 rounded-full font-label-caps-md text-label-caps-md uppercase tracking-wider transition-all ${
                      idx === activeCollectionIdx
                        ? "bg-[#F7F6F4] text-[#0A0A0C] font-semibold shadow-sm"
                        : "bg-obsidian-elevated text-text-on-dark-secondary hover:text-text-on-dark-primary hover:bg-[#222226] border border-hairline-on-dark"
                    }`}
                  >
                    {col.name} ({col.items.length})
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="relative z-10 py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-hairline-on-dark border-t-primary animate-spin" />
                <span className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest text-xs">
                  Retrieving curated collections...
                </span>
              </div>
            ) : !activeCollection ? (
              <div className="relative z-10 py-20 flex flex-col items-center justify-center gap-4 text-center">
                <span className="material-symbols-outlined text-[48px] text-text-on-dark-secondary">bookmarks</span>
                <h2 className="font-headline-md text-text-on-dark-primary uppercase tracking-wider">
                  No Collections Yet
                </h2>
                <p className="font-body-md text-text-on-dark-secondary max-w-sm">
                  Start saving sanctuaries to build your first curated archive.
                </p>
                <Link
                  href="/properties"
                  className="mt-2 px-6 py-2 rounded-full bg-primary text-obsidian-base font-label-caps-sm uppercase tracking-wider font-semibold inline-flex items-center gap-2"
                >
                  <span>Explore Retreats</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            ) : (
              <>
                {/* Active Collection Context Banner */}
                <div className="relative z-10 my-space-lg p-space-lg rounded-2xl bg-surface-container-lowest/80 border border-hairline-on-dark backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-space-xs mb-1">
                      <span className="material-symbols-outlined text-[16px] text-text-on-dark-secondary">
                        qr_code_2
                      </span>
                      <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                        ACTIVE ARCHIVE DOSSIER
                      </span>
                    </div>
                    <h2 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wide">
                      {activeCollection.name}
                    </h2>
                    <p className="font-body-md text-body-md text-text-on-dark-secondary mt-1">
                      {activeCollection.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-space-sm self-start md:self-auto">
                    <button
                      onClick={() => showToast(`Rename option ready for ${activeCollection.name}`)}
                      className="px-3.5 py-1.5 rounded-full bg-obsidian-elevated border border-hairline-on-dark text-text-on-dark-secondary hover:text-text-on-dark-primary text-body-sm font-body-sm tracking-wide transition-colors"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(`${window.location.origin}/wishlists?shared=${encodeURIComponent(activeCollection.name)}`);
                        }
                        showToast("Private companion link copied");
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-obsidian-elevated border border-hairline-on-dark text-text-on-dark-secondary hover:text-text-on-dark-primary text-body-sm font-body-sm tracking-wide transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">link</span>
                      <span>Share with Companion (Private Link)</span>
                    </button>
                    {collections.length > 1 && (
                      <button
                        onClick={() => {
                          setCollections((prev) => prev.filter((_, idx) => idx !== activeCollectionIdx));
                          setActiveCollectionIdx(0);
                          showToast("Collection removed");
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-obsidian-elevated hover:bg-state-error/20 text-state-error text-body-sm font-body-sm tracking-wide transition-colors border border-hairline-on-dark"
                      >
                        Delete Collection
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid of Curated Sanctuary Cards */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg mt-space-xl">
                  {activeCollection.items.length === 0 ? (
                    <div className="col-span-3 p-12 text-center rounded-2xl bg-obsidian-elevated/40 border border-hairline-on-dark">
                      <span className="material-symbols-outlined text-[48px] text-text-on-dark-secondary">
                        favorite_border
                      </span>
                      <p className="font-label-caps-md text-text-on-dark-secondary uppercase tracking-widest mt-2">
                        No sanctuaries in this collection yet
                      </p>
                      <div className="pt-4">
                        <Link
                          href="/properties"
                          className="px-6 py-2 rounded-full bg-primary text-obsidian-base font-label-caps-sm uppercase tracking-wider font-semibold inline-flex items-center gap-2"
                        >
                          <span>Explore Retreats</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
              ) : (
                activeCollection.items.map((card) => (
                  <div
                    key={card.id}
                    className="group relative flex flex-col justify-between rounded-2xl bg-surface-container-lowest border border-hairline-on-dark overflow-hidden transition-all duration-500 hover:translate-y-[-4px] hover:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.7)]"
                  >
                    <div className="relative h-64 w-full overflow-hidden">
                      <img
                        alt={card.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        src={card.imageUrl}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-black/40" />

                      {/* Bortle Badge */}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-obsidian-base/80 backdrop-blur-md text-[#C9CDD2] font-data-tabular text-data-tabular uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-hairline-on-dark/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-state-success" />
                        {card.bortleClass}
                      </div>

                      {/* Remove Favorite Toggle */}
                      <button
                        onClick={() => handleRemoveSanctuary(card.propertyId, card.title)}
                        aria-label="Remove from collection"
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-obsidian-base/70 hover:bg-obsidian-base backdrop-blur-md flex items-center justify-center text-state-error transition-colors border border-hairline-on-dark/40"
                      >
                        <span className="material-symbols-outlined text-[18px]">favorite</span>
                      </button>
                    </div>

                    <div className="p-space-lg flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex items-baseline justify-between gap-space-sm mb-1">
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary tracking-widest uppercase">
                            {card.location}
                          </span>
                          <div className="flex items-center gap-1 font-data-tabular text-data-tabular text-[#C9CDD2]">
                            <span className="text-amber-200 text-xs">★</span>
                            <span>{card.rating.toFixed(2)}</span>
                            <span className="text-text-on-dark-secondary">({card.reviewCount})</span>
                          </div>
                        </div>
                        <h3 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wide">
                          {card.title}
                        </h3>
                        <p className="font-body-sm text-body-sm text-text-on-dark-secondary mt-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-text-on-dark-primary shrink-0">
                            view_in_ar
                          </span>
                          <span>{card.telescopeAmenity}</span>
                        </p>
                      </div>

                      <div className="mt-space-lg pt-space-md flex items-center justify-between border-t border-hairline-on-dark/50">
                        <div className="flex flex-col">
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase">
                            RATE / NIGHT
                          </span>
                          <div className="font-data-tabular text-data-tabular text-text-on-dark-primary text-[15px] font-semibold">
                            €{card.pricePerNight}
                          </div>
                        </div>
                        <Link
                          href={`/properties/${card.propertyId}`}
                          className="px-5 py-2 rounded-full bg-[#F7F6F4] text-[#0A0A0C] hover:bg-canvas-outer font-label-caps-md text-label-caps-md uppercase tracking-wider font-semibold transition-all"
                        >
                          Reserve Dates
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            </>
            )}
          </div>
        </div>

        {/* Create Collection Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-obsidian-elevated border border-hairline-on-dark p-6 text-text-on-dark-primary space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-hairline-on-dark pb-3">
                <h3 className="font-headline-md text-lg text-text-on-dark-primary">
                  New Sanctuary Collection
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-full text-text-on-dark-secondary hover:text-text-on-dark-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateCollection} className="space-y-4">
                <div className="flex flex-col">
                  <label className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider mb-1">
                    Collection Title
                  </label>
                  <input
                    required
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="e.g. Nordic Eclipse Lodges"
                    className="w-full h-11 bg-obsidian-base border border-hairline-on-dark rounded-lg px-3 text-body-sm text-text-on-dark-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="font-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newCollectionDesc}
                    onChange={(e) => setNewCollectionDesc(e.target.value)}
                    placeholder="Brief curatorial purpose or travel focus..."
                    className="w-full bg-obsidian-base border border-hairline-on-dark rounded-lg p-3 text-body-sm text-text-on-dark-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 h-10 rounded-full bg-obsidian-base border border-hairline-on-dark text-text-on-dark-secondary font-label-caps-sm uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 h-10 rounded-full bg-primary text-obsidian-base font-label-caps-sm uppercase tracking-wider font-semibold hover:bg-canvas-outer"
                  >
                    Save Archive
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <LonaFooter />
    </div>
  );
}
