"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const AdminNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Vision Pipeline & Vector Mesh",
      shortLabel: "Vision Pipeline",
      href: "/admin/vision",
      icon: "hub",
      active: pathname.startsWith("/admin/vision"),
    },
    {
      label: "Sanctuary Moderation & QA",
      shortLabel: "Sanctuary Moderation",
      href: "/admin/sanctuaries",
      icon: "verified",
      active: pathname.startsWith("/admin/sanctuaries"),
    },
    {
      label: "User Identity Directory",
      shortLabel: "User Directory",
      href: "/admin/users",
      icon: "badge",
      active: pathname.startsWith("/admin/users"),
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto mb-space-md flex items-center justify-between gap-4 py-2 border-b border-hairline-on-light/60">
      <nav className="flex items-center gap-space-xs sm:gap-space-sm overflow-x-auto" aria-label="Admin Sub-Navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`font-label-caps-sm text-[12px] uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              item.active
                ? "bg-obsidian-base text-text-on-dark-primary font-semibold shadow-sm"
                : "text-text-on-light-secondary hover:text-text-on-light-primary hover:bg-black/5"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">{item.icon}</span>
            <span>{item.shortLabel}</span>
          </Link>
        ))}
      </nav>
      <div className="hidden sm:flex items-center gap-space-xs text-text-on-light-secondary font-label-caps-sm text-[11px] uppercase tracking-widest">
        <span>ADMIN CONSOLE</span>
        <span>•</span>
        <span>LUNAR PASS 14.8d</span>
      </div>
    </div>
  );
};
