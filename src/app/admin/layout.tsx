import React from "react";
import type { Metadata } from "next";
import { LonaHeader } from "@/components/common/LonaHeader";
import { AdminFooter } from "@/components/admin/AdminFooter";

export const metadata: Metadata = {
  title: "Admin Console • Platform Metrics & Infrastructure Health | Aggarly by Lona",
  description:
    "Executive Lunar Telemetry, Agentic Mesh Cluster Diagnostics, Spatial Vector Indexing, and Priority Action Ledger.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas-outer min-h-screen flex flex-col font-body-md text-body-md text-on-surface antialiased selection:bg-obsidian-elevated selection:text-text-on-dark-primary">
      {/* Executive Unified Lona Monolith Header */}
      <LonaHeader />

      {/* Main Administrative Stage */}
      <main className="w-full flex-grow py-8 sm:py-10 pb-space-3xl px-card-margin-mobile lg:px-card-margin-desktop bg-canvas-outer">
        <div className="max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>

      {/* Architectural Solitude Footer */}
      <AdminFooter />
    </div>
  );
}
