import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChatNotification {
  id: string;
  conversationId: string;
  senderName: string;
  senderType: "LUMEN" | "HOST" | "USER" | "SYSTEM" | string;
  content: string;
  timestamp: string;
}

export type PointerPhase =
  | "idle"
  | "moving"
  | "hovering"
  | "clicking"
  | "typing"
  | "scrolling"
  | "verifying"
  | "success"
  | "error";

export interface ElementHighlightBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CursorBeaconState {
  isActive: boolean;
  x: number;
  y: number;
  label?: string;
  isClicking?: boolean;
  phase?: PointerPhase;
  targetRef?: string;
  highlightBox?: ElementHighlightBox | null;
}

export type LumenExecutionMode = "SUGGEST" | "ASSIST" | "AUTONOMOUS";

export interface UiState {
  isFloatingInquiriesOpen: boolean;
  isMemoryDrawerOpen: boolean;
  isNewDirectModalOpen: boolean;
  incomingNotification: ChatNotification | null;
  isPropertyCoPilotOpen: boolean;
  isAutonomousMode: boolean;
  executionMode: LumenExecutionMode;
  isAgentPaused: boolean;
  cursorBeacon: CursorBeaconState | null;
}

const initialState: UiState = {
  isFloatingInquiriesOpen: false,
  isMemoryDrawerOpen: false,
  isNewDirectModalOpen: false,
  incomingNotification: null,
  isPropertyCoPilotOpen: false,
  isAutonomousMode: true,
  executionMode: "AUTONOMOUS",
  isAgentPaused: false,
  cursorBeacon: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleFloatingInquiries: (state) => {
      state.isFloatingInquiriesOpen = !state.isFloatingInquiriesOpen;
    },
    setFloatingInquiriesOpen: (state, action: PayloadAction<boolean>) => {
      state.isFloatingInquiriesOpen = action.payload;
    },
    toggleMemoryDrawer: (state) => {
      state.isMemoryDrawerOpen = !state.isMemoryDrawerOpen;
    },
    setMemoryDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isMemoryDrawerOpen = action.payload;
    },
    setNewDirectModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isNewDirectModalOpen = action.payload;
    },
    showIncomingNotification: (state, action: PayloadAction<ChatNotification>) => {
      state.incomingNotification = action.payload;
    },
    dismissNotification: (state) => {
      state.incomingNotification = null;
    },
    togglePropertyCoPilot: (state) => {
      state.isPropertyCoPilotOpen = !state.isPropertyCoPilotOpen;
    },
    setPropertyCoPilotOpen: (state, action: PayloadAction<boolean>) => {
      state.isPropertyCoPilotOpen = action.payload;
    },
    toggleAutonomousMode: (state) => {
      state.isAutonomousMode = !state.isAutonomousMode;
      state.executionMode = state.isAutonomousMode ? "AUTONOMOUS" : "SUGGEST";
    },
    setAutonomousMode: (state, action: PayloadAction<boolean>) => {
      state.isAutonomousMode = action.payload;
      state.executionMode = action.payload ? "AUTONOMOUS" : "SUGGEST";
    },
    setExecutionMode: (state, action: PayloadAction<LumenExecutionMode>) => {
      state.executionMode = action.payload;
      state.isAutonomousMode = action.payload === "AUTONOMOUS";
    },
    setIsAgentPaused: (state, action: PayloadAction<boolean>) => {
      state.isAgentPaused = action.payload;
    },
    toggleAgentPaused: (state) => {
      state.isAgentPaused = !state.isAgentPaused;
    },
    setCursorBeacon: (state, action: PayloadAction<CursorBeaconState | null>) => {
      state.cursorBeacon = action.payload;
    },
    updateCursorBeacon: (state, action: PayloadAction<Partial<CursorBeaconState>>) => {
      if (state.cursorBeacon) {
        state.cursorBeacon = { ...state.cursorBeacon, ...action.payload };
      } else {
        state.cursorBeacon = {
          isActive: true,
          x: 0,
          y: 0,
          isClicking: false,
          ...action.payload,
        };
      }
    },
    clearCursorBeacon: (state) => {
      state.cursorBeacon = null;
    },
  },
});

export const {
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
  setExecutionMode,
  setIsAgentPaused,
  toggleAgentPaused,
  setCursorBeacon,
  updateCursorBeacon,
  clearCursorBeacon,
} = uiSlice.actions;

export default uiSlice.reducer;
