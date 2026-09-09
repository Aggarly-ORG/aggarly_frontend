"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { GuestHomePage } from "../components/guest-view/GuestHomePage";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // If the user has exclusively the ADMIN role, redirect to admin area
      const roles = user.roles?.map((r) => r.toUpperCase()) || [];
      const isPureAdmin = roles.includes("ADMIN") && !roles.includes("GUEST") && !roles.includes("HOST");
      if (isPureAdmin) {
        // If pure admin, they can be directed to their admin portal
        router.replace("/admin");
      }
      // For GUEST and HOST (and unauthenticated visitors), the homepage IS the main page!
    }
  }, [isAuthenticated, isLoading, user, router]);

  // While loading auth state, show a subtle loading pulse
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "#f0f2f5" }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-black/20 border-t-black animate-spin" />
      </div>
    );
  }

  // Render the homepage for guests, hosts, and members!
  return <GuestHomePage />;
}
