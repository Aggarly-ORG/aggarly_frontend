"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AdminNav } from "../../../components/admin/AdminNav";
import { AdminClient, UserProfileSummary } from "../../../lib/adminClient";

export default function AdminUsersPage() {
  // State
  const [users, setUsers] = useState<UserProfileSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "suspended">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "guests" | "hosts" | "admins">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfileSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [userSessions, setUserSessions] = useState<
    Record<string, Array<{ device: string; icon: string; ip: string; id: string }>>
  >({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 300ms search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Global Cmd+K / Ctrl+K shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load users from backend
  const loadUsers = useCallback(async (query: string = "") => {
    try {
      setLoading(true);
      const res = await AdminClient.getUsers(query, 50);
      setUsers(res);
      if (res.length > 0 && !selectedUser) {
        setSelectedUser(res[0]);
      }
    } catch (err) {
      console.error("Failed to fetch users directory:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    loadUsers(debouncedQuery);
  }, [debouncedQuery, loadUsers]);

  // Derive display initials and name
  const getUserDisplayName = (u: UserProfileSummary): string => {
    if (u.displayName) return u.displayName;
    if (u.firstName || u.lastName) return `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return u.username || u.email.split("@")[0];
  };

  const getUserInitials = (u: UserProfileSummary): string => {
    const name = getUserDisplayName(u);
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getUserRoleTag = (u: UserProfileSummary): string => {
    if (u.roles && u.roles.length > 0) {
      if (u.roles.includes("ADMIN") || u.roles.includes("ROLE_ADMIN")) return "ADMIN • LEVEL IX";
      if (u.roles.includes("HOST") || u.roles.includes("ROLE_HOST")) return "HOST & CURATOR";
      return "GUEST • TIER IV";
    }
    return "GUEST • TIER IV";
  };

  const loadSessionsForUser = useCallback(async (userId: string) => {
    if (userSessions[userId]) return;
    try {
      const sessions = await AdminClient.getUserSessions(userId);
      if (sessions) {
        const mapped = sessions.map((s) => ({
          id: s.sessionId,
          device: s.device || "Unknown Device",
          icon: s.device?.toLowerCase().includes("mobile") || s.device?.toLowerCase().includes("iphone") || s.device?.toLowerCase().includes("android") ? "smartphone" : "laptop_mac",
          ip: s.ipAddress || "—",
        }));
        setUserSessions((prev) => ({ ...prev, [userId]: mapped }));
      }
    } catch (err) {
      console.error("Failed to load sessions", err);
    }
  }, [userSessions]);

  const handleTerminateSingleSession = async (userId: string, sessId: string) => {
    await AdminClient.revokeUserSession(userId, sessId);
    setUserSessions((prev) => ({
      ...prev,
      [userId]: (prev[userId] || []).filter((s) => s.id !== sessId),
    }));
    showToast(`Session ${sessId} revoked.`);
  };

  const handleTerminateAllSessions = async (userId: string) => {
    await AdminClient.revokeAllUserSessions(userId);
    setUserSessions((prev) => ({ ...prev, [userId]: [] }));
    showToast(`All sessions for user ${userId} revoked.`);
  };

  const handleForcePasswordReset = async (user: UserProfileSummary) => {
    await AdminClient.forcePasswordReset(user.id);
    showToast(`Password reset email dispatched to ${user.email}`);
  };

  const handleToggleSuspend = async (user: UserProfileSummary) => {
    const isSuspended = user.status === "SUSPENDED" || user.status === "SANCTIONED";
    const nextStatus = isSuspended ? "ACTIVE" : "SUSPENDED";
    await AdminClient.updateUserStatus(user.id, nextStatus);
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: nextStatus } : u));
    showToast(`User ${user.email} ${isSuspended ? "reinstated" : "suspended"}.`);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const isSuspended = u.status === "SUSPENDED" || u.status === "SANCTIONED";

      if (statusFilter === "suspended" && !isSuspended) return false;
      if (statusFilter === "active" && isSuspended) return false;

      const roles = u.roles || [];
      const isHost = roles.includes("HOST") || roles.includes("ROLE_HOST");
      const isAdmin = roles.includes("ADMIN") || roles.includes("ROLE_ADMIN");

      if (roleFilter === "hosts" && !isHost) return false;
      if (roleFilter === "admins" && !isAdmin) return false;
      if (roleFilter === "guests" && (isHost || isAdmin)) return false;

      return true;
    });
  }, [users, statusFilter, roleFilter]);

  const activeSelectedUser = selectedUser || users[0] || null;
  const isSelectedSuspended = activeSelectedUser
    ? activeSelectedUser.status === "SUSPENDED" || activeSelectedUser.status === "SANCTIONED"
    : false;
  const selectedSessions = activeSelectedUser ? (userSessions[activeSelectedUser.id] || []) : [];

  return (
    <div className="flex flex-col w-full space-y-space-md">
      <AdminNav />

      <section className="w-full max-w-7xl mx-auto">
        {/* Main Obsidian Card Wrapper */}
        <div className="relative bg-gradient-to-b from-obsidian-base to-[#121215] rounded-[28px] shadow-2xl p-space-lg lg:p-card-padding-desktop overflow-hidden text-text-on-dark-primary">
          {/* Directional Glow Atmosphere */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#DCE6EF]/5 blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/3 -right-28 w-80 h-80 rounded-full bg-[#DCE6EF]/10 blur-3xl pointer-events-none"></div>

          {/* Header Telemetry Row */}
          <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-space-lg pb-space-xl border-b border-hairline-on-dark">
            <div className="flex items-start gap-space-lg">
              <div className="relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24">
                <div className="absolute inset-0 rounded-full bg-[#DCE6EF]/20 blur-xl"></div>
                <img
                  alt="Lona Celestial Core"
                  className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_24px_rgba(220,230,239,0.35)]"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLVkgk0NIRY4r-mOROPRHFtcpncs7DYnEcjCUWsLCJla7Tdy0O7uuiBjuBXeNDClVUfeP37lP40SozxjY1qOsM9u9HW4C6Dt1KnukhjlkMZfqZrSsK5ncxm6Ba5xB6nyqakQ-oSSIhAKSTKidFzgYscT17OghQVb99F0CeThq1z_1ElhBq6A7tE5VMuplNOj5MbUw9bRiTigbGXoSZjra55Ns9gV6GG4t5eAUrWpTp-0IjrILUefqplAFTOz26DaQrhA"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary tracking-widest uppercase">
                  AGGARLY SECURE AUTH MATRIX
                </span>
                <h1 className="font-headline-lg text-headline-lg uppercase text-text-on-dark-primary tracking-widest mt-1">
                  USER &amp; IDENTITY DIRECTORY
                </h1>
                <p className="font-subline-editorial text-subline-editorial italic text-text-on-dark-secondary mt-0.5">
                  Aggarly by Lona • Global Residence Passports &amp; Moderation
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-space-sm bg-obsidian-elevated px-space-md py-space-sm rounded-full">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-state-success animate-pulse"></span>
                <span className="font-data-tabular text-data-tabular text-text-on-dark-secondary">
                  CORE REST API v1
                </span>
              </div>
              <span className="text-hairline-on-dark font-data-tabular">/</span>
              <span className="font-data-tabular text-data-tabular text-text-on-dark-primary">
                {users.length} LOADED SUBJECTS
              </span>
            </div>
          </header>

          {/* Search & Filter Bar */}
          <section className="space-y-space-md pt-space-md pb-space-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
              {/* Search Input */}
              <div className="lg:col-span-7 relative bg-obsidian-elevated rounded-xl p-space-sm flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-text-on-dark-secondary ml-2">search</span>
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-text-on-dark-primary placeholder:text-text-on-dark-secondary/50 text-body-md font-body-md focus:outline-none"
                  placeholder="Search by legal name, email, identity UID, or username..."
                  type="text"
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 font-data-tabular text-[10px] text-text-on-dark-secondary bg-surface-container px-2 py-0.5 rounded border border-hairline-on-dark uppercase tracking-wider">
                  ⌘K
                </kbd>
                <span className="hidden sm:inline font-data-tabular text-body-sm text-text-on-dark-secondary bg-surface-container px-2 py-0.5 rounded">
                  LIVE
                </span>
              </div>

                {/* Status Scope Filters */}
                <div className="lg:col-span-5 flex items-center justify-between lg:justify-end gap-space-xs">
                  <div className="flex items-center gap-1 bg-obsidian-elevated p-1 rounded-full w-full justify-between sm:w-auto">
                    {(["all", "active", "pending", "suspended"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition-all ${
                          statusFilter === st
                            ? "bg-primary text-obsidian-base font-semibold"
                            : "text-text-on-dark-secondary hover:text-text-on-dark-primary"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Role Scope Filter Pills */}
              <div className="flex flex-wrap items-center gap-space-xs pt-space-xs">
                <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest mr-2">
                  Scope:
                </span>
                {(
                  [
                    { id: "all", label: `All Users (${users.length})` },
                    { id: "guests", label: "Guests" },
                    { id: "hosts", label: "Hosts" },
                    { id: "admins", label: "Admins" },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRoleFilter(r.id)}
                    className={`px-3.5 py-1.5 rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider transition ${
                      roleFilter === r.id
                        ? "bg-primary text-obsidian-base font-semibold shadow-sm"
                        : "bg-obsidian-elevated hover:bg-surface-container text-text-on-dark-secondary hover:text-text-on-dark-primary"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
              {/* Left Column: User Directory List (8 cols) */}
              <div className="xl:col-span-8 flex flex-col gap-space-sm">
                {loading ? (
                  <div className="bg-obsidian-elevated rounded-2xl p-8 text-center text-text-on-dark-secondary">
                    <span className="material-symbols-outlined text-3xl animate-spin mb-2 block">
                      refresh
                    </span>
                    <span>Querying identity records from backend...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="bg-obsidian-elevated rounded-2xl p-8 text-center text-text-on-dark-secondary">
                    <span className="material-symbols-outlined text-3xl mb-2 block opacity-40">
                      person_off
                    </span>
                    <span>No identity records matching the filter criteria.</span>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const displayName = getUserDisplayName(u);
                    const initials = getUserInitials(u);
                    const roleTag = getUserRoleTag(u);
                    const isSuspended = u.status === "SUSPENDED" || u.status === "SANCTIONED";
                    const isSelected = activeSelectedUser?.id === u.id;

                    return (
                      <div
                        key={u.id}
                        className={`rounded-2xl p-space-md transition border ${
                          isSelected
                            ? "bg-surface-container border-primary/40"
                            : "bg-obsidian-elevated hover:bg-surface-container border-transparent"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
                          {/* User Avatar & Info */}
                          <div className="flex items-start gap-space-md">
                            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center font-headline-md text-headline-md text-text-on-dark-primary shrink-0 overflow-hidden">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-space-xs">
                                <h2 className="font-headline-md text-headline-md text-text-on-dark-primary tracking-wide">
                                  {displayName}
                                </h2>
                                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded font-label-caps-sm text-label-caps-sm uppercase tracking-wider">
                                  {roleTag}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded font-data-tabular text-data-tabular ${
                                    isSuspended
                                      ? "bg-state-error/20 text-state-error"
                                      : "bg-state-success/15 text-state-success"
                                  }`}
                                >
                                  {isSuspended ? "SUSPENDED" : "PASSPORT VERIFIED"}
                                </span>
                              </div>

                              <p className="font-body-sm text-body-sm text-text-on-dark-secondary">
                                UID: <span className="font-data-tabular text-text-on-dark-primary">{u.id}</span>
                                {u.email && <> • {u.email}</>}
                              </p>

                              {u.bio && (
                                <p className="font-body-sm text-body-sm text-text-on-dark-secondary/80 italic line-clamp-1">
                                  &ldquo;{u.bio}&rdquo;
                                </p>
                              )}

                              <p className="font-body-sm text-body-sm text-text-on-dark-secondary flex items-center gap-1.5">
                                <span
                                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                                    isSuspended ? "bg-state-error" : "bg-state-success"
                                  }`}
                                ></span>
                                Active Node:{" "}
                                <span className="text-text-on-dark-primary font-data-tabular">
                                  Verified Client
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap md:flex-col items-end gap-space-xs pt-space-xs md:pt-0 shrink-0">
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="w-full md:w-auto px-4 py-2 rounded-full bg-primary text-obsidian-base font-label-caps-sm text-label-caps-sm uppercase tracking-widest hover:bg-canvas-outer transition flex items-center justify-center gap-1 font-semibold"
                            >
                              <span>Inspect Dossier</span>
                              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </button>

                            <div className="flex items-center gap-space-xs">
                              <button
                                onClick={() => handleTerminateAllSessions(u.id)}
                                className="px-3 py-1.5 rounded-full bg-surface-container text-text-on-dark-secondary hover:text-state-error font-label-caps-sm text-label-caps-sm uppercase transition flex items-center gap-1"
                                title="Terminate Sessions"
                              >
                                <span className="material-symbols-outlined text-[14px]">logout</span>
                                <span>End Session</span>
                              </button>

                              <button
                                onClick={() => handleForcePasswordReset(u)}
                                className="px-3 py-1.5 rounded-full bg-surface-container text-text-on-dark-secondary hover:text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase transition"
                                title="Force Password Reset"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Selected Dossier Sidebar (Sticky) (4 cols) */}
              <aside className="xl:col-span-4 bg-obsidian-elevated rounded-2xl p-space-lg sticky top-24 shadow-xl space-y-space-lg">
                {activeSelectedUser ? (
                  <>
                    <div className="flex items-center justify-between pb-space-sm border-b border-hairline-on-dark">
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-widest">
                          Selected Dossier
                        </span>
                        <span className="font-headline-md text-headline-md text-text-on-dark-primary truncate">
                          {getUserDisplayName(activeSelectedUser)}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full font-label-caps-sm text-label-caps-sm uppercase font-semibold shrink-0 ${
                          isSelectedSuspended
                            ? "bg-state-error/20 text-state-error"
                            : "bg-state-success/20 text-state-success"
                        }`}
                      >
                        {isSelectedSuspended ? "Suspended" : "Active Verified"}
                      </span>
                    </div>

                    <div className="space-y-space-md">
                      {/* KYC & Biometric Integrity */}
                      <div>
                        <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider block mb-2">
                          KYC &amp; Biometric Integrity
                        </span>
                        <div className="bg-surface-container-low rounded-xl p-space-sm space-y-2">
                          <div className="flex items-center justify-between text-body-sm font-body-sm">
                            <span className="text-text-on-dark-secondary">Hardware Biometrics</span>
                            <span className="text-state-success font-data-tabular flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                              <span>Bound</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-body-sm font-body-sm">
                            <span className="text-text-on-dark-secondary">Interpol / Sanctions</span>
                            <span className="text-state-success font-data-tabular flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              <span>Cleared</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-body-sm font-body-sm">
                            <span className="text-text-on-dark-secondary">Passport Hash</span>
                            <span className="font-data-tabular text-text-on-dark-primary text-[11px] truncate max-w-[140px]">
                              {activeSelectedUser.id.replace(/-/g, "").slice(0, 16)}...
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Active Device Sessions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider">
                            Active Device Sessions
                          </span>
                          <span className="font-data-tabular text-body-sm text-text-on-dark-secondary">
                            {selectedSessions.length} Concurrent
                          </span>
                        </div>

                        <div className="space-y-2">
                          {selectedSessions.length === 0 ? (
                            <div className="p-space-sm rounded-xl bg-surface-container-low text-text-on-dark-secondary font-body-sm italic">
                              No active sessions registered.
                            </div>
                          ) : (
                            selectedSessions.map((s) => (
                              <div
                                key={s.id}
                                className="bg-surface-container-low p-space-sm rounded-xl flex items-center justify-between"
                              >
                                <div className="space-y-0.5">
                                  <div className="text-body-sm font-body-sm text-text-on-dark-primary flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-text-on-dark-secondary">
                                      {s.icon}
                                    </span>
                                    <span>{s.device}</span>
                                  </div>
                                  <p className="font-data-tabular text-[11px] text-text-on-dark-secondary">
                                    {s.ip}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleTerminateSingleSession(activeSelectedUser.id, s.id)}
                                  className="p-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-text-on-dark-secondary hover:text-state-error transition"
                                  title="Revoke Session"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Administrative Actions */}
                      <div className="space-y-2 pt-space-xs">
                        <span className="font-label-caps-sm text-label-caps-sm text-text-on-dark-secondary uppercase tracking-wider block">
                          Administrative Actions
                        </span>

                        <button
                          onClick={() => handleTerminateAllSessions(activeSelectedUser.id)}
                          className="w-full py-2.5 px-space-md rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider flex items-center justify-center gap-2 transition"
                        >
                          <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                          <span>Terminate All Remote Sessions</span>
                        </button>

                        <button
                          onClick={() => handleForcePasswordReset(activeSelectedUser)}
                          className="w-full py-2.5 px-space-md rounded-full bg-surface-container-high hover:bg-surface-container-highest text-text-on-dark-primary font-label-caps-sm text-label-caps-sm uppercase tracking-wider flex items-center justify-center gap-2 transition"
                        >
                          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                          <span>Force Identity Password Reset</span>
                        </button>

                        <button
                          onClick={() => handleToggleSuspend(activeSelectedUser)}
                          className={`w-full py-2.5 px-space-md rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                            isSelectedSuspended
                              ? "bg-state-success/20 hover:bg-state-success/30 text-state-success"
                              : "bg-error-container/40 hover:bg-error-container text-state-error"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isSelectedSuspended ? "lock_open" : "block"}
                          </span>
                          <span>
                            {isSelectedSuspended
                              ? "Reinstate User Passport"
                              : "Suspend User & Sanction Residence Access"}
                          </span>
                        </button>
                      </div>

                      {/* Audit Telemetry Dispatch */}
                      <div className="bg-surface-container-lowest p-space-sm rounded-xl space-y-1">
                        <span className="font-label-caps-sm text-[10px] text-text-on-dark-secondary uppercase tracking-widest block">
                          Audit Telemetry Dispatch
                        </span>
                        <p className="font-data-tabular text-[11px] text-text-on-dark-secondary">
                          GET <span className="text-text-on-dark-primary">/api/v1/users/{activeSelectedUser.id}</span> [200 OK]
                        </p>
                        <p className="font-data-tabular text-[11px] text-text-on-dark-secondary">
                          PUT <span className="text-text-on-dark-primary">/api/v1/users/{activeSelectedUser.id}/status</span> [READY]
                        </p>
                        <p className="font-data-tabular text-[11px] text-text-on-dark-secondary">
                          DELETE <span className="text-text-on-dark-primary">/api/v1/users/{activeSelectedUser.id}/sessions</span> [READY]
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-text-on-dark-secondary text-sm italic py-8 text-center">
                    Select a subject from the directory to inspect dossier.
                  </div>
                )}
              </aside>
            </div>

            {/* Monolith Footer */}
            <footer className="mt-space-xl pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md text-text-on-dark-secondary font-label-caps-sm text-label-caps-sm uppercase tracking-widest border-t border-hairline-on-dark">
              <span>ENCRYPTED PASSCODE VAULT: SHA-512 HSM</span>
              <div className="flex items-center gap-space-md">
                <button
                  onClick={() => showToast("Exporting audit stream to JSON...")}
                  className="hover:text-text-on-dark-primary cursor-pointer transition uppercase"
                >
                  EXPORT AUDIT STREAM
                </button>
                <span>•</span>
                <button
                  onClick={() => showToast("Downloading identity compliance log...")}
                  className="hover:text-text-on-dark-primary cursor-pointer transition uppercase"
                >
                  IDENTITY COMPLIANCE LOG
                </button>
              </div>
            </footer>
          </div>
        </section>

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-obsidian-base px-space-md py-space-sm rounded-full font-label-caps-sm text-label-caps-sm uppercase tracking-wider shadow-2xl transition-all duration-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
