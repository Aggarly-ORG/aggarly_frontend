"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Conversation, UserMemoryItem } from "../../lib/types";
import { AggarlyChatBridgeClient } from "../../lib/chatBridgeClient";
import { ProfileClient, ProfileBooking } from "../../lib/profileClient";
import { PropertyClient } from "../../lib/propertyClient";
import { PropertyDetail } from "../../lib/propertyTypes";
import { LonaHeader } from "../common/LonaHeader";
import { LumenInquiriesSidebar } from "./LumenInquiriesSidebar";
import { LumenChatSlice, ContextPreviewData } from "./LumenChatSlice";
import { LumenContextPanel } from "./LumenContextPanel";
import { LumenMemoryDrawer } from "./LumenMemoryDrawer";
import { ResizeHandle } from "./ResizeHandle";
import { cn } from "@/lib/utils";

const LAYOUT_STORAGE_KEY = "aggarly_lumen_layout_v1";

interface SliceItem {
  id: string;
  conversationId: string;
  title: string;
  subtitle?: string;
}

interface LumenChatWorkspaceProps {
  initialConversationId?: string;
  singleChatMode?: boolean;
}

export const LumenChatWorkspace: React.FC<LumenChatWorkspaceProps> = ({
  initialConversationId,
  singleChatMode = false,
}) => {
  // 1. Conversations List
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>(
    initialConversationId || ""
  );

  // 2. Multi-Slice Vertical Split Editor State
  const [activeSlices, setActiveSlices] = useState<SliceItem[]>([
    {
      id: "slice-main",
      conversationId: initialConversationId || "",
      title: "Sanctuary Consultation",
      subtitle: "Lumen Autonomous Sanctuary Intelligence",
    },
  ]);

  // 3. Real Reservation & Property Context State
  const [activeBooking, setActiveBooking] = useState<ProfileBooking | null>(null);
  const [activeProperty, setActiveProperty] = useState<PropertyDetail | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState<boolean>(true);

  // 4. Accordion Collapse States for Left & Right Panels (Default closed per request)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(true);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(true);

  // 5. Dynamic Resizable Panel Sizes (with localStorage persistence)
  const [sidebarWidth, setSidebarWidth] = useState<number>(310);
  const [contextWidth, setContextWidth] = useState<number>(340);
  const [sliceFractions, setSliceFractions] = useState<number[]>([1]);
  const centerStageRef = useRef<HTMLDivElement>(null);

  // Load layout preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sidebarWidth && parsed.sidebarWidth >= 220 && parsed.sidebarWidth <= 480) {
          setSidebarWidth(parsed.sidebarWidth);
        }
        if (parsed.contextWidth && parsed.contextWidth >= 260 && parsed.contextWidth <= 600) {
          setContextWidth(parsed.contextWidth);
        }
      }
    } catch {
      // fallback to defaults
    }
  }, []);

  // Debounced layout persistence to avoid blocking disk I/O during 60/120fps dragging
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSaveLayout = useCallback(
    (newSidebar?: number, newContext?: number, newSlices?: number[]) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        try {
          const current = {
            sidebarWidth: newSidebar ?? sidebarWidth,
            contextWidth: newContext ?? contextWidth,
            sliceFractions: newSlices ?? sliceFractions,
          };
          localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(current));
        } catch {
          // ignore
        }
      }, 300);
    },
    [sidebarWidth, contextWidth, sliceFractions]
  );

  // Resize handlers
  const handleSidebarDrag = useCallback(
    (deltaX: number) => {
      setSidebarWidth((prev) => {
        const next = Math.max(220, Math.min(480, prev + deltaX));
        debouncedSaveLayout(next, undefined, undefined);
        return next;
      });
    },
    [debouncedSaveLayout]
  );

  const handleSidebarReset = useCallback(() => {
    setSidebarWidth(310);
    debouncedSaveLayout(310, undefined, undefined);
  }, [debouncedSaveLayout]);

  const handleContextDrag = useCallback(
    (deltaX: number) => {
      // Dragging left increases context panel width
      setContextWidth((prev) => {
        const next = Math.max(260, Math.min(600, prev - deltaX));
        debouncedSaveLayout(undefined, next, undefined);
        return next;
      });
    },
    [debouncedSaveLayout]
  );

  const handleContextReset = useCallback(() => {
    setContextWidth(340);
    debouncedSaveLayout(undefined, 340, undefined);
  }, [debouncedSaveLayout]);

  // Sync slice distribution whenever total slices changes
  useEffect(() => {
    setSliceFractions((prev) => {
      if (prev.length === activeSlices.length) return prev;
      return activeSlices.map(() => 1 / activeSlices.length);
    });
  }, [activeSlices.length]);

  const handleSliceDrag = useCallback(
    (idx: number, deltaX: number) => {
      const centerWidth = centerStageRef.current?.clientWidth || 800;
      const fractionDelta = deltaX / centerWidth;
      setSliceFractions((prev) => {
        const updated = [...prev];
        if (updated.length <= 1 || idx >= updated.length - 1) return prev;
        const minFraction = 280 / centerWidth;
        const maxA = updated[idx] + updated[idx + 1] - minFraction;
        const newA = Math.max(minFraction, Math.min(maxA, updated[idx] + fractionDelta));
        const deltaActual = newA - updated[idx];
        updated[idx] = newA;
        updated[idx + 1] = Math.max(minFraction, updated[idx + 1] - deltaActual);
        debouncedSaveLayout(undefined, undefined, updated);
        return updated;
      });
    },
    [debouncedSaveLayout]
  );

  const handleSliceReset = useCallback(() => {
    setSliceFractions((prev) => {
      const count = prev.length || 1;
      const equal = Array(count).fill(1 / count);
      debouncedSaveLayout(undefined, undefined, equal);
      return equal;
    });
  }, [debouncedSaveLayout]);

  // 6. Fullscreen Mode State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // 5. In-Context Webpage / Property Viewport Preview State
  const [previewContext, setPreviewContext] = useState<ContextPreviewData | null>(null);

  // 6. Memory Preferences Drawer
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [memories, setMemories] = useState<UserMemoryItem[]>([]);

  // Load memories from backend
  useEffect(() => {
    let isMounted = true;
    AggarlyChatBridgeClient.listMemories().then((items) => {
      if (isMounted && items) setMemories(items);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleForgetMemory = async (key: string) => {
    await AggarlyChatBridgeClient.forgetMemory(key);
    setMemories((prev) => prev.filter((m) => m.key !== key));
  };

  const handleAddMemory = async (item: UserMemoryItem) => {
    await AggarlyChatBridgeClient.saveMemory(item);
    setMemories((prev) => [item, ...prev]);
  };

  // Load real user conversations from backend (Zero Mock Data)
  useEffect(() => {
    let isMounted = true;
    async function loadConversations() {
      try {
        const list = await AggarlyChatBridgeClient.getConversations();
        if (isMounted) {
          if (list && list.length > 0) {
            setConversations(list);
            const targetId = activeConversationId || initialConversationId;
            const found = targetId ? list.find((c) => c.id === targetId) : list[0];
            if (found) {
              setActiveConversationId(found.id);
              setActiveSlices([
                {
                  id: "slice-main",
                  conversationId: found.id,
                  title: found.title,
                  subtitle: found.subtitle,
                },
              ]);
            }
          } else {
            setConversations([]);
          }
        }
      } catch (err) {
        console.warn("[LumenChatWorkspace] Error loading conversations:", err);
      }
    }
    loadConversations();
    return () => {
      isMounted = false;
    };
  }, [activeConversationId, initialConversationId]);

  // Load real reservation & property context from backend
  useEffect(() => {
    let isMounted = true;
    async function loadReservationContext() {
      setIsLoadingContext(true);
      try {
        const bookings = await ProfileClient.getMyBookings();
        if (!isMounted) return;

        if (bookings && bookings.length > 0) {
          const upcoming = bookings.find((b) => b.isUpcoming) || bookings[0];
          setActiveBooking(upcoming);

          try {
            const propDetail = await PropertyClient.getPropertyById(upcoming.propertyId);
            if (isMounted && propDetail?.data) {
              setActiveProperty(propDetail.data);
            }
          } catch {
            // property detail is optional enhancement
          }
        } else {
          // No upcoming bookings — fetch real curated sanctuary property
          try {
            const propList = await PropertyClient.listProperties({ size: 1 });
            if (isMounted && propList.content && propList.content.length > 0) {
              setActiveProperty(propList.content[0]);
            }
          } catch {
            // curated property fallback optional
          }
        }
      } catch (err) {
        console.warn("[LumenChatWorkspace] Error loading reservation context:", err);
      } finally {
        if (isMounted) setIsLoadingContext(false);
      }
    }
    loadReservationContext();
    return () => {
      isMounted = false;
    };
  }, []);

  // Left click on inquiry: Updates primary slice
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    const target = conversations.find((c) => c.id === id);
    if (!target) return;

    setActiveSlices((prev) => {
      const updated = [...prev];
      updated[0] = {
        id: updated[0]?.id || "slice-main",
        conversationId: target.id,
        title: target.title,
        subtitle: target.subtitle,
      };
      return updated;
    });
  };

  // Right click -> "Open to the side (Slice)"
  const handleOpenSlice = (conversation: Conversation) => {
    // If already open in any slice, focus it
    const exists = activeSlices.some((s) => s.conversationId === conversation.id);
    if (exists) return;

    // Max 3 slices
    if (activeSlices.length >= 3) {
      alert("A maximum of 3 vertical chat slices can be opened simultaneously.");
      return;
    }

    setActiveSlices((prev) => [
      ...prev,
      {
        id: `slice-${Date.now()}`,
        conversationId: conversation.id,
        title: conversation.title,
        subtitle: conversation.subtitle,
      },
    ]);
  };

  // Close vertical slice
  const handleCloseSlice = (sliceId: string) => {
    setActiveSlices((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== sliceId);
    });
  };

  // Create new inquiry
  const handleCreateNewInquiry = async () => {
    try {
      const title = `Sanctuary Consultation ${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      const newConv = await AggarlyChatBridgeClient.createNewAiConversation(title);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveSlices([
        {
          id: "slice-main",
          conversationId: newConv.id,
          title: newConv.title,
          subtitle: newConv.subtitle,
        },
      ]);
    } catch (err) {
      console.warn("[LumenChatWorkspace] Error creating new inquiry:", err);
    }
  };

  // Delete inquiry
  const handleDeleteConversation = async (id: string) => {
    await AggarlyChatBridgeClient.clearConversationMessages(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveSlices((prev) => prev.filter((s) => s.conversationId !== id));
    if (activeConversationId === id) {
      const next = conversations.find((c) => c.id !== id);
      if (next) handleSelectConversation(next.id);
    }
  };

  return (
    <div
      className={cn(
        "h-screen w-full max-w-full overflow-hidden bg-[#F6F5F2] text-[#1A1A1A] flex flex-col justify-between selection:bg-[#1A1A1A] selection:text-white transition-all",
        isFullscreen ? "p-0 m-0" : ""
      )}
    >
      {/* Global Brand Header with Lunar Phase Capsule (hidden in fullscreen) */}
      {!isFullscreen && (
        <div className="shrink-0">
          <LonaHeader />
        </div>
      )}

      {/* Main Workspace Frame (Takes 95%-97% of width, maximized height) */}
      <main
        className={cn(
          "flex-1 flex flex-col min-h-0 overflow-hidden transition-all",
          isFullscreen
            ? "fixed inset-0 z-50 w-full h-full m-0 p-0 rounded-none border-0"
            : "w-[96%] max-w-[2200px] mx-auto px-1 sm:px-2 py-1"
        )}
      >
        {/* Master 3-Panel Obsidian Container */}
        <div
          className={cn(
            "flex-1 w-full h-full min-h-0 bg-[#0A0A0C] border border-black/15 shadow-[0_24px_70px_rgba(0,0,0,0.35)] overflow-hidden flex items-stretch relative text-white transition-all",
            isFullscreen
              ? "rounded-none border-0 h-full w-full"
              : "rounded-[24px] md:rounded-[28px]"
          )}
        >
          {/* Left Inquiries Sidebar (Omitted in singleChatMode) */}
          {!singleChatMode && (
            <>
              <LumenInquiriesSidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onOpenSlice={handleOpenSlice}
                onCreateNewInquiry={handleCreateNewInquiry}
                onDeleteConversation={handleDeleteConversation}
                onToggleCollapse={() => setIsLeftCollapsed(!isLeftCollapsed)}
                isCollapsed={isLeftCollapsed}
                onOpenPreferences={() => setIsPreferencesOpen(true)}
                width={sidebarWidth}
              />

              {/* Left Resizer (visible when sidebar is open) */}
              {!isLeftCollapsed && (
                <ResizeHandle
                  onDrag={handleSidebarDrag}
                  onDoubleClick={handleSidebarReset}
                  title="Drag to resize Inquiries sidebar • Double-click to reset (310px)"
                />
              )}
            </>
          )}

          {/* Center Stage: Chat Slice(s) */}
          <div ref={centerStageRef} className="flex-1 flex items-stretch self-stretch h-full min-h-full min-w-0 max-w-full overflow-hidden relative">
            {(singleChatMode ? [activeSlices[0] || { id: "slice-main", conversationId: initialConversationId || "", title: "Sanctuary Consultation", subtitle: "Lumen Autonomous Sanctuary Intelligence" }] : activeSlices).map((slice, idx, arr) => (
              <React.Fragment key={slice.id}>
                <div
                  className="h-full min-h-full self-stretch flex flex-col min-w-0 max-w-full overflow-hidden"
                  style={{
                    flex:
                      arr.length > 1 && sliceFractions[idx]
                        ? `${sliceFractions[idx]} 1 0%`
                        : "1 1 0%",
                    minWidth: arr.length > 1 ? "240px" : "0px",
                  }}
                >
                  <LumenChatSlice
                    conversationId={slice.conversationId}
                    title={slice.title}
                    subtitle={slice.subtitle}
                    sliceIndex={idx}
                    totalSlices={arr.length}
                    singleChatMode={singleChatMode}
                    onCloseSlice={() => handleCloseSlice(slice.id)}
                    onOpenContext={(preview) => {
                      setPreviewContext(preview);
                      if (isRightCollapsed) setIsRightCollapsed(false);
                    }}
                    isLeftCollapsed={isLeftCollapsed}
                    onToggleLeft={() => setIsLeftCollapsed(!isLeftCollapsed)}
                    isRightCollapsed={isRightCollapsed}
                    onToggleRight={() => setIsRightCollapsed(!isRightCollapsed)}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={handleToggleFullscreen}
                  />
                </div>

                {/* Resize handle between vertical slices */}
                {!singleChatMode && arr.length > 1 && idx < arr.length - 1 && (
                  <ResizeHandle
                    onDrag={(dx) => handleSliceDrag(idx, dx)}
                    onDoubleClick={handleSliceReset}
                    title="Drag to adjust slice split • Double-click to balance evenly"
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Right Resizer (visible when context panel is open) */}
          {!isRightCollapsed && (
            <ResizeHandle
              onDrag={handleContextDrag}
              onDoubleClick={handleContextReset}
              title="Drag to resize Context panel • Double-click to reset (340px)"
            />
          )}

          {/* Right Context Panel (Collapsible via Accordion) */}
          <LumenContextPanel
            isCollapsed={isRightCollapsed}
            onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
            previewContext={previewContext}
            onClosePreview={() => setPreviewContext(null)}
            booking={activeBooking}
            property={activeProperty}
            isLoading={isLoadingContext}
            width={contextWidth}
          />
        </div>
      </main>

      {/* Compact Minimized Footer (hidden in fullscreen) */}
      {!isFullscreen && (
        <footer className="w-[96%] max-w-[2200px] mx-auto py-1.5 px-3 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#1A1A1A]/40 shrink-0">
          <div className="flex items-center gap-2">
            <span>© 2026 AGGARLY BY LONA</span>
            <span>•</span>
            <span className="hidden sm:inline">CELESTIAL ARCHITECTURAL SOLITUDE</span>
          </div>
          <div className="flex items-center gap-5 mt-1 sm:mt-0">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-black transition-colors">Support</Link>
          </div>
        </footer>
      )}

      {/* Lumen Memory Calibration Drawer */}
      <LumenMemoryDrawer
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        memories={memories}
        onForgetMemory={handleForgetMemory}
        onAddMemory={handleAddMemory}
      />
    </div>
  );
};
