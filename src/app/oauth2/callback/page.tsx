"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthClient } from "../../../lib/authClient";

function OAuth2CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 1. Prioritize extracting params from URL Fragment / Hash (#)
    // Format: http://localhost:3000/oauth2/callback#token=...&refreshToken=...
    // The hash fragment is never sent to servers or in Referer headers, staying client-side.
    let hashStr = "";
    if (typeof window !== "undefined" && window.location.hash) {
      hashStr = window.location.hash.replace(/^#\/?(\??)/, "");
    }
    const hashParams = new URLSearchParams(hashStr);

    // Helper: inspect hash first, then searchParams fallback
    const getParam = (keys: string[]): string | undefined => {
      for (const key of keys) {
        const val = hashParams.get(key);
        if (val && val.trim()) return val.trim();
      }
      for (const key of keys) {
        const val = searchParams.get(key);
        if (val && val.trim()) return val.trim();
      }
      return undefined;
    };

    const token = getParam(["token", "access_token", "accessToken", "jwt"]);
    const refreshToken = getParam(["refreshToken", "refresh_token"]);
    const email = getParam(["email"]);
    const username = getParam(["username"]);
    const id = getParam(["id", "userId", "user_id"]);
    const error = getParam(["error", "error_description", "error_message"]);

    // Security best practice: immediately strip hash/tokens from browser URL bar & history
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    // Handle OAuth Error
    if (error) {
      if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(
            {
              type: "AGGARLY_OAUTH_ERROR",
              error,
            },
            window.location.origin
          );
        } catch (e) {
          console.warn("postMessage error:", e);
        }
        setTimeout(() => window.close(), 150);
        return;
      }
      router.replace(`/auth?error=${encodeURIComponent(error)}`);
      return;
    }

    // Handle OAuth Success
    if (token) {
      // Store tokens and user in localStorage and memory
      const user = AuthClient.handleOAuthSuccess(token, refreshToken || undefined, {
        email,
        username,
        id,
      });

      // If running inside a popup / floating window, notify the opener
      if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(
            {
              type: "AGGARLY_OAUTH_SUCCESS",
              token,
              refreshToken,
              user,
            },
            window.location.origin
          );
        } catch (e) {
          console.warn("postMessage error:", e);
        }
        // Gracefully close popup window
        setTimeout(() => {
          window.close();
        }, 150);
        return;
      }

      // Fallback: If not opened in a popup (direct tab redirect), route to home page
      router.replace("/");
    } else {
      // No token found -> route back to login
      router.replace("/auth");
    }
  }, [router, searchParams]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        flexDirection: "column",
        gap: "16px",
        fontFamily: "var(--font-sans)",
        background: "#04060a",
        color: "#f1f5f9",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #38bdf8 0%, #0369a1 70%)",
          boxShadow: "0 0 20px rgba(56, 189, 248, 0.5)",
          animation: "pulse 1.8s infinite",
        }}
      />
      <p style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "0.08em", color: "#94a3b8" }}>
        Authenticating with Aggarly by Lona...
      </p>
    </div>
  );
}

export default function OAuth2CallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#04060a",
            color: "#94a3b8",
            fontFamily: "var(--font-sans)",
          }}
        >
          <p>Connecting to sanctuary...</p>
        </div>
      }
    >
      <OAuth2CallbackHandler />
    </Suspense>
  );
}
