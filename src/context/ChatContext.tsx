"use client";

import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "../store/hooks";
import {
  setMessages,
  addMessage,
  updateMessage,
  setThinkingForConv,
  clearThinkingForConv,
  addOrUpdateActivity,
  clearActivitiesForConv,
  setIsSubmitting,
  setSelectedConvId,
  setPendingAiConvId,
  setPropertyConvId,
  enqueueUiCommands,
  clearChat,
} from "../store/slices/chatSlice";
import {
  setConversations,
  addConversation,
  updateConversationLastMessage,
  setConversationsLoading,
  setConversationsError,
} from "../store/slices/conversationsSlice";
import {
  toggleFloatingInquiries,
  setFloatingInquiriesOpen,
  toggleMemoryDrawer,
  setMemoryDrawerOpen,
  setNewDirectModalOpen,
  showIncomingNotification,
  dismissNotification,
  togglePropertyCoPilot,
  setPropertyCoPilotOpen,
  toggleAutonomousMode,
  setAutonomousMode,
  ChatNotification,
} from "../store/slices/uiSlice";
import { AggarlyChatBridgeClient } from "../lib/chatBridgeClient";
import { PropertyConversationClient } from "../lib/propertyConversationClient";
import { DomSnapshotAgent } from "../lib/DomSnapshotAgent";
import { PageScreenshotCapture } from "../lib/lumen/observation/PageScreenshotCapture";
import { VisionClient } from "../lib/visionClient";
import { AiComponentParser } from "../lib/parser/aiComponentParser";
import { ChatMessage, Conversation, ActivityStep, UiCommand } from "../lib/types";

interface ChatContextValue {
  // State from Redux
  messages: ChatMessage[];
  isThinking: boolean;
  thinkingCaption: string;
  liveActivities: ActivityStep[];
  isSubmitting: boolean;
  selectedConvId: string;
  conversations: Conversation[];
  isConversationsLoading: boolean;
  currentConv: Conversation;
  isFloatingInquiriesOpen: boolean;
  isMemoryDrawerOpen: boolean;
  isNewDirectModalOpen: boolean;
  incomingNotification: ChatNotification | null;
  propertyConvId: string | null;
  isPropertyCoPilotOpen: boolean;
  isAutonomousMode: boolean;

  // Actions
  sendMessage: (text: string, imageFile?: File, imagePreviewUrl?: string) => Promise<void>;
  selectConversation: (id: string) => void;
  startNewInquiry: () => void;
  loadConversations: () => Promise<void>;
  loadMessagesForConv: (convId: string) => Promise<void>;
  handleConfirmCardAction: (token: string) => Promise<void>;
  setFloatingInquiries: (open: boolean) => void;
  toggleFloatingInquiriesDrawer: () => void;
  setMemoryDrawer: (open: boolean) => void;
  toggleMemoryDrawerState: () => void;
  setNewDirectModal: (open: boolean) => void;
  dismissChatNotification: () => void;
  initPropertyConversation: (params: { propertyId?: string; draftId?: string; title?: string }) => Promise<string | null>;
  sendPropertyMessage: (
    text: string,
    wizardStep?: number,
    options?: { isFeedback?: boolean; caption?: string; screenshotUrl?: string | null }
  ) => Promise<void>;
  togglePropertyCoPilotDrawer: () => void;
  setPropertyCoPilotDrawerOpen: (open: boolean) => void;
  toggleAutonomous: () => void;
  setAutonomous: (val: boolean) => void;
}

function isUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

const ChatContext = createContext<ChatContextValue | null>(null);

