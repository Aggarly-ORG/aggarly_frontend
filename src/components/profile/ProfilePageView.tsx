"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LonaHeader } from "../common/LonaHeader";
import { LonaFooter } from "../common/LonaFooter";
import { RealisticMoon } from "../auth/RealisticMoon";
import { useAuth } from "../../context/AuthContext";
import {
  ProfileClient,
  ProfileData,
  ProfileBooking,
  ProfileWishlistItem,
  ProfileReview,
  ProfilePreference,
} from "../../lib/profileClient";
import { LocalPreferencesManager } from "../../lib/settingsClient";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Moon,
  Sparkles,
  Share2,
  LogOut,
  ExternalLink,
  Trash2,
  Plus,
  Edit3,
  Check,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Compass,
  Star,
  Sliders,
  X,
  Bookmark,
  MessageSquare,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Camera,
  CheckCircle2,
  CreditCard,
  Clock,
  Building2,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileTab = "overview" | "preferences" | "wishlists" | "reviews";

export const ProfilePageView: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [bookings, setBookings] = useState<ProfileBooking[]>([]);
  const [wishlistItems, setWishlistItems] = useState<ProfileWishlistItem[]>([]);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [preferences, setPreferences] = useState<ProfilePreference[]>([]);

  const isHost = useMemo(() => {
    return (
      user?.role === "HOST" ||
      user?.role === "ROLE_HOST" ||
      user?.roles?.includes("HOST") ||
      user?.roles?.includes("ROLE_HOST") ||
      profile?.roles?.includes("HOST") ||
      profile?.roles?.includes("ROLE_HOST")
    );
  }, [user, profile]);

  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Bio inline edit state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  // Avatar upload state
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Add preference modal state
  const [showAddPrefModal, setShowAddPrefModal] = useState(false);
  const [newPrefKey, setNewPrefKey] = useState("");
  const [newPrefVal, setNewPrefVal] = useState("");
  const [savingPref, setSavingPref] = useState(false);

  // Booking detail modal state
  const [selectedBooking, setSelectedBooking] = useState<ProfileBooking | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load all profile data concurrently from backend
  const loadProfileData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, bRes, wRes, rRes, prefRes] = await Promise.allSettled([
        ProfileClient.getMyProfile(),
        ProfileClient.getMyBookings(),
        ProfileClient.getMySavedRetreats(),
        ProfileClient.getMyReviews(),
        ProfileClient.getMyPreferences(),
      ]);

      if (pRes.status === "fulfilled") {
        setProfile(pRes.value);
        setBioInput(pRes.value.bio || "");
      } else if (user) {
        setProfile({
          id: user.id || "",
          email: user.email || "",
          username: user.username || "",
          displayName: user.displayName || "",
          phone: user.phone || "",
          avatarUrl: user.avatarUrl || "",
          bio: "",
          roles: user.roles || ["USER"],
          emailVerified: Boolean(user.emailVerified),
          phoneVerified: false,
          mfaEnabled: false,
        });
      }

      if (bRes.status === "fulfilled") setBookings(bRes.value);
      if (wRes.status === "fulfilled") setWishlistItems(wRes.value);
      if (rRes.status === "fulfilled") setReviews(rRes.value);
      if (prefRes.status === "fulfilled") setPreferences(prefRes.value);
    } catch (e) {
      console.warn("Error loading profile data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Stay sub-filter state
  const [stayFilter, setStayFilter] = useState<"ALL" | "UPCOMING" | "COMPLETED" | "CANCELLED">("ALL");

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "CONFIRMED":
        return {
          label: "Confirmed",
          className: "bg-emerald-950/80 border-emerald-500/30 text-emerald-400",
        };
      case "PENDING_PAYMENT":
        return {
          label: "Payment Pending",
          className: "bg-amber-950/80 border-amber-500/30 text-amber-400",
        };
      case "COMPLETED":
        return {
          label: "Completed",
          className: "bg-zinc-800/80 border-zinc-700/40 text-zinc-300",
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          className: "bg-rose-950/80 border-rose-500/30 text-rose-400",
        };
      default:
        return {
          label: s,
          className: "bg-zinc-800/80 border-zinc-700/40 text-zinc-300",
        };
    }
  };

  // Derived booking collections (sorted chronologically)
  const upcomingStays = useMemo(() => {
    return bookings
      .filter((b) => b.isUpcoming && b.status !== "CANCELLED")
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
  }, [bookings]);

  const pastStays = useMemo(() => {
    return bookings
      .filter((b) => !b.isUpcoming && b.status !== "CANCELLED")
      .sort((a, b) => new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime());
  }, [bookings]);

  const cancelledStays = useMemo(() => {
    return bookings
      .filter((b) => b.status === "CANCELLED")
      .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [bookings]);

  const totalNights = useMemo(() => {
    return bookings
      .filter((b) => b.status !== "CANCELLED")
      .reduce((sum, b) => sum + (b.nights || 1), 0);
  }, [bookings]);

  const primaryUpcoming = upcomingStays[0] || null;
  const otherUpcomingStays = useMemo(() => upcomingStays.slice(1), [upcomingStays]);

  // Format member joined date
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Member";

  // Share profile handler
  const handleShareProfile = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        showToast("Profile URL copied to clipboard", "success");
      }
    }
  };

  // Avatar upload handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const newUrl = await ProfileClient.uploadAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatarUrl: newUrl } : null));
      await refreshUser();
      showToast("Sanctuary avatar updated successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to upload avatar", "error");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // Bio save handler
  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      const updated = await ProfileClient.updateProfile({ bio: bioInput.trim() });
      setProfile(updated);
      setIsEditingBio(false);
      showToast("Nocturnal bio updated successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save bio", "error");
    } finally {
      setSavingBio(false);
    }
  };

  // Add preference handler
  const handleSavePreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrefKey.trim() || !newPrefVal.trim()) return;

    setSavingPref(true);
    try {
      await ProfileClient.savePreference(newPrefKey.trim(), newPrefVal.trim());
      setPreferences((prev) => [
        ...prev.filter((p) => p.key !== newPrefKey.trim()),
        { key: newPrefKey.trim(), value: newPrefVal.trim(), label: newPrefKey.trim() },
      ]);
      setShowAddPrefModal(false);
      setNewPrefKey("");
      setNewPrefVal("");
      showToast("Travel preference calibrated", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save preference", "error");
    } finally {
      setSavingPref(false);
    }
  };

  // Delete preference handler
  const handleDeletePreference = async (key: string) => {
    try {
      await ProfileClient.deletePreference(key);
      setPreferences((prev) => prev.filter((p) => p.key !== key));
      showToast("Preference removed", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete preference", "error");
    }
  };

  // Remove saved retreat handler
  const handleRemoveWishlist = async (wishlistId: string, propertyId: string) => {
    try {
      await ProfileClient.removeSavedRetreat(wishlistId, propertyId);
      setWishlistItems((prev) => prev.filter((w) => !(w.wishlistId === wishlistId && w.propertyId === propertyId)));
      showToast("Retreat removed from saved list", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to remove saved retreat", "error");
    }
  };

  // Delete authored review handler
  const handleDeleteReview = async (reviewId: string) => {
    try {
      await ProfileClient.deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast("Observation review removed", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete review", "error");
    }
  };

  // Local preferences for right rail display
  const localPrefs = LocalPreferencesManager.getPreferences();

  /* ── Tab Bar Scrolling & Drag-to-Scroll Support ── */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollState();

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateScrollState();
      }
    };

    const handleScroll = () => {
      updateScrollState();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    const activeBtn = tabRefs.current[activeTab];
    if (activeBtn && scrollContainerRef.current) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      setTimeout(updateScrollState, 300);
    }
  }, [activeTab, updateScrollState]);

  const scrollByAmount = (amount: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
      setTimeout(updateScrollState, 300);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
    updateScrollState();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleTabClick = (tabId: ProfileTab) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    setActiveTab(tabId);
    const btn = tabRefs.current[tabId];
    if (btn && scrollContainerRef.current) {
      btn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      setTimeout(updateScrollState, 300);
    }
  };

  const tabsConfig: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: `STAYS & RESERVATIONS (${bookings.length})`,
      icon: <Calendar className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: "preferences",
      label: "TRAVEL & STAY PREFERENCES",
      icon: <Sliders className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: "wishlists",
      label: `SAVED RETREATS (${wishlistItems.length})`,
      icon: <Bookmark className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: "reviews",
      label: `CELESTIAL JOURNAL & REVIEWS (${reviews.length})`,
      icon: <Star className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  const userDisplayName =
    profile?.displayName ||
    ([profile?.firstName, profile?.lastName].filter(Boolean).join(" ")) ||
    profile?.username ||
    user?.displayName ||
    "Resident";

  return (
    <div className="min-h-screen bg-canvas-outer text-text-on-light-primary flex flex-col font-sans selection:bg-surface-container selection:text-text-on-dark-primary">
      {/* Global Minimalist Lona Header */}
      <LonaHeader />

      {/* Main Canvas Frame */}
      <main className="w-full pt-4 sm:pt-8 pb-16 px-3 sm:px-6 lg:px-8 flex-1 flex flex-col items-center justify-start">
        {/* Toast Notification Alert */}
        {toast && (
          <div
            className={cn(
              "fixed top-20 z-50 px-5 py-3 rounded-full text-xs font-semibold uppercase tracking-wider shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300",
              toast.type === "success"
                ? "bg-white text-[#0A0A0C] shadow-[0_8px_30px_rgba(255,255,255,0.25)] border border-white/40"
                : "bg-red-600 text-white shadow-[0_8px_30px_rgba(239,68,68,0.3)] border border-red-500/40"
            )}
          >
            {toast.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Central Floating Obsidian Monolith Card */}
        <div className="w-full max-w-6xl rounded-2xl sm:rounded-[32px] bg-gradient-to-b from-obsidian-base to-surface-container-lowest border border-hairline-on-dark shadow-[0_24px_48px_-12px_rgba(10,10,12,0.35),0_4px_16px_rgba(10,10,12,0.12)] relative overflow-hidden text-text-on-dark-primary p-5 sm:p-8 md:p-10 lg:p-12 transition-all flex flex-col gap-8">
          {/* Subtle Ambient Celestial Glows */}
          <div className="absolute -top-36 -left-20 w-96 h-96 rounded-full bg-white/[0.03] blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-white/[0.02] blur-[100px] pointer-events-none" />

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: RESIDENT HERO IDENTITY                                 */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-hairline-on-dark">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
              {/* Resident Avatar with Glowing Ring & Upload Trigger */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-surface-container-highest border-2 border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.08)] flex items-center justify-center relative">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={userDisplayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-serif text-2xl sm:text-3xl font-medium text-white/80">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </span>
                  )}

                  {/* Upload Overlay */}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    aria-label="Upload resident photo"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white/90" />
                    )}
                  </button>
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />

                {/* Status Pill Badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-obsidian-base border border-hairline-on-dark flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* Identity & Metadata Details */}
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-text-on-dark-primary font-normal tracking-wide uppercase">
                    {userDisplayName}
                  </h1>

                  {/* Role Badge */}
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border shadow-sm",
                      isHost
                        ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400"
                        : "bg-surface-container-highest border border-hairline-on-dark text-white/80"
                    )}
                  >
                    {isHost ? "Sanctuary Host" : "Verified Resident"}
                  </span>
                </div>

                {/* Verification & Contact Row */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-text-on-dark-secondary">
                  {profile?.emailVerified && (
                    <span className="inline-flex items-center gap-1 text-emerald-400/90 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>ID VERIFIED</span>
                    </span>
                  )}

                  {profile?.email && (
                    <span className="inline-flex items-center gap-1 font-mono text-text-on-dark-secondary">
                      <Mail className="w-3.5 h-3.5 text-text-on-dark-secondary/70" />
                      <span>{profile.email}</span>
                    </span>
                  )}

                  {profile?.phone && (
                    <span className="inline-flex items-center gap-1 text-text-on-dark-secondary font-mono">
                      <Phone className="w-3 h-3" />
                      <span>{profile.phone}</span>
                    </span>
                  )}
                </div>

                {/* Dynamic Stat Capsules Row */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <div className="px-3 py-1 rounded-full bg-surface-container-lowest/80 border border-hairline-on-dark flex items-center gap-1.5 text-[11px] text-text-on-dark-primary font-medium shadow-sm">
                    <Calendar className="w-3.5 h-3.5 text-white/70" />
                    <span>
                      {bookings.length} {bookings.length === 1 ? "Reservation" : "Reservations"}
                      {upcomingStays.length > 0 ? ` (${upcomingStays.length} Upcoming)` : ""}
                    </span>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-surface-container-lowest/80 border border-hairline-on-dark flex items-center gap-1.5 text-[11px] text-text-on-dark-primary font-medium shadow-sm">
                    <Moon className="w-3.5 h-3.5 text-white/70" />
                    <span>{totalNights} Nights Under Moonlight</span>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-surface-container-lowest/80 border border-hairline-on-dark flex items-center gap-1.5 text-[11px] text-text-on-dark-secondary font-medium shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white/60" />
                    <span>Resident Since {memberSince}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 flex-wrap">
              {isHost && (
                <>
                  <Link
                    href="/host"
                    className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer font-bold"
                  >
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Host Portfolio</span>
                  </Link>
                  <Link
                    href="/host/sanctuaries/new"
                    className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-surface-container-highest border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50 hover:border-emerald-500/60 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Sanctuary</span>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={handleShareProfile}
                className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-surface-container-highest border border-hairline-on-dark text-text-on-dark-primary hover:bg-surface-container hover:border-white/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Profile</span>
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-transparent border border-hairline-on-dark text-text-on-dark-secondary hover:text-white hover:border-white/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: FUNCTIONAL HORIZONTAL TABS BAR (SCROLLABLE & SWIPEABLE) */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 w-full border-b border-hairline-on-dark pb-2">
            {/* Left Scroll Chevron */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-2 z-20 flex items-center pr-3 bg-gradient-to-r from-obsidian-base via-obsidian-base/90 to-transparent pointer-events-none">
                <button
                  type="button"
                  onClick={() => scrollByAmount(-220)}
                  aria-label="Scroll tabs left"
                  className="pointer-events-auto h-7 w-7 rounded-full bg-surface-container-highest hover:bg-surface-container border border-hairline-on-dark shadow-md flex items-center justify-center text-text-on-dark-primary transition-all cursor-pointer hover:border-white/30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Right Scroll Chevron */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-2 z-20 flex items-center pl-3 bg-gradient-to-l from-obsidian-base via-obsidian-base/90 to-transparent pointer-events-none">
                <button
                  type="button"
                  onClick={() => scrollByAmount(220)}
                  aria-label="Scroll tabs right"
                  className="pointer-events-auto h-7 w-7 rounded-full bg-surface-container-highest hover:bg-surface-container border border-hairline-on-dark shadow-md flex items-center justify-center text-text-on-dark-primary transition-all cursor-pointer hover:border-white/30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Scrollable Tabs Track */}
            <div
              ref={scrollContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 touch-pan-x cursor-grab active:cursor-grabbing select-none"
            >
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={cn(
                      "px-4 sm:px-5 py-2.5 rounded-full font-semibold text-[11px] sm:text-xs tracking-wider uppercase shrink-0 transition-all flex items-center gap-2 border cursor-pointer select-none whitespace-nowrap",
                      isActive
                        ? "bg-white text-[#0A0A0C] border-white shadow-md font-bold"
                        : "bg-surface-container-highest/40 text-text-on-dark-secondary hover:text-white hover:bg-surface-container-highest border-hairline-on-dark"
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 3: TWO-COLUMN MAIN CONTENT GRID                            */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ────────────────────────────────────────────────────────────── */}
            {/* LEFT COLUMN: ACTIVE TAB PANEL (8 COLS)                          */}
            {/* ────────────────────────────────────────────────────────────── */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              {/* TAB 1: OVERVIEW & STAYS */}
              {activeTab === "overview" && (
                <div className="flex flex-col gap-8 animate-in fade-in duration-200">
                  {/* Host Quick-Access Operational Card */}
                  {isHost && (
                    <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-surface-container-lowest to-surface-container-lowest border border-emerald-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif text-sm sm:text-base text-white font-normal">
                              Host Sanctuary Operations
                            </h4>
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-bold tracking-widest uppercase bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-text-on-dark-secondary">
                            Access your retreat portfolio, live occupancy, booking requests, and calendar tariffs.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <Link
                          href="/host"
                          className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 font-bold cursor-pointer"
                        >
                          <span>Manage Portfolio</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Sub-Filter Tabs: All, Upcoming, Completed, Cancelled */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline-on-dark pb-3">
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-lowest/80 border border-hairline-on-dark overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setStayFilter("ALL")}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer",
                          stayFilter === "ALL"
                            ? "bg-white text-[#0A0A0C] shadow-sm font-bold"
                            : "text-text-on-dark-secondary hover:text-white"
                        )}
                      >
                        All ({bookings.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStayFilter("UPCOMING")}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer",
                          stayFilter === "UPCOMING"
                            ? "bg-white text-[#0A0A0C] shadow-sm font-bold"
                            : "text-text-on-dark-secondary hover:text-white"
                        )}
                      >
                        Upcoming ({upcomingStays.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStayFilter("COMPLETED")}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer",
                          stayFilter === "COMPLETED"
                            ? "bg-white text-[#0A0A0C] shadow-sm font-bold"
                            : "text-text-on-dark-secondary hover:text-white"
                        )}
                      >
                        Completed ({pastStays.length})
                      </button>
                      {cancelledStays.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setStayFilter("CANCELLED")}
                          className={cn(
                            "px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer",
                            stayFilter === "CANCELLED"
                              ? "bg-white text-[#0A0A0C] shadow-sm font-bold"
                              : "text-text-on-dark-secondary hover:text-white"
                          )}
                        >
                          Cancelled ({cancelledStays.length})
                        </button>
                      )}
                    </div>

                    <Link
                      href="/properties"
                      className="text-xs font-semibold uppercase tracking-wider text-text-on-dark-secondary hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Explore Sanctuaries</span>
                    </Link>
                  </div>

                  {/* Empty state if user has literally zero bookings */}
                  {bookings.length === 0 && (
                    <div className="rounded-2xl bg-surface-container-lowest/90 border border-hairline-on-dark p-8 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-container-highest/60 border border-hairline-on-dark flex items-center justify-center text-white/50 mb-1">
                        <Moon className="w-6 h-6" />
                      </div>
                      <h3 className="font-serif text-lg text-white">No Sanctuary Reservations Yet</h3>
                      <p className="text-xs text-text-on-dark-secondary max-w-sm">
                        You haven't reserved any retreats yet. Browse our curated architectural properties to schedule your first nocturnal journey.
                      </p>
                      <Link
                        href="/properties"
                        className="mt-2 px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Explore Sanctuaries</span>
                      </Link>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* 1. PRIMARY / IMMINENT UPCOMING STAY HERO SPOTLIGHT         */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {(stayFilter === "ALL" || stayFilter === "UPCOMING") && primaryUpcoming && (
                    <div className="rounded-2xl bg-surface-container-lowest/90 border border-hairline-on-dark p-5 sm:p-6 flex flex-col gap-5 relative overflow-hidden shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline-on-dark pb-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-label-caps-sm text-[10px] uppercase tracking-widest text-text-on-dark-secondary">
                            NEXT SCHEDULED SANCTUARY
                          </span>
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", getStatusBadge(primaryUpcoming.status).className)}>
                            {getStatusBadge(primaryUpcoming.status).label}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-text-on-dark-secondary">
                          #LONA-{primaryUpcoming.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-4">
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-container-highest overflow-hidden shrink-0 border border-hairline-on-dark flex items-center justify-center">
                              {primaryUpcoming.propertyImage ? (
                                <img
                                  src={primaryUpcoming.propertyImage}
                                  alt={primaryUpcoming.propertyTitle}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Moon className="w-6 h-6 text-white/40" />
                              )}
                            </div>
                            <div>
                              <h2 className="font-serif text-xl sm:text-2xl text-text-on-dark-primary font-normal">
                                {primaryUpcoming.propertyTitle}
                              </h2>
                              <p className="text-xs text-text-on-dark-secondary flex items-center gap-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-text-on-dark-secondary/70 shrink-0" />
                                <span>
                                  {[primaryUpcoming.propertyCity, primaryUpcoming.propertyCountry]
                                    .filter(Boolean)
                                    .join(", ") || "Sanctuary Haven"}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-xs text-text-on-dark-secondary uppercase tracking-wider block">
                              Duration
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {primaryUpcoming.checkIn} → {primaryUpcoming.checkOut} ({primaryUpcoming.nights} Nights)
                            </span>
                            {primaryUpcoming.totalAmount > 0 && (
                              <span className="text-xs text-text-on-dark-secondary block mt-0.5">
                                Commitment: {primaryUpcoming.currency} {primaryUpcoming.totalAmount.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          {primaryUpcoming.status === "PENDING_PAYMENT" && (
                            <Link
                              href={`/properties/${primaryUpcoming.propertyId}/checkout?bookingId=${primaryUpcoming.id}`}
                              className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-black hover:bg-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Complete Payment</span>
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedBooking(primaryUpcoming)}
                            className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                          >
                            <span>Manage Reservation</span>
                          </button>

                          <Link
                            href={`/properties/${primaryUpcoming.propertyId}`}
                            className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-surface-container-highest border border-hairline-on-dark text-white hover:border-white/30 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>View Sanctuary</span>
                            <ExternalLink className="w-3.5 h-3.5 text-white/70" />
                          </Link>

                          <Link
                            href="/chat"
                            className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-transparent border border-hairline-on-dark text-text-on-dark-secondary hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Concierge Support</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* 2. ALL OTHER UPCOMING & SCHEDULED SANCTUARIES              */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {(stayFilter === "ALL" || stayFilter === "UPCOMING") && otherUpcomingStays.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-serif text-lg text-text-on-dark-primary font-normal">
                            Other Scheduled Sanctuaries
                          </h3>
                          <p className="text-xs text-text-on-dark-secondary mt-0.5">
                            Additional upcoming nocturnal retreats and confirmed itineraries.
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-text-on-dark-secondary">
                          {otherUpcomingStays.length} SCHEDULED
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        {otherUpcomingStays.map((stay) => {
                          const badge = getStatusBadge(stay.status);
                          return (
                            <div
                              key={stay.id}
                              className="rounded-2xl bg-surface-container-lowest/80 border border-hairline-on-dark p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-all shadow-sm group"
                            >
                              <div className="flex items-start sm:items-center gap-4 min-w-0">
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-container-highest overflow-hidden shrink-0 border border-hairline-on-dark flex items-center justify-center">
                                  {stay.propertyImage ? (
                                    <img
                                      src={stay.propertyImage}
                                      alt={stay.propertyTitle}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  ) : (
                                    <Moon className="w-6 h-6 text-white/40" />
                                  )}
                                </div>

                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", badge.className)}>
                                      {badge.label}
                                    </span>
                                    <span className="text-[10px] font-mono text-text-on-dark-secondary">
                                      #LONA-{stay.id.slice(0, 8).toUpperCase()}
                                    </span>
                                  </div>

                                  <h4 className="font-serif text-base sm:text-lg text-white font-normal truncate">
                                    {stay.propertyTitle}
                                  </h4>

                                  <p className="text-xs text-text-on-dark-secondary flex items-center gap-1.5 truncate">
                                    <MapPin className="w-3 h-3 text-text-on-dark-secondary/70 shrink-0" />
                                    <span className="truncate">
                                      {[stay.propertyCity, stay.propertyCountry].filter(Boolean).join(", ") || "Sanctuary Haven"}
                                    </span>
                                  </p>

                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-on-dark-secondary pt-0.5">
                                    <span className="text-white/90 font-medium">
                                      {stay.checkIn} → {stay.checkOut}
                                    </span>
                                    <span>•</span>
                                    <span>{stay.nights} {stay.nights === 1 ? "Night" : "Nights"}</span>
                                    <span>•</span>
                                    <span>{stay.guestCount} {stay.guestCount === 1 ? "Guest" : "Guests"}</span>
                                    {stay.totalAmount > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="font-semibold text-white">
                                          {stay.currency} {stay.totalAmount.toFixed(2)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0 pt-2 md:pt-0">
                                {stay.status === "PENDING_PAYMENT" && (
                                  <Link
                                    href={`/properties/${stay.propertyId}/checkout?bookingId=${stay.id}`}
                                    className="px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-400 text-black hover:bg-amber-300 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Pay Now</span>
                                  </Link>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setSelectedBooking(stay)}
                                  className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                                >
                                  <span>Manage</span>
                                </button>

                                <Link
                                  href={`/properties/${stay.propertyId}`}
                                  className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-surface-container-highest border border-hairline-on-dark text-white/90 hover:text-white hover:border-white/30 transition-all flex items-center gap-1"
                                >
                                  <span>Sanctuary</span>
                                  <ExternalLink className="w-3 h-3 text-white/60" />
                                </Link>

                                <Link
                                  href="/chat"
                                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-transparent border border-hairline-on-dark text-text-on-dark-secondary hover:text-white transition-all flex items-center gap-1"
                                  title="Concierge Support"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty state when filtering UPCOMING and none exist */}
                  {stayFilter === "UPCOMING" && upcomingStays.length === 0 && bookings.length > 0 && (
                    <div className="rounded-xl bg-surface-container-lowest/60 border border-hairline-on-dark p-8 text-center flex flex-col items-center gap-2 text-xs text-text-on-dark-secondary">
                      <Moon className="w-6 h-6 text-white/30 mb-1" />
                      <p className="text-white font-medium">No upcoming stays scheduled.</p>
                      <p>Browse your completed stays or discover new nocturnal destinations.</p>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* 3. PAST STAYS & MEMORIES SECTION                           */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {(stayFilter === "ALL" || stayFilter === "COMPLETED") && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-serif text-lg text-text-on-dark-primary font-normal">
                            Past Stays &amp; Memories
                          </h3>
                          <p className="text-xs text-text-on-dark-secondary mt-0.5">
                            Completed journeys and recorded nocturnal observation archives.
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-text-on-dark-secondary">
                          {pastStays.length} ARCHIVED
                        </span>
                      </div>

                      {pastStays.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {pastStays.map((stay) => {
                            const badge = getStatusBadge(stay.status);
                            return (
                              <div
                                key={stay.id}
                                className="rounded-xl bg-surface-container-lowest/70 border border-hairline-on-dark p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-hairline-on-dark/80 transition-colors group"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest overflow-hidden shrink-0 border border-hairline-on-dark flex items-center justify-center">
                                    {stay.propertyImage ? (
                                      <img
                                        src={stay.propertyImage}
                                        alt={stay.propertyTitle}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                      />
                                    ) : (
                                      <Moon className="w-5 h-5 text-white/40" />
                                    )}
                                  </div>

                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-semibold text-white truncate">
                                        {stay.propertyTitle}
                                      </h4>
                                      <span className={cn("px-1.5 py-0.2 rounded text-[9px] uppercase border", badge.className)}>
                                        {badge.label}
                                      </span>
                                    </div>
                                    <span className="text-xs text-text-on-dark-secondary truncate">
                                      {[stay.propertyCity, stay.propertyCountry].filter(Boolean).join(", ") || "Sanctuary"} • {stay.checkIn} → {stay.checkOut} ({stay.nights} Nights)
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBooking(stay)}
                                    className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-hairline-on-dark text-white transition-all cursor-pointer"
                                  >
                                    <span>Details</span>
                                  </button>

                                  <Link
                                    href={`/properties/${stay.propertyId}`}
                                    className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-surface-container-highest border border-hairline-on-dark text-white/90 hover:text-white hover:border-white/30 transition-all flex items-center gap-1.5"
                                  >
                                    <span>View Sanctuary</span>
                                    <ArrowRight className="w-3 h-3 text-white/60" />
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl bg-surface-container-lowest/50 border border-hairline-on-dark p-6 text-center text-xs text-text-on-dark-secondary">
                          No completed journeys archived yet. Your past checkout records will be preserved here.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* 4. CANCELLED RESERVATIONS SECTION (IF ANY EXIST)           */}
                  {/* ────────────────────────────────────────────────────────── */}
                  {(stayFilter === "ALL" || stayFilter === "CANCELLED") && cancelledStays.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-serif text-lg text-text-on-dark-primary font-normal text-rose-300/90">
                            Cancelled Reservations
                          </h3>
                          <p className="text-xs text-text-on-dark-secondary mt-0.5">
                            Archived sanctuary bookings that were cancelled.
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-text-on-dark-secondary">
                          {cancelledStays.length} CANCELLED
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        {cancelledStays.map((stay) => {
                          const badge = getStatusBadge(stay.status);
                          return (
                            <div
                              key={stay.id}
                              className="rounded-xl bg-surface-container-lowest/50 border border-hairline-on-dark/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-12 h-12 rounded-lg bg-surface-container-highest/60 overflow-hidden shrink-0 border border-hairline-on-dark flex items-center justify-center">
                                  {stay.propertyImage ? (
                                    <img
                                      src={stay.propertyImage}
                                      alt={stay.propertyTitle}
                                      className="w-full h-full object-cover grayscale"
                                    />
                                  ) : (
                                    <Moon className="w-5 h-5 text-white/40" />
                                  )}
                                </div>

                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold text-white/80 line-through truncate">
                                      {stay.propertyTitle}
                                    </h4>
                                    <span className={cn("px-1.5 py-0.2 rounded text-[9px] uppercase border", badge.className)}>
                                      {badge.label}
                                    </span>
                                  </div>
                                  <span className="text-xs text-text-on-dark-secondary truncate">
                                    {[stay.propertyCity, stay.propertyCountry].filter(Boolean).join(", ") || "Sanctuary"} • {stay.checkIn} ({stay.nights} Nights)
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedBooking(stay)}
                                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-surface-container-highest border border-hairline-on-dark text-white/80 hover:text-white transition-all cursor-pointer"
                                >
                                  <span>Details</span>
                                </button>
                                <Link
                                  href={`/properties/${stay.propertyId}`}
                                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-transparent border border-hairline-on-dark text-white/80 hover:text-white transition-all flex items-center gap-1"
                                >
                                  <span>Revisit Sanctuary</span>
                                  <ExternalLink className="w-3 h-3 text-white/50" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TRAVEL & STAY PREFERENCES */}
              {activeTab === "preferences" && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline-on-dark pb-4">
                    <div>
                      <h2 className="font-serif text-xl text-text-on-dark-primary font-normal">
                        Travel &amp; Stay Preferences
                      </h2>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        Autonomous hospitality parameters calibrated by Lumen AI for nocturnal arrivals and stay comfort.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddPrefModal(true)}
                      className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-sm active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Preference</span>
                    </button>
                  </div>

                  {preferences.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {preferences.map((pref) => (
                        <div
                          key={pref.key}
                          className="rounded-xl bg-surface-container-lowest/80 border border-hairline-on-dark p-4 flex flex-col justify-between gap-3 group hover:border-hairline-on-dark/80 transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-label-caps-sm text-[10px] uppercase tracking-widest text-text-on-dark-secondary">
                                {pref.label || pref.key}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeletePreference(pref.key)}
                                title="Remove parameter"
                                aria-label={`Remove ${pref.key}`}
                                className="text-text-on-dark-secondary/50 hover:text-red-400 transition-colors p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-sm font-semibold text-white mt-1">
                              {pref.value}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Calibrated in Lumen Memory</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-surface-container-lowest/60 border border-hairline-on-dark p-8 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-container-highest/60 border border-hairline-on-dark flex items-center justify-center text-white/50">
                        <Sliders className="w-5 h-5" />
                      </div>
                      <h3 className="font-serif text-base text-white">No Custom Preferences Recorded</h3>
                      <p className="text-xs text-text-on-dark-secondary max-w-md">
                        Calibrate your nocturnal arrival time, dietary habits, acoustic silence parameters, or telescope optic preferences.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddPrefModal(true)}
                        className="mt-1 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-surface-container-highest border border-hairline-on-dark text-white hover:border-white/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Define New Parameter</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SAVED RETREATS (WISHLISTS) */}
              {activeTab === "wishlists" && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                  <div className="border-b border-hairline-on-dark pb-4">
                    <h2 className="font-serif text-xl text-text-on-dark-primary font-normal">
                      Saved Retreats &amp; Wishlists
                    </h2>
                    <p className="text-xs text-text-on-dark-secondary mt-0.5">
                      Curated sanctuaries and architectural solitude retreats bookmarked for upcoming journeys.
                    </p>
                  </div>

                  {wishlistItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {wishlistItems.map((item) => (
                        <div
                          key={`${item.wishlistId}-${item.propertyId}`}
                          className="rounded-2xl bg-surface-container-lowest/80 border border-hairline-on-dark overflow-hidden flex flex-col justify-between group hover:border-white/20 transition-all shadow-sm"
                        >
                          {/* Property Image Container */}
                          <div className="relative h-44 w-full bg-surface-container-highest overflow-hidden">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/40">
                                <Moon className="w-8 h-8" />
                              </div>
                            )}

                            {/* Remove from wishlist button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveWishlist(item.wishlistId, item.propertyId)}
                              title="Remove from saved retreats"
                              aria-label={`Remove ${item.title} from saved`}
                              className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-red-400 hover:bg-black/80 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Rating pill if available */}
                            {typeof item.rating === "number" && item.rating > 0 && (
                              <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span>{item.rating.toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          {/* Property Details */}
                          <div className="p-4 flex flex-col gap-2">
                            <div>
                              <h4 className="font-serif text-base text-white font-normal truncate">
                                {item.title}
                              </h4>
                              <p className="text-xs text-text-on-dark-secondary truncate">
                                {[item.city, item.country].filter(Boolean).join(", ") || "Global Destination"}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-hairline-on-dark/60 mt-1">
                              <div>
                                <span className="text-sm font-semibold text-white">
                                  {item.currency === "EUR" ? "€" : "$"}{item.pricePerNight}
                                </span>
                                <span className="text-[11px] text-text-on-dark-secondary"> / night</span>
                              </div>

                              <Link
                                href={`/properties/${item.propertyId}`}
                                className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all flex items-center gap-1 shadow-sm"
                              >
                                <span>Reserve</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-surface-container-lowest/60 border border-hairline-on-dark p-8 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-container-highest/60 border border-hairline-on-dark flex items-center justify-center text-white/50">
                        <Bookmark className="w-5 h-5" />
                      </div>
                      <h3 className="font-serif text-base text-white">No Retreats Bookmarked</h3>
                      <p className="text-xs text-text-on-dark-secondary max-w-sm">
                        Browse our collection of dark-sky sanctuaries and architectural properties to curate your personal wishlist.
                      </p>
                      <Link
                        href="/properties"
                        className="mt-1 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Discover Properties</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CELESTIAL JOURNAL & REVIEWS */}
              {activeTab === "reviews" && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                  <div className="border-b border-hairline-on-dark pb-4">
                    <h2 className="font-serif text-xl text-text-on-dark-primary font-normal">
                      Celestial Journal &amp; Reviews
                    </h2>
                    <p className="text-xs text-text-on-dark-secondary mt-0.5">
                      Personal impressions and astronomical notes recorded from completed sanctuary stays.
                    </p>
                  </div>

                  {reviews.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="rounded-2xl bg-surface-container-lowest/80 border border-hairline-on-dark p-5 flex flex-col gap-3 group hover:border-hairline-on-dark/80 transition-all"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/properties/${rev.propertyId}`}
                                className="font-serif text-base text-white hover:underline truncate"
                              >
                                {rev.propertyTitle || "Sanctuary"}
                              </Link>
                              <div className="flex items-center gap-0.5 ml-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "w-3.5 h-3.5",
                                      i < rev.rating
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-zinc-600"
                                    )}
                                  />
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteReview(rev.id)}
                              title="Delete review"
                              aria-label="Delete review"
                              className="text-text-on-dark-secondary/50 hover:text-red-400 transition-colors p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs sm:text-sm text-text-on-dark-secondary leading-relaxed italic">
                            "{rev.comment}"
                          </p>

                          {rev.createdAt && (
                            <span className="text-[11px] font-mono text-text-on-dark-secondary/60">
                              Recorded on {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-surface-container-lowest/60 border border-hairline-on-dark p-8 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-container-highest/60 border border-hairline-on-dark flex items-center justify-center text-white/50">
                        <Star className="w-5 h-5" />
                      </div>
                      <h3 className="font-serif text-base text-white">No Observation Reviews Yet</h3>
                      <p className="text-xs text-text-on-dark-secondary max-w-sm">
                        After concluding a nocturnal journey, your submitted stay impressions and acoustic ratings will be preserved in your celestial journal.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ────────────────────────────────────────────────────────────── */}
            {/* RIGHT COLUMN: SIDEBAR WIDGETS (4 COLS)                         */}
            {/* ────────────────────────────────────────────────────────────── */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* HOST OPERATIONS CONSOLE WIDGET */}
              {isHost && (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-surface-container-lowest to-surface-container-lowest border border-emerald-500/30 p-5 sm:p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-[40px] pointer-events-none" />
                  <div className="flex items-center justify-between border-b border-hairline-on-dark pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-serif text-base text-white font-normal">
                        Host Console
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                      Verified Host
                    </span>
                  </div>

                  <p className="text-xs text-text-on-dark-secondary leading-relaxed">
                    Manage your architectural properties, review live calendar reservations, calibrate seasonal tariffs, and configure cleaning routines.
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <Link
                      href="/host"
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 font-bold cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Host Portfolio</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto text-zinc-500" />
                    </Link>
                    <Link
                      href="/host/sanctuaries/new"
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-surface-container-highest border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50 hover:border-emerald-500/60 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Add New Sanctuary</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto text-text-on-dark-secondary" />
                    </Link>
                  </div>
                </div>
              )}

              {/* WIDGET 1: BIO & STARGAZING PROFILE */}
              <div className="rounded-2xl bg-surface-container-lowest/90 border border-hairline-on-dark p-5 sm:p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-hairline-on-dark pb-3">
                  <h3 className="font-serif text-base text-white font-normal">
                    Bio &amp; Stargazing Profile
                  </h3>
                  {!isEditingBio && (
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(true)}
                      className="text-xs font-semibold uppercase tracking-wider text-text-on-dark-secondary hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {isEditingBio ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      placeholder="Describe your nocturnal retreat style, optical preferences, and architectural sensibilities..."
                      rows={4}
                      className="w-full rounded-xl bg-surface-container-highest border border-hairline-on-dark p-3 text-xs text-white placeholder:text-text-on-dark-secondary/50 focus:outline-none focus:border-white/40 transition-colors resize-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setBioInput(profile?.bio || "");
                          setIsEditingBio(false);
                        }}
                        disabled={savingBio}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider text-text-on-dark-secondary hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        className="px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        {savingBio && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-on-dark-secondary leading-relaxed italic">
                    {profile?.bio
                      ? `"${profile.bio}"`
                      : "Architectural enthusiast and nocturnal observer seeking quiet contemplation and unpolluted horizons."}
                  </p>
                )}

                {/* Local Preferences Quick Snapshot */}
                <div className="flex flex-col gap-2 pt-2 border-t border-hairline-on-dark/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-on-dark-secondary">Visual Theme</span>
                    <span className="font-semibold text-white uppercase">{localPrefs.theme} Obsidian</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-on-dark-secondary">Preferred Currency</span>
                    <span className="font-semibold text-white">{localPrefs.currency}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-on-dark-secondary">Units</span>
                    <span className="font-semibold text-white capitalize">{localPrefs.metric}</span>
                  </div>
                </div>
              </div>

              {/* WIDGET 2: ACCOUNT SECURITY & VERIFICATION */}
              <div className="rounded-2xl bg-surface-container-lowest/90 border border-hairline-on-dark p-5 sm:p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-hairline-on-dark pb-3">
                  <h3 className="font-serif text-base text-white font-normal">
                    Account Security
                  </h3>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-highest/40 border border-hairline-on-dark/40">
                    <span className="text-text-on-dark-secondary">Email Verification</span>
                    <span className={cn("font-medium", profile?.emailVerified ? "text-emerald-400" : "text-amber-400")}>
                      {profile?.emailVerified ? "Verified" : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-highest/40 border border-hairline-on-dark/40">
                    <span className="text-text-on-dark-secondary">Two-Factor (TOTP)</span>
                    <span className={cn("font-medium", profile?.mfaEnabled ? "text-emerald-400" : "text-text-on-dark-secondary")}>
                      {profile?.mfaEnabled ? "Enforced" : "Disabled"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-highest/40 border border-hairline-on-dark/40">
                    <span className="text-text-on-dark-secondary">Member Tier</span>
                    <span className="font-medium text-white">
                      {profile?.roles?.includes("HOST") ? "Sanctuary Host" : "Verified Member"}
                    </span>
                  </div>
                </div>

                <Link
                  href="/settings"
                  className="mt-1 text-center py-2 px-3 rounded-xl bg-surface-container-highest border border-hairline-on-dark text-xs font-semibold uppercase tracking-wider text-white hover:border-white/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Manage in Settings</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                </Link>
              </div>

              {/* WIDGET 3: LUMEN AI CONCIERGE (24/7 AUTONOMOUS OFFICER) */}
              <div className="rounded-2xl bg-gradient-to-br from-surface-container-lowest to-surface-container-highest/60 border border-hairline-on-dark p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-hairline-on-dark pb-3">
                  <div className="flex items-center gap-2">
                    <RealisticMoon size={20} />
                    <h3 className="font-serif text-base text-white font-normal">
                      Lumen Concierge
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    ON DUTY
                  </span>
                </div>

                <p className="text-xs text-text-on-dark-secondary leading-relaxed">
                  Your autonomous 24/7 nocturnal travel intelligence assistant. Calibrated to your stay preferences, celestial forecasts, and private sanctuary itineraries.
                </p>

                <Link
                  href="/chat"
                  className="mt-1 w-full py-2.5 px-4 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Converse with Lumen</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD TRAVEL PREFERENCE                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {showAddPrefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-obsidian-base border border-hairline-on-dark p-6 flex flex-col gap-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline-on-dark pb-3">
              <h3 className="font-serif text-lg font-normal">Calibrate Stay Preference</h3>
              <button
                type="button"
                onClick={() => setShowAddPrefModal(false)}
                className="text-text-on-dark-secondary hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePreference} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-on-dark-secondary uppercase tracking-wider">
                  Parameter Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dietary Requirements, Arrival Time, Optics"
                  value={newPrefKey}
                  onChange={(e) => setNewPrefKey(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-highest border border-hairline-on-dark px-3.5 py-2.5 text-xs text-white placeholder:text-text-on-dark-secondary/50 focus:outline-none focus:border-white/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-on-dark-secondary uppercase tracking-wider">
                  Preference Value
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pescetarian, Twilight Arrival, Schmidt-Cassegrain 14"
                  value={newPrefVal}
                  onChange={(e) => setNewPrefVal(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-highest border border-hairline-on-dark px-3.5 py-2.5 text-xs text-white placeholder:text-text-on-dark-secondary/50 focus:outline-none focus:border-white/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPrefModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider text-text-on-dark-secondary hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPref}
                  className="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {savingPref && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Calibrate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: BOOKING RESERVATION DETAILS                                   */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-obsidian-base border border-hairline-on-dark p-6 flex flex-col gap-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline-on-dark pb-3">
              <div>
                <span className="font-label-caps-sm text-[10px] uppercase tracking-widest text-text-on-dark-secondary">
                  RESERVATION RECORD
                </span>
                <h3 className="font-serif text-lg font-normal mt-0.5">
                  {selectedBooking.propertyTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-text-on-dark-secondary hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sanctuary Image Preview Banner */}
            {selectedBooking.propertyImage && (
              <div className="w-full h-36 rounded-xl overflow-hidden border border-hairline-on-dark relative">
                <img
                  src={selectedBooking.propertyImage}
                  alt={selectedBooking.propertyTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian-base/90 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 text-xs text-white/90 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-white/70" />
                  <span>
                    {[selectedBooking.propertyCity, selectedBooking.propertyCountry].filter(Boolean).join(", ") || "Sanctuary Haven"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between py-2 border-b border-hairline-on-dark/60">
                <span className="text-text-on-dark-secondary">Booking Reference</span>
                <span className="font-mono text-white">#LONA-{selectedBooking.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-hairline-on-dark/60 items-center">
                <span className="text-text-on-dark-secondary">Status</span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", getStatusBadge(selectedBooking.status).className)}>
                  {getStatusBadge(selectedBooking.status).label}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-hairline-on-dark/60">
                <span className="text-text-on-dark-secondary">Check-In</span>
                <span className="text-white font-medium">{selectedBooking.checkIn}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-hairline-on-dark/60">
                <span className="text-text-on-dark-secondary">Check-Out</span>
                <span className="text-white font-medium">{selectedBooking.checkOut}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-hairline-on-dark/60">
                <span className="text-text-on-dark-secondary">Duration</span>
                <span className="text-white font-medium">{selectedBooking.nights} Night(s)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-hairline-on-dark/60">
                <span className="text-text-on-dark-secondary">Guests</span>
                <span className="text-white font-medium">{selectedBooking.guestCount} Resident(s)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-hairline-on-dark/60">
                <span className="text-text-on-dark-secondary">Total Commitment</span>
                <span className="text-white font-semibold">
                  {selectedBooking.currency} {selectedBooking.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedBooking.status === "PENDING_PAYMENT" && (
                  <Link
                    href={`/properties/${selectedBooking.propertyId}/checkout?bookingId=${selectedBooking.id}`}
                    className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-black hover:bg-amber-300 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Complete Payment</span>
                  </Link>
                )}

                <Link
                  href={`/properties/${selectedBooking.propertyId}`}
                  className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-surface-container-highest border border-hairline-on-dark text-white hover:border-white/30 transition-all flex items-center gap-1.5"
                >
                  <span>View Sanctuary Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href="/chat"
                  className="px-3.5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-transparent border border-hairline-on-dark text-text-on-dark-secondary hover:text-white transition-all flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Concierge</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-[#0A0A0C] hover:bg-white/90 transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Minimalist Lona Footer */}
      <LonaFooter />
    </div>
  );
};
