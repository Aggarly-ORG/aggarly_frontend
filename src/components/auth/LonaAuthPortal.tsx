"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RealisticMoon } from "./RealisticMoon";
import { useAuth } from "../../context/AuthContext";
import { AuthClient } from "../../lib/authClient";

export const LonaAuthPortal: React.FC = () => {
  const router = useRouter();

  const {
    login,
    loginWithMfa,
    register,
    loginWithOAuth,
    refreshUser,
    isAuthenticated,
    user,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<
    "signin" | "signup" | "forgot" | "reset" | "mfa"
  >("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");

  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [maintainSession, setMaintainSession] = useState(true);
  const [mfaToken, setMfaToken] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // =========================================================================
  // OAuth hash callback
  // =========================================================================

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) {
      return;
    }

    const cleanHash = window.location.hash.replace(/^#\/?(\??)/, "");
    const hashParams = new URLSearchParams(cleanHash);

    const token =
      hashParams.get("token") ||
      hashParams.get("access_token") ||
      hashParams.get("accessToken") ||
      hashParams.get("jwt");

    const refreshToken =
      hashParams.get("refreshToken") ||
      hashParams.get("refresh_token") ||
      undefined;

    const oauthEmail = hashParams.get("email") || undefined;
    const oauthUsername = hashParams.get("username") || undefined;

    const error =
      hashParams.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error_message");

    // Remove token/hash from URL immediately.
    if (window.history?.replaceState) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }

    if (error) {
      setErrorMsg(error);
      return;
    }

    if (token) {
      loginWithOAuth(token, refreshToken, {
        email: oauthEmail,
        username: oauthUsername,
      });

      setSuccessMsg("Signed in successfully. Redirecting to home...");

      setTimeout(() => {
        router.replace("/");
      }, 400);
    }
  }, [loginWithOAuth, router]);

  // =========================================================================
  // OAuth popup listener
  // =========================================================================

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (typeof window === "undefined") {
        return;
      }

      const allowedOrigins = [
        window.location.origin,
        "http://localhost:3000",
        "http://localhost:8081",
        process.env.NEXT_PUBLIC_API_URL,
      ].filter(Boolean);

      if (!allowedOrigins.includes(event.origin)) {
        return;
      }

      if (event.data?.type === "AGGARLY_OAUTH_SUCCESS") {
        const { token, refreshToken, user: oauthUser } = event.data;

        if (token) {
          loginWithOAuth(token, refreshToken, oauthUser);

          setSuccessMsg(
            "Signed in with Google. Redirecting to home..."
          );

          setTimeout(() => {
            router.replace("/");
          }, 400);
        }
      }

      if (event.data?.type === "AGGARLY_OAUTH_ERROR") {
        setErrorMsg(
          event.data.error ||
            "Authentication could not be completed."
        );
      }
    };

    window.addEventListener("message", handleOAuthMessage);

    return () => {
      window.removeEventListener("message", handleOAuthMessage);
    };
  }, [loginWithOAuth, router]);

  // =========================================================================
  // OAuth popup
  // =========================================================================

  const openOAuthPopup = (
    provider: "google" | "apple" | "github"
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const width = 520;
    const height = 660;

    const left = Math.max(
      0,
      Math.round(
        window.screenX +
          (window.outerWidth - width) / 2
      )
    );

    const top = Math.max(
      0,
      Math.round(
        window.screenY +
          (window.outerHeight - height) / 2
      )
    );

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8081";

    const authUrl =
      `${apiUrl}/oauth2/authorization/${provider}`;

    const popup = window.open(
      authUrl,
      `${provider}_oauth_floating`,
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (popup && !popup.closed) {
      popup.focus();
    }

    const pollInterval = window.setInterval(() => {
      if (!popup || popup.closed) {
        window.clearInterval(pollInterval);

        const storedToken = localStorage.getItem(
          "aggarly_jwt_token"
        );

        if (storedToken) {
          refreshUser();
          router.replace("/");
        }
      }
    }, 500);
  };

  // =========================================================================
  // Form submit
  // =========================================================================

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      // ---------------------------------------------------------------------
      // SIGN IN
      // ---------------------------------------------------------------------

      if (mode === "signin") {
        if (!email.trim() || !password) {
          throw new Error(
            "Please enter your email and password."
          );
        }

        const result = await login(
          email.trim(),
          password
        );

        if (result.status === "MFA_REQUIRED") {
          setMfaToken(result.mfaToken || "");
          setOtpCode("");
          setErrorMsg(null);

          setSuccessMsg(
            "Two-factor authentication required. Enter the 6-digit code from your authenticator app."
          );

          setMode("mfa");
        } else {
          setSuccessMsg(
            "Welcome back to Aggarly by Lona."
          );

          setTimeout(() => {
            router.push("/");
          }, 500);
        }

        return;
      }

      // ---------------------------------------------------------------------
      // MFA
      // ---------------------------------------------------------------------

      if (mode === "mfa") {
        const code = otpCode.trim();

        if (!code || code.length !== 6) {
          throw new Error(
            "Please enter the 6-digit code from your authenticator app."
          );
        }

        await loginWithMfa(mfaToken, code);

        setSuccessMsg(
          "Identity verified. Entering Lona..."
        );

        setTimeout(() => {
          router.push("/");
        }, 500);

        return;
      }

      // ---------------------------------------------------------------------
      // SIGN UP
      // ---------------------------------------------------------------------

      if (mode === "signup") {
        if (
          !email.trim() ||
          !password ||
          !firstName.trim() ||
          !lastName.trim() ||
          !username.trim()
        ) {
          throw new Error(
            "Please provide all required fields."
          );
        }

        await register({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          phone: phone.trim() || undefined,
        });

        setSuccessMsg(
          "Account created. Entering Lona..."
        );

        setTimeout(() => {
          router.push("/");
        }, 500);

        return;
      }

      // ---------------------------------------------------------------------
      // FORGOT PASSWORD
      // ---------------------------------------------------------------------

      if (mode === "forgot") {
        if (!email.trim()) {
          throw new Error(
            "Please enter your email address to receive the recovery OTP."
          );
        }

        const msg = await AuthClient.forgotPassword(
          email.trim()
        );

        setSuccessMsg(
          msg ||
            "If the email exists, a 6-digit OTP code has been sent."
        );

        setOtpCode("");
        setMode("reset");

        return;
      }

      // ---------------------------------------------------------------------
      // RESET PASSWORD
      // ---------------------------------------------------------------------

      if (mode === "reset") {
        if (
          !email.trim() ||
          otpCode.trim().length !== 6 ||
          !newPassword
        ) {
          throw new Error(
            "Please enter your email, 6-digit OTP code, and new password."
          );
        }

        const msg = await AuthClient.resetPassword(
          email.trim(),
          otpCode.trim(),
          newPassword
        );

        setSuccessMsg(
          msg ||
            "Password reset successfully. Please sign in."
        );

        setPassword(newPassword);
        setOtpCode("");
        setNewPassword("");
        setMode("signin");

        return;
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          "Authentication failed. Please verify your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Forgot password
  // =========================================================================

  const handleForgotPasswordClick = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setMode("forgot");
      return;
    }

    setIsSubmitting(true);

    try {
      const msg = await AuthClient.forgotPassword(
        email.trim()
      );

      setSuccessMsg(
        msg ||
          "If the email exists, a 6-digit recovery OTP code has been sent."
      );

      setOtpCode("");
      setMode("reset");
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Failed to send reset code."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="lona-portal-wrapper">
      <div className="lona-card-container">

        {/* ================================================================
            LEFT PANEL
        ================================================================ */}

        <div className="lona-left-panel">
          <div className="lona-moon-container">
            <RealisticMoon size={230} />
          </div>

          <div className="lona-headline-block">
            <h1 className="lona-headline-serif">
              WHERE MOONLIGHT UNVEILS
            </h1>

            <h2 className="lona-headline-italic">
              AGGARLY BY LONA
            </h2>

            <p className="lona-subcaption">
              Welcome to your nocturnal retreat.
              Sign in to access your space.
            </p>
          </div>
        </div>

        {/* ================================================================
            RIGHT PANEL
        ================================================================ */}

        <div className="lona-right-panel">

          {/* ==============================================================
              SIGN IN / SIGN UP TOGGLE
          ============================================================== */}

          <div className="lona-mode-toggle">
            <button
              type="button"
              className={`lona-toggle-btn ${
                mode === "signin" ? "active" : ""
              }`}
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line
                  x1="15"
                  y1="12"
                  x2="3"
                  y2="12"
                />
              </svg>

              <span>SIGN IN</span>
            </button>

            <button
              type="button"
              className={`lona-toggle-btn ${
                mode === "signup" ? "active" : ""
              }`}
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle
                  cx="8.5"
                  cy="7"
                  r="4"
                />
                <line
                  x1="20"
                  y1="8"
                  x2="20"
                  y2="14"
                />
                <line
                  x1="23"
                  y1="11"
                  x2="17"
                  y2="11"
                />
              </svg>

              <span>SIGN UP</span>
            </button>
          </div>

          {/* ==============================================================
              HEADINGS
          ============================================================== */}

          <div className="lona-form-headings">
            <h3 className="lona-form-title">
              {mode === "signin"
                ? "SIGN IN"
                : mode === "signup"
                ? "CREATE ACCOUNT"
                : mode === "forgot"
                ? "RECOVER ACCESS"
                : mode === "mfa"
                ? "TWO-FACTOR AUTHENTICATION"
                : "SET NEW PASSWORD"}
            </h3>

            <p className="lona-form-desc">
              {mode === "signin"
                ? "Enter your credentials to access your account."
                : mode === "signup"
                ? "Create your account to get started with Lona."
                : mode === "forgot"
                ? "Enter your registered email to receive a 6-digit recovery OTP."
                : mode === "mfa"
                ? "Enter the 6-digit code from your authenticator app."
                : "Enter the 6-digit OTP from your email and your new password."}
            </p>
          </div>

          {/* ==============================================================
              ACTIVE SESSION
          ============================================================== */}

          {isAuthenticated && user && (
            <div className="lona-active-session-banner">
              <div className="lona-session-avatar">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                  />
                ) : (
                  <span>
                    {(user.username ||
                      user.email ||
                      "U")[0].toUpperCase()}
                  </span>
                )}
              </div>

              <div className="lona-session-details">
                <span className="lona-session-greet">
                  Currently signed in as
                </span>

                <span className="lona-session-user">
                  {user.email}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="lona-session-action-btn flex-1"
                  onClick={() => router.push("/")}
                >
                  Go to Home →
                </button>

                <button
                  type="button"
                  className="lona-session-action-btn"
                  style={{
                    background:
                      "rgba(239, 68, 68, 0.15)",
                    color: "#fca5a5",
                    border:
                      "1px solid rgba(239, 68, 68, 0.3)",
                  }}
                  onClick={logout}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* ==============================================================
              FEEDBACK
          ============================================================== */}

          {errorMsg && (
            <div className="lona-error-alert">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="lona-success-alert">
              {successMsg}
            </div>
          )}

          {/* ==============================================================
              AUTH FORM
          ============================================================== */}

          <form
            onSubmit={handleSubmit}
            className="lona-auth-form"
            autoComplete="on"
          >

            {/* ============================================================
                SIGN UP NAME FIELDS
            ============================================================ */}

            {mode === "signup" && (
              <>
                <div className="lona-form-row">

                  <div className="lona-input-group">
                    <label className="lona-input-label">
                      FIRST NAME
                    </label>

                    <input
                      type="text"
                      name="given-name"
                      autoComplete="given-name"
                      className="lona-input-field"
                      placeholder="Astrid"
                      value={firstName}
                      onChange={(e) =>
                        setFirstName(e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="lona-input-group">
                    <label className="lona-input-label">
                      LAST NAME
                    </label>

                    <input
                      type="text"
                      name="family-name"
                      autoComplete="family-name"
                      className="lona-input-field"
                      placeholder="Vance"
                      value={lastName}
                      onChange={(e) =>
                        setLastName(e.target.value)
                      }
                      required
                    />
                  </div>

                </div>

                <div className="lona-input-group">
                  <label className="lona-input-label">
                    USERNAME
                  </label>

                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    className="lona-input-field"
                    placeholder="username"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    required
                  />
                </div>
              </>
            )}

            {/* ============================================================
                MFA
            ============================================================ */}

            {mode === "mfa" && (
              <div className="lona-input-group">
                <label className="lona-input-label">
                  AUTHENTICATOR CODE
                </label>

                <div className="lona-input-wrapper">
                  <input
                    type="text"
                    name="one-time-code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="lona-input-field"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    autoFocus
                    required
                    style={{
                      textAlign: "center",
                      fontSize: "22px",
                      letterSpacing: "0.4em",
                      fontFamily: "monospace",
                    }}
                  />
                </div>

                <p
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginTop: "6px",
                  }}
                >
                  Open your authenticator app and enter
                  the current 6-digit code.
                </p>
              </div>
            )}

            {/* ============================================================
                EMAIL
            ============================================================ */}

            {mode !== "mfa" && (
              <div className="lona-input-group">
                <label className="lona-input-label">
                  EMAIL ADDRESS
                </label>

                <div className="lona-input-wrapper">

                  <input
                    type="email"
                    name={
                      mode === "signin"
                        ? "username"
                        : "email"
                    }
                    autoComplete={
                      mode === "signin"
                        ? "username"
                        : "email"
                    }
                    className="lona-input-field"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    required
                  />

                  <span className="lona-input-icon">
                    @
                  </span>

                </div>
              </div>
            )}

            {/* ============================================================
                OTP RESET CODE
            ============================================================ */}

            {mode === "reset" && (
              <div className="lona-input-group">
                <label className="lona-input-label">
                  6-DIGIT OTP CODE
                </label>

                <div className="lona-input-wrapper">

                  <input
                    type="text"
                    name="one-time-code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="lona-input-field"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    required
                  />

                  <span className="lona-input-icon">
                    #
                  </span>

                </div>
              </div>
            )}

            {/* ============================================================
                PASSWORD
            ============================================================ */}

            {(mode === "signin" ||
              mode === "signup") && (
              <div className="lona-input-group">

                <div className="lona-label-with-link">
                  <label className="lona-input-label">
                    PASSWORD
                  </label>

                  {mode === "signin" && (
                    <button
                      type="button"
                      className="lona-lost-key-link"
                      onClick={
                        handleForgotPasswordClick
                      }
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="lona-input-wrapper">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    autoComplete={
                      mode === "signin"
                        ? "current-password"
                        : "new-password"
                    }
                    className="lona-input-field"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                  />

                  <button
                    type="button"
                    className="lona-eye-toggle-btn"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line
                          x1="1"
                          y1="1"
                          x2="23"
                          y2="23"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                        />
                      </svg>
                    )}
                  </button>

                </div>
              </div>
            )}

            {/* ============================================================
                NEW PASSWORD
            ============================================================ */}

            {mode === "reset" && (
              <div className="lona-input-group">

                <label className="lona-input-label">
                  NEW PASSWORD
                </label>

                <div className="lona-input-wrapper">

                  <input
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    name="new-password"
                    autoComplete="new-password"
                    className="lona-input-field"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    required
                  />

                  <button
                    type="button"
                    className="lona-eye-toggle-btn"
                    onClick={() =>
                      setShowNewPassword(
                        !showNewPassword
                      )
                    }
                    aria-label={
                      showNewPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showNewPassword ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line
                          x1="1"
                          y1="1"
                          x2="23"
                          y2="23"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                        />
                      </svg>
                    )}
                  </button>

                </div>
              </div>
            )}

            {/* ============================================================
                REMEMBER ME
            ============================================================ */}

            {(mode === "signin" ||
              mode === "signup") && (
              <div className="lona-form-options">
                <label className="lona-checkbox-label">

                  <input
                    type="checkbox"
                    name="remember-me"
                    checked={maintainSession}
                    onChange={(e) =>
                      setMaintainSession(
                        e.target.checked
                      )
                    }
                    className="lona-checkbox"
                  />

                  <span>Remember me</span>

                </label>
              </div>
            )}

            {/* ============================================================
                SUBMIT
            ============================================================ */}

            <button
              type="submit"
              disabled={isSubmitting}
              className="lona-submit-cta-btn"
            >
              {isSubmitting ? (
                <span>
                  {mode === "signin"
                    ? "Signing in..."
                    : mode === "signup"
                    ? "Creating account..."
                    : mode === "forgot"
                    ? "Sending OTP..."
                    : mode === "mfa"
                    ? "Verifying code..."
                    : "Resetting password..."}
                </span>
              ) : (
                <>
                  <span>
                    {mode === "signin"
                      ? "SIGN IN"
                      : mode === "signup"
                      ? "CREATE ACCOUNT"
                      : mode === "forgot"
                      ? "SEND RECOVERY CODE"
                      : mode === "mfa"
                      ? "VERIFY CODE"
                      : "RESET PASSWORD"}
                  </span>

                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <line
                      x1="5"
                      y1="12"
                      x2="19"
                      y2="12"
                    />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>

            {/* ============================================================
                BACK BUTTON
            ============================================================ */}

            {(mode === "forgot" ||
              mode === "reset") && (
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setOtpCode("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "12px",
                  cursor: "pointer",
                  marginTop: "12px",
                  textAlign: "center",
                  display: "block",
                  width: "100%",
                }}
              >
                ← Back to Sign In
              </button>
            )}
          </form>

          {/* ==============================================================
              SOCIAL DIVIDER
          ============================================================== */}

          <div className="lona-divider-block">
            <span className="lona-divider-line" />
            <span className="lona-divider-text">
              OR CONTINUE WITH
            </span>
            <span className="lona-divider-line" />
          </div>

          {/* ==============================================================
              SOCIAL LOGIN
          ============================================================== */}

          <div className="lona-social-grid">

            {/* Google */}

            <button
              type="button"
              className="lona-social-btn"
              onClick={() =>
                openOAuthPopup("google")
              }
              title="Sign in with Google"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />

                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />

                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />

                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
                />
              </svg>

              <span>Google</span>
            </button>

            {/* Apple */}

            <button
              type="button"
              className="lona-social-btn"
              onClick={() =>
                openOAuthPopup("apple")
              }
              title="Sign in with Apple"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.88-.9.04-1.99.6-2.63 1.35-.58.67-.99 1.74-.88 2.79 1.01.08 2.05-.51 2.59-1.26z" />
              </svg>

              <span>Apple</span>
            </button>

            {/* GitHub */}

            <button
              type="button"
              className="lona-social-btn"
              onClick={() =>
                openOAuthPopup("github")
              }
              title="Sign in with GitHub"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>

              <span>GitHub</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};