"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AggarlyChatBridgeClient } from "../../../lib/chatBridgeClient";
import { useAuth } from "../../../context/AuthContext";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError("No user ID provided.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function loadUser() {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const res = await AggarlyChatBridgeClient.authFetch(`${apiUrl}/api/v1/users/${userId}`);
        if (!res.ok) {
          throw new Error(`Profile unavailable (${res.status})`);
        }
        const json = await res.json();
        if (isMounted) {
          setProfile(json?.data || json);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Resident profile could not be retrieved.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadUser();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleMessageUser = async () => {
    if (!profile) return;
    try {
      const conv = await AggarlyChatBridgeClient.createDirectConversation(
        profile.id || userId,
        undefined,
        `Direct Inquiry`
      );
      router.push(`/chat/conversation/${conv.id}`);
    } catch {
      router.push(
        `/chat?initialPrompt=${encodeURIComponent(
          `I would like to message resident ${profile.displayName || profile.username || "Member"}.`
        )}`
      );
    }
  };

  const displayName =
    profile?.displayName ||
    (profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "Verified Resident");
  const username = profile?.username || "resident";
  const avatarUrl = profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=user-${userId}`;
  const bio =
    profile?.bio ||
    "Discerning traveler and esteemed member of the Aggarly nocturnal network. Seeking quiet contemplation, brutalist architecture, and celestial horizons.";

  return (
    <div className="bg-canvas-outer min-h-screen text-text-on-light-primary font-sans antialiased flex flex-col justify-between">
      {/* ─── Global Minimal Header ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-canvas-outer/90 backdrop-blur-md border-b border-hairline-on-light">
        <div className="h-20 w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 flex-shrink-0 flex items-center justify-center">
              <img
                src="/moon_isolated.png"
                alt="Aggarly Moon"
                className="w-9 h-9 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.45)] group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md tracking-wider text-text-on-light-primary leading-none">
                AGGARLY
              </span>
              <span className="font-label-caps-sm text-label-caps-sm uppercase tracking-widest text-text-on-light-secondary mt-0.5">
                BY LONA
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs uppercase tracking-widest font-semibold text-text-on-light-secondary hover:text-text-on-light-primary transition-colors"
            >
              ← Back to Sanctuaries
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Profile Body ─── */}
      <main className="w-full pt-28 pb-16 px-4 md:px-8 flex-1 flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#18181B] border-t-transparent animate-spin" />
            <p className="font-serif tracking-widest uppercase text-xs text-[#8A8884]">
              Unveiling Resident Records...
            </p>
          </div>
        ) : error ? (
          <div className="w-full max-w-md p-8 rounded-3xl bg-[#18181B] border border-hairline-on-dark text-text-on-dark-primary text-center space-y-4 shadow-2xl">
            <span className="material-symbols-outlined text-[36px] text-state-error">person_off</span>
            <h2 className="font-headline-md text-2xl uppercase tracking-wider">Resident Not Found</h2>
            <p className="text-xs text-text-on-dark-secondary leading-relaxed">{error}</p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-full bg-white text-[#0A0A0C] font-semibold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all"
            >
              Return to Almanac
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-xl rounded-3xl bg-[#18181B] border border-hairline-on-dark p-8 sm:p-12 text-text-on-dark-primary shadow-[0_24px_50px_rgba(0,0,0,0.5)] space-y-8 animate-in fade-in duration-300">
            {/* Header / Avatar */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-hairline-on-dark shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-state-success text-white flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                </div>
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-3 py-0.5 rounded-full bg-surface-container border border-hairline-on-dark text-state-success font-label-caps-sm text-[10px] uppercase tracking-wider">
                    Verified Member
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-surface-container border border-hairline-on-dark text-text-on-dark-secondary font-data-tabular text-[10px] uppercase tracking-wider">
                    ID • {userId.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h1 className="font-headline-md text-3xl text-text-on-dark-primary tracking-wide">
                  {displayName}
                </h1>
                <p className="font-mono text-xs text-text-on-dark-secondary">@{username}</p>
              </div>
            </div>

            {/* Bio Section */}
            <div className="pt-6 border-t border-hairline-on-dark space-y-2">
              <h3 className="font-label-caps-sm text-xs text-text-on-dark-secondary uppercase tracking-widest">
                Resident Bio &amp; Architectural Focus
              </h3>
              <p className="font-body-md text-sm text-secondary leading-relaxed">{bio}</p>
            </div>

            {/* Resident Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-surface-container border border-hairline-on-dark text-center space-y-1">
                <span className="material-symbols-outlined text-[20px] text-text-on-dark-primary">
                  travel_explore
                </span>
                <p className="font-headline-md text-base text-text-on-dark-primary">Curated</p>
                <p className="font-label-caps-sm text-[9px] text-text-on-dark-secondary uppercase">
                  Verified Stays
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-hairline-on-dark text-center space-y-1">
                <span className="material-symbols-outlined text-[20px] text-text-on-dark-primary">
                  reviews
                </span>
                <p className="font-headline-md text-base text-text-on-dark-primary">Author</p>
                <p className="font-label-caps-sm text-[9px] text-text-on-dark-secondary uppercase">
                  Guest Impressions
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-hairline-on-dark text-center space-y-1 col-span-2 sm:col-span-1">
                <span className="material-symbols-outlined text-[20px] text-text-on-dark-primary">
                  nights_stay
                </span>
                <p className="font-headline-md text-base text-text-on-dark-primary">Celestial</p>
                <p className="font-label-caps-sm text-[9px] text-text-on-dark-secondary uppercase">
                  Nocturnal Traveler
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-hairline-on-dark flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleMessageUser}
                className="flex-1 h-12 rounded-full bg-[#F7F6F4] hover:bg-white text-obsidian-base font-label-caps-md text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span>Send Direct Inquiry</span>
              </button>

              <Link
                href="/"
                className="flex-1 h-12 rounded-full bg-surface-container hover:bg-surface-bright text-text-on-dark-primary border border-hairline-on-dark font-label-caps-md text-xs uppercase tracking-widest font-semibold flex items-center justify-center transition-all"
              >
                Explore Sanctuaries
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ─── Minimal Warm Footer ─── */}
      <footer className="w-full py-6 border-t border-hairline-on-light text-center">
        <span className="font-label-caps-sm text-label-caps-sm text-text-on-light-secondary tracking-widest uppercase text-[11px]">
          © 2026 AGGARLY BY LONA • CELESTIAL ARCHITECTURAL SOLITUDE
        </span>
      </footer>
    </div>
  );
}