export const defaultLumenConv: Conversation = {
  id: "new",
  type: "LUMEN",
  title: "Lumen AI Concierge",
  subtitle: "Always online • Tailored recommendations & luxury stays",
  isLumen: true,
  lastMessage: "",
  lastMessageTimestamp: "Now",
  unreadCount: 0,
  status: "ACTIVE",
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const isUpgradingConvRef = useRef<string | null>(null);
  const activeConvRef = useRef<string>("new");

  // Redux state
  const { messages, thinkingByConv, liveActivitiesByConv, isSubmitting, selectedConvId, propertyConvId } =
    useAppSelector((state) => state.chat);
  const { conversations, isLoading: isConversationsLoading } = useAppSelector(
    (state) => state.conversations
  );
  const {
    isFloatingInquiriesOpen,
    isMemoryDrawerOpen,
    isNewDirectModalOpen,
    incomingNotification,
    isPropertyCoPilotOpen,
    isAutonomousMode,
  } = useAppSelector((state) => state.ui);

  // Keep activeConvRef perfectly in sync
  useEffect(() => {
    activeConvRef.current = selectedConvId;
  }, [selectedConvId]);

  // Derive conversation-scoped thinking state & activities for current screen
  const currentThinking = thinkingByConv[selectedConvId];
  const isThinking = !!currentThinking?.isThinking;
  const thinkingCaption =
    currentThinking?.caption || "Lumen is curating tailored recommendations...";
  const liveActivities = useMemo(() => {
    return liveActivitiesByConv[selectedConvId] || [];
  }, [liveActivitiesByConv, selectedConvId]);

  // Derive current conversation
  const currentConv = useMemo(() => {
    if (!selectedConvId || selectedConvId === "new" || selectedConvId === "conv-lumen") {
      return defaultLumenConv;
    }
    const found = conversations.find((c) => c.id === selectedConvId);
    if (found) return found;

    return {
      id: selectedConvId,
      type: "LUMEN" as const,
      title: "Lumen AI Concierge",
      subtitle: "Always online • Tailored recommendations & bookings",
      isLumen: true,
      lastMessage: "",
      lastMessageTimestamp: "Active",
      unreadCount: 0,
      status: "ACTIVE" as const,
    };
  }, [selectedConvId, conversations]);

  // Load conversations inbox
  const loadConversations = useCallback(async () => {
    dispatch(setConversationsLoading(true));
    try {
      const list = await AggarlyChatBridgeClient.getConversations();
      dispatch(setConversations(list));
    } catch (e: any) {
      dispatch(setConversationsError(e.message || "Failed to load conversations"));
    }
  }, [dispatch]);

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Load message history for a conversation
  const loadMessagesForConv = useCallback(
    async (convId: string) => {
      if (!convId || convId === "new" || convId === "conv-lumen") {
        dispatch(setMessages([]));
        AggarlyChatBridgeClient.setActiveAiConversationId(null);
        return;
      }

      if (isUpgradingConvRef.current === convId) {
        // In-flight new thread creation: preserve optimistic user message & thinking progress
        isUpgradingConvRef.current = null;
        return;
      }

      // Clear previous messages immediately on switch
      dispatch(setMessages([]));

      AggarlyChatBridgeClient.setActiveAiConversationId(convId);
      AggarlyChatBridgeClient.initWebSocket(convId);

      const msgs = await AggarlyChatBridgeClient.getMessages(convId);
      
      // Ensure the user hasn't switched away while loading
      if (activeConvRef.current === convId) {
        dispatch(setMessages(msgs));
      }

      // AUTO-RESUME THINKING ON RESTART/REFRESH
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const matchedConv = conversationsRef.current.find((c) => c.id === convId);
        
        // Strict AI thread identification: direct/host conversations are NEVER AI threads unless explicitly configured
        const isAiThread = matchedConv
          ? (matchedConv.isLumen === true || matchedConv.type === "LUMEN")
          : (convId === "new" || convId.startsWith("conv-lumen"));

        if (lastMsg.senderType === "USER" && isAiThread) {
          dispatch(
            setThinkingForConv({
              convId,
              isThinking: true,
              caption: "Lumen is curating tailored recommendations...",
            })
          );

          AggarlyChatBridgeClient.waitForAiResponse(convId).then((reply) => {
            if (reply) {
              dispatch(clearThinkingForConv(convId));
              dispatch(setPendingAiConvId(null));

              // If user is viewing this conversation, append
              if (activeConvRef.current === convId) {
                dispatch(addMessage(reply));
              } else {
                // If user is in another conversation, show notification banner
                dispatch(
                  showIncomingNotification({
                    id: reply.id,
                    conversationId: convId,
                    senderName: "Lumen AI",
                    senderType: "LUMEN",
                    content: reply.content,
                    timestamp: reply.timestamp || "Just now",
                  })
                );
              }

              // Update inbox snippet
              dispatch(
                updateConversationLastMessage({
                  id: convId,
                  lastMessage: reply.content,
                  timestamp: "Just now",
                })
              );
            }
          });
        } else {
          // Direct chat or non-AI thread: ensure thinking is cleared
          dispatch(clearThinkingForConv(convId));
        }
      }
    },
    [dispatch]
  );

  // Automatically fetch messages whenever selectedConvId changes
  useEffect(() => {
    loadMessagesForConv(selectedConvId);
  }, [selectedConvId, loadMessagesForConv]);

  // Subscribe to real-time WebSocket messages
  useEffect(() => {
    const unsubscribe = AggarlyChatBridgeClient.subscribeToMessages((incomingMsg) => {
      const msgConvId = incomingMsg.conversationId;
      const currentPropConvId = store.getState().chat.propertyConvId;

      // Extract and enqueue any UI commands whenever Lumen sends them
      if (incomingMsg.senderType === "LUMEN") {
        const commandsToEnqueue: UiCommand[] = [];

        if (incomingMsg.blocks && Array.isArray(incomingMsg.blocks)) {
          incomingMsg.blocks.forEach((block) => {
            if (block.type === "ui_command" && block.data) {
              if (Array.isArray(block.data.commands)) {
                commandsToEnqueue.push(...block.data.commands);
              } else if (block.data.command) {
                commandsToEnqueue.push(block.data.command);
              } else if (block.data.action && block.data.target) {
                commandsToEnqueue.push({
                  type: block.data.action,
                  target: block.data.target,
                  value: block.data.value,
                  description: block.data.description,
                } as any);
              }
            }
          });
        }

        if (incomingMsg.metadata) {
          try {
            const meta = typeof incomingMsg.metadata === "string" ? JSON.parse(incomingMsg.metadata) : incomingMsg.metadata;
            if (meta?.uiCommands && Array.isArray(meta.uiCommands)) {
              commandsToEnqueue.push(...meta.uiCommands);
            }
          } catch (e) {}
        }

        if (commandsToEnqueue.length > 0) {
          dispatch(enqueueUiCommands(commandsToEnqueue));
        }
      }

      // 0. Dedicated routing for PROPERTY_CONVERSATION:
      if (msgConvId && currentPropConvId && msgConvId === currentPropConvId) {
        dispatch(addMessage(incomingMsg));

        if (incomingMsg.senderType === "LUMEN") {
          dispatch(clearThinkingForConv(msgConvId));
          dispatch(clearActivitiesForConv(msgConvId));
        }
        return; // Guard from guest inbox and toast notification
      }

      // 1. If message is for currently active conversation, append it
      if (msgConvId && msgConvId === activeConvRef.current) {
        dispatch(addMessage(incomingMsg));
      } else if (msgConvId && msgConvId !== activeConvRef.current && incomingMsg.senderType !== "USER") {
        // Message arrived in another conversation -> Show toast notification
        dispatch(
          showIncomingNotification({
            id: incomingMsg.id,
            conversationId: msgConvId,
            senderName: incomingMsg.senderName || (incomingMsg.senderType === "LUMEN" ? "Lumen AI" : "Host"),
            senderType: incomingMsg.senderType,
            content: incomingMsg.content,
            timestamp: incomingMsg.timestamp || "Just now",
          })
        );
      }

      // 2. If it is a LUMEN response, clear thinking & activities for that conversation
      if (incomingMsg.senderType === "LUMEN" && msgConvId) {
        dispatch(clearThinkingForConv(msgConvId));
        dispatch(clearActivitiesForConv(msgConvId));
        dispatch(setPendingAiConvId(null));
      }

      // 3. Always update inbox preview snippet
      if (msgConvId) {
        dispatch(
          updateConversationLastMessage({
            id: msgConvId,
            lastMessage: incomingMsg.content,
            timestamp: incomingMsg.timestamp || "Just now",
          })
        );
      }
    });

    const unsubscribeActivity = AggarlyChatBridgeClient.subscribeToActivity((activity) => {
      const actConvId = activity.conversationId;
      // Strictly scope to the event's actual conversation ID (ignore dummy global broadcasts)
      if (actConvId && actConvId !== "00000000-0000-0000-0000-000000000000") {
        if (activity.activityType?.includes("INTENT")) {
          return;
        }
        // If a new agent session begins, reset stale activities for this thread
        if (activity.activityType === "AGENT_START" || (activity as any).turn === 1) {
          dispatch(clearActivitiesForConv(actConvId));
        }

        // Only append to steps list if it represents an actual tool or step
        if (
          activity.toolName ||
          activity.activityType?.includes("TOOL") ||
          activity.inputSummary ||
          activity.resultSummary
        ) {
          dispatch(addOrUpdateActivity({ conversationId: actConvId, activity }));
        }

        // Update live thinking caption
        if (activity.friendlyTitle) {
          dispatch(
            setThinkingForConv({
              convId: actConvId,
              isThinking: true,
              caption: activity.friendlyTitle,
            })
          );
        }
      }
    });

    const stopAutoRefresh = AggarlyChatBridgeClient.startTokenAutoRefresh(5 * 60 * 1000);

    return () => {
      unsubscribe();
      unsubscribeActivity();
      stopAutoRefresh();
    };
  }, [dispatch]);

  // Initial load of inbox on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Select conversation
  const selectConversation = useCallback(
    (id: string) => {
      dispatch(setSelectedConvId(id));
      dispatch(setFloatingInquiriesOpen(false));
      dispatch(dismissNotification());

      const found = conversationsRef.current.find((c) => c.id === id);
      if (found && (found.isLumen || found.type === "LUMEN")) {
        AggarlyChatBridgeClient.setActiveAiConversationId(id);
      } else if (found && (found.type === "DIRECT" || found.type === "HOST_INQUIRY")) {
        AggarlyChatBridgeClient.setActiveAiConversationId(null);
        dispatch(clearThinkingForConv(id));
      }

      if (typeof window !== "undefined") {
        if (id && id !== "new" && id !== "conv-lumen") {
          window.history.pushState(null, "", `/chat/conversation/${id}`);
        } else {
          window.history.pushState(null, "", `/chat`);
        }
      }
    },
    [dispatch]
  );

  // Start new inquiry
  const startNewInquiry = useCallback(() => {
    dispatch(clearChat());
    dispatch(setSelectedConvId("new"));
    dispatch(setFloatingInquiriesOpen(false));
    dispatch(dismissNotification());
    AggarlyChatBridgeClient.setActiveAiConversationId(null);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/");
    }
  }, [dispatch]);

  // Send message action
  const sendMessage = useCallback(
    async (textToSend: string, imageFile?: File, imagePreviewUrl?: string) => {
      const trimmed = textToSend.trim();
      if ((!trimmed && !imageFile) || isSubmitting || isThinking) return;

      const lower = trimmed.toLowerCase();
      const isClearCommand =
        lower === "@lumen command:clear" ||
        lower === "command:clear" ||
        lower === "@lumen clear" ||
        lower === "/clear";

      let activeId = selectedConvId;

      // Handle @Lumen command:clear (clears AI agent reasoning context without wiping UI chat messages)
      if (isClearCommand) {
        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
          conversationId: activeId,
          senderType: "USER",
          senderName: "You",
          content: trimmed,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "TEXT",
        };
        dispatch(addMessage(userMsg));

        const lumenNoticeMsg: ChatMessage = {
          id: `msg-lumen-clear-${Date.now()}`,
          conversationId: activeId,
          senderType: "LUMEN",
          senderName: "Lumen AI",
          content: "✦ **Lumen AI Context Reset**: The conversational memory and active tool search state for this thread have been cleared from the AI engine. All previous messages remain preserved above for your reference, and your next prompt will be processed with a completely fresh context.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "TEXT",
        };
        dispatch(addMessage(lumenNoticeMsg));

        if (activeId) {
          dispatch(clearThinkingForConv(activeId));
          dispatch(clearActivitiesForConv(activeId));
          dispatch(
            updateConversationLastMessage({
              id: activeId,
              lastMessage: "Context cleared",
              timestamp: "Just now",
            })
          );
          // Delete AI context messages from backend DB
          AggarlyChatBridgeClient.clearConversationMessages(activeId).catch((err) => {
            console.warn("Could not clear AI context on DB:", err);
          });
        }
        return;
      }

      dispatch(setIsSubmitting(true));

      // =========================================================================
      // VISION SEARCH REQUEST FLOW: Create chat first -> Switch to it -> Send request & persist
      // =========================================================================
      if (imageFile) {
        let targetConvId = activeId;
        const isNewInquiry = !activeId || activeId === "new" || activeId === "conv-lumen" || !isUuid(activeId);

        // 1. First request to create chat first
        if (isNewInquiry) {
          const convTitle = trimmed
            ? trimmed.slice(0, 32)
            : "Visual Search Inquiry";

          const newConv = await AggarlyChatBridgeClient.createNewAiConversation(convTitle);
          targetConvId = newConv.id;
          isUpgradingConvRef.current = targetConvId;

          // 2. Then switch to it immediately
          dispatch(setSelectedConvId(targetConvId));
          dispatch(setPendingAiConvId(targetConvId));
          AggarlyChatBridgeClient.setActiveAiConversationId(targetConvId);
          AggarlyChatBridgeClient.initWebSocket(targetConvId);
          dispatch(addConversation(newConv));

          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", `/chat/conversation/${targetConvId}`);
          }
        } else {
          dispatch(setPendingAiConvId(targetConvId));
        }

        // 3. And do all things that we do (add user message with photo & start thinking)
        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
          conversationId: targetConvId,
          senderType: "USER",
          senderName: "You",
          content: trimmed || "Visual Search with reference photo",
          imageAttachmentUrl: imagePreviewUrl,
          imageAttachmentName: imageFile.name,
          imageAttachmentSize: imageFile.size,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "IMAGE",
        };
        dispatch(addMessage(userMsg));

        dispatch(clearActivitiesForConv(targetConvId));
        dispatch(
          setThinkingForConv({
            convId: targetConvId,
            isThinking: true,
            caption: "Lumen Vision is analyzing architectural aesthetic & finding matching sanctuaries...",
          })
        );

        // 4. Then send the request to server to persist the chat
        try {
          // A. Upload image to permanent storage
          const uploadRes = await VisionClient.uploadImageFile(imageFile);
          const storedImageUrl = uploadRes?.viewUrl || imagePreviewUrl;

          // B. Persist user message to backend DB
          await AggarlyChatBridgeClient.sendUserMessage(targetConvId, {
            content: trimmed || "Visual Search with reference photo",
            messageType: "IMAGE",
            metadataJson: JSON.stringify({
              imageUrl: storedImageUrl,
              imageAttachmentUrl: storedImageUrl,
              imageName: imageFile.name,
              fileSize: imageFile.size,
              skipAiTurn: true,
            }),
          });

          // C. Perform vision search
          const visionRes = await VisionClient.searchByImageUpload(
            imageFile,
            trimmed || undefined
          );

          dispatch(clearThinkingForConv(targetConvId));
          dispatch(clearActivitiesForConv(targetConvId));
          dispatch(setPendingAiConvId(null));
          dispatch(setIsSubmitting(false));

          // D. Construct Lumen reply and presentation blocks
          let lumenReply: ChatMessage;
          let replyContent: string;
          let blocks: any[];

          if (!visionRes.success) {
            const isInvalidImage = visionRes.errorCode === "INVALID_SEARCH_IMAGE";
            replyContent = isInvalidImage
              ? `✦ **Lumen Vision Inspection**: ${visionRes.error || "The uploaded image does not appear to be a property or room scene. Please upload a clear photo of a luxury villa, room interior, or coastal landscape to search."}`
              : `✦ **Lumen Vision**: Unable to complete visual search at this moment (${visionRes.error}). Please try again with another photo.`;
            blocks = [{ type: "text", content: replyContent }];
            lumenReply = {
              id: `msg-lumen-${Date.now()}`,
              conversationId: targetConvId,
              senderType: "LUMEN",
              senderName: "Lumen AI",
              content: replyContent,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              type: "TEXT",
              blocks,
            };
          } else if (visionRes.results.length === 0) {
            replyContent = "I analyzed your reference image across our entire portfolio of sanctuaries, but didn't find properties meeting our strict visual match criteria. Try another photo of an exterior facade, pool deck, or interior suite.";
            blocks = [{ type: "text", content: replyContent }];
            lumenReply = {
              id: `msg-lumen-${Date.now()}`,
              conversationId: targetConvId,
              senderType: "LUMEN",
              senderName: "Lumen AI",
              content: replyContent,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              type: "TEXT",
              blocks,
            };
          } else {
            const count = visionRes.results.length;
            replyContent = `I analyzed your reference photo and discovered **${count} luxury sanctuaries** sharing this architectural aesthetic, setting, and coastal character:`;
            blocks = [
              {
                type: "text",
                content: replyContent,
              },
              {
                type: "vision_search_results",
                data: {
                  queryImagePreviewUrl: storedImageUrl,
                  textQuery: trimmed || undefined,
                  results: visionRes.results,
                  totalFound: visionRes.count || count,
                },
              },
            ];
            lumenReply = {
              id: `msg-lumen-${Date.now()}`,
              conversationId: targetConvId,
              senderType: "LUMEN",
              senderName: "Lumen AI",
              content: replyContent,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              type: "TOOL_RESULT",
              blocks,
              visionSearchResults: visionRes.results,
            };
          }

          // E. Persist Lumen reply to backend DB!
          await AggarlyChatBridgeClient.persistBotMessage(targetConvId, {
            content: replyContent,
            messageType: lumenReply.type,
            metadataJson: JSON.stringify({
              version: "1",
              blocks,
              visionSearchResults: visionRes.results,
            }),
          });

          // F. Update UI
          if (activeConvRef.current === targetConvId) {
            dispatch(addMessage(lumenReply));
          } else {
            dispatch(
              showIncomingNotification({
                id: lumenReply.id,
                conversationId: targetConvId,
                senderName: "Lumen AI",
                senderType: "LUMEN",
                content: lumenReply.content,
                timestamp: lumenReply.timestamp || "Just now",
              })
            );
          }

          dispatch(
            updateConversationLastMessage({
              id: targetConvId,
              lastMessage: visionRes.success
                ? `Vision Search: ${visionRes.results.length} matches`
                : "Vision search inquiry",
              timestamp: "Just now",
            })
          );
        } catch (err: any) {
          console.error("Vision search pipeline error:", err);
          dispatch(clearThinkingForConv(targetConvId));
          dispatch(setIsSubmitting(false));
          dispatch(setPendingAiConvId(null));
        }
        return;
      }

      // =========================================================================
      // STANDARD TEXT MESSAGING FLOW
      // =========================================================================
      const isDirectConv =
        currentConv?.type === "DIRECT" ||
        currentConv?.type === "HOST_INQUIRY" ||
        Boolean((currentConv as any)?.recipientId || currentConv?.participant);

      const isLumen = isDirectConv
        ? false
        : (currentConv?.isLumen ??
          (currentConv?.type === "LUMEN" ||
            currentConv?.type === "AI_CONCIERGE" ||
            !activeId ||
            activeId === "new" ||
            activeId === "conv-lumen"));
      const isNewInquiry = !activeId || activeId === "new" || activeId === "conv-lumen";

      // 1. Add user message optimistic preview
      const userMsg: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        conversationId: activeId,
        senderType: "USER",
        senderName: "You",
        content: trimmed,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "TEXT",
      };

      dispatch(addMessage(userMsg));

      if (isLumen) {
        dispatch(
          setThinkingForConv({
            convId: activeId,
            isThinking: true,
            caption: "Lumen is curating tailored recommendations...",
          })
        );
      }

      try {
        if (isLumen) {
          let targetConvId = activeId;

          // Step A: If new inquiry, CREATE conversation on backend first
          if (isNewInquiry) {
            dispatch(
              setThinkingForConv({
                convId: activeId,
                isThinking: true,
                caption: "Creating conversation thread...",
              })
            );

            const convTitle = trimmed
              ? trimmed.slice(0, 32)
              : "Trip Inquiry";

            const newConv = await AggarlyChatBridgeClient.createNewAiConversation(
              convTitle
            );
            targetConvId = newConv.id;
            isUpgradingConvRef.current = targetConvId;
            
            // Move thinking state to new conversation ID
            dispatch(clearThinkingForConv(activeId));
            dispatch(
              setThinkingForConv({
                convId: targetConvId,
                isThinking: true,
                caption: "Lumen is curating tailored recommendations...",
              })
            );

            dispatch(setSelectedConvId(targetConvId));
            dispatch(setPendingAiConvId(targetConvId));
            AggarlyChatBridgeClient.setActiveAiConversationId(targetConvId);
            AggarlyChatBridgeClient.initWebSocket(targetConvId);
            dispatch(addConversation(newConv));

            // Smooth URL update WITHOUT unmounting React tree
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", `/chat/conversation/${targetConvId}`);
            }
          } else {
            dispatch(setPendingAiConvId(targetConvId));
          }

          // Step C: Regular AI conversational text turn
          dispatch(clearActivitiesForConv(targetConvId));
          const lumenReply = await AggarlyChatBridgeClient.sendLumenMessage(
            trimmed,
            (caption) =>
              dispatch(
                setThinkingForConv({
                  convId: targetConvId,
                  isThinking: true,
                  caption,
                })
              ),
            targetConvId
          );

          // Clear thinking & live activities for target conversation
          dispatch(clearThinkingForConv(targetConvId));
          dispatch(clearActivitiesForConv(targetConvId));
          dispatch(setPendingAiConvId(null));

          // ONLY append to active messages IF the user is currently viewing this conversation!
          if (activeConvRef.current === targetConvId) {
            dispatch(addMessage(lumenReply));
          } else {
            // User switched away to another thread -> show notification toast!
            dispatch(
              showIncomingNotification({
                id: lumenReply.id,
                conversationId: targetConvId,
                senderName: "Lumen AI",
                senderType: "LUMEN",
                content: lumenReply.content,
                timestamp: lumenReply.timestamp || "Just now",
              })
            );
          }

          // Always update conversation inbox snippet
          dispatch(
            updateConversationLastMessage({
              id: targetConvId,
              lastMessage: lumenReply.content,
              timestamp: "Just now",
            })
          );

          // If backend assigned a newer conversation ID
          if (lumenReply.conversationId && lumenReply.conversationId !== targetConvId) {
            const newBackendId = lumenReply.conversationId;
            dispatch(setSelectedConvId(newBackendId));
            AggarlyChatBridgeClient.setActiveAiConversationId(newBackendId);
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", `/chat/conversation/${newBackendId}`);
            }
          }
        } else {
          // Direct human-to-human message: always reset previous turn activities
          dispatch(clearActivitiesForConv(activeId));

          const isMentioningLumen =
            trimmed.toLowerCase().includes("@lumen") ||
            trimmed.toLowerCase().includes("@ai");

          if (isMentioningLumen) {
            dispatch(
              setThinkingForConv({
                convId: activeId,
                isThinking: true,
                caption: "Lumen is joining the conversation & generating a response...",
              })
            );
          }

          try {
            const sentMsg = await AggarlyChatBridgeClient.sendHostMessage(activeId, trimmed);
            if (activeConvRef.current === activeId) {
              dispatch(updateMessage({ id: userMsg.id, updates: sentMsg }));
            }
            dispatch(
              updateConversationLastMessage({
                id: activeId,
                lastMessage: trimmed,
                timestamp: "Just now",
              })
            );
          } finally {
            if (!isMentioningLumen) {
              dispatch(clearThinkingForConv(activeId));
              dispatch(clearActivitiesForConv(activeId));
            }
          }
        }
      } finally {
        dispatch(setIsSubmitting(false));
      }
    },
    [dispatch, isSubmitting, isThinking, selectedConvId, currentConv]
  );

  // Confirm action card handler
  const handleConfirmCardAction = useCallback(
    async (token: string) => {
      const targetConvId = selectedConvId || activeConvRef.current || undefined;

      try {
        if (targetConvId) {
          dispatch(
            setThinkingForConv({
              convId: targetConvId,
              isThinking: true,
              caption: "Confirming and executing authorized action with Aggarly...",
            })
          );
        }
        const resultMsg = await AggarlyChatBridgeClient.confirmAction(token, targetConvId || undefined);
        if (resultMsg) {
          dispatch(addMessage(resultMsg));
        }
      } catch (e) {
        console.warn("Error confirming action:", e);
      } finally {
        if (targetConvId) {
          dispatch(clearThinkingForConv(targetConvId));
        }
      }
    },
    [dispatch, selectedConvId]
  );

  // Initialize or attach to dedicated property conversation with persistent property ID binding
  const initPropertyConversation = useCallback(
    async (params: { propertyId?: string; draftId?: string; title?: string }) => {
      try {
        const storageKey = params.propertyId
          ? `lumen_prop_conv_${params.propertyId}`
          : params.draftId
          ? `lumen_draft_conv_${params.draftId}`
          : null;

        // 1. Immediately hydrate from localStorage if known so conversation is instantly found
        if (typeof window !== "undefined" && storageKey) {
          const cachedId = localStorage.getItem(storageKey);
          if (cachedId) {
            dispatch(setPropertyConvId(cachedId));
            AggarlyChatBridgeClient.initWebSocket(cachedId);
            AggarlyChatBridgeClient.getMessages(cachedId).then((history) => {
              if (Array.isArray(history)) {
                history.forEach((m) => dispatch(addMessage(m)));
              }
            });
          }
        }

        // 2. Fetch authoritative conversation from backend
        const conv = await PropertyConversationClient.getOrCreatePropertyConversation(params);
        if (conv?.id) {
          if (typeof window !== "undefined" && storageKey) {
            localStorage.setItem(storageKey, conv.id);
            if (params.propertyId) {
              localStorage.setItem("lumen_last_property_id", params.propertyId);
            }
          }

          dispatch(setPropertyConvId(conv.id));
          AggarlyChatBridgeClient.initWebSocket(conv.id);

          const history = await AggarlyChatBridgeClient.getMessages(conv.id);
          if (Array.isArray(history)) {
            history.forEach((m) => dispatch(addMessage(m)));
          }
          return conv.id;
        }
      } catch (err) {
        console.warn("Could not initialize property conversation:", err);
      }
      return null;
    },
    [dispatch]
  );

  // Send a message in the property conversation with client DOM context snapshot attached
  const sendPropertyMessage = useCallback(
    async (
      textToSend: string,
      wizardStep?: number,
      options?: { isFeedback?: boolean; caption?: string; screenshotUrl?: string | null }
    ) => {
      const trimmed = textToSend.trim();
      let propId = store.getState().chat.propertyConvId;
      if (!propId && typeof window !== "undefined") {
        const lastPropId = localStorage.getItem("lumen_last_property_id");
        if (lastPropId) {
          propId = localStorage.getItem(`lumen_prop_conv_${lastPropId}`) || null;
          if (propId) {
            dispatch(setPropertyConvId(propId));
          }
        }
      }
      if (!trimmed || !propId) return;

      const isFeedback = options?.isFeedback ?? false;
      let effectiveScreenshotUrl: string | null = options?.screenshotUrl ?? null;

      if (!isFeedback) {
        const uploadResult = await PageScreenshotCapture.captureAndUpload();
        effectiveScreenshotUrl = uploadResult.minioUrl || uploadResult.dataUrl;

        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
          conversationId: propId,
          senderType: "USER",
          senderName: "Host",
          content: trimmed,
          imageAttachmentUrl: effectiveScreenshotUrl || undefined,
          imageAttachmentName: "Current Screen State",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: effectiveScreenshotUrl ? "IMAGE" : "TEXT",
        };
        dispatch(addMessage(userMsg));
      }

      dispatch(
        setThinkingForConv({
          convId: propId,
          isThinking: true,
          caption:
            options?.caption ||
            (isFeedback
              ? "Lumen arrived at new page view and continuing task..."
              : "Lumen is inspecting property context & live page layout..."),
        })
      );

      let enrichedText = trimmed;
      const screenshotLine = effectiveScreenshotUrl ? `SCREENSHOT_URL: ${effectiveScreenshotUrl}\n` : "";
      if (!trimmed.includes("[PAGE_CONTEXT]")) {
        const compactContext = DomSnapshotAgent.captureCompact();
        enrichedText = `${trimmed}\n\n[PAGE_CONTEXT]\n${screenshotLine}${compactContext}\n[/PAGE_CONTEXT]`;
      } else if (effectiveScreenshotUrl && !trimmed.includes("SCREENSHOT_URL:")) {
        enrichedText = trimmed.replace("[PAGE_CONTEXT]", `[PAGE_CONTEXT]\n${screenshotLine}`);
      }

      try {
        await PropertyConversationClient.sendMessage(propId, enrichedText, effectiveScreenshotUrl);

        // Fallback safety poller in case WebSocket has latency or dropped packet:
        let isResolved = false;
        const checkDone = () => {
          const state = store.getState();
          const thinking = state.chat.thinkingByConv[propId]?.isThinking;
          return !thinking;
        };

        const pollStartTime = Date.now();
        const pollInterval = setInterval(async () => {
          if (isResolved || checkDone() || Date.now() - pollStartTime > 25000) {
            clearInterval(pollInterval);
            isResolved = true;
            return;
          }

          try {
            const msgs = await PropertyConversationClient.getMessages(propId);
            if (msgs && msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1];
              const parsed = AiComponentParser.parse(lastMsg, AggarlyChatBridgeClient.getCurrentUserId());
              if (parsed.senderType === "LUMEN") {
                const existing = store.getState().chat.messages.some((m) => m.id === parsed.id);
                if (!existing) {
                  dispatch(addMessage(parsed));
                  if (parsed.blocks && Array.isArray(parsed.blocks)) {
                    const cmds: UiCommand[] = [];
                    parsed.blocks.forEach((b: any) => {
                      if (b.type === "ui_command" && b.data) {
                        if (Array.isArray(b.data.commands)) {
                          cmds.push(...b.data.commands);
                        } else if (b.data.command) {
                          cmds.push(b.data.command);
                        }
                      }
                    });
                    if (cmds.length > 0) {
                      dispatch(enqueueUiCommands(cmds));
                    }
                  }
                  dispatch(clearThinkingForConv(propId));
                  isResolved = true;
                  clearInterval(pollInterval);
                }
              }
            }
          } catch (e) {}
        }, 1500);
      } catch (err) {
        console.error("Failed to send property conversation message:", err);
        dispatch(clearThinkingForConv(propId));
      }
    },
    [dispatch, store]
  );

  const value: ChatContextValue = useMemo(
    () => ({
      messages,
      isThinking,
      thinkingCaption,
      liveActivities,
      isSubmitting,
      selectedConvId,
      conversations,
      isConversationsLoading,
      currentConv,
      isFloatingInquiriesOpen,
      isMemoryDrawerOpen,
      isNewDirectModalOpen,
      incomingNotification,
      propertyConvId,
      isPropertyCoPilotOpen,
      isAutonomousMode,
      sendMessage,
      selectConversation,
      startNewInquiry,
      loadConversations,
      loadMessagesForConv,
      handleConfirmCardAction,
      setFloatingInquiries: (open) => dispatch(setFloatingInquiriesOpen(open)),
      toggleFloatingInquiriesDrawer: () => dispatch(toggleFloatingInquiries()),
      setMemoryDrawer: (open) => dispatch(setMemoryDrawerOpen(open)),
      toggleMemoryDrawerState: () => dispatch(toggleMemoryDrawer()),
      setNewDirectModal: (open) => dispatch(setNewDirectModalOpen(open)),
      dismissChatNotification: () => dispatch(dismissNotification()),
      initPropertyConversation,
      sendPropertyMessage,
      togglePropertyCoPilotDrawer: () => dispatch(togglePropertyCoPilot()),
      setPropertyCoPilotDrawerOpen: (open) => dispatch(setPropertyCoPilotOpen(open)),
      toggleAutonomous: () => dispatch(toggleAutonomousMode()),
      setAutonomous: (val) => dispatch(setAutonomousMode(val)),
    }),
    [
      messages,
      isThinking,
      thinkingCaption,
      liveActivities,
      isSubmitting,
      selectedConvId,
      conversations,
      isConversationsLoading,
      currentConv,
      isFloatingInquiriesOpen,
      isMemoryDrawerOpen,
      isNewDirectModalOpen,
      incomingNotification,
      propertyConvId,
      isPropertyCoPilotOpen,
      isAutonomousMode,
      sendMessage,
      selectConversation,
      startNewInquiry,
      loadConversations,
      loadMessagesForConv,
      handleConfirmCardAction,
      initPropertyConversation,
      sendPropertyMessage,
      dispatch,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return ctx;
};
