"use client";

import React, { useState, useEffect, useRef } from "react";
import { Conversation } from "../../lib/types";

import Link from "next/link";
import { PanelLeftClose, Sliders, Plus, SplitSquareVertical, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  conversation: Conversation | null;
}

interface LumenInquiriesSidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onOpenSlice: (conversation: Conversation) => void;
  onCreateNewInquiry: () => void;
  onDeleteConversation: (id: string) => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  onOpenPreferences?: () => void;
  width?: number;
}

export const LumenInquiriesSidebar: React.FC<LumenInquiriesSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenSlice,
  onCreateNewInquiry,
  onDeleteConversation,
  onToggleCollapse,
  isCollapsed,
  onOpenPreferences,
  width,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    conversation: null,
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu({ visible: false, x: 0, y: 0, conversation: null });
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu({ visible: false, x: 0, y: 0, conversation: null });
      }
      // Keyboard shortcut ⌘N / Ctrl+N for new inquiry
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onCreateNewInquiry();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCreateNewInquiry]);

  const handleContextMenu = (e: React.MouseEvent, conv: Conversation) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      conversation: conv,
    });
  };

  return (
    <aside
      style={!isCollapsed && width ? { width: `${width}px` } : undefined}
      className={cn(
        "self-stretch min-h-full h-full bg-[#0E0E10] border-r border-white/10 flex flex-col justify-between select-none shrink-0 relative",
        isCollapsed
          ? "w-0 min-w-0 p-0 opacity-0 overflow-hidden border-r-0 pointer-events-none transition-all duration-300 ease-in-out"
          : "w-80 min-w-[240px] max-w-[480px] p-3.5 sm:p-4 opacity-100 overflow-hidden transition-opacity duration-200"
      )}
    >
      <div className={cn("w-full flex flex-col justify-between h-full min-h-full flex-1 transition-opacity duration-200 overflow-hidden", isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100")}>
        {/* Top Section */}
        <div className="flex flex-col space-y-3 flex-1 min-h-0 overflow-hidden">
          {/* Header with Title, Count, and Transferred Accordion Collapse Button */}
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37] shrink-0" />
              <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-white/80 truncate">
                INQUIRIES
              </span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/[0.06] font-mono text-[9px] text-white/40 tracking-wider shrink-0">
                {conversations.length}
              </span>
            </div>

            {/* Accordion Collapse Trigger directly in header - matches outer header icon button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse inquiries sidebar (Ctrl+B)"
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-sm group shrink-0"
            >
              <PanelLeftClose className="w-4 h-4 text-[#D4AF37] group-hover:scale-105 transition-transform" />
            </button>
          </div>

          {/* + NEW INQUIRY Button */}
          <button
            type="button"
            onClick={onCreateNewInquiry}
            className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-white/[0.07] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.06] border border-white/15 hover:border-[#D4AF37]/50 text-white flex items-center justify-between transition-all group cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(212,175,55,0.15)] shrink-0"
          >
            <div className="flex items-center gap-2.5 font-sans text-xs font-semibold tracking-wider uppercase">
              <span className="w-5 h-5 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center text-sm font-light group-hover:rotate-90 transition-transform duration-300">
                +
              </span>
              <span>NEW INQUIRY</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-white/40 group-hover:text-white/80 transition-colors">
              ⌘N
            </span>
          </button>

          {/* CURRENT & RECENT List */}
          <div className="pt-1 flex flex-col space-y-1 flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-1 mb-1 shrink-0">
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 truncate">
                ARCHIVE
              </span>
              <span className="text-[9px] font-mono text-white/30 truncate shrink-0">
                SPLIT / SLICE
              </span>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 space-y-2 pr-1 custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="p-5 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-xs font-sans text-white/40 block">
                    No active inquiries cataloged.
                  </span>
                  <button
                    type="button"
                    onClick={onCreateNewInquiry}
                    className="text-[11px] font-mono text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    Start a consultation →
                  </button>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      onContextMenu={(e) => handleContextMenu(e, conv)}
                      className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-white/[0.08] to-white/[0.04] border-[#D4AF37]/60 text-white shadow-lg border-l-4 border-l-[#D4AF37]"
                          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15 text-white/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] shrink-0" />
                          )}
                          <span className="text-[13px] font-sans font-medium truncate tracking-tight text-white group-hover:text-white">
                            {conv.title || "Sanctuary Consultation"}
                          </span>
                        </div>

                        {/* Quick inline action buttons on card hover */}
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0 z-10">
                          <Link
                            href={`/chat/conversation/${conv.id}`}
                            onClick={(e) => e.stopPropagation()}
                            title="Open dedicated chat"
                            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSlice(conv);
                            }}
                            title="Open vertical slice to side"
                            className="p-1 rounded-md text-white/50 hover:text-[#D4AF37] hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <SplitSquareVertical className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(conv.id);
                            }}
                            title="Delete inquiry"
                            className="p-1 rounded-md text-white/50 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono text-white/40">
                        <span className="truncate max-w-[130px]">
                          {conv.subtitle?.replace("Always online • ", "") || "Sanctuary"}
                        </span>
                        <span className="shrink-0">
                          {isActive ? "Active" : conv.lastMessageTimestamp || "Recent"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      {/* Bottom Ephemeris Status Capsule */}
      <div className="pt-3 border-t border-white/10 shrink-0">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 text-xs">
              ☾
            </div>
            <div>
              <span className="text-white text-[11px] block font-medium">
                Lumen 3.2 Ephemeris
              </span>
              <span className="text-[10px] text-[#10B981] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#10B981] animate-pulse" />
                <span>Reflecting</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenPreferences}
            title="Lumen Memory & AI Tuning"
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              tune
            </span>
          </button>
        </div>
      </div>

      {/* Right-Click Context Menu (VS Code Split Slicing) */}
      {contextMenu.visible && contextMenu.conversation && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-56 rounded-2xl bg-[#18181B] border border-white/15 p-1.5 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
        >
          {/* Open to the Side (Vertical Slice) */}
          <button
            type="button"
            onClick={() => {
              if (contextMenu.conversation) {
                onOpenSlice(contextMenu.conversation);
              }
              setContextMenu({ visible: false, x: 0, y: 0, conversation: null });
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs font-mono text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#D4AF37]">
              vertical_split
            </span>
            <span>Open to the side (Slice)</span>
          </button>

          {/* Delete Conversation */}
          <button
            type="button"
            onClick={() => {
              if (contextMenu.conversation) {
                onDeleteConversation(contextMenu.conversation.id);
              }
              setContextMenu({ visible: false, x: 0, y: 0, conversation: null });
            }}
            className="w-full px-3 py-2 rounded-xl text-left text-xs font-mono text-red-300 hover:bg-red-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-red-400">
              delete
            </span>
            <span>Delete Inquiry</span>
          </button>
        </div>
      )}
      </div>
    </aside>
  );
};
