import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Conversation } from "../../lib/types";

export interface ConversationsState {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ConversationsState = {
  conversations: [],
  isLoading: false,
  error: null,
};

export const conversationsSlice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const existsIdx = state.conversations.findIndex((c) => c.id === action.payload.id);
      if (existsIdx !== -1) {
        state.conversations[existsIdx] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
    },
    updateConversationLastMessage: (
      state,
      action: PayloadAction<{ id: string; lastMessage: string; timestamp?: string }>
    ) => {
      const conv = state.conversations.find((c) => c.id === action.payload.id);
      if (conv) {
        conv.lastMessage = action.payload.lastMessage;
        conv.lastMessageTimestamp = action.payload.timestamp || "Just now";
      }
    },
    setConversationsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setConversationsError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const {
  setConversations,
  addConversation,
  updateConversationLastMessage,
  setConversationsLoading,
  setConversationsError,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
