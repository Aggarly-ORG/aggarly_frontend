"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { LonaHeader } from "../common/LonaHeader";
import { RealisticMoon } from "../auth/RealisticMoon";
import { useAuth } from "../../context/AuthContext";
import {
  SettingsClient,
  BackendUserProfile,
  NotificationPreferenceItem,
  UserPaymentMethodItem,
  BookingHistoryItem,
  AiMemoryItem,
  LocalUserPreferences,
  LocalPreferencesManager,
  MfaSetupData,
  UserSession,
} from "../../lib/settingsClient";
import {
  User,
  Bell,
  Sparkles,
  CreditCard,
  Check,
  Mail,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Sliders,
  Moon,
  Sun,
  Globe,
  Copy,
  QrCode,
  Monitor,
  Smartphone,
  Laptop,
  Tablet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsTab = "account" | "preferences" | "notifications" | "billing" | "lumen";

/* ─────────────────────────────────────────────────────────────────────────────
   REUSABLE ACCESSIBLE LONA TOGGLE SWITCH (CENTERED, WHITE & OBSIDIAN)
   ───────────────────────────────────────────────────────────────────────────── */
interface LonaToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
}

export const LonaToggle: React.FC<LonaToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  id,
}) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none select-none",
        disabled && "opacity-50 cursor-not-allowed",
        checked
          ? "bg-white shadow-[0_0_14px_rgba(255,255,255,0.3)]"
          : "bg-surface-container-highest border border-hairline-on-dark"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full shadow-md transition-transform duration-200 ease-in-out",
          checked
            ? "translate-x-5 bg-[#0A0A0C]"
            : "translate-x-0 bg-text-on-dark-secondary"
        )}
      />
    </button>
  );
};

