"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { 
  Bell, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Compass, 
  Sparkles,
  Menu,
  Building2,
  PlusCircle,
  Plus,
  Shield,
  Calendar,
  CreditCard,
  Star,
  CheckSquare,
  Bookmark,
  LayoutDashboard,
  Tag,
  Clock,
  Users,
  Eye,
  ShieldAlert
} from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "../ui/sheet";
import { cn } from "@/lib/utils";
import { NotificationClient, NotificationItem } from "@/lib/notificationClient";
export const LonaHeader: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notificationsOpen) return;
    setNotifLoading(true);
    NotificationClient.getNotifications(undefined,true)
      .then((items) => setNotifications(items.slice(0, 5)))
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }, [notificationsOpen]);
  const isHost =
    user?.role === "HOST" ||
    user?.role === "ROLE_HOST" ||
    user?.roles?.includes("HOST") ||
    user?.roles?.includes("ROLE_HOST") ||
    pathname.startsWith("/host");
  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "ROLE_ADMIN" ||
    user?.roles?.includes("ADMIN") ||
    user?.roles?.includes("ROLE_ADMIN") ||
    pathname.startsWith("/admin");
  const isHostSection = pathname.startsWith("/host");
  const isAdminSection = pathname.startsWith("/admin");
  
  const navLinks = [
    { label: "HOME", href: "/", active: pathname === "/" },
    { label: "STAYS & RETREATS", href: "/properties", active: pathname.startsWith("/properties") },
    ...(isHost ? [{ label: "HOST HUB", href: "/host", active: pathname.startsWith("/host") }] : []),
    ...(isAdmin ? [{ label: "ADMIN", href: "/admin", active: pathname.startsWith("/admin") }] : []),
    { label: "MOON PHASE", href: "/moon-phase", active: pathname.startsWith("/moon-phase") },
    ...(pathname.startsWith("/profile") ? [{ label:"PROFILE", href: "/profile", active: true }] : []),
    ...(pathname.startsWith("/settings") ? [{ label: "SETTINGS", href: "/settings", active: true }] : []),
    { label: "CHAT & LUMEN AI", href: "/chat", active: pathname.startsWith("/chat") },
  ];
  
  const hostNavLinks = [
    { label: "Overview", href: "/host", active: pathname === "/host", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { label: "Reservations", href: "/host/reservations", active: pathname.startsWith("/host/reservations"), icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { label: "Calendar", href: "/host/calendar", active: pathname.startsWith("/host/calendar"), icon: <Calendar className="w-3.5 h-3.5" /> },
    { label: "Financials", href: "/host/financials", active: pathname.startsWith("/host/financials"), icon: <CreditCard className="w-3.5 h-3.5" /> },
    { label: "Reviews", href: "/host/reviews", active: pathname.startsWith("/host/reviews"), icon: <Star className="w-3.5 h-3.5" /> },
    { label: "Turnover", href: "/host/turnover", active: pathname.startsWith("/host/turnover"), icon: <Sparkles className="w-3.5 h-3.5" /> },
    { label: "+ Add Sanctuary", href: "/host/sanctuaries/new", active: pathname.startsWith("/host/sanctuaries/new"), icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-600" /> },
  ];
  
  const adminNavLinks = [
    { label: "Overview", href: "/admin", active: pathname === "/admin", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { label: "Coupons & Promos", href: "/admin/coupons", active: pathname.startsWith("/admin/coupons"), icon: <Tag className="w-3.5 h-3.5" /> },
    { label: "Cron Scheduler", href: "/admin/scheduler", active: pathname.startsWith("/admin/scheduler"), icon: <Clock className="w-3.5 h-3.5" /> },
    { label: "Sanctuaries", href: "/admin/sanctuaries", active: pathname.startsWith("/admin/sanctuaries"), icon: <Building2 className="w-3.5 h-3.5" /> },
    { label: "Payments & Escrow", href: "/admin/payments", active: pathname.startsWith("/admin/payments"), icon: <CreditCard className="w-3.5 h-3.5" /> },
    { label: "Users Directory", href: "/admin/users", active: pathname.startsWith("/admin/users"), icon: <Users className="w-3.5 h-3.5" /> },
    { label: "AI Safety Audit", href: "/admin/ai-audit", active: pathname.startsWith("/admin/ai-audit"), icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { label: "Vision Pipeline", href: "/admin/vision", active: pathname.startsWith("/admin/vision"), icon: <Eye className="w-3.5 h-3.5" /> },
  ];
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };
    if (dropdownOpen || notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, notificationsOpen]);
  
  useEffect(() => {
    setDropdownOpen(false);
    setNotificationsOpen(false);
    setMobileOpen(false);
  }, [pathname]);
  const userDisplayName =
    user?.displayName ||
    user?.username ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "") ||
    (user?.email ? user.email.split("@")[0] : "Member");
  const userAvatarInitial = (userDisplayName || "U").slice(0, 1).toUpperCase();
  return (
    <header className="sticky top-0 z-50 w-full bg-canvas-outer/95 backdrop-blur-md border-b border-hairline-on-light transition-all shadow-xs">
      
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 h-20 flex items-center justify-between gap-4">
        
        
        <Link href="/" className="flex items-center gap-3 select-none group shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#0b0e14] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3.58-.5 5.06-1.38-4.52-.77-7.96-4.71-7.96-9.48 0-4.77 3.44-8.71 7.96-9.48C15.58 2.5 13.85 2 12 2z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-serif text-[15px] font-bold tracking-[0.22em] text-[#0b0e14]">
              A G G A R L Y
            </span>
            <span className="text-[8.5px] font-semibold tracking-[0.18em] text-[#71717a] uppercase">
              BY LONA
            </span>
          </div>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 xl:gap-9" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "relative py-1.5 text-xs font-semibold tracking-[0.14em] uppercase transition-colors duration-200",
                link.active
                  ? "text-[#09090b]"
                  : "text-[#71717a] hover:text-[#09090b]"
              )}
            >
              {link.label}
              {link.active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#09090b] rounded-full" />
              )}
            </Link>
          ))}
        </nav>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className={cn(
                "relative p-2 rounded-full text-zinc-600 hover:text-zinc-950 hover:bg-black/5 transition-colors cursor-pointer focus:outline-none",
                notificationsOpen && "bg-black/10 text-zinc-950"
              )}
              title="Notifications & Dispatches"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#dfb15b] rounded-full ring-2 ring-white animate-pulse" />
            </button>
              {notificationsOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-80 sm:w-96 rounded-2xl bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#dfb15b]">
                      notifications_active
                    </span>
                    <span className="font-semibold text-xs uppercase tracking-wider text-zinc-900">
                      Dispatches &amp; Alerts
                    </span>
                  </div>
                  <Link
                    href="/notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100"
                  >
                    View Center
                  </Link>
                </div>
                <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                  {notifLoading ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-zinc-400">
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-300 border-t-amber-500 animate-spin" />
                      <span className="text-xs">Loading dispatches...</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-400">
                      No new dispatches
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const badgeColor =
                        notif.category === "bookings" ? "text-emerald-600" :
                        notif.category === "messages" ? "text-blue-600" :
                        notif.category === "price-alerts" ? "text-amber-600" :
                        "text-zinc-500";
                      const href =
                        notif.actionUrl ||
                        (notif.category === "messages" ? "/chat" :
                         notif.category === "price-alerts" ? "/watchdog" :
                         notif.category === "bookings" ? "/trips" : "/notifications");
                      return (
                        <Link
                          key={notif.id}
                          href={href}
                          onClick={() => setNotificationsOpen(false)}
                          className="block p-2.5 rounded-xl bg-black/[0.02] hover:bg-black/[0.05] transition-colors text-left border border-black/[0.03]"
                        >
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                            <span className={`font-semibold uppercase ${badgeColor}`}>
                              {notif.badgeText}
                            </span>
                            <span className="font-mono">{notif.timeAgo}</span>
                          </div>
                          <p className="text-xs font-medium text-zinc-900">
                            {notif.body || notif.title}
                          </p>
                        </Link>
                      );
                    })
                  )}
                </div>
                <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between">
                  <Link
                    href="/notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs font-semibold text-zinc-900 hover:underline uppercase tracking-wider flex items-center gap-1"
                  >
                    <span>View All Dispatches</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/watchdog"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900"
                  >
                    Radar Settings
                  </Link>
                </div>
              </div>
            )}
          </div>
          {isAuthenticated && user ? (
            <div className="relative flex items-center gap-2" ref={dropdownRef}>
              <button
                type="button"
                className="flex items-center gap-1.5 py-1 px-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="Open user menu"
              >
                <Avatar className="w-8 h-8 border border-black/10 shadow-sm">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={userDisplayName} />}
                  <AvatarFallback className="bg-[#09090b] text-[#f1f5f9] text-xs font-bold">
                    {userAvatarInitial}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-zinc-500 transition-transform duration-200",
                    dropdownOpen && "rotate-180 text-zinc-900"
                  )}
                />
              </button>
                  {dropdownOpen && (
                <div
                  className="absolute top-[calc(100%+8px)] right-0 w-64 rounded-2xl bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  role="menu"
                >
                          <div className="flex items-center gap-3 p-3 bg-black/[0.03] rounded-xl mb-1 border border-black/[0.04]">
                    <Avatar className="w-10 h-10 border border-black/10 shrink-0 shadow-sm">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={userDisplayName} />}
                      <AvatarFallback className="bg-[#09090b] text-[#f1f5f9] text-xs font-bold">
                        {userAvatarInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-zinc-900 truncate">
                        {userDisplayName}
                      </span>
                      <span className="text-[11px] text-zinc-500 truncate">
                        {user.email || ""}
                      </span>
                    </div>
                  </div>
                  <div className="h-px bg-black/[0.06] my-1" />
                          <Link
                    href="/trips"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.04] rounded-lg transition-colors"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Compass className="w-4 h-4 text-zinc-500" />
                    <span>My Journeys &amp; Trips</span>
                  </Link>
                  <Link
                    href="/wishlists"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.04] rounded-lg transition-colors"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Bookmark className="w-4 h-4 text-zinc-500" />
                    <span>Saved Wishlists</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.04] rounded-lg transition-colors"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="w-4 h-4 text-zinc-500" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.04] rounded-lg transition-colors"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="w-4 h-4 text-zinc-500" />
                    <span>Settings</span>
                  </Link>
                          {isAdmin && (
                    <>
                      <div className="h-px bg-black/[0.06] my-1" />
                      <div className="px-3 py-1 text-[10px] font-semibold tracking-widest text-amber-800 uppercase">
                        Admin Console
                      </div>
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-amber-900 hover:text-black hover:bg-amber-50 rounded-lg transition-colors"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-600" />
                        <span>Platform Overview</span>
                      </Link>
                      <Link
                        href="/admin/coupons"
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-amber-900 hover:text-black hover:bg-amber-50 rounded-lg transition-colors"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Tag className="w-4 h-4 text-amber-600" />
                        <span>Coupons &amp; Promos</span>
                      </Link>
                      <Link
                        href="/admin/scheduler"
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-amber-900 hover:text-black hover:bg-amber-50 rounded-lg transition-colors"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Cron Scheduler</span>
                      </Link>
                    </>
                  )}
                          {isHost && (
                    <>
                      <div className="h-px bg-black/[0.06] my-1" />
                      <div className="px-3 py-1 text-[10px] font-semibold tracking-widest text-emerald-800 uppercase">
                        Host Sanctuary Hub
                      </div>
                      <Link
                        href="/host"
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-lg transition-colors"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                        <span>Portfolio Overview</span>
                      </Link>
                      <Link
                        href="/host/reservations"
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-lg transition-colors"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <span>Master Reservations</span>
                      </Link>
                      <Link
                        href="/host/calendar"
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-lg transition-colors"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>Multi-Sanctuary Calendar</span>
                      </Link>
                      <Link
                        href="/host/financials"
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-lg transition-colors"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>Financials &amp; Payouts</span>
                      </Link>
                      <Link
                        href="/host/sanctuaries/new"
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-lg transition-colors"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <PlusCircle className="w-4 h-4 text-emerald-600" />
                        <span>+ Add New Sanctuary</span>
                      </Link>
                    </>
                  )}
                  <div className="h-px bg-black/[0.06] my-1" />
                          <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-left"
                    role="menuitem"
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-xs font-semibold tracking-wider text-zinc-700 hover:text-black">
                <Link href="/auth">SIGN IN</Link>
              </Button>
              <Button variant="default" size="sm" asChild className="text-xs font-semibold tracking-wider px-4">
                <Link href="/auth">GET STARTED →</Link>
              </Button>
            </div>
          )}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-zinc-700 hover:text-black hover:bg-black/5"
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] sm:w-[350px] bg-[#0b0e14] text-white p-6 border-l border-white/10 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3 pr-8">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3.58-.5 5.06-1.38-4.52-.77-7.96-4.71-7.96-9.48 0-4.77 3.44-8.71 7.96-9.48C15.58 2.5 13.85 2 12 2z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <span className="font-serif text-sm font-bold tracking-[0.2em] text-white">
                      AGGARLY
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "px-3 py-2.5 rounded-xl text-xs font-semibold tracking-[0.14em] uppercase transition-colors",
                        link.active
                          ? "bg-white/10 text-white font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
                      {isAdmin && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-amber-400 uppercase">
                      Admin Operations
                    </div>
                    <div className="flex flex-col gap-1">
                      {adminNavLinks.map((aLink) => (
                        <Link
                          key={aLink.href}
                          href={aLink.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium tracking-wider uppercase transition-colors flex items-center gap-2",
                            aLink.active
                              ? "bg-amber-500/20 text-amber-200"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          )}
                        >
                          {aLink.icon}
                          <span>{aLink.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                      {isHost && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-emerald-400 uppercase">
                      Host Sanctuary Hub
                    </div>
                    <div className="flex flex-col gap-1">
                      {hostNavLinks.map((hLink) => (
                        <Link
                          key={hLink.href}
                          href={hLink.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium tracking-wider uppercase transition-colors flex items-center gap-2",
                            hLink.active
                              ? "bg-emerald-500/20 text-emerald-200"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          )}
                        >
                          {hLink.icon}
                          <span>{hLink.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
                  <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-2.5">
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center gap-3 px-2 py-2 mb-2 bg-white/5 rounded-xl border border-white/5">
                      <Avatar className="w-8 h-8 border border-white/20">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={userDisplayName} />}
                        <AvatarFallback className="bg-white/10 text-white text-xs font-bold">
                          {userAvatarInitial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-white truncate">
                          {userDisplayName}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate">
                          {user.email || ""}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full justify-start text-xs font-normal"
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2" /> Log Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild className="w-full text-white border-white/20 hover:bg-white/10 hover:text-white">
                      <Link href="/auth" onClick={() => setMobileOpen(false)}>
                        SIGN IN
                      </Link>
                    </Button>
                    <Button variant="default" size="sm" asChild className="w-full bg-white text-black hover:bg-zinc-200">
                      <Link href="/auth" onClick={() => setMobileOpen(false)}>
                        GET STARTED →
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {isHostSection && (
        <div className="w-full bg-canvas-outer/95 backdrop-blur-md border-t border-hairline-on-light/60 transition-all shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 min-h-[46px] py-1.5">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/10 text-emerald-900 border border-emerald-900/15 text-[10.5px] font-semibold tracking-widest uppercase shrink-0 select-none">
                <Building2 className="w-3 h-3 text-emerald-700" />
                <span>Host Hub</span>
              </div>
              <div className="h-4 w-px bg-hairline-on-light shrink-0 hidden sm:block" />
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
                {hostNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 shrink-0",
                      link.active
                        ? "bg-[#0b0e14] text-white font-semibold shadow-xs"
                        : "text-[#71717a] hover:text-[#0b0e14] hover:bg-black/5"
                    )}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
              <div className="hidden lg:flex items-center gap-2 shrink-0">
              <Link
                href="/host/sanctuaries/new"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border shadow-2xs",
                  pathname === "/host/sanctuaries/new"
                    ? "bg-[#0b0e14] text-white border-[#0b0e14]"
                    : "bg-white/80 hover:bg-white text-zinc-900 border-black/10"
                )}
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                <span>New Sanctuary</span>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {isAdminSection && (
        <div className="w-full bg-canvas-outer/95 backdrop-blur-md border-t border-hairline-on-light/60 transition-all shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 min-h-[46px] py-1.5">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-900/10 text-amber-900 border border-amber-900/15 text-[10.5px] font-semibold tracking-widest uppercase shrink-0 select-none">
                <Shield className="w-3 h-3 text-amber-700" />
                <span>Admin Console</span>
              </div>
              <div className="h-4 w-px bg-hairline-on-light shrink-0 hidden sm:block" />
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
                {adminNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 shrink-0",
                      link.active
                        ? "bg-[#0b0e14] text-white font-semibold shadow-xs"
                        : "text-[#71717a] hover:text-[#0b0e14] hover:bg-black/5"
                    )}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/70 border border-hairline-on-light text-[11px] font-mono uppercase tracking-wider text-[#71717a] shrink-0 select-none shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Mesh: Active</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
export const Header = LonaHeader;
