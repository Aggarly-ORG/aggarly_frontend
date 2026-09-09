"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { CalibratingSanctuaryLoading } from "../common/CalibratingSanctuaryLoading";
import {
  ShieldAlert,
  Shield,
  KeyRound,
  Mail,
  Clock,
  ArrowRight,
  Loader2,
  Lock,
  AlertTriangle,
  Check,
} from "lucide-react";

/**
 * Obsidian Sanctuary Gate (Gate 01 // ID Auth)
 * Exact 2-column layout matching media_1788704857471.png:
 * - Left column: Photoreal Moon, "AUTHENTICATE YOUR LIGHT", nocturnal encryption badges
 * - Right column: "SECURITY CHECKPOINT", "ENTER 6-DIGIT PASSCODE", 6 separate digit cells,
 *   countdown timer, resend button, and mandatory verification notice.
 */
export const EmailVerificationGate: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated, isLoading, logout, verifyEmail, resendVerificationEmail } = useAuth();
  const pathname = usePathname();

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresInSeconds, setExpiresInSeconds] = useState(600); // 10 minutes

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Expiration countdown
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => {
      setExpiresInSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [mounted]);

  // Resend cooldown timer
  useEffect(() => {
    if (!mounted || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [mounted, resendCooldown]);

  // Prevent hydration mismatch: render nothing during SSR and initial client hydration
  if (!mounted) {
    return null;
  }

  // Do not render gate while authentication status is resolving
  if (isLoading) {
    return null;
  }

  // Strictly check that a token exists in storage
  if (typeof window !== "undefined" && !localStorage.getItem("aggarly_jwt_token")) {
    return null;
  }

  // If unauthenticated or no user, strictly do not block
  if (!isAuthenticated || !user) {
    return null;
  }

  // Allow auth and oauth callback routes without blocking
  if (pathname === "/" || pathname === "/auth" || pathname === "/oauth2/callback") {
    return null;
  }

  // STRICT REQUIREMENT: Only appear when emailVerified is explicitly and strictly false
  // If emailVerified is true, undefined, or not loaded, do not appear
  if (user.emailVerified !== false) {
    return null;
  }

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    const newDigits = [...digits];

    if (!cleaned) {
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    // Single digit entry
    newDigits[index] = cleaned[cleaned.length - 1];
    setDigits(newDigits);

    // Auto advance focus
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const fullCode = digits.join("");

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (fullCode.length < 6) {
      setErrorMsg("Please enter all 6 digits of your authorization passcode.");
      return;
    }

    setVerifying(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await verifyEmail(fullCode);
      setSuccessMsg("Passcode confirmed. Unveiling sanctuary admittance...");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired passcode. Please request a new token.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const msg = await resendVerificationEmail();
      setSuccessMsg(msg || "A new 6-digit passcode has been transmitted to your email.");
      setResendCooldown(60);
      setExpiresInSeconds(600);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to transmit passcode. Please wait a moment and try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#07080B]/95 backdrop-blur-2xl animate-in fade-in duration-300 select-none overflow-y-auto"
      style={{ isolation: "isolate" }}
    >
      {/* Central Obsidian Floating Card */}
      <div className="w-full max-w-5xl rounded-[28px] bg-gradient-to-b from-[#0E0E12] via-[#121216] to-[#0A0A0D] border border-[#26262B] shadow-[0_30px_90px_rgba(0,0,0,0.95)] p-6 sm:p-10 relative overflow-hidden text-[#F5F4F1] my-auto">
        {/* Subtle Ambient Starfield / Celestial Grid Background inside Card */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(220,230,239,0.08)_0%,_transparent_70%)] pointer-events-none" />

        {/* Top Notice Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 mb-8 text-xs text-[#9A9A9F]">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-relaxed">
              <strong className="text-amber-300 font-medium mr-1.5">Restricted Sanctuary Access:</strong>
              Complete email verification to unveil your nocturnal reservations, concierge services, and celestial calendar.
            </span>
          </div>
          <span className="px-2.5 py-1 rounded bg-[#18181B] border border-[#2E2E33] text-[10px] tracking-widest text-[#8A8884] font-mono shrink-0 uppercase">
            GATE 01 // ID AUTH
          </span>
        </div>

        {/* Two-Column Layout */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Left Column: Moon & Philosophical Brand Narrative */}
          <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left">
            {/* Glowing Moon Asset */}
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center mb-6">
              <div className="absolute w-56 h-56 rounded-full bg-[radial-gradient(circle,_rgba(220,235,255,0.22)_0%,_rgba(145,190,240,0.08)_50%,_transparent_70%)] filter blur-xl pointer-events-none" />
              <img
                src="/moon_isolated.png"
                alt="Sanctuary Moon"
                className="w-36 h-36 sm:w-44 sm:h-44 object-contain rounded-full relative z-10 select-none pointer-events-none shadow-[0_0_35px_rgba(220,230,239,0.3)] brightness-[1.06]"
              />
            </div>

            <span className="text-[10px] tracking-[0.25em] font-mono uppercase text-[#9A9A9F] mb-1.5">
              VERIFICATION REQUIRED
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#F5F4F1] tracking-[0.1em] uppercase font-normal leading-snug mb-1">
              AUTHENTICATE YOUR LIGHT
            </h2>
            <p className="font-serif italic text-sm text-[#8A8884] font-light mb-4">
              Aggarly by Lona — Sanctuary Gate
            </p>

            <p className="text-xs text-[#8A8884] leading-relaxed mb-8 max-w-sm">
              In honoring the quiet exclusivity of our nocturnal sanctuaries and private telescope observatories, every member account must be verified before admittance.
            </p>

            {/* Feature Bullets */}
            <div className="space-y-3 pt-5 border-t border-white/5 w-full">
              <div className="flex items-center gap-3 text-xs text-[#A1A1AA]">
                <div className="w-6 h-6 rounded-full bg-[#18181B] border border-[#2A2A2E] flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span>End-to-end nocturnal encryption</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#A1A1AA]">
                <div className="w-6 h-6 rounded-full bg-[#18181B] border border-[#2A2A2E] flex items-center justify-center shrink-0">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span>Temporary 6-digit authentication token</span>
              </div>
            </div>
          </div>

          {/* Right Column: Security Checkpoint & Passcode Inputs */}
          <div className="md:col-span-7 flex flex-col text-left">
            {/* Top row */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-[#8A8884]">
                SECURITY CHECKPOINT
              </span>
              <div className="p-2 rounded-lg bg-[#18181B] border border-[#2A2A2E] text-[#9A9A9F]">
                <Mail className="w-4 h-4" />
              </div>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl tracking-[0.06em] text-[#F5F4F1] uppercase font-normal mb-1.5">
              ENTER 6-DIGIT PASSCODE
            </h3>
            <p className="text-xs text-[#8A8884] mb-3">
              We sent an ephemeral nocturnal authorization code to:
            </p>

            {/* Email Pill & Sign Out Action */}
            <div className="w-full px-4 py-2.5 rounded-xl bg-[#16161A] border border-[#2A2A2E] flex items-center justify-between gap-3 mb-6">
              <span className="text-xs font-mono text-slate-200 truncate">{user.email}</span>
              <button
                type="button"
                onClick={logout}
                className="text-[10px] uppercase font-mono tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 underline underline-offset-2"
              >
                CHANGE EMAIL
              </button>
            </div>

            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="w-full p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="w-full p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5 mb-4">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Confirmation Token Label & Expiration */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] tracking-wider uppercase font-mono text-[#8A8884]">
                CONFIRMATION TOKEN (6 DIGITS)
              </span>
              <span className="text-[10px] tracking-wider font-mono text-[#A1A1AA] flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                Expires in {formatCountdown(expiresInSeconds)}
              </span>
            </div>

            {/* 6 Individual OTP Boxes */}
            <div className="grid grid-cols-6 gap-2 sm:gap-3 mb-2">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={verifying}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  autoFocus={idx === 0}
                  className="w-full h-14 sm:h-16 rounded-xl bg-[#16161A] border border-[#2E2E33] focus:border-white/60 focus:bg-[#1C1C22] text-center text-xl sm:text-2xl font-mono font-semibold text-white outline-none transition-all placeholder:text-slate-700"
                />
              ))}
            </div>

            <p className="text-[11px] text-[#63615D] italic mb-6">
              Tip: Check your spam or promotions folder if the transmission does not appear within 60 seconds.
            </p>

            {/* CTA Button */}
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={verifying || fullCode.length < 6}
              className="w-full py-4 px-6 rounded-full bg-[#F5F4F1] hover:bg-white text-[#131316] font-semibold text-xs tracking-[0.15em] uppercase shadow-[0_4px_25px_rgba(255,255,255,0.18)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  VERIFYING PASSCODE...
                </>
              ) : (
                <>
                  VERIFY &amp; UNLOCK ACCESS <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Secondary actions: Resend & Direct Magic Link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-5 pt-3">
              <div className="text-[#8A8884]">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || resendCooldown > 0}
                  className="text-white hover:underline font-medium ml-1 cursor-pointer disabled:opacity-50"
                >
                  {resending
                    ? "Transmitting..."
                    : resendCooldown > 0
                    ? `Resend token (${resendCooldown}s)`
                    : "Resend token"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="text-[#8A8884] hover:text-white text-[10px] tracking-widest uppercase font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 text-left"
              >
                <span>▶</span> SEND DIRECT MAGIC LINK
              </button>
            </div>

            {/* Why is this mandatory? Callout */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[#2A2A2E] flex items-start gap-3 mt-6 text-left">
              <Lock className="w-4 h-4 text-[#8A8884] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#8A8884] leading-relaxed">
                <strong className="text-white font-medium">Why is this mandatory?</strong> To preserve your reservation
                safety and protect exclusive night-sky itineraries, unverified sessions cannot navigate to retreat
                bookings, payment vaults, or chat with Lumen.
              </p>
            </div>

            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => logout()}
                className="text-[11px] text-[#8A8884] hover:text-white transition-colors underline cursor-pointer"
              >
                Sign out or switch to another account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
