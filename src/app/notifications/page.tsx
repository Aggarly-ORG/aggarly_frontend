"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { LonaHeader } from "@/components/common/LonaHeader";
import { LonaFooter } from "@/components/common/LonaFooter";
import { NotificationClient, NotificationItem } from "@/lib/notificationClient";




export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | "bookings" | "messages" | "price-alerts" | "system">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [prefEmail, setPrefEmail] = useState(true);
  const [prefSms, setPrefSms] = useState(true);
  const [prefCelestial, setPrefCelestial] = useState(true);

  useEffect(() => {
    setLoading(true);
    NotificationClient.getNotifications(activeFilter)
      .then((items) => {
        if (items) setNotifications(items);
      })
      .finally(() => setLoading(false));
  }, [activeFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleMarkAllAsRead = async () => {
    startTransition(async () => {
      await NotificationClient.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      showToast("All dispatches marked as read.");
    });
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await NotificationClient.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    showToast("Dispatch marked as read.");
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await NotificationClient.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    showToast("Dispatch dismissed.");
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    return n.category === activeFilter;
  });

  const getCategoryCount = (cat: string) => {
    if (cat === "all") return notifications.length;
    return notifications.filter((n) => n.category === cat).length;
  };

  return (
    <div className="bg-[#EFEEEC] min-h-screen text-[#151415] selection:bg-[#1f1f22] selection:text-[#F5F4F1] flex flex-col justify-between">
      <LonaHeader />

      <main className="w-full pt-20 pb-16 flex flex-col justify-center">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-14 py-8 md:py-12">
          {/* Central Monolithic Obsidian Shell */}
          <div className="relative w-full rounded-[28px] bg-gradient-to-b from-[#0A0A0C] to-[#121215] p-6 sm:p-10 lg:p-12 shadow-[0_24px_48px_-12px_rgba(10,10,12,0.22),0_4px_16px_rgba(10,10,12,0.06)] overflow-hidden text-[#F5F4F1] border border-[#2A2A2E]/50">
            {/* Directional Lunar Ambient Blooms */}
            <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-[#DCE6EF]/[0.035] blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-[#AEC5DC]/[0.025] blur-[100px] pointer-events-none" />

            {/* Header Block: Photoreal Moon & Seraphic Title */}
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#2A2A2E]/50">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                  <div className="absolute inset-0 rounded-full bg-[#DCE6EF]/20 blur-xl" />
                  <div className="relative z-10 w-full h-full rounded-full bg-gradient-to-tr from-[#1E293B] via-[#475569] to-[#F1F5F9] shadow-2xl flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-3xl sm:text-4xl text-white">
                      notifications_active
                    </span>
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97] animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8E9199]">
                      REALTIME TELEMETRY FEED
                    </span>
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl text-[#F5F4F1] tracking-widest uppercase mt-0.5">
                    Notification Center &amp; Dispatches
                  </h1>
                  <p className="font-serif italic text-xs sm:text-sm text-[#9A9A9F] mt-0.5">
                    Aggarly by Lona • Celestial Alerts, Host Transmissions &amp; System Signals
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 self-stretch md:self-auto justify-end">
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isPending}
                  className="h-[42px] px-5 rounded-full bg-[#1b1b1e] hover:bg-[#2a2a2d] transition-colors text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest flex items-center gap-2 border border-[#2A2A2E]"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#A6ADB8]">done_all</span>
                  <span>Mark All as Read</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferencesModal(true)}
                  className="h-[42px] w-[42px] rounded-full bg-[#1b1b1e] hover:bg-[#2a2a2d] transition-colors text-[#9A9A9F] hover:text-[#F5F4F1] flex items-center justify-center border border-[#2A2A2E]"
                  title="Notification Preferences"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs Track */}
            <div className="relative z-10 my-6 flex items-center justify-between gap-4 overflow-x-auto pb-2">
              <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#161619] border border-[#2A2A2E]/50">
                {(["all", "bookings", "messages", "price-alerts", "system"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFilter(tab)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeFilter === tab
                        ? "bg-[#F7F6F4] text-[#0A0A0C] shadow-sm"
                        : "text-[#9A9A9F] hover:text-[#F5F4F1]"
                    }`}
                  >
                    {tab === "all"
                      ? "All"
                      : tab === "bookings"
                      ? "Bookings"
                      : tab === "messages"
                      ? "Messages"
                      : tab === "price-alerts"
                      ? "Price Alerts"
                      : "System"}{" "}
                    <span className="ml-1 opacity-70">({getCategoryCount(tab)})</span>
                  </button>
                ))}
              </div>

              <div className="hidden lg:flex items-center gap-2 text-[#9A9A9F]">
                <span className="material-symbols-outlined text-[15px] text-[#8FAE97]">lock</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#8FAE97]">
                  STATION SYNC: ACTIVE
                </span>
              </div>
            </div>

            {/* Notification Items Feed */}
            <div className="relative z-10 flex flex-col gap-3.5 my-4">
              {filteredNotifications.length === 0 ? (
                <div className="py-16 text-center text-[#9A9A9F] text-sm">
                  No notifications recorded in this channel.
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <article
                    key={n.id}
                    className={`group relative rounded-2xl p-5 sm:p-6 transition-all duration-300 border ${
                      n.unread
                        ? "bg-[#1b1b1e] border-[#353438] shadow-lg"
                        : "bg-[#161619]/70 border-[#2A2A2E]/40 hover:bg-[#1b1b1e]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18181B] text-[#DCE6EF] text-[10px] font-semibold uppercase tracking-wider border border-[#2A2A2E]">
                          <span className="material-symbols-outlined text-[13px] text-[#8FAE97]">
                            {n.badgeIcon}
                          </span>
                          <span>{n.badgeText}</span>
                        </span>
                        {n.metaInfo && (
                          <span className="text-[10px] font-mono text-[#9A9A9F]">{n.metaInfo}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-[#9A9A9F]">{n.timeAgo}</span>
                        {n.unread && (
                          <span className="w-2 h-2 rounded-full bg-[#8FAE97] animate-pulse" />
                        )}
                      </div>
                    </div>

                    <h2 className="font-serif text-base sm:text-lg text-[#F5F4F1] font-medium tracking-wide">
                      {n.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#9A9A9F] mt-1 leading-relaxed font-light">
                      {n.body}
                    </p>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#2A2A2E]/40">
                      {n.actionUrl ? (
                        <Link
                          href={n.actionUrl}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5F4F1] hover:text-white group/link"
                        >
                          <span>{n.actionLabel || "View Details"}</span>
                          <span className="material-symbols-outlined text-[14px] transition-transform group-hover/link:translate-x-1">
                            arrow_forward
                          </span>
                        </Link>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-3">
                        {n.unread && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            className="text-[11px] text-[#9A9A9F] hover:text-[#F5F4F1] uppercase tracking-wider"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(n.id, e)}
                          className="text-[11px] text-[#9A9A9F] hover:text-[#ffb4ab] uppercase tracking-wider"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: NOTIFICATION PREFERENCES */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0C]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0e0e11] border border-[#2A2A2E] rounded-2xl p-6 sm:p-8 text-[#F5F4F1] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2E]">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A9A9F]">
                  TELEMETRY DISPATCHES
                </span>
                <h3 className="font-serif text-xl tracking-wide uppercase mt-0.5">Preferences</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="text-[#9A9A9F] hover:text-[#F5F4F1]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="py-6 space-y-4 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181B] border border-[#2A2A2E] cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium text-[#F5F4F1]">Email Stay Dossiers</span>
                  <span className="text-[#9A9A9F] text-[11px]">Vault codes, directions, invoices</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefEmail}
                  onChange={(e) => setPrefEmail(e.target.checked)}
                  className="rounded bg-[#2a2a2d] border-[#353438] text-white focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181B] border border-[#2A2A2E] cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium text-[#F5F4F1]">SMS Critical Signals</span>
                  <span className="text-[#9A9A9F] text-[11px]">Immediate door unseal alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefSms}
                  onChange={(e) => setPrefSms(e.target.checked)}
                  className="rounded bg-[#2a2a2d] border-[#353438] text-white focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181B] border border-[#2A2A2E] cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium text-[#F5F4F1]">Watchdog Celestial Alerts</span>
                  <span className="text-[#9A9A9F] text-[11px]">Price drops &amp; astronomical dark sky windows</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefCelestial}
                  onChange={(e) => setPrefCelestial(e.target.checked)}
                  className="rounded bg-[#2a2a2d] border-[#353438] text-white focus:ring-0"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="px-5 py-2 rounded-full bg-[#2a2a2d] text-[#F5F4F1] text-xs font-semibold uppercase tracking-widest"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreferencesModal(false);
                  showToast("Notification telemetry preferences saved.");
                }}
                className="px-5 py-2 rounded-full bg-[#F7F6F4] text-[#0A0A0C] text-xs font-semibold uppercase tracking-widest"
              >
                Save Channels
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-[#18181B] border border-[#2A2A2E] text-white shadow-2xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8FAE97]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <LonaFooter />
    </div>
  );
}
