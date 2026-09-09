"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { LonaHeader } from "../../components/common/LonaHeader";
import { LonaAuthPortal } from "../../components/auth/LonaAuthPortal";
import { LonaFooter } from "../../components/common/LonaFooter";

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  // Do not show login forms if already authenticated or while loading
  if (isLoading || isAuthenticated) {
    return (
      <div
        className="lona-page-root"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#04060a",
          minHeight: "100vh",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "radial-gradient(circle, #38bdf8 0%, #0369a1 70%)",
              boxShadow: "0 0 24px rgba(56, 189, 248, 0.4)",
              animation: "pulse 1.8s infinite",
            }}
          />
          <p style={{ color: "#788595", fontSize: "13px", letterSpacing: "0.12em", fontWeight: 500 }}>
            ENTERING LONA...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lona-page-root">
      <LonaHeader />
      <main className="lona-page-main">
        <LonaAuthPortal />
      </main>
      <LonaFooter />
    </div>
  );
}