export const SettingsPageView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  /* ── 1. Real Backend Profile State ── */
  const [profile, setProfile] = useState<BackendUserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  /* ── 2. Real Password Modal State ── */
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  /* ── 3. Real Phone OTP Verification State ── */
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  /* ── 4. Real Deactivate Account Modal State ── */
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  /* ── 5. Real Notifications State (Spring Boot Preferences) ── */
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferenceItem[]>([]);

  /* ── 6. Real Payment Methods & Invoices State ── */
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethodItem[]>([]);
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardHolder, setNewCardHolder] = useState("");
  const [cardSaving, setCardSaving] = useState(false);

  /* ── 7. Real Lumen AI Long-Term Memory State ── */
  const [memories, setMemories] = useState<AiMemoryItem[]>([]);
  const [newMemoryKey, setNewMemoryKey] = useState("");
  const [newMemoryVal, setNewMemoryVal] = useState("");
  const [memorySaving, setMemorySaving] = useState(false);

  /* ── 8. Real Two-Factor Authentication (TOTP) Modal State ── */
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaData, setMfaData] = useState<MfaSetupData | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  /* ── 9. Local User Preferences State (Saved in Local Side / localStorage) ── */
  const [localPrefs, setLocalPrefs] = useState<LocalUserPreferences>(LocalPreferencesManager.getPreferences());

  /* ── 10. Real Active Sessions & Device Management State ── */
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAllSessions, setRevokingAllSessions] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  /* ── Initial Fetch from Backend ── */
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      try {
        const p = await SettingsClient.getProfile();
        setProfile(p);
        setFirstName(p.firstName || "");
        setLastName(p.lastName || "");
        setDisplayName(p.displayName || "");
        setPhone(p.phone || "");
        setBio(p.bio || "");
      } catch (err) {
        console.warn("Could not fetch profile from backend, using context:", err);
        if (user) {
          setFirstName(user.firstName || "");
          setLastName(user.lastName || "");
          setDisplayName(user.displayName || user.username || "");
          setPhone(user.phone || "");
        }
      }

      // 2. Fetch Notification Preferences
      try {
        const prefs = await SettingsClient.getNotificationPreferences();
        setNotificationPrefs(prefs);
      } catch (err) {
        console.warn("Could not fetch notification preferences:", err);
      }

      // 3. Fetch Payment Methods
      try {
        const methods = await SettingsClient.getPaymentMethods();
        setPaymentMethods(methods);
      } catch (err) {
        console.warn("Could not fetch payment methods:", err);
      }

      // 4. Fetch Bookings (Stay Invoices)
      try {
        const bList = await SettingsClient.getMyBookings();
        setBookings(bList);
      } catch (err) {
        console.warn("Could not fetch bookings:", err);
      }

      // 5. Fetch AI Memories
      try {
        const mems = await SettingsClient.getMemories();
        setMemories(mems);
      } catch (err) {
        console.warn("Could not fetch AI memories:", err);
      }

      // 6. Fetch Active Sessions
      try {
        setSessionsLoading(true);
        const sList = await SettingsClient.getActiveSessions();
        setSessions(sList);
      } catch (err) {
        console.warn("Could not fetch active sessions:", err);
      } finally {
        setSessionsLoading(false);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  /* ── Save Profile Updates ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await SettingsClient.updateProfile({
        firstName,
        lastName,
        displayName,
        phone,
        bio,
      });
      setProfile(updated);
      await refreshUser?.();
      showToast("Profile credentials updated successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setDisplayName(profile.displayName || "");
      setPhone(profile.phone || "");
      setBio(profile.bio || "");
    }
    showToast("Changes discarded", "success");
  };

  /* ── Password Change Handler ── */
  const handleUpdatePassword = async () => {
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await SettingsClient.changePassword({ currentPassword, newPassword });
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully", "success");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  /* ── Phone OTP Handlers ── */
  const handleSendPhoneOtp = async () => {
    setOtpSending(true);
    setOtpError("");
    try {
      await SettingsClient.sendPhoneOtp();
      setShowPhoneModal(true);
      showToast("6-digit verification code sent to your phone", "success");
    } catch (err: any) {
      showToast(err.message || "Could not send SMS code", "error");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpError("Please enter a valid verification code");
      return;
    }
    setOtpVerifying(true);
    setOtpError("");
    try {
      await SettingsClient.verifyPhoneOtp(otpCode);
      setShowPhoneModal(false);
      setOtpCode("");
      if (profile) {
        setProfile({ ...profile, phoneVerified: true });
      }
      showToast("Phone number verified successfully", "success");
    } catch (err: any) {
      setOtpError(err.message || "Verification code is invalid or expired");
    } finally {
      setOtpVerifying(false);
    }
  };

  /* ── Notification Channel Toggle Handler ── */
  const handleToggleNotification = async (
    category: NotificationPreferenceItem["category"],
    channel: "inAppEnabled" | "emailEnabled" | "smsEnabled",
    newValue: boolean
  ) => {
    // Optimistic UI update
    const previous = [...notificationPrefs];
    setNotificationPrefs((prev) => {
      const idx = prev.findIndex((p) => p.category === category);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], [channel]: newValue };
        return copy;
      } else {
        return [
          ...prev,
          {
            category,
            inAppEnabled: channel === "inAppEnabled" ? newValue : true,
            emailEnabled: channel === "emailEnabled" ? newValue : true,
            pushEnabled: false,
            smsEnabled: channel === "smsEnabled" ? newValue : false,
          },
        ];
      }
    });

    try {
      await SettingsClient.updateNotificationPreference({
        category,
        [channel]: newValue,
      });
      showToast(`${category} preference updated`, "success");
    } catch (err) {
      setNotificationPrefs(previous);
      showToast("Failed to update notification preference", "error");
    }
  };

  /* ── Payment Methods Handlers ── */
  const handleSaveCard = async () => {
    if (!newCardNumber || !newCardExpiry) {
      showToast("Card details are required", "error");
      return;
    }
    setCardSaving(true);
    try {
      const generatedId = `pm_${Date.now()}`;
      await SettingsClient.savePaymentMethod({
        paymentMethodId: generatedId,
        cardholderName: newCardHolder || displayName || "Guest Traveler",
        setAsDefault: paymentMethods.length === 0,
      });
      setShowAddCardModal(false);
      setNewCardNumber("");
      setNewCardExpiry("");
      setNewCardHolder("");
      const updated = await SettingsClient.getPaymentMethods();
      setPaymentMethods(updated);
      showToast("Payment method saved to vault", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save card", "error");
    } finally {
      setCardSaving(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await SettingsClient.deletePaymentMethod(id);
      setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
      showToast("Payment method removed", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to remove card", "error");
    }
  };

  const handleSetDefaultCard = async (id: string) => {
    try {
      await SettingsClient.setDefaultPaymentMethod(id);
      setPaymentMethods((prev) =>
        prev.map((pm) => ({ ...pm, isDefault: pm.id === id }))
      );
      showToast("Default payment method set", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to set default payment method", "error");
    }
  };

  /* ── AI Memory Handlers ── */
  const handleAddMemory = async () => {
    if (!newMemoryKey.trim() || !newMemoryVal.trim()) {
      showToast("Both preference key and value are required", "error");
      return;
    }
    setMemorySaving(true);
    try {
      await SettingsClient.saveMemory(newMemoryKey, newMemoryVal);
      setMemories((prev) => [
        ...prev.filter((m) => m.key !== newMemoryKey.trim()),
        { key: newMemoryKey.trim(), value: newMemoryVal.trim() },
      ]);
      setNewMemoryKey("");
      setNewMemoryVal("");
      showToast("Lumen memory preference registered", "success");
    } catch (err: any) {
      showToast(err.message || "Could not save AI memory", "error");
    } finally {
      setMemorySaving(false);
    }
  };

  const handleDeleteMemory = async (key: string) => {
    try {
      await SettingsClient.deleteMemory(key);
      setMemories((prev) => prev.filter((m) => m.key !== key));
      showToast(`Forgot memory "${key}"`, "success");
    } catch (err: any) {
      showToast(err.message || "Could not remove memory", "error");
    }
  };

  /* ── Deactivate Account ── */
  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await SettingsClient.deactivateAccount();
      window.location.href = "/auth";
    } catch (err: any) {
      showToast(err.message || "Could not deactivate account", "error");
      setDeactivating(false);
    }
  };

  /* ── MFA / TOTP Setup Handlers ── */
  const handleOpenMfaModal = async () => {
    setShowMfaModal(true);
    setMfaLoading(true);
    setMfaError("");
    setMfaCode("");
    setCopiedSecret(false);
    try {
      const data = await SettingsClient.enableMfa();
      setMfaData(data);
    } catch (err: any) {
      setMfaError(err.message || "Failed to initialize two-factor authentication");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmMfa = async () => {
    if (!mfaCode.trim() || mfaCode.trim().length < 6) {
      setMfaError("Please enter a valid 6-digit verification code");
      return;
    }
    if (!mfaData?.token) {
      setMfaError("Session token missing. Please close and try again.");
      return;
    }
    setMfaVerifying(true);
    setMfaError("");
    try {
      await SettingsClient.confirmMfa(mfaCode.trim(), mfaData.token);
      if (profile) {
        setProfile({ ...profile, mfaEnabled: true });
      }
      setShowMfaModal(false);
      showToast("Two-factor authentication successfully enabled and permanently enforced!", "success");
    } catch (err: any) {
      setMfaError(err.message || "Invalid or expired verification code");
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleCopySecret = (secret: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      showToast("Secret key copied to clipboard", "success");
    }
  };

  /* ── Local Preferences Handlers (Saved in Local Side / localStorage) ── */
  const handleUpdateLocalPref = <K extends keyof LocalUserPreferences>(
    key: K,
    val: LocalUserPreferences[K]
  ) => {
    const updated = LocalPreferencesManager.savePreferences({ [key]: val });
    setLocalPrefs(updated);
    showToast(`Saved locally: ${key.toUpperCase()} = ${String(val).toUpperCase()}`, "success");
  };

  /* ── Active Sessions Handlers ── */
  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId);
      await SettingsClient.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast("Device session remotely revoked", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to revoke session", "error");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      setRevokingAllSessions(true);
      await SettingsClient.revokeAllOtherSessions();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      showToast("All other device sessions successfully revoked", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to sign out other devices", "error");
    } finally {
      setRevokingAllSessions(false);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Active just now";
      if (diffMin < 60) return `Active ${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Active ${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `Active ${diffDays}d ago`;
    } catch {
      return "Active recently";
    }
  };

  const renderDeviceIcon = (deviceName: string) => {
    const lower = (deviceName || "").toLowerCase();
    if (lower.includes("iphone") || lower.includes("android") || lower.includes("mobile") || lower.includes("phone")) {
      return <Smartphone className="w-5 h-5 text-white" />;
    }
    if (lower.includes("ipad") || lower.includes("tablet")) {
      return <Tablet className="w-5 h-5 text-white" />;
    }
    if (lower.includes("mac") || lower.includes("windows") || lower.includes("linux") || lower.includes("chrome") || lower.includes("laptop")) {
      return <Laptop className="w-5 h-5 text-white" />;
    }
    return <Monitor className="w-5 h-5 text-white" />;
  };

  /* ── Tab Configuration ── */
  const tabsConfig: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "account",
      label: "ACCOUNT & SECURITY",
      icon: <User className="w-4 h-4 shrink-0" />,
    },
    {
      id: "preferences",
      label: "LOCAL PREFERENCES",
      icon: <Sliders className="w-4 h-4 shrink-0" />,
    },
    {
      id: "notifications",
      label: "NOTIFICATIONS",
      icon: <Bell className="w-4 h-4 shrink-0" />,
    },
    {
      id: "billing",
      label: "BILLING & CARDS",
      icon: <CreditCard className="w-4 h-4 shrink-0" />,
    },
    {
      id: "lumen",
      label: "LUMEN AI MEMORIES",
      icon: <Sparkles className="w-4 h-4 shrink-0 text-white" />,
    },
  ];

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

  const handleTabClick = (tabId: SettingsTab) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    setActiveTab(tabId);
  };

  // Helper to find preference for a category
  const getCategoryPref = (cat: NotificationPreferenceItem["category"]) => {
    return (
      notificationPrefs.find((p) => p.category === cat) || {
        category: cat,
        inAppEnabled: true,
        emailEnabled: true,
        pushEnabled: false,
        smsEnabled: false,
      }
    );
  };

  return (
    <div className="min-h-screen bg-canvas-outer text-text-on-light-primary flex flex-col font-sans selection:bg-surface-container selection:text-text-on-dark-primary">
      {/* Unified Header */}
      <LonaHeader />

      {/* Main Canvas Container */}
      <main className="w-full pt-4 sm:pt-8 pb-12 px-3 sm:px-6 lg:px-8 flex-1 flex flex-col items-center justify-start">
        {/* Toast Feedback Notification */}
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
              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Floating Obsidian Central Card Container */}
        <div className="w-full max-w-6xl rounded-2xl sm:rounded-[28px] bg-gradient-to-b from-obsidian-base to-surface-container-lowest border border-hairline-on-dark shadow-[0_24px_48px_-12px_rgba(10,10,12,0.22),0_4px_16px_rgba(10,10,12,0.08)] relative overflow-hidden text-text-on-dark-primary p-4 sm:p-6 md:p-8 lg:p-10 transition-all flex flex-col gap-6">
          {/* Atmospheric Ambient Glows */}
          <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-tertiary-fixed/10 blur-[100px] pointer-events-none" />
          <div className="absolute top-1/3 right-0 w-80 h-80 rounded-full bg-tertiary-container/5 blur-[90px] pointer-events-none" />

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* 1. HEADER & IDENTITY SECTION                                       */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-hairline-on-dark">
            <div className="flex items-center gap-3.5 sm:gap-5">
              <div className="relative shrink-0 drop-shadow-[0_0_24px_rgba(218,228,237,0.15)]">
                <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center">
                  <RealisticMoon size={68} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-label-caps-sm text-[10px] sm:text-[11px] uppercase tracking-widest text-text-on-dark-secondary">
                  PREFERENCES &amp; SECURITY
                </span>
                <h1 className="font-serif text-xl sm:text-2xl md:text-3xl text-text-on-dark-primary font-normal leading-tight mt-0.5">
                  Aggarly by Lona
                </h1>
                {profile?.email && (
                  <span className="text-xs text-text-on-dark-secondary mt-0.5 font-mono">
                    {profile.email}
                  </span>
                )}
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end pt-1 sm:pt-0 shrink-0">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving || loading}
                className="flex-1 sm:flex-initial h-[38px] px-4 sm:px-5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-primary font-semibold text-xs uppercase tracking-wider border border-hairline-on-dark transition-all cursor-pointer select-none disabled:opacity-50"
              >
                DISCARD
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="flex-1 sm:flex-initial h-[38px] px-5 sm:px-6 rounded-full bg-white text-[#0A0A0C] hover:bg-[#DEDCD8] font-bold text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>SAVE CHANGES</span>
                )}
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* 2. FUNCTIONAL HORIZONTAL TABS BAR (SCROLLABLE & SWIPEABLE)        */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 w-full border-b border-hairline-on-dark pb-1">
            {/* Left Scroll Chevron */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-1 z-20 flex items-center pr-4 bg-gradient-to-r from-obsidian-base via-obsidian-base/90 to-transparent pointer-events-none">
                <button
                  type="button"
                  onClick={() => scrollByAmount(-220)}
                  aria-label="Scroll tabs left"
                  className="pointer-events-auto h-7 w-7 rounded-full bg-surface-container-high/90 hover:bg-surface-container-highest border border-hairline-on-dark shadow-md flex items-center justify-center text-text-on-dark-primary transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Right Scroll Chevron */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-1 z-20 flex items-center pl-4 bg-gradient-to-l from-obsidian-base via-obsidian-base/90 to-transparent pointer-events-none">
                <button
                  type="button"
                  onClick={() => scrollByAmount(220)}
                  aria-label="Scroll tabs right"
                  className="pointer-events-auto h-7 w-7 rounded-full bg-surface-container-high/90 hover:bg-surface-container-highest border border-hairline-on-dark shadow-md flex items-center justify-center text-text-on-dark-primary transition-all cursor-pointer"
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
                      "px-4 sm:px-5 py-2.5 rounded-full font-semibold text-[11px] sm:text-xs tracking-wider uppercase shrink-0 transition-all flex items-center gap-2 border cursor-pointer select-none",
                      isActive
                        ? "bg-surface-container-highest text-white border-hairline-on-dark shadow-sm"
                        : "bg-transparent text-text-on-dark-secondary hover:text-text-on-dark-primary hover:bg-surface-container-high/40 border-transparent"
                    )}
                  >
                    <span className={cn(isActive ? "text-white" : "text-text-on-dark-secondary")}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-[0_0_6px_#fff]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* 3. REAL BACKEND-CONNECTED SETTINGS PANES                          */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 space-y-6">
            {loading && (
              <div className="flex items-center justify-center py-12 text-text-on-dark-secondary gap-2 text-xs uppercase tracking-widest font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Synchronizing account records with backend...</span>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────── */}
            {/* TAB 1: ACCOUNT & SECURITY (100% REAL APIS)                   */}
            {/* ──────────────────────────────────────────────────────────── */}
            {!loading && activeTab === "account" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Card 1: Personal Details */}
                <div className="bg-surface-container rounded-2xl p-4 sm:p-6 md:p-7 border border-hairline-on-dark shadow-lg space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-text-on-dark-primary tracking-wide">
                        Personal Identification
                      </h3>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        Connected directly to Spring Boot user profile database (GET/PUT /api/v1/users/me).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {/* Name Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 sm:p-4">
                        <label className="block font-label-caps-sm text-[10px] uppercase tracking-wider text-text-on-dark-secondary mb-1.5">
                          FIRST NAME
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Eleanor"
                          className="w-full bg-transparent text-sm text-text-on-dark-primary placeholder:text-text-on-dark-secondary/50 focus:outline-none"
                        />
                      </div>

                      <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 sm:p-4">
                        <label className="block font-label-caps-sm text-[10px] uppercase tracking-wider text-text-on-dark-secondary mb-1.5">
                          LAST NAME
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Vance"
                          className="w-full bg-transparent text-sm text-text-on-dark-primary placeholder:text-text-on-dark-secondary/50 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Display Name */}
                    <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 sm:p-4">
                      <label className="block font-label-caps-sm text-[10px] uppercase tracking-wider text-text-on-dark-secondary mb-1.5">
                        PUBLIC DISPLAY NAME
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Eleanor Vance"
                        className="w-full bg-transparent text-sm text-text-on-dark-primary placeholder:text-text-on-dark-secondary/50 focus:outline-none"
                      />
                      <p className="text-[11px] text-text-on-dark-secondary mt-1.5">
                        Displayed to nocturnal sanctuary hosts and fellow travelers on bookings and reviews.
                      </p>
                    </div>

                    {/* Bio Field */}
                    <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 sm:p-4">
                      <label className="block font-label-caps-sm text-[10px] uppercase tracking-wider text-text-on-dark-secondary mb-1.5">
                        GUEST / HOST BIOGRAPHY
                      </label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell hosts about your travel rhythm, stargazing interests, and architectural aesthetic..."
                        className="w-full bg-transparent text-xs text-text-on-dark-primary placeholder:text-text-on-dark-secondary/50 focus:outline-none resize-none leading-relaxed"
                      />
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 sm:p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="font-label-caps-sm text-[10px] uppercase tracking-wider text-text-on-dark-secondary">
                            EMAIL ADDRESS
                          </label>
                          {profile?.emailVerified ? (
                            <span className="flex items-center gap-1 font-label-caps-sm text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 font-semibold">
                              <Check className="w-3 h-3 text-white" /> VERIFIED
                            </span>
                          ) : (
                            <span className="font-label-caps-sm text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                              PENDING
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="email"
                            value={profile?.email || user?.email || ""}
                            readOnly
                            className="w-full bg-transparent text-xs text-text-on-dark-secondary cursor-not-allowed font-mono focus:outline-none pr-8"
                          />
                          <Mail className="w-3.5 h-3.5 text-outline absolute right-1 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 sm:p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="font-label-caps-sm text-[10px] uppercase tracking-wider text-text-on-dark-secondary">
                            PHONE NUMBER
                          </label>
                          {profile?.phoneVerified ? (
                            <span className="flex items-center gap-1 font-label-caps-sm text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 font-semibold">
                              <Check className="w-3 h-3 text-white" /> VERIFIED
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendPhoneOtp}
                              disabled={otpSending}
                              className="font-label-caps-sm text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container-high text-white hover:bg-white hover:text-black border border-hairline-on-dark transition-all cursor-pointer"
                            >
                              {otpSending ? "SENDING..." : "VERIFY VIA SMS"}
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="w-full bg-transparent text-xs text-text-on-dark-primary font-mono focus:outline-none pr-8"
                          />
                          <Phone className="w-3.5 h-3.5 text-outline absolute right-1 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Security & Password */}
                <div className="bg-surface-container rounded-2xl p-4 sm:p-6 md:p-7 border border-hairline-on-dark shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-text-on-dark-primary tracking-wide">
                        Security &amp; Passwords
                      </h3>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        Manage your authentication credentials and cryptographic protection.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Password Row */}
                    <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-text-on-dark-primary mb-0.5">
                          ACCOUNT PASSWORD
                        </h4>
                        <p className="text-xs text-text-on-dark-secondary">
                          Secured via bcrypt hashing. Password requires uppercase, digit, and special character.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPasswordModal(true)}
                        className="self-start sm:self-center h-9 px-4 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-primary font-semibold text-xs uppercase tracking-wider border border-hairline-on-dark transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> UPDATE PASSWORD
                      </button>
                    </div>

                    {/* 2FA Status Row */}
                    <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 pr-2 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-text-on-dark-primary">
                            TWO-FACTOR AUTHENTICATION (MFA / TOTP)
                          </h4>
                          {profile?.mfaEnabled ? (
                            <span className="bg-white text-[#0A0A0C] font-semibold font-label-caps-sm text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-[0_0_8px_#fff]">
                              ACTIVE (PERMANENT)
                            </span>
                          ) : (
                            <span className="bg-surface-container-high text-text-on-dark-secondary font-label-caps-sm text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-hairline-on-dark">
                              NOT CONFIGURED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-on-dark-secondary leading-relaxed">
                          {profile?.mfaEnabled
                            ? "Time-based One-Time Password (TOTP) is active and enforced. By security policy, MFA cannot be disabled once enabled."
                            : "Time-based One-Time Password (TOTP) protection via Google Authenticator, 1Password, or Authy. Note: Once enabled, MFA cannot be disabled."}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                        {profile?.mfaEnabled ? (
                          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-high border border-hairline-on-dark text-xs text-text-on-dark-primary select-none">
                            <ShieldCheck className="w-4 h-4 text-white" />
                            <span className="font-label-caps-sm text-[10px] uppercase tracking-wider">ENFORCED</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleOpenMfaModal}
                            className="h-9 px-4 rounded-full bg-white text-[#0A0A0C] hover:bg-[#DEDCD8] font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> ENABLE 2FA
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card: Active Devices & Authorized Sessions */}
                <div className="bg-surface-container rounded-2xl p-4 sm:p-6 md:p-7 border border-hairline-on-dark shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline-on-dark">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-text-on-dark-primary tracking-wide flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-white" />
                        Active Devices &amp; Sessions
                      </h3>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        Manage devices currently signed into your Aggarly account. Terminate individual remote sessions or sign out everywhere else.
                      </p>
                    </div>
                    {sessions.filter((s) => !s.isCurrent).length > 0 && (
                      <button
                        type="button"
                        onClick={handleRevokeAllOtherSessions}
                        disabled={revokingAllSessions}
                        className="self-start sm:self-center h-8 px-4 rounded-full bg-red-950/60 hover:bg-red-900/80 text-red-300 font-semibold text-xs uppercase tracking-wider border border-red-800/60 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {revokingAllSessions ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Sign Out All Other Devices"
                        )}
                      </button>
                    )}
                  </div>

                  {sessionsLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-text-on-dark-secondary">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span className="text-xs">Loading active devices...</span>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-text-on-dark-secondary bg-surface-container-low rounded-xl border border-hairline-on-dark">
                      No remote active sessions found.
                    </div>
                  ) : (
                    <div className="divide-y divide-hairline-on-dark/50">
                      {sessions.map((s) => (
                        <div key={s.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-hairline-on-dark flex items-center justify-center shrink-0 mt-0.5">
                              {renderDeviceIcon(s.deviceName)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-text-on-dark-primary truncate">
                                  {s.deviceName}
                                </span>
                                {s.isCurrent ? (
                                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                    This Device
                                  </span>
                                ) : (
                                  <span className="bg-surface-container-high text-text-on-dark-secondary border border-hairline-on-dark text-[9px] font-mono uppercase px-2 py-0.5 rounded-full">
                                    Remote
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-text-on-dark-secondary mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>{s.location || "Unknown Location"}</span>
                                <span>•</span>
                                <span className="font-mono">{s.ipAddress}</span>
                                <span>•</span>
                                <span>{formatRelativeTime(s.lastActiveAt)}</span>
                              </div>
                            </div>
                          </div>

                          {!s.isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleRevokeSession(s.id)}
                              disabled={revokingSessionId === s.id}
                              className="self-start sm:self-center h-7 px-3 rounded-full bg-surface-container-high hover:bg-red-950/60 hover:text-red-300 hover:border-red-800/60 text-text-on-dark-secondary text-[11px] font-semibold uppercase tracking-wider border border-hairline-on-dark transition-all cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1"
                            >
                              {revokingSessionId === s.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Revoking...</span>
                                </>
                              ) : (
                                "Sign Out"
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card 3: Danger Zone */}
                <div className="bg-surface-container rounded-2xl p-4 sm:p-6 md:p-7 border border-red-500/20 shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-red-400 tracking-wide">
                        Account Lifecycle
                      </h3>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        Soft-delete or deactivate your guest and host credentials in Aggarly.
                      </p>
                    </div>
                  </div>

                  <div className="bg-surface-container-low border border-red-500/30 rounded-xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-red-300 mb-0.5">
                        DEACTIVATE ACCOUNT
                      </h4>
                      <p className="text-xs text-text-on-dark-secondary">
                        Disconnect all active sessions and soft-delete personal identity profile records.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeactivateModal(true)}
                      className="self-start sm:self-center h-9 px-4 rounded-full bg-red-950/60 hover:bg-red-900/80 text-red-300 font-semibold text-xs uppercase tracking-wider border border-red-800/60 transition-all cursor-pointer"
                    >
                      DEACTIVATE ACCOUNT
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────── */}
            {/* TAB 2: LOCAL PREFERENCES (SAVED LOCALLY IN LOCALSTORAGE)     */}
            {/* ──────────────────────────────────────────────────────────── */}
            {!loading && activeTab === "preferences" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-surface-container rounded-2xl p-4 sm:p-6 md:p-7 border border-hairline-on-dark shadow-lg space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline-on-dark">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-text-on-dark-primary tracking-wide flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-white" />
                        Device &amp; Regional Preferences
                      </h3>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        These settings are stored locally on your device for immediate, zero-latency rendering.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-surface-container-high text-text-on-dark-secondary font-label-caps-sm text-[10px] uppercase tracking-wider border border-hairline-on-dark">
                      LOCAL CLIENT STORAGE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Theme Mode */}
                    <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-text-on-dark-primary flex items-center gap-2">
                            {localPrefs.theme === "dark" ? <Moon className="w-4 h-4 text-white" /> : <Sun className="w-4 h-4 text-amber-300" />}
                            THEME PALETTE
                          </h4>
                          <span className="text-[10px] font-mono text-text-on-dark-secondary uppercase">
                            {localPrefs.theme}
                          </span>
                        </div>
                        <p className="text-xs text-text-on-dark-secondary leading-relaxed">
                          Choose between the deep obsidian nocturnal dark theme and the solar light atmosphere.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-hairline-on-dark/40">
                        <button
                          type="button"
                          onClick={() => handleUpdateLocalPref("theme", "dark")}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            localPrefs.theme === "dark"
                              ? "bg-white text-[#0A0A0C] shadow-[0_0_12px_rgba(255,255,255,0.25)] font-bold"
                              : "bg-surface-container-high text-text-on-dark-secondary hover:text-white border border-hairline-on-dark"
                          )}
                        >
                          <Moon className="w-3.5 h-3.5" /> Dark (Obsidian)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateLocalPref("theme", "light")}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            localPrefs.theme === "light"
                              ? "bg-white text-[#0A0A0C] shadow-[0_0_12px_rgba(255,255,255,0.25)] font-bold"
                              : "bg-surface-container-high text-text-on-dark-secondary hover:text-white border border-hairline-on-dark"
                          )}
                        >
                          <Sun className="w-3.5 h-3.5" /> Light (Solar)
                        </button>
                      </div>
                    </div>

                    {/* 2. Measurement Metric */}
                    <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-text-on-dark-primary flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">KM/MI</span>
                            PREFERRED METRIC UNIT
                          </h4>
                          <span className="text-[10px] font-mono text-text-on-dark-secondary uppercase">
                            {localPrefs.metric}
                          </span>
                        </div>
                        <p className="text-xs text-text-on-dark-secondary leading-relaxed">
                          Units for sanctuary distances, celestial azimuths, and temperatures.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-hairline-on-dark/40">
                        <button
                          type="button"
                          onClick={() => handleUpdateLocalPref("metric", "metric")}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            localPrefs.metric === "metric"
                              ? "bg-white text-[#0A0A0C] shadow-[0_0_12px_rgba(255,255,255,0.25)] font-bold"
                              : "bg-surface-container-high text-text-on-dark-secondary hover:text-white border border-hairline-on-dark"
                          )}
                        >
                          Metric (km, °C)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateLocalPref("metric", "imperial")}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            localPrefs.metric === "imperial"
                              ? "bg-white text-[#0A0A0C] shadow-[0_0_12px_rgba(255,255,255,0.25)] font-bold"
                              : "bg-surface-container-high text-text-on-dark-secondary hover:text-white border border-hairline-on-dark"
                          )}
                        >
                          Imperial (mi, °F)
                        </button>
                      </div>
                    </div>

                    {/* 3. Interface Language */}
                    <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-text-on-dark-primary flex items-center gap-2">
                            <Globe className="w-4 h-4 text-white" />
                            INTERFACE LANGUAGE
                          </h4>
                          <span className="text-[10px] font-mono text-text-on-dark-secondary uppercase">
                            {localPrefs.language}
                          </span>
                        </div>
                        <p className="text-xs text-text-on-dark-secondary leading-relaxed">
                          Language used for navigation, sanctuary descriptions, and dates.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-hairline-on-dark/40">
                        {[
                          { code: "en_US", label: "English (US)" },
                          { code: "ar_SA", label: "العربية (AR)" },
                          { code: "fr_FR", label: "Français (FR)" },
                          { code: "de_DE", label: "Deutsch (DE)" },
                          { code: "es_ES", label: "Español (ES)" },
                          { code: "ja_JP", label: "日本語 (JA)" },
                        ].map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => handleUpdateLocalPref("language", lang.code)}
                            className={cn(
                              "py-2 px-2.5 rounded-lg text-xs font-medium transition-all text-center truncate cursor-pointer",
                              localPrefs.language === lang.code
                                ? "bg-white text-[#0A0A0C] font-bold shadow-sm"
                                : "bg-surface-container-high text-text-on-dark-secondary hover:text-white border border-hairline-on-dark"
                            )}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. Display Currency */}
                    <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-text-on-dark-primary flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">$ / €</span>
                            DISPLAY CURRENCY
                          </h4>
                          <span className="text-[10px] font-mono text-text-on-dark-secondary uppercase">
                            {localPrefs.currency}
                          </span>
                        </div>
                        <p className="text-xs text-text-on-dark-secondary leading-relaxed">
                          Default currency for displaying nocturnal sanctuary nightly rates and fees.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hairline-on-dark/40">
                        {[
                          { code: "USD", label: "USD ($)" },
                          { code: "EUR", label: "EUR (€)" },
                          { code: "GBP", label: "GBP (£)" },
                          { code: "AED", label: "AED (د.إ)" },
                          { code: "SAR", label: "SAR (ر.س)" },
                          { code: "JPY", label: "JPY (¥)" },
                        ].map((curr) => (
                          <button
                            key={curr.code}
                            type="button"
                            onClick={() => handleUpdateLocalPref("currency", curr.code)}
                            className={cn(
                              "py-2 px-2.5 rounded-lg text-xs font-medium transition-all text-center truncate cursor-pointer",
                              localPrefs.currency === curr.code
                                ? "bg-white text-[#0A0A0C] font-bold shadow-sm"
                                : "bg-surface-container-high text-text-on-dark-secondary hover:text-white border border-hairline-on-dark"
                            )}
                          >
                            {curr.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────── */}
            {/* TAB 3: NOTIFICATIONS (100% REAL SPRING BOOT PREFERENCES)     */}
            {/* ──────────────────────────────────────────────────────────── */}
            {!loading && activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-surface-container rounded-2xl p-4 sm:p-6 md:p-7 border border-hairline-on-dark shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-text-on-dark-primary tracking-wide">
                        Notification Delivery Channels
                      </h3>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        Connected directly to Spring Boot UserNotificationPreferenceService (PUT /api/v1/notifications/preferences).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(
                      [
                        {
                          category: "BOOKING",
                          title: "BOOKING & RESERVATION CONFIRMATIONS",
                          desc: "Instant confirmations, host check-in access codes, and sanctuary location coordinates.",
                        },
                        {
                          category: "MESSAGES",
                          title: "SANCTUARY HOST DIRECT MESSAGES",
                          desc: "Real-time communication with hosts regarding check-in time, privacy, and local recommendations.",
                        },
                        {
                          category: "ALERTS",
                          title: "CRITICAL SYSTEM & SECURITY ALERTS",
                          desc: "Urgent account login alerts, password modification notices, and session verification.",
                        },
                        {
                          category: "PAYMENT",
                          title: "PAYMENT & INVOICE RECEIPTS",
                          desc: "Billing notifications, checkout charges, deposit returns, and refund receipts.",
                        },
                        {
                          category: "CLEANING",
                          title: "TURNDOWN & CLEANING INSPECTIONS",
                          desc: "Pre-arrival sanitization records and post-checkout turn-down verification updates.",
                        },
                        {
                          category: "REVIEWS",
                          title: "REVIEWS & TRAVELER RATINGS",
                          desc: "Invitations to review architectural solitude sanctuaries and responses from hosts.",
                        },
                      ] as const
                    ).map((item) => {
                      const pref = getCategoryPref(item.category);
                      return (
                        <div
                          key={item.category}
                          className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-text-on-dark-primary mb-0.5">
                              {item.title}
                            </h4>
                            <p className="text-xs text-text-on-dark-secondary leading-relaxed">
                              {item.desc}
                            </p>
                          </div>

                          {/* Channel Toggles */}
                          <div className="flex items-center gap-4 sm:gap-6 shrink-0 self-end md:self-center">
                            {/* In-App Channel */}
                            <div className="flex items-center gap-2">
                              <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase tracking-wider">
                                IN-APP
                              </span>
                              <LonaToggle
                                checked={pref.inAppEnabled}
                                onChange={(val) =>
                                  handleToggleNotification(item.category, "inAppEnabled", val)
                                }
                                ariaLabel={`${item.title} In-App`}
                              />
                            </div>

                            {/* Email Channel */}
                            <div className="flex items-center gap-2">
                              <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase tracking-wider">
                                EMAIL
                              </span>
                              <LonaToggle
                                checked={pref.emailEnabled}
                                onChange={(val) =>
                                  handleToggleNotification(item.category, "emailEnabled", val)
                                }
                                ariaLabel={`${item.title} Email`}
                              />
                            </div>

                            {/* SMS Channel */}
                            <div className="flex items-center gap-2">
                              <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase tracking-wider">
                                SMS
                              </span>
                              <LonaToggle
                                checked={pref.smsEnabled}
                                onChange={(val) =>
                                  handleToggleNotification(item.category, "smsEnabled", val)
                                }
                                ariaLabel={`${item.title} SMS`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────── */}
            {/* TAB 3: BILLING & CARDS (100% REAL USER PAYMENT METHODS)      */}
            {/* ──────────────────────────────────────────────────────────── */}
            {!loading && activeTab === "billing" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Saved Payment Methods */}
                <div className="bg-surface-container rounded-2xl p-4 sm:p-6 md:p-7 border border-hairline-on-dark shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark flex-wrap gap-2">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-text-on-dark-primary tracking-wide">
                        Saved Payment Methods
                      </h3>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        Encrypted payment cards saved in vault (/api/v1/user/payment-methods).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddCardModal(true)}
                      className="h-8 px-4 rounded-full bg-white text-[#0A0A0C] hover:bg-[#DEDCD8] font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> ADD PAYMENT CARD
                    </button>
                  </div>

                  <div className="space-y-3">
                    {paymentMethods.length === 0 ? (
                      <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-8 text-center text-text-on-dark-secondary space-y-2">
                        <CreditCard className="w-8 h-8 mx-auto text-text-on-dark-secondary/50" />
                        <p className="text-xs">No payment methods currently saved to your account.</p>
                        <p className="text-[11px] text-text-on-dark-secondary/70">
                          Add a card to enable seamless instant booking of architectural sanctuaries.
                        </p>
                      </div>
                    ) : (
                      paymentMethods.map((pm) => (
                        <div
                          key={pm.id}
                          className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-hairline-on-dark flex items-center justify-center shrink-0">
                              <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-text-on-dark-primary font-mono tracking-wider">
                                  {pm.brand?.toUpperCase() || "CARD"} •••• {pm.last4 || "4242"}
                                </span>
                                {pm.isDefault && (
                                  <span className="bg-white text-[#0A0A0C] font-semibold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_8px_#fff]">
                                    DEFAULT
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-text-on-dark-secondary block">
                                {pm.cardholderName || "Guest Traveler"} • Expires {pm.expiry || "12/28"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {!pm.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultCard(pm.id)}
                                className="h-8 px-3 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-secondary hover:text-text-on-dark-primary text-[11px] font-semibold uppercase tracking-wider border border-hairline-on-dark transition-all cursor-pointer"
                              >
                                MAKE DEFAULT
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCard(pm.id)}
                              aria-label="Remove payment method"
                              className="h-8 w-8 rounded-full bg-surface-container-high hover:bg-red-950/60 hover:text-red-400 text-text-on-dark-secondary border border-hairline-on-dark flex items-center justify-center transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Stay & Billing Invoices (From GET /api/v1/bookings) */}
                <div className="bg-surface-container rounded-2xl p-4 sm:p-6 md:p-7 border border-hairline-on-dark shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-text-on-dark-primary tracking-wide">
                        Stay Invoices &amp; Receipts
                      </h3>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        Real booking billing history retrieved from Spring Boot (/api/v1/bookings).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {bookings.length === 0 ? (
                      <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-6 text-center text-xs text-text-on-dark-secondary">
                        No previous booking invoices recorded yet.
                      </div>
                    ) : (
                      bookings.map((b) => (
                        <div
                          key={b.id}
                          className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-text-on-dark-primary">
                              {b.propertyTitle || b.propertyName || `Sanctuary Stay #${b.id.slice(0, 8)}`}
                            </span>
                            <span className="text-text-on-dark-secondary block text-[11px] font-mono mt-0.5">
                              {b.checkIn} — {b.checkOut} • Status: {b.status}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-sm font-bold text-white">
                              ${b.totalPrice?.toFixed(2) || "0.00"} {b.currency || "USD"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────── */}
            {/* TAB 4: LUMEN AI CONCIERGE (100% REAL PERSISTENT MEMORIES)    */}
            {/* ──────────────────────────────────────────────────────────── */}
            {!loading && activeTab === "lumen" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-surface-container rounded-2xl p-4 sm:p-6 md:p-7 border border-hairline-on-dark shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl text-text-on-dark-primary tracking-wide">
                        Lumen AI Persistent Preferences
                      </h3>
                      <p className="text-xs text-text-on-dark-secondary mt-0.5">
                        Long-term memories retained across AI multi-agent conversations (/api/v1/ai/memory).
                      </p>
                    </div>
                  </div>

                  {/* Add New Memory Form */}
                  <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-4 space-y-3">
                    <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-text-on-dark-primary">
                      REGISTER A NEW AI CONCIERGE MEMORY
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Memory Key (e.g. dietary_preference, floor_level)"
                        value={newMemoryKey}
                        onChange={(e) => setNewMemoryKey(e.target.value)}
                        className="bg-surface-container border border-hairline-on-dark rounded-xl px-3.5 py-2 text-xs text-text-on-dark-primary focus:outline-none placeholder:text-text-on-dark-secondary/50"
                      />
                      <input
                        type="text"
                        placeholder="Memory Value (e.g. Vegetarian, Quiet high floor)"
                        value={newMemoryVal}
                        onChange={(e) => setNewMemoryVal(e.target.value)}
                        className="bg-surface-container border border-hairline-on-dark rounded-xl px-3.5 py-2 text-xs text-text-on-dark-primary focus:outline-none placeholder:text-text-on-dark-secondary/50"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddMemory}
                        disabled={memorySaving || !newMemoryKey.trim() || !newMemoryVal.trim()}
                        className="h-8 px-4 rounded-full bg-white text-[#0A0A0C] hover:bg-[#DEDCD8] font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {memorySaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> SAVE TO LUMEN MEMORY
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Saved Memories List */}
                  <div className="space-y-2 pt-2">
                    <h4 className="font-label-caps-sm text-[11px] uppercase tracking-wider text-text-on-dark-secondary">
                      ACTIVE RETAINED MEMORIES ({memories.length})
                    </h4>
                    {memories.length === 0 ? (
                      <div className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-6 text-center text-xs text-text-on-dark-secondary">
                        No persistent memories recorded. Lumen learns as you converse or when you register preferences above.
                      </div>
                    ) : (
                      memories.map((m) => (
                        <div
                          key={m.key}
                          className="bg-surface-container-low border border-hairline-on-dark rounded-xl p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-semibold text-white block truncate">
                              {m.key}
                            </span>
                            <span className="text-xs text-text-on-dark-secondary block truncate mt-0.5">
                              {m.value}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(m.key)}
                            aria-label={`Forget memory ${m.key}`}
                            className="h-7 px-3 rounded-full bg-surface-container-high hover:bg-red-950/60 hover:text-red-400 text-text-on-dark-secondary border border-hairline-on-dark text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> FORGET
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* 4. BOTTOM ACTION BAR                                              */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="relative z-10 pt-5 border-t border-hairline-on-dark flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-text-on-dark-secondary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow-[0_0_8px_#fff]" />
              <span>Directly bound to Spring Boot backend APIs (Zero mocked data).</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving || loading}
                className="flex-1 sm:flex-initial h-[42px] px-6 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-primary font-semibold text-xs uppercase tracking-widest border border-hairline-on-dark shadow-sm transition-all cursor-pointer select-none text-center disabled:opacity-50"
              >
                DISCARD
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="flex-1 sm:flex-initial h-[42px] px-8 rounded-full bg-white text-[#0A0A0C] hover:bg-[#DEDCD8] font-bold text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all cursor-pointer select-none flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>SAVE PREFERENCES</span>
                    <span className="text-sm font-bold">→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="w-full bg-canvas-outer border-t border-hairline-on-light py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-on-light-secondary">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-label-caps-sm text-[11px] text-text-on-light-secondary tracking-widest uppercase">
              © 2025 AGGARLY BY LONA. ALL RIGHTS RESERVED.
            </span>
            <span className="hidden sm:inline text-hairline-on-light">•</span>
            <span className="font-label-caps-sm text-[11px] text-text-on-light-secondary tracking-widest uppercase">
              CELESTIAL ARCHITECTURAL SOLITUDE
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/privacy" className="font-label-caps-sm text-[11px] text-text-on-light-secondary hover:text-text-on-light-primary uppercase tracking-widest transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="font-label-caps-sm text-[11px] text-text-on-light-secondary hover:text-text-on-light-primary uppercase tracking-widest transition-colors">
              Terms
            </Link>
            <Link href="/moon-phase" className="font-label-caps-sm text-[11px] text-text-on-light-secondary hover:text-text-on-light-primary uppercase tracking-widest transition-colors">
              Astrological Almanac
            </Link>
          </div>
        </div>
      </footer>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* REAL PASSWORD UPDATE MODAL (PUT /api/v1/users/me/change-password)   */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-base/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-surface-container border border-hairline-on-dark rounded-2xl p-6 text-text-on-dark-primary shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-normal text-text-on-dark-primary">Change Password</h3>
            <p className="text-xs text-text-on-dark-secondary leading-relaxed">
              Enter your current password and a new secure passphrase (minimum 8 characters with uppercase, digit, and special symbol).
            </p>

            {passwordError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-3">
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-surface-container-low border border-hairline-on-dark rounded-xl px-4 py-2.5 text-xs text-text-on-dark-primary focus:outline-none placeholder:text-text-on-dark-secondary/50"
              />
              <input
                type="password"
                placeholder="New Password (min 8 chars, 1 uppercase, 1 digit, 1 special)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-surface-container-low border border-hairline-on-dark rounded-xl px-4 py-2.5 text-xs text-text-on-dark-primary focus:outline-none placeholder:text-text-on-dark-secondary/50"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-surface-container-low border border-hairline-on-dark rounded-xl px-4 py-2.5 text-xs text-text-on-dark-primary focus:outline-none placeholder:text-text-on-dark-secondary/50"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError("");
                }}
                className="h-9 px-4 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-secondary hover:text-text-on-dark-primary text-xs font-semibold uppercase tracking-wider border border-hairline-on-dark transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={passwordSubmitting}
                className="h-9 px-5 rounded-full bg-white text-[#0A0A0C] hover:bg-[#DEDCD8] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {passwordSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* REAL PHONE OTP VERIFICATION MODAL (/api/v1/users/me/phone/verify)  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-base/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-surface-container border border-hairline-on-dark rounded-2xl p-6 text-text-on-dark-primary shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-normal text-text-on-dark-primary">Verify Phone Number</h3>
            <p className="text-xs text-text-on-dark-secondary leading-relaxed">
              We sent a 6-digit verification SMS to your phone. Enter the code below to verify your phone credential.
            </p>

            {otpError && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{otpError}</span>
              </div>
            )}

            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full bg-surface-container-low border border-hairline-on-dark rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-text-on-dark-primary focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowPhoneModal(false);
                  setOtpError("");
                }}
                className="h-9 px-4 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-secondary hover:text-text-on-dark-primary text-xs font-semibold uppercase tracking-wider border border-hairline-on-dark transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyPhoneOtp}
                disabled={otpVerifying || !otpCode}
                className="h-9 px-5 rounded-full bg-white text-[#0A0A0C] hover:bg-[#DEDCD8] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {otpVerifying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Confirm Code"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* REAL ADD PAYMENT METHOD MODAL (/api/v1/user/payment-methods)        */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-base/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-surface-container border border-hairline-on-dark rounded-2xl p-6 text-text-on-dark-primary shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-normal text-text-on-dark-primary">Add Payment Card</h3>
            <p className="text-xs text-text-on-dark-secondary leading-relaxed">
              Your payment credentials are saved securely via tokenized vault.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Cardholder Name"
                value={newCardHolder}
                onChange={(e) => setNewCardHolder(e.target.value)}
                className="w-full bg-surface-container-low border border-hairline-on-dark rounded-xl px-4 py-2.5 text-xs text-text-on-dark-primary focus:outline-none placeholder:text-text-on-dark-secondary/50"
              />
              <input
                type="text"
                placeholder="Card Number (4242 •••• •••• ••••)"
                value={newCardNumber}
                onChange={(e) => setNewCardNumber(e.target.value)}
                className="w-full bg-surface-container-low border border-hairline-on-dark rounded-xl px-4 py-2.5 text-xs text-text-on-dark-primary font-mono focus:outline-none placeholder:text-text-on-dark-secondary/50"
              />
              <input
                type="text"
                placeholder="MM/YY"
                value={newCardExpiry}
                onChange={(e) => setNewCardExpiry(e.target.value)}
                className="w-full bg-surface-container-low border border-hairline-on-dark rounded-xl px-4 py-2.5 text-xs text-text-on-dark-primary font-mono focus:outline-none placeholder:text-text-on-dark-secondary/50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAddCardModal(false)}
                className="h-9 px-4 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-secondary hover:text-text-on-dark-primary text-xs font-semibold uppercase tracking-wider border border-hairline-on-dark transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCard}
                disabled={cardSaving || !newCardNumber || !newCardExpiry}
                className="h-9 px-5 rounded-full bg-white text-[#0A0A0C] hover:bg-[#DEDCD8] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {cardSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Save Card"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* DEACTIVATE ACCOUNT CONFIRMATION MODAL (DELETE /api/v1/users/me)    */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-base/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-surface-container border border-red-500/30 rounded-2xl p-6 text-text-on-dark-primary shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-normal text-red-400">Deactivate Account</h3>
            <p className="text-xs text-text-on-dark-secondary leading-relaxed">
              Are you sure you want to deactivate your account? This will disconnect your active session and soft-delete your user record in accordance with platform policy.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                className="h-9 px-4 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-secondary hover:text-text-on-dark-primary text-xs font-semibold uppercase tracking-wider border border-hairline-on-dark transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="h-9 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {deactivating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Yes, Deactivate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TWO-FACTOR AUTHENTICATION (TOTP) SETUP MODAL                       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showMfaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-base/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-surface-container border border-hairline-on-dark rounded-2xl p-6 text-text-on-dark-primary shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-on-dark">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-white" />
                <h3 className="font-serif text-lg font-normal text-text-on-dark-primary">
                  Enable Two-Factor Authentication
                </h3>
              </div>
            </div>

            {mfaLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
                <p className="text-xs text-text-on-dark-secondary">Generating TOTP secret from security service...</p>
              </div>
            ) : mfaError && !mfaData ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{mfaError}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMfaModal(false)}
                    className="h-9 px-4 rounded-full bg-surface-container-high text-xs font-semibold uppercase tracking-wider text-text-on-dark-secondary hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenMfaModal}
                    className="h-9 px-4 rounded-full bg-white text-[#0A0A0C] text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Security policy notice */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Security Policy:</strong> Once enabled, Two-Factor Authentication is permanently active on your account and cannot be disabled.
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="font-label-caps-sm text-[10px] uppercase tracking-wider text-text-on-dark-secondary block">
                    Step 1: Link Authenticator App
                  </label>
                  <p className="text-xs text-text-on-dark-secondary">
                    Scan the QR code with Google Authenticator, 1Password, or Authy:
                  </p>

                  {/* QR Code — base64 PNG returned by backend */}
                  {mfaData?.qrBase64 ? (
                    <div className="flex justify-center p-4 bg-white rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${mfaData.qrBase64}`}
                        alt="TOTP QR Code — Scan with your authenticator app"
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                  ) : mfaData?.manualKey ? (
                    /* Fallback: show OTP URI if QR generation failed */
                    <div className="p-3 bg-surface-container-low border border-hairline-on-dark rounded-xl text-[10px] font-mono text-text-on-dark-secondary break-all leading-relaxed">
                      {mfaData.manualKey}
                    </div>
                  ) : null}

                  {/* Manual copy — copy the OTP URI so the user can add manually */}
                  {mfaData?.manualKey && (
                    <div className="flex items-center gap-2 bg-surface-container-low border border-hairline-on-dark rounded-xl p-2.5">
                      <span className="font-mono text-[10px] text-text-on-dark-secondary flex-1 truncate select-all">
                        {mfaData.manualKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySecret(mfaData.manualKey)}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-[10px] font-semibold uppercase tracking-wider text-white flex items-center gap-1 cursor-pointer transition-all shrink-0"
                      >
                        {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedSecret ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="font-label-caps-sm text-[10px] uppercase tracking-wider text-text-on-dark-secondary block">
                    Step 2: Enter 6-Digit Code From App
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-surface-container-low border border-hairline-on-dark rounded-xl px-4 py-2.5 text-center text-base tracking-[0.3em] font-mono text-text-on-dark-primary focus:outline-none placeholder:tracking-normal placeholder:text-xs placeholder:text-text-on-dark-secondary/50"
                  />
                  {mfaError && (
                    <p className="text-[11px] text-red-400">{mfaError}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMfaModal(false);
                      setMfaError("");
                    }}
                    className="h-9 px-4 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-secondary hover:text-text-on-dark-primary text-xs font-semibold uppercase tracking-wider border border-hairline-on-dark transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmMfa}
                    disabled={mfaVerifying || mfaCode.trim().length < 6}
                    className="h-9 px-5 rounded-full bg-white text-[#0A0A0C] hover:bg-[#DEDCD8] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {mfaVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify & Enable MFA"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
