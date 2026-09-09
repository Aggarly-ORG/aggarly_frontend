import React from "react";
import Link from "next/link";

export const AdminFooter: React.FC = () => {
  return (
    <footer className="w-full bg-canvas-outer py-space-xl border-t border-hairline-on-light/60">
      <div className="max-w-[1440px] mx-auto px-card-margin-mobile lg:px-card-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md text-text-on-light-secondary">
        <div className="flex items-center gap-space-sm font-subline-editorial text-subline-editorial text-text-on-light-primary">
          <span className="material-symbols-outlined text-[20px]">nightlight</span>
          <span>Aggarly Nocturnal Retreats • Architectural Solitude</span>
        </div>
        <div className="flex items-center gap-space-lg font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
          <Link className="hover:text-text-on-light-primary transition-colors" href="/admin">
            System Status
          </Link>
          <Link className="hover:text-text-on-light-primary transition-colors" href="/admin/ai-audit">
            API Docs
          </Link>
          <Link className="hover:text-text-on-light-primary transition-colors" href="/admin/sanctuaries">
            Curator Desk
          </Link>
        </div>
        <div className="font-data-tabular text-data-tabular text-text-on-light-secondary">
          © 2026 Aggarly by Lona. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
