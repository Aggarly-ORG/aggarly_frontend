"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth");
    }

    const handleAuthCleared = () => {
      router.replace("/");
    };

    window.addEventListener("aggarly_auth_cleared", handleAuthCleared);
    return () => {
      window.removeEventListener("aggarly_auth_cleared", handleAuthCleared);
    };
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#04060a",
          color: "#94a3b8",
          fontFamily: "var(--font-sans)",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #38bdf8 0%, #0369a1 70%)",
            boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)",
            animation: "pulse 1.8s infinite",
          }}
        />
        <p style={{ fontSize: "13px", letterSpacing: "0.1em" }}>Verifying credentials...</p>
      </div>
    );
  }

  return <>{children}</>;
};
