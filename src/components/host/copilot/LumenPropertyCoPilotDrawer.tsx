"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Eye,
  CheckCircle2,
  Send,
  Loader2,
  Lock,
  Compass,
  Zap,
  Camera,
  Play,
  PauseCircle,
} from "lucide-react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { useChatContext } from "@/context/ChatContext";
import {
  togglePropertyCoPilot,
  setPropertyCoPilotOpen,
  setAutonomousMode,
  setIsAgentPaused,
} from "@/store/slices/uiSlice";
import { BrowserAgentRuntime } from "@/lib/lumen/BrowserAgentRuntime";
import { PageScreenshotCapture } from "@/lib/lumen/observation/PageScreenshotCapture";
import { useUiCommandsExecutor } from "@/hooks/useUiCommandsExecutor";
import { LumenBlockRenderer } from "@/components/chat/LumenBlockRenderer";
import { FastVisionAnalysisResult } from "@/lib/propertyConversationClient";
import { ChatMessage } from "@/lib/types";
import { addMessage } from "@/store/slices/chatSlice";

export interface LumenPropertyCoPilotDrawerProps {
  propertyId?: string;
  draftId?: string;
  propertyTitle?: string;
  wizardStep?: number;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  analysisResults?: FastVisionAnalysisResult[];
  isAnalyzing?: boolean;
  currentAnalyzingName?: string;
  autonomousMode?: boolean;
  onToggleAutonomousMode?: (val: boolean) => void;
  onUploadPhotos?: (files: FileList | null) => void;
}

