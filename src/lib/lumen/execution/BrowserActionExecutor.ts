import { ComputerAction } from "../protocol/ComputerAction";
import { ActionResult, ActionVerification } from "../protocol/ActionResult";
import { TargetResolver } from "../resolution/TargetResolver";
import { CursorController } from "../cursor/CursorController";
import { CursorTracker } from "../cursor/CursorTracker";
import { InputAdapter } from "../adapters/InputAdapter";
import { ActionVerifier } from "./ActionVerifier";

export interface ActionExecutorHandlers {
  onNotifyAction?: (message: string) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class BrowserActionExecutor {
  /**
   * Executes a single computer action in the browser environment.
   */
  static async execute(
    action: ComputerAction,
    cursor: CursorController,
    handlers: ActionExecutorHandlers = {}
  ): Promise<ActionResult> {
    const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      switch (action.type) {
        case "CLICK": {
          const resolved = TargetResolver.resolve(
            action.target,
            action.description
          );
          const el = resolved.element;
          const snapshot = ActionVerifier.captureSnapshot(el);

          if (el) {
            // 1. Ensure element is visible in viewport before clicking
            const rectBefore = el.getBoundingClientRect();
            const isOffscreen =
              rectBefore.top < 0 ||
              rectBefore.bottom > window.innerHeight ||
              rectBefore.left < 0 ||
              rectBefore.right > window.innerWidth;

            if (isOffscreen) {
              cursor.setPhase("scrolling", action.description || "Scrolling to element...");
              el.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });
              await CursorTracker.waitForScrollToSettle(1200);
            }

            // 2. Track & glide cursor to element
            await cursor.trackElement(
              el,
              action.description || `Clicking ${resolved.ref || el.tagName.toLowerCase()}`,
              "moving"
            );
            await sleep(150);

            // 3. Trigger visual click ripple
            await cursor.triggerClick(action.description);

            // 4. Perform actual interaction
            const clickable =
              el.closest<HTMLElement>(
                "button, a, [role='button'], [role='tab'], [role='checkbox'], [role='switch'], [role='menuitem'], label, input, select, textarea, [data-action], [tabindex='0']"
              ) || el;


            const rect = clickable.getBoundingClientRect();
            const clientX = rect.left + rect.width / 2;
            const clientY = rect.top + rect.height / 2;

            const isButtonDisabled =
              (clickable instanceof HTMLButtonElement || clickable instanceof HTMLInputElement) &&
              clickable.disabled;
            const isAriaDisabled = clickable.getAttribute("aria-disabled") === "true";

            if (!isButtonDisabled && !isAriaDisabled) {
              const eventInit: MouseEventInit = {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX,
                clientY,
              };

              clickable.dispatchEvent(
                new PointerEvent("pointerdown", {
                  ...eventInit,
                  pointerType: "mouse",
                  isPrimary: true,
                  button: 0,
                  buttons: 1,
                })
              );
              clickable.dispatchEvent(
                new MouseEvent("mousedown", {
                  ...eventInit,
                  button: 0,
                  buttons: 1,
                })
              );
              if (typeof (clickable as any).focus === "function") {
                try {
                  (clickable as any).focus();
                } catch {}
              }
              clickable.dispatchEvent(
                new PointerEvent("pointerup", {
                  ...eventInit,
                  pointerType: "mouse",
                  isPrimary: true,
                  button: 0,
                  buttons: 0,
                })
              );
              clickable.dispatchEvent(
                new MouseEvent("mouseup", {
                  ...eventInit,
                  button: 0,
                  buttons: 0,
                })
              );

              // Single authoritative click execution
              if (typeof clickable.click === "function") {
                clickable.click();
              } else {
                clickable.dispatchEvent(
                  new MouseEvent("click", {
                    ...eventInit,
                    button: 0,
                  })
                );
              }
            }

            await sleep(250);

            const verification = ActionVerifier.verify(action, clickable, snapshot);

            return {
              success: verification.verified,
              actionId,
              verification,
            };
          }

          return {
            success: false,
            actionId,
            error: `Target could not be resolved in DOM: ${JSON.stringify(action.target)}`,
          };
        }

        case "CLICK_AT": {
          const snapshot = ActionVerifier.captureSnapshot(null);
          await cursor.moveTo(
            action.x,
            action.y,
            action.description || `Click at (${action.x}, ${action.y})`,
            "moving"
          );
          await cursor.triggerClick(action.description);

          const elAtPoint = document.elementFromPoint(action.x, action.y) as HTMLElement | null;
          if (elAtPoint) {
            elAtPoint.dispatchEvent(
              new PointerEvent("pointerdown", { bubbles: true, clientX: action.x, clientY: action.y })
            );
            elAtPoint.dispatchEvent(
              new MouseEvent("mousedown", { bubbles: true, clientX: action.x, clientY: action.y })
            );
            if (typeof (elAtPoint as any).focus === "function") {
              (elAtPoint as any).focus();
            }
            elAtPoint.dispatchEvent(
              new PointerEvent("pointerup", { bubbles: true, clientX: action.x, clientY: action.y })
            );
            elAtPoint.dispatchEvent(
              new MouseEvent("mouseup", { bubbles: true, clientX: action.x, clientY: action.y })
            );
            elAtPoint.click();
          }

          await sleep(200);
          const verification = ActionVerifier.verify(action, elAtPoint, snapshot);
          return {
            success: true,
            actionId,
            verification,
          };
        }

        case "TYPE": {
          const inputEl = TargetResolver.resolveInput(action.target, action.description);
          const snapshot = ActionVerifier.captureSnapshot(inputEl);

          if (inputEl) {
            const rect = inputEl.getBoundingClientRect();
            const isOffscreen =
              rect.top < 0 ||
              rect.bottom > window.innerHeight ||
              rect.left < 0 ||
              rect.right > window.innerWidth;

            if (isOffscreen) {
              inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
              await CursorTracker.waitForScrollToSettle(1000);
            }

            await cursor.trackElement(
              inputEl,
              action.description || `Typing into ${inputEl.tagName.toLowerCase()}`,
              "typing"
            );

            if (action.clearFirst) {
              InputAdapter.setValue(inputEl, "");
              await sleep(50);
            }

            InputAdapter.setValue(inputEl, action.value);
            await sleep(150);

            const verification = ActionVerifier.verify(action, inputEl, snapshot);
            return {
              success: verification.verified,
              actionId,
              verification,
            };
          }

          return {
            success: false,
            actionId,
            error: `Input target not found in DOM: ${JSON.stringify(action.target)}`,
          };
        }

        case "SCROLL_TO": {
          const resolved = TargetResolver.resolve(action.target);
          if (resolved.element) {
            cursor.setPhase("scrolling", action.description || "Scrolling to element...");
            resolved.element.scrollIntoView({
              behavior: "smooth",
              block: action.alignment || "center",
            });
            await CursorTracker.waitForScrollToSettle(1200);
            await cursor.trackElement(resolved.element, undefined, "hovering");
            return {
              success: true,
              actionId,
              verification: { verified: true, reason: "Scrolled element into view" },
            };
          }

          return {
            success: false,
            actionId,
            error: `Scroll target not found: ${JSON.stringify(action.target)}`,
          };
        }

        case "SCROLL": {
          const snapshot = ActionVerifier.captureSnapshot(null);
          cursor.setPhase("scrolling", `Scrolling by ${action.deltaY}px...`);
          window.scrollBy({ top: action.deltaY, behavior: "smooth" });
          await CursorTracker.waitForScrollToSettle(1000);
          const verification = ActionVerifier.verify(action, null, snapshot);
          return {
            success: true,
            actionId,
            verification,
          };
        }

        case "PRESS": {
          cursor.setPhase("typing", `Pressing key "${action.key}"...`);
          const target = (document.activeElement as HTMLElement) || document.body;
          target.dispatchEvent(
            new KeyboardEvent("keydown", { key: action.key, bubbles: true })
          );
          target.dispatchEvent(
            new KeyboardEvent("keypress", { key: action.key, bubbles: true })
          );
          target.dispatchEvent(
            new KeyboardEvent("keyup", { key: action.key, bubbles: true })
          );
          await sleep(100);
          return {
            success: true,
            actionId,
            verification: { verified: true, reason: `Dispatched key "${action.key}"` },
          };
        }

        case "HOVER": {
          const resolved = TargetResolver.resolve(action.target);
          if (resolved.element) {
            await cursor.trackElement(
              resolved.element,
              action.description || "Inspecting element...",
              "hovering"
            );
            resolved.element.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
            resolved.element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
            return {
              success: true,
              actionId,
              verification: { verified: true, reason: "Hovered over element" },
            };
          }
          return {
            success: false,
            actionId,
            error: `Hover target not found: ${JSON.stringify(action.target)}`,
          };
        }

        case "WAIT": {
          cursor.setPhase("idle", `Waiting ${action.delayMs}ms...`);
          await sleep(action.delayMs);
          return {
            success: true,
            actionId,
            verification: { verified: true, reason: `Waited for ${action.delayMs}ms` },
          };
        }

        default:
          return {
            success: false,
            actionId,
            error: `Unsupported action type: ${(action as any).type}`,
          };
      }
    } catch (err: any) {
      cursor.setPhase("error", err?.message || "Action failed");
      return {
        success: false,
        actionId,
        error: err?.message || String(err),
      };
    }
  }
}
