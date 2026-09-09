import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ChatMessage, ActivityStep, UiCommand } from "../../lib/types";

export interface ThinkingState {
  isThinking: boolean;
  caption: string;
}

export interface ChatState {
  messages: ChatMessage[];
  thinkingByConv: Record<string, ThinkingState>;
  liveActivitiesByConv: Record<string, ActivityStep[]>;
  isSubmitting: boolean;
  selectedConvId: string;
  pendingAiConvId: string | null;
  propertyConvId: string | null;
  uiCommandsQueue: UiCommand[];
  isExecutingCommands: boolean;
}

const initialState: ChatState = {
  messages: [],
  thinkingByConv: {},
  liveActivitiesByConv: {},
  isSubmitting: false,
  selectedConvId: "new",
  pendingAiConvId: null,
  propertyConvId: null,
  uiCommandsQueue: [],
  isExecutingCommands: false,
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      const newMsg = { ...action.payload };

      // Attach live activity steps if available for this conversation
      if (newMsg.senderType === "LUMEN" && newMsg.conversationId) {
        const liveSteps = state.liveActivitiesByConv[newMsg.conversationId];
        if (liveSteps && liveSteps.length > 0 && (!newMsg.activitySteps || newMsg.activitySteps.length === 0)) {
          newMsg.activitySteps = [...liveSteps];
        }
      }

      // 1. Exact ID match: update existing message
      const exactIdx = state.messages.findIndex((m) => m.id === newMsg.id);
      if (exactIdx !== -1) {
        state.messages[exactIdx] = newMsg;
        return;
      }

      // 2. If message is from USER:
      if (newMsg.senderType === "USER") {
        // If incoming is official backend message (NOT starting with msg-user-), replace the matching optimistic temporary message
        if (!newMsg.id.startsWith("msg-user-")) {
          const optimisticIdx = state.messages.findIndex(
            (m) =>
              m.senderType === "USER" &&
              m.id.startsWith("msg-user-") &&
              m.content.trim() === newMsg.content.trim()
          );
          if (optimisticIdx !== -1) {
            state.messages[optimisticIdx] = newMsg;
            return;
          }
        }

        // If identical temporary message ID already in list, do not duplicate
        if (state.messages.some((m) => m.id === newMsg.id)) {
          return;
        }
      }

      // 3. If message is from LUMEN: avoid duplicates with identical ID or identical content & time
      if (newMsg.senderType === "LUMEN") {
        if (
          state.messages.some(
            (m) =>
              m.id === newMsg.id ||
              (m.senderType === "LUMEN" &&
                m.content.trim() === newMsg.content.trim() &&
                m.timestamp === newMsg.timestamp)
          )
        ) {
          return;
        }
      }

      // 4. If message is from HOST: avoid exact duplicates
      if (newMsg.senderType === "HOST") {
        if (
          state.messages.some(
            (m) =>
              m.id === newMsg.id ||
              (m.content.trim() === newMsg.content.trim() && m.timestamp === newMsg.timestamp)
          )
        ) {
          return;
        }
      }

      state.messages.push(newMsg);
    },
    updateMessage: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<ChatMessage> }>
    ) => {
      const idx = state.messages.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) {
        state.messages[idx] = { ...state.messages[idx], ...action.payload.updates };
      }
    },
    setThinkingForConv: (
      state,
      action: PayloadAction<{ convId: string; isThinking: boolean; caption?: string }>
    ) => {
      const { convId, isThinking, caption } = action.payload;
      if (isThinking) {
        state.thinkingByConv[convId] = {
          isThinking: true,
          caption: caption || "Lumen is curating tailored recommendations...",
        };
      } else {
        delete state.thinkingByConv[convId];
      }
    },
    clearThinkingForConv: (state, action: PayloadAction<string>) => {
      delete state.thinkingByConv[action.payload];
    },
    setIsSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },
    setSelectedConvId: (state, action: PayloadAction<string>) => {
      state.selectedConvId = action.payload;
    },
    setPendingAiConvId: (state, action: PayloadAction<string | null>) => {
      state.pendingAiConvId = action.payload;
      if (typeof window !== "undefined") {
        if (action.payload) {
          sessionStorage.setItem("aggarly_pending_ai_conv", action.payload);
        } else {
          sessionStorage.removeItem("aggarly_pending_ai_conv");
        }
      }
    },
    addOrUpdateActivity: (
      state,
      action: PayloadAction<{ conversationId: string; activity: Partial<ActivityStep> }>
    ) => {
      const { conversationId, activity } = action.payload;
      if (!conversationId) return;

      if (!state.liveActivitiesByConv[conversationId]) {
        state.liveActivitiesByConv[conversationId] = [];
      }

      const list = state.liveActivitiesByConv[conversationId];
      const toolId = activity.id || activity.toolName || `step-${list.length + 1}`;
      const existingIdx = list.findIndex(
        (s) => s.id === toolId || (activity.toolName && s.toolName === activity.toolName)
      );

      const stepObj: ActivityStep = {
        id: toolId,
        conversationId,
        activityType: activity.activityType || "TOOL_START",
        agentName: activity.agentName || "PropertyAgent",
        toolName: activity.toolName,
        friendlyTitle: activity.friendlyTitle || "AI is processing...",
        status: (activity.status as any) || "RUNNING",
        durationMs: activity.durationMs ?? null,
        inputSummary: activity.inputSummary ?? null,
        resultSummary: activity.resultSummary ?? null,
        timestamp: activity.timestamp || new Date().toISOString(),
      };

      if (existingIdx !== -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          ...stepObj,
          inputSummary: stepObj.inputSummary ?? list[existingIdx].inputSummary ?? null,
          durationMs: stepObj.durationMs ?? list[existingIdx].durationMs ?? null,
        };
      } else {
        list.push(stepObj);
      }
    },
    clearActivitiesForConv: (state, action: PayloadAction<string>) => {
      delete state.liveActivitiesByConv[action.payload];
    },
    setPropertyConvId: (state, action: PayloadAction<string | null>) => {
      state.propertyConvId = action.payload;
    },
    enqueueUiCommands: (state, action: PayloadAction<UiCommand[]>) => {
      state.uiCommandsQueue.push(...action.payload);
    },
    dequeueUiCommand: (state) => {
      state.uiCommandsQueue.shift();
    },
    clearUiCommandsQueue: (state) => {
      state.uiCommandsQueue = [];
    },
    setIsExecutingCommands: (state, action: PayloadAction<boolean>) => {
      state.isExecutingCommands = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.isSubmitting = false;
      state.selectedConvId = "new";
      state.pendingAiConvId = null;
      state.thinkingByConv = {};
      state.liveActivitiesByConv = {};
      state.propertyConvId = null;
      state.uiCommandsQueue = [];
      state.isExecutingCommands = false;
    },
  },
});

export const {
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
  dequeueUiCommand,
  clearUiCommandsQueue,
  setIsExecutingCommands,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;
