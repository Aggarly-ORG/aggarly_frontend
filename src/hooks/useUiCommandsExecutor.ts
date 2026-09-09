"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { clearUiCommandsQueue, setIsExecutingCommands } from "@/store/slices/chatSlice";
import { BrowserAgentRuntime, ExecutionResultSummary } from "@/lib/lumen/BrowserAgentRuntime";

export interface UiAgentHandlers {
  onExecutionFinished?: (summary: ExecutionResultSummary) => void | Promise<void>;
}

export function useUiCommandsExecutor(handlers: UiAgentHandlers = {}) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const isExecutingRef = useRef(false);
  const queueLength = useAppSelector((state) => state.chat.uiCommandsQueue.length);

  useEffect(() => {
    const runtime = BrowserAgentRuntime.getInstance();
    runtime.init(dispatch);
  }, [dispatch]);

  useEffect(() => {
    if (queueLength === 0 || isExecutingRef.current) return;

    isExecutingRef.current = true;
    dispatch(setIsExecutingCommands(true));

    const commands = [...store.getState().chat.uiCommandsQueue];
    dispatch(clearUiCommandsQueue());

    const runtime = BrowserAgentRuntime.getInstance();
    runtime.setHandlers({});

    (async () => {
      try {
        if (commands.length > 0) {
          const summary = await runtime.executeLegacyCommands(commands);
          if (handlersRef.current.onExecutionFinished) {
            await handlersRef.current.onExecutionFinished(summary);
          }
        }
      } catch (err) {
        console.error("[useUiCommandsExecutor] Execution failed:", err);
      } finally {
        isExecutingRef.current = false;
        dispatch(setIsExecutingCommands(false));
      }
    })();
  }, [queueLength, dispatch, store]);
}
