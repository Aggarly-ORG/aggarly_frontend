"use client";

import React from "react";
import Link from "next/link";

interface LonaFooterProps {
  className?: string;
}

export const LonaFooter: React.FC<LonaFooterProps> = ({ className = "" }) => {
  return (
    <footer className={`w-full bg-canvas-outer border-t border-hairline-on-light py-10 sm:py-12 ${className}`}>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-label-caps-sm tracking-widest uppercase text-text-on-light-secondary">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <span>© 2026 AGGARLY BY LONA. ALL RIGHTS RESERVED.</span>
          <span className="hidden sm:inline text-hairline-on-light">•</span>
          <span>CELESTIAL ARCHITECTURAL SOLITUDE</span>
        </div>
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/privacy" className="hover:text-text-on-light-primary transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-text-on-light-primary transition-colors">
            Terms
          </Link>
          <Link href="/support" className="hover:text-text-on-light-primary transition-colors">
            Support
          </Link>
          <Link href="/moon-phase" className="hover:text-text-on-light-primary transition-colors">
            Astrological Almanac
          </Link>
        </div>
      </div>
    </footer>
  );
};

export const Footer = LonaFooter;

