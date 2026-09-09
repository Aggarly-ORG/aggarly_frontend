import { ComputerAction, TargetInput } from "./protocol/ComputerAction";
import { ActionResult } from "./protocol/ActionResult";
import { BrowserObservation } from "./protocol/BrowserObservation";
import { ObservationBuilder } from "./observation/ObservationBuilder";
import { CursorController } from "./cursor/CursorController";
import { BrowserActionExecutor, ActionExecutorHandlers } from "./execution/BrowserActionExecutor";
import { AppDispatch, RootState } from "@/store/store";
import { setIsAgentPaused, setExecutionMode, LumenExecutionMode } from "@/store/slices/uiSlice";
import { UiCommand } from "@/lib/types";

export interface ExecutionResultSummary {
  success: boolean;
  totalExecuted: number;
  results: ActionResult[];
  newObservation: {
    observation: BrowserObservation;
    promptContext: string;
  };
}

export interface RuntimeListener {
  onActionStart?: (action: ComputerAction, index: number, total: number) => void;
  onActionComplete?: (action: ComputerAction, result: ActionResult, index: number, total: number) => void;
  onQueueComplete?: (summary: ExecutionResultSummary) => void;
  onPausedStateChange?: (isPaused: boolean) => void;
}

export class BrowserAgentRuntime {
  private static instance: BrowserAgentRuntime | null = null;

  private dispatch: AppDispatch | null = null;
  private cursorController: CursorController;
  private handlers: ActionExecutorHandlers = {};
  private listeners: RuntimeListener[] = [];

  private isExecuting = false;
  private isPaused = false;
  private isCancelled = false;
  private executionMode: LumenExecutionMode = "AUTONOMOUS";

  private queue: ComputerAction[] = [];
  private currentActionIndex = 0;
  private resumeResolve: (() => void) | null = null;

  private constructor() {
    this.cursorController = new CursorController();
    this.attachHumanInteractionListeners();
  }

  static getInstance(): BrowserAgentRuntime {
    if (!this.instance) {
      this.instance = new BrowserAgentRuntime();
    }
    return this.instance;
  }

  init(dispatch: AppDispatch, handlers: ActionExecutorHandlers = {}) {
    this.dispatch = dispatch;
    this.cursorController.setDispatch(dispatch);
    this.handlers = handlers;
  }