export const LumenPropertyCoPilotDrawer: React.FC<LumenPropertyCoPilotDrawerProps> = ({
  propertyId,
  draftId,
  propertyTitle,
  wizardStep,
  isOpen: propIsOpen,
  onToggleOpen: propOnToggleOpen,
  analysisResults = [],
  isAnalyzing = false,
  currentAnalyzingName,
  autonomousMode: propAutonomousMode,
  onToggleAutonomousMode: propOnToggleAutonomousMode,
  onUploadPhotos,
}) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const {
    propertyConvId,
    initPropertyConversation,
    sendPropertyMessage,
    handleConfirmCardAction,
  } = useChatContext();

  // Derive effective property ID (from prop, URL pathname, or localStorage)
  const effectivePropertyId =
    propertyId ||
    (typeof window !== "undefined"
      ? window.location.pathname.match(/\/host\/manage\/([a-zA-Z0-9-]+)/)?.[1] ||
        localStorage.getItem("lumen_last_property_id") ||
        undefined
      : undefined);

  // Redux state
  const reduxIsOpen = useAppSelector((state) => state.ui.isPropertyCoPilotOpen);
  const reduxAutonomous = useAppSelector((state) => state.ui.isAutonomousMode);
  const isAgentPaused = useAppSelector((state) => state.ui.isAgentPaused);
  const allMessages = useAppSelector((state) => state.chat.messages);
  const thinkingByConv = useAppSelector((state) => state.chat.thinkingByConv);

  // Derive active drawer flags
  const isOpen = propIsOpen ?? reduxIsOpen;
  const autonomousMode = propAutonomousMode ?? reduxAutonomous;
  const activeConvId = propertyConvId || (effectivePropertyId ? (typeof window !== "undefined" ? localStorage.getItem(`lumen_prop_conv_${effectivePropertyId}`) : null) : null);
  const isThinking = activeConvId ? !!thinkingByConv[activeConvId]?.isThinking : false;
  const thinkingCaption = activeConvId
    ? thinkingByConv[activeConvId]?.caption || "Lumen is inspecting property context..."
    : "Lumen is inspecting property context...";

  // Filter messages strictly for this property conversation
  const messages: ChatMessage[] = React.useMemo(() => {
    if (!activeConvId) return [];
    return allMessages.filter((m) => m.conversationId === activeConvId);
  }, [allMessages, activeConvId]);

  const lastUserPromptRef = useRef<string>("");
  const initialStepBeforeActionRef = useRef<number>(wizardStep ?? 1);
  const continuationCycleRef = useRef<number>(0);

  // Check if the latest Lumen message requested autonomous multi-step continuation
  const lastMessage = messages[messages.length - 1];
  const requiresContinuation = React.useMemo(() => {
    if (!lastMessage || lastMessage.senderType !== "LUMEN" || !lastMessage.blocks) return false;
    return lastMessage.blocks.some((b) => {
      if (b.type === "ui_command" && b.data) {
        return b.data.done === false || b.data.status === "IN_PROGRESS" || b.data.continueAutonomous === true;
      }
      return false;
    });
  }, [lastMessage]);

  // Install the UI Commands Executor hook
  useUiCommandsExecutor({
    onExecutionFinished: async (summary) => {
      const convId = activeConvId || "property-copilot";

      // 1. Capture real live screenshot of the application page and upload to MinIO
      const captureResult = await PageScreenshotCapture.captureAndUpload();
      const screenshotUrl = captureResult.minioUrl || captureResult.dataUrl;

      // 2. Post visible step progress update with screenshot into the conversation
      if (summary.totalExecuted > 0) {
        const stepMessage: ChatMessage = {
          id: `msg-step-${Date.now()}`,
          conversationId: convId,
          senderType: "LUMEN",
          senderName: "Lumen Browser Agent",
          content: `⚡ **Action Executed**: Completed ${summary.totalExecuted} browser action(s).\n📸 **Live Screen State** captured below:`,
          imageAttachmentUrl: screenshotUrl || undefined,
          imageAttachmentName: `Live Screen Snapshot`,
          type: screenshotUrl ? "IMAGE" : "TEXT",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        dispatch(addMessage(stepMessage));
      }

      // 3. Inspect latest messages in Redux to determine original goal and LLM completion status
      const currentMessages = store.getState().chat.messages.filter((m) => m.conversationId === convId);
      const lastUserMsg = [...currentMessages].reverse().find(
        (m) => m.senderType === "USER" && !m.content.startsWith("[EXECUTION_FEEDBACK]")
      );
      const effectiveUserPrompt = lastUserPromptRef.current || lastUserMsg?.content || "";

      const lastAiCommandMsg = [...currentMessages].reverse().find(
        (m) => m.senderType === "LUMEN" && m.blocks?.some((b) => b.type === "ui_command")
      );
      const lastUiBlock = lastAiCommandMsg?.blocks?.find((b) => b.type === "ui_command");
      const isLlmExplicitlyDone = lastUiBlock?.data?.done === true;

      // The LLM agent itself inspects the new screen state to determine if its goal is achieved
      const shouldAskLlmIfGoalAchieved =
        Boolean(effectiveUserPrompt) &&
        !isAgentPaused &&
        continuationCycleRef.current < 10 &&
        (!isLlmExplicitlyDone || summary.totalExecuted > 0);

      if (shouldAskLlmIfGoalAchieved) {
        continuationCycleRef.current += 1;

        console.log(
          `[Lumen Co-Pilot] Autonomous cycle #${continuationCycleRef.current}. Sending updated observation to LLM agent to evaluate goal: "${effectiveUserPrompt}"...`
        );

        const freshObs = BrowserAgentRuntime.getInstance().observe();
        const screenshotLine = screenshotUrl ? `SCREENSHOT_URL: ${screenshotUrl}\n` : "";

        const feedback = `[EXECUTION_FEEDBACK]
Executed ${summary.totalExecuted} action(s). Status: ${summary.success ? "SUCCESS" : "PARTIAL_SUCCESS"}.
Current Page: ${typeof window !== "undefined" ? window.location.pathname : ""}.
Target Property ID: ${effectivePropertyId || "N/A"}.
Original User Request: "${effectiveUserPrompt}"

[PAGE_CONTEXT]
${screenshotLine}${freshObs.promptContext}
[/PAGE_CONTEXT]

EVALUATE AND ACT:
Look at the live [PAGE_CONTEXT] above:
- Did the executed actions completely satisfy the user's overall request ("${effectiveUserPrompt}")?
- If YES: State that the task is finished in your text block, and set "done": true in your ui_command block (commands can be empty []).
- If NO: Explain what remains to be done, output the next command(s) in "commands", and set "done": false so the browser can execute them and feed you the resulting page.
[/EXECUTION_FEEDBACK]`;

        await sendPropertyMessage(feedback, undefined, {
          isFeedback: true,
          caption: `Lumen inspecting page state to verify goal: "${effectiveUserPrompt.slice(0, 35)}..."`,
          screenshotUrl,
        });
      } else {
        // LLM has confirmed completion or cycle limit reached
        continuationCycleRef.current = 0;
        if (effectiveUserPrompt && isLlmExplicitlyDone) {
          const doneMessage: ChatMessage = {
            id: `msg-done-${Date.now()}`,
            conversationId: convId,
            senderType: "LUMEN",
            senderName: "Lumen Browser Agent",
            content: `✅ **Goal Completed**: Task finished.\n📸 **Final page state** captured below:`,
            imageAttachmentUrl: screenshotUrl || undefined,
            imageAttachmentName: `Final Page View`,
            type: screenshotUrl ? "IMAGE" : "TEXT",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          dispatch(addMessage(doneMessage));
        }
        lastUserPromptRef.current = "";
      }
    },
  });

  const [inputText, setInputText] = useState<string>("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or fetch the dedicated Property Conversation in Redux
  useEffect(() => {
    if (effectivePropertyId || draftId) {
      initPropertyConversation({
        propertyId: effectivePropertyId,
        draftId,
        title: propertyTitle,
      });
    }
  }, [effectivePropertyId, draftId, propertyTitle, initPropertyConversation]);

  // Auto scroll chat to bottom when new messages arrive or analysis changes
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages.length, isAnalyzing, isThinking]);

  const handleToggleOpen = () => {
    if (propOnToggleOpen) {
      propOnToggleOpen();
    } else {
      dispatch(togglePropertyCoPilot());
    }
  };

  const handleToggleAutonomous = (val: boolean) => {
    BrowserAgentRuntime.getInstance().setExecutionMode(val ? "AUTONOMOUS" : "SUGGEST");
    if (propOnToggleAutonomousMode) {
      propOnToggleAutonomousMode(val);
    } else {
      dispatch(setAutonomousMode(val));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUploadPhotos) {
      onUploadPhotos(e.target.files);
      e.target.value = "";
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isThinking) return;

    lastUserPromptRef.current = text.trim();
    initialStepBeforeActionRef.current = wizardStep ?? 1;
    continuationCycleRef.current = 0;
    if (!textToSend) setInputText("");
    await sendPropertyMessage(text);
  };

  // Aggregated amenities and styles from all analyzed photos
  const allDiscoveredAmenities = Array.from(
    new Set(analysisResults.flatMap((r) => r.detectedAmenities || []))
  );
  const allDiscoveredStyles = Array.from(
    new Set(analysisResults.flatMap((r) => r.styleTags || []))
  );

  return (
    <>
      {/* Floating Trigger Tab on Right Edge (when drawer is closed) */}
      {!isOpen && (
        <button
          onClick={handleToggleOpen}
          className="fixed right-0 top-1/3 z-50 flex items-center gap-2.5 px-3.5 py-3 rounded-l-2xl bg-stone-900/95 border-y border-l border-amber-500/40 text-amber-200 shadow-[0_4px_25px_rgba(0,0,0,0.6)] backdrop-blur-md hover:bg-stone-800 hover:border-amber-400 transition-all duration-300 group cursor-pointer"
          title="Open Lumen Property Co-pilot"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
            {(isAnalyzing || isThinking) && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-300">
              Lumen Co-pilot
            </span>
            <span className="text-[10px] text-stone-400">
              {isAnalyzing
                ? "Analyzing photo..."
                : isThinking
                ? "Inspecting UI..."
                : `${analysisResults.length} photo${analysisResults.length === 1 ? "" : "s"} parsed`}
            </span>
          </div>
          <ChevronLeft className="w-4 h-4 text-amber-400/80 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Slide-out Drawer Panel */}
      <aside
        data-copilot-drawer="true"
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] z-[9990] bg-[#0c0d0e]/95 backdrop-blur-xl border-l border-stone-800/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-stone-800/80 bg-stone-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-950/40 border border-amber-400/30 flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-stone-100">
                  Lumen Co-pilot
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <Lock className="w-2.5 h-2.5" /> Host Private
                </span>
                {effectivePropertyId && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono"
                    title={`Connected to Sanctuary #${effectivePropertyId}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Prop #{effectivePropertyId.slice(0, 8)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 truncate max-w-[200px]">
                {propertyTitle || "Sanctuary Vision Perception"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onUploadPhotos && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-medium text-amber-300 transition-colors cursor-pointer shadow-sm"
                title="Upload photos for Fast Vision Analysis"
              >
                <Camera className="w-3 h-3" />
                <span className="hidden sm:inline">Add Photos</span>
              </button>
            )}
            <button
              onClick={handleToggleOpen}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/60 transition-colors cursor-pointer"
              title="Collapse Co-pilot"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Autonomous Mode Toggle Bar */}
        <div className="px-4 py-2.5 bg-stone-900/50 border-b border-stone-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={`w-3.5 h-3.5 ${autonomousMode ? "text-amber-400" : "text-stone-500"}`} />
            <span className="text-xs text-stone-300 font-medium">Autonomous UI Control</span>
          </div>
          <button
            type="button"
            onClick={() => handleToggleAutonomous(!autonomousMode)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autonomousMode ? "bg-amber-500" : "bg-stone-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                autonomousMode ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* User Manual Interaction Pause / Resume Banner */}
        {isAgentPaused && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <PauseCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs text-amber-200">
                <span className="font-semibold">Paused:</span> Manual interaction detected.
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  BrowserAgentRuntime.getInstance().resume();
                  dispatch(setIsAgentPaused(false));
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow"
              >
                <Play className="w-3 h-3 fill-current" />
                Resume
              </button>
              <button
                type="button"
                onClick={() => {
                  BrowserAgentRuntime.getInstance().cancel();
                  dispatch(setIsAgentPaused(false));
                }}
                className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Live Analysis / Thinking Progress Banner */}
        {(isAnalyzing || isThinking) && (
          <div className="p-3 bg-gradient-to-r from-amber-950/40 via-stone-900/60 to-transparent border-b border-amber-500/30 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            <div className="text-xs text-amber-200">
              <span className="font-semibold">
                {isAnalyzing ? "Perceiving photo:" : "Lumen AI:"}
              </span>{" "}
              {currentAnalyzingName || (isThinking ? thinkingCaption : "Analyzing architectural elements...")}
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Visual Intelligence Summary Card */}
          {analysisResults.length > 0 && (
            <div className="p-3.5 rounded-xl bg-stone-900/70 border border-stone-800/80 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800/60 pb-2">
                <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" /> Visual Context Acquired
                </span>
                <span className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {analysisResults.length} photo{analysisResults.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Amenities pill cloud */}
              {allDiscoveredAmenities.length > 0 && (
                <div>
                  <span className="text-[11px] text-stone-400 font-medium block mb-1.5">
                    Verified Amenities ({allDiscoveredAmenities.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {allDiscoveredAmenities.map((amenity, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-800/90 border border-amber-500/30 text-[11px] text-amber-200/90"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Architectural style cues */}
              {allDiscoveredStyles.length > 0 && (
                <div>
                  <span className="text-[11px] text-stone-400 font-medium block mb-1.5">
                    Architectural Elements
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {allDiscoveredStyles.map((style, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-stone-950/80 border border-stone-800 text-[10px] text-stone-300 font-mono"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat Messages */}
          {messages.length === 0 ? (
            <div className="py-8 text-center text-stone-500 space-y-3">
              <Compass className="w-8 h-8 text-stone-600 mx-auto animate-pulse" />
              <p className="font-medium text-stone-300">Ready for Live Co-Pilot Actions</p>
              <p className="text-[11px] text-stone-400 max-w-[280px] mx-auto leading-relaxed">
                Upload your sanctuary photos or ask Lumen to fill forms, verify amenities, or adjust your sanctuary listing.
              </p>
              {onUploadPhotos && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-colors cursor-pointer shadow-md mx-auto"
                >
                  <Camera className="w-4 h-4" /> Upload Photos for Fast Analysis
                </button>
              )}

              {effectivePropertyId && (
                <div className="pt-2 flex flex-col gap-1.5 text-left max-w-[320px] mx-auto">
                  <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider text-center block mb-1">
                    Suggested Co-pilot Actions
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("Block calendar for maintenance next week")}
                    className="p-2 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-amber-200 text-[11px] transition-colors text-left flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Block calendar for maintenance next week</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("Review and audit active pricing rules & seasonal rates")}
                    className="p-2 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-amber-200 text-[11px] transition-colors text-left flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Review pricing rules & seasonal rates</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("Inspect sanctuary description and suggest enhancements")}
                    className="p-2 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-amber-200 text-[11px] transition-colors text-left flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Inspect description & suggest enhancements</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.senderType === "USER";
              let metadataObj: any = undefined;
              if (msg.metadata) {
                try {
                  metadataObj = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
                } catch (e) {}
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl p-3.5 space-y-2 leading-relaxed ${
                      isUser
                        ? "bg-amber-500/20 border border-amber-500/30 text-amber-100 rounded-tr-none"
                        : "bg-stone-900/90 border border-stone-800 text-stone-200 rounded-tl-none shadow-md"
                    }`}
                  >
                    {/* Render rich blocks if present */}
                    {msg.blocks && msg.blocks.length > 0 ? (
                      <LumenBlockRenderer
                        blocks={msg.blocks}
                        onQuickPrompt={(prompt) => handleSendMessage(prompt)}
                        onConfirmAction={handleConfirmCardAction}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}

                    {/* Render live page state screenshot or image attachment */}
                    {msg.imageAttachmentUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-stone-800 bg-stone-950/90 shadow-inner">
                        <div className="flex items-center justify-between px-2.5 py-1 bg-stone-900/90 border-b border-stone-800/80 text-[10px] text-stone-400">
                          <span className="flex items-center gap-1.5 font-mono text-amber-300/90">
                            <Camera className="w-3 h-3 text-amber-400" />
                            {msg.imageAttachmentName || "Screen Snapshot"}
                          </span>
                          <span className="text-[9px] text-stone-500">Live Snapshot</span>
                        </div>
                        <img
                          src={msg.imageAttachmentUrl}
                          alt={msg.imageAttachmentName || "Screen Snapshot"}
                          className="w-full max-h-56 object-cover object-top hover:opacity-95 transition-opacity cursor-pointer"
                          onClick={() => window.open(msg.imageAttachmentUrl, "_blank")}
                        />
                      </div>
                    )}

                    {/* If metadata has caption suggestion */}
                    {metadataObj?.aiCaption && (
                      <button
                        type="button"
                        onClick={() => {
                          BrowserAgentRuntime.getInstance().executeActions([
                            {
                              type: "TYPE",
                              target: {
                                lumenField: "description",
                                selector: 'textarea[name="description"], textarea[field="description"], #description',
                              },
                              value: metadataObj.aiCaption,
                            },
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] border border-amber-500/30 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Apply as Curatorial Description
                      </button>
                    )}

                    {/* If metadata has suggested title */}
                    {metadataObj?.suggestedTitle && (
                      <button
                        type="button"
                        onClick={() => {
                          BrowserAgentRuntime.getInstance().executeActions([
                            {
                              type: "TYPE",
                              target: {
                                lumenField: "title",
                                selector: 'input[name="title"], input[field="title"], #title',
                              },
                              value: metadataObj.suggestedTitle,
                            },
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] border border-amber-500/30 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Apply as Sanctuary Title
                      </button>
                    )}

                    {/* If metadata has detected amenities badges */}
                    {metadataObj?.detectedAmenities && metadataObj.detectedAmenities.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1">
                        {metadataObj.detectedAmenities.map((amenityName: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            {amenityName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-stone-500 mt-1 px-1">
                    {msg.timestamp || "Just now"}
                  </span>
                </div>
              );
            })
          )}

          {isThinking && (
            <div className="flex items-center gap-2 text-stone-400 italic">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>{thinkingCaption}</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-stone-800/80 bg-stone-950/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleSendMessage("Suggest an architectural title for this listing")}
            className="shrink-0 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-[11px] text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
          >
            ✦ Suggest Title
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Draft a curatorial description based on the photos")}
            className="shrink-0 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-[11px] text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
          >
            ✦ Draft Description
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("Inspect the page and verify amenities checkboxes")}
            className="shrink-0 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-[11px] text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
          >
            ✦ Verify Amenities
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage("What key photos am I still missing?")}
            className="shrink-0 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-[11px] text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
          >
            ✦ Missing Angles?
          </button>
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 border-t border-stone-800 bg-stone-950 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Instruct Lumen to control UI or advise..."
            className="flex-1 bg-stone-900/90 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Hidden File Input for Direct Drawer Photo Upload */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </aside>
    </>
  );
};