  setHandlers(handlers: ActionExecutorHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  setExecutionMode(mode: LumenExecutionMode) {
    this.executionMode = mode;
    this.dispatch?.(setExecutionMode(mode));
  }

  addListener(listener: RuntimeListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Captures a fresh observation of the current browser page.
   */
  observe(): { observation: BrowserObservation; promptContext: string } {
    const observation = ObservationBuilder.build();
    const promptContext = ObservationBuilder.buildPromptContext();
    return { observation, promptContext };
  }

  /**
   * Enqueue a batch of computer actions for execution.
   */
  async executeActions(actions: ComputerAction[]): Promise<ExecutionResultSummary> {
    if (!actions || actions.length === 0) {
      const obs = this.observe();
      return { success: true, totalExecuted: 0, results: [], newObservation: obs };
    }

    if (this.executionMode === "SUGGEST") {
      this.handlers.onNotifyAction?.(
        `Lumen prepared ${actions.length} action(s). Review suggestions in copilot drawer.`
      );
      const obs = this.observe();
      return { success: true, totalExecuted: 0, results: [], newObservation: obs };
    }

    this.queue = [...actions];
    this.currentActionIndex = 0;
    this.isCancelled = false;
    this.isPaused = false;

    return await this.runQueue();
  }

  /**
   * Converts legacy UiCommand[] into modern ComputerAction[] and executes them.
   */
  async executeLegacyCommands(commands: UiCommand[]): Promise<ExecutionResultSummary> {
    const actions = this.convertCommandsToActions(commands);
    return await this.executeActions(actions);
  }

  /**
   * Internal queue execution loop.
   */
  private async runQueue(): Promise<ExecutionResultSummary> {
    if (this.isExecuting) {
      const obs = this.observe();
      return { success: false, totalExecuted: 0, results: [], newObservation: obs };
    }
    this.isExecuting = true;
    const executionResults: ActionResult[] = [];

    try {
      while (this.currentActionIndex < this.queue.length) {
        if (this.isCancelled) {
          break;
        }

        // Check if execution was paused by user manual intervention
        if (this.isPaused) {
          await new Promise<void>((resolve) => {
            this.resumeResolve = resolve;
          });
          if (this.isCancelled) break;
        }

        const action = this.queue[this.currentActionIndex];
        this.notifyActionStart(action, this.currentActionIndex, this.queue.length);

        const result = await BrowserActionExecutor.execute(
          action,
          this.cursorController,
          this.handlers
        );

        executionResults.push(result);
        this.notifyActionComplete(action, result, this.currentActionIndex, this.queue.length);

        this.currentActionIndex++;
        // Small pause between sequential actions for natural perception pacing
        await new Promise((r) => setTimeout(r, 380));
      }
    } finally {
      this.isExecuting = false;
      this.isPaused = false;
      this.dispatch?.(setIsAgentPaused(false));
      this.notifyPausedState(false);
      this.queue = [];
      this.currentActionIndex = 0;
      this.cursorController.hide(1000);

      const newObservation = this.observe();
      const allSucceeded = executionResults.every((r) => r.success);
      const summary: ExecutionResultSummary = {
        success: allSucceeded,
        totalExecuted: executionResults.length,
        results: executionResults,
        newObservation,
      };

      this.notifyQueueComplete(summary);
      return summary;
    }
  }

  /**
   * Pause execution (e.g. when human manual interaction is detected).
   */
  pause(): void {
    if (!this.isExecuting || this.isPaused) return;
    this.isPaused = true;
    this.dispatch?.(setIsAgentPaused(true));
    this.notifyPausedState(true);
    this.cursorController.setPhase("idle", "Paused (User took control)");
  }

  /**
   * Resume paused execution.
   */
  resume(): void {
    this.isPaused = false;
    this.dispatch?.(setIsAgentPaused(false));
    this.notifyPausedState(false);
    this.cursorController.setPhase("moving", "Resuming Lumen actions...");

    if (this.resumeResolve) {
      const resolve = this.resumeResolve;
      this.resumeResolve = null;
      resolve();
    } else if (!this.isExecuting && this.queue.length > this.currentActionIndex) {
      this.runQueue().catch((err) => {
        console.error("Failed to resume BrowserAgentRuntime queue:", err);
      });
    }
  }

  /**
   * Cancel and clear the action queue.
   */
  cancel(): void {
    this.isCancelled = true;
    this.isPaused = false;
    this.dispatch?.(setIsAgentPaused(false));
    this.notifyPausedState(false);

    if (this.resumeResolve) {
      const resolve = this.resumeResolve;
      this.resumeResolve = null;
      resolve();
    }

    this.queue = [];
    this.isExecuting = false;
    this.cursorController.hide(200);
  }

  getIsExecuting(): boolean {
    return this.isExecuting;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Converts legacy UiCommands to modern ComputerAction objects.
   */
  convertCommandsToActions(commands: UiCommand[]): ComputerAction[] {
    return commands.map((cmd) => {
      const targetInput = parseTargetInput(cmd.target);

      switch (cmd.type) {
        case "TYPE":
        case "FILL_FORM":
        case "UPDATE_FIELD":
        case "SUGGEST_CONTENT":
          return {
            type: "TYPE",
            target: targetInput,
            value: String(cmd.value ?? ""),
            description: cmd.description || `Fill ${cmd.target} with "${cmd.value}"`,
          };

        case "CLICK_AMENITY":
        case "TOGGLE_CHECKBOX":
          return {
            type: "CLICK",
            target: {
              lumenAmenityId: cmd.target,
              text: (cmd.value as string) || cmd.target,
              selector: `[data-amenity-id="${cmd.target}"], [data-lumen-amenity-id="${cmd.target}"]`,
            },
            description: cmd.description || `Toggle ${cmd.value || cmd.target}`,
          };

        case "SCROLL_TO":
          return {
            type: "SCROLL_TO",
            target: targetInput,
            description: cmd.description || `Scroll to ${cmd.target}`,
          };

        case "WAIT":
          return {
            type: "WAIT",
            delayMs: cmd.delayMs || 500,
            description: cmd.description,
          };

        case "NAVIGATE": {
          // Resolve nav direction generically by lumenAction — FuzzyResolver will find
          // the real "continue", "next", "back", "previous" button on any page by text or data attribute
          const navLumenAction =
            cmd.target === "next" || cmd.target === "forward"
              ? "next"
              : cmd.target === "prev" || cmd.target === "back"
              ? "prev"
              : cmd.target;
          return {
            type: "CLICK",
            target: { lumenAction: navLumenAction, text: cmd.target },
            description: cmd.description || `Navigate ${cmd.target}`,
          };
        }

        case "CLICK":
        default:
          return {
            type: "CLICK",
            target: targetInput,
            description: cmd.description || `Click ${cmd.target}`,
          };
      }
    });
  }

  /**
   * Detects human interaction outside copilot drawer to pause autonomous execution safely.
   */
  private attachHumanInteractionListeners() {
    if (typeof window === "undefined") return;

    const handleUserInteraction = (e: Event) => {
      // Ignore synthetic events generated by automation or Lumen itself
      if (!e.isTrusted) return;

      if (!this.isExecuting || this.isPaused) return;

      // Ignore interactions inside the copilot drawer or controls
      const targetNode = e.target as HTMLElement | null;
      if (
        targetNode &&
        (targetNode.closest("[data-copilot-drawer]") ||
          targetNode.closest("[data-lumen-controls]") ||
          targetNode.closest("#lumen-cursor-beacon"))
      ) {
        return;
      }

      // If user uses scroll wheel, clicks, or types on the page directly, pause gracefully
      this.pause();
    };

    window.addEventListener("wheel", handleUserInteraction, { passive: true });
    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });
  }

  private notifyActionStart(action: ComputerAction, index: number, total: number) {
    this.listeners.forEach((l) => l.onActionStart?.(action, index, total));
  }

  private notifyActionComplete(
    action: ComputerAction,
    result: ActionResult,
    index: number,
    total: number
  ) {
    this.listeners.forEach((l) => l.onActionComplete?.(action, result, index, total));
  }

  private notifyQueueComplete(summary: ExecutionResultSummary) {
    this.listeners.forEach((l) => l.onQueueComplete?.(summary));
  }

  private notifyPausedState(isPaused: boolean) {
    this.listeners.forEach((l) => l.onPausedStateChange?.(isPaused));
  }
}

function parseTargetInput(rawTarget: any): TargetInput {
  if (!rawTarget) return {};
  if (typeof rawTarget === "object") return rawTarget;
  const trimmed = String(rawTarget).trim();
  if (trimmed.startsWith("el_") || /^\[el_\d+\]$/.test(trimmed)) {
    return { ref: trimmed.replace(/[\[\]]/g, "") };
  }
  if (trimmed.startsWith("#") || trimmed.startsWith(".") || trimmed.startsWith("[")) {
    return { selector: trimmed };
  }
  return {
    lumenField: trimmed,
    selector: `#${trimmed}`,
    text: trimmed,
  };
}
