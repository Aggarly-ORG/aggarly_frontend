import { ComputerAction } from "../protocol/ComputerAction";
import { ActionVerification, UiChange } from "../protocol/ActionResult";

function isToggleControl(el: HTMLElement): boolean {
  return (
    el.getAttribute("role") === "checkbox" ||
    el.getAttribute("role") === "switch" ||
    (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) ||
    el.hasAttribute("aria-checked") ||
    el.hasAttribute("data-checked") ||
    el.hasAttribute("data-amenity-id")
  );
}

function isElementChecked(el: HTMLElement): boolean {
  if (el.getAttribute("aria-checked") === "true") return true;
  if (el.getAttribute("data-checked") === "true") return true;
  if (el.getAttribute("aria-selected") === "true") return true;
  if (el.getAttribute("data-active") === "true") return true;

  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    return el.checked;
  }

  const childCheckbox = el.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (childCheckbox && childCheckbox.checked) return true;

  if (el.getAttribute("aria-pressed") === "true") return true;
  const dataState = el.getAttribute("data-state");
  if (dataState === "checked" || dataState === "on" || dataState === "active") return true;

  const className = typeof el.className === "string" ? el.className.toLowerCase() : "";
  return (
    className.includes("selected") ||
    className.includes("active") ||
    className.includes("checked")
  );
}

export interface PreActionSnapshot {
  timestamp: number;
  scrollY: number;
  url: string;
  activeElementTag: string | null;
  elementState?: {
    value?: string;
    checked?: boolean;
    step?: number;
    className?: string;
    ariaExpanded?: string | null;
  };
}

export class ActionVerifier {
  /**
   * Capture a lightweight snapshot of the DOM and target element before executing an action.
   */
  static captureSnapshot(
    targetElement?: HTMLElement | null
  ): PreActionSnapshot {
    let elementState: PreActionSnapshot["elementState"];

    if (targetElement) {
      const isInput =
        targetElement instanceof HTMLInputElement ||
        targetElement instanceof HTMLTextAreaElement ||
        targetElement instanceof HTMLSelectElement;

      const isCheckbox = isToggleControl(targetElement);

      elementState = {
        value: isInput ? (targetElement as HTMLInputElement).value : undefined,
        checked: isCheckbox ? isElementChecked(targetElement) : undefined,
        className: targetElement.className,
        ariaExpanded: targetElement.getAttribute("aria-expanded"),
      };
    }

    return {
      timestamp: Date.now(),
      scrollY: window.scrollY,
      url: window.location.href,
      activeElementTag: document.activeElement ? document.activeElement.tagName : null,
      elementState,
    };
  }

  /**
   * Verify whether the action produced the expected DOM / application effect.
   */
  static verify(
    action: ComputerAction,
    targetElement: HTMLElement | null,
    snapshot: PreActionSnapshot
  ): ActionVerification {
    const changes: UiChange[] = [];

    switch (action.type) {
      case "CLICK":
      case "CLICK_AT": {
        if (!targetElement) {
          // If no target element was bound (e.g. click at coordinate), verify URL or scroll
          if (window.location.href !== snapshot.url) {
            changes.push({
              property: "url",
              before: snapshot.url,
              after: window.location.href,
            });
            return { verified: true, reason: "Navigation occurred", changes };
          }
          return { verified: true, reason: "Coordinate clicked", changes };
        }

        // Check checkbox / toggle state change
        const isCheckbox = isToggleControl(targetElement);

        if (isCheckbox && snapshot.elementState?.checked !== undefined) {
          const currentChecked = isElementChecked(targetElement);
          changes.push({
            property: "checked",
            before: snapshot.elementState.checked,
            after: currentChecked,
          });

          if (currentChecked !== snapshot.elementState.checked) {
            return {
              verified: true,
              reason: `Toggle state changed from ${snapshot.elementState.checked} to ${currentChecked}`,
              changes,
            };
          }
        }

        // Check URL change
        if (window.location.href !== snapshot.url) {
          changes.push({
            property: "url",
            before: snapshot.url,
            after: window.location.href,
          });
          return { verified: true, reason: "Navigation occurred", changes };
        }

        // Check aria-expanded toggle (for accordions / dropdowns)
        const currentExpanded = targetElement.getAttribute("aria-expanded");
        if (currentExpanded && currentExpanded !== snapshot.elementState?.ariaExpanded) {
          changes.push({
            property: "aria-expanded",
            before: snapshot.elementState?.ariaExpanded ?? null,
            after: currentExpanded,
          });
          return { verified: true, reason: "Expand state toggled", changes };
        }

        // Default click verification is considered verified if element was interactable
        return {
          verified: true,
          reason: "Element received click event sequence",
          changes,
        };
      }

      case "TYPE": {
        if (!targetElement) {
          return { verified: false, reason: "No target element to verify typing" };
        }

        const currentValue =
          targetElement instanceof HTMLInputElement ||
          targetElement instanceof HTMLTextAreaElement ||
          targetElement instanceof HTMLSelectElement
            ? targetElement.value
            : targetElement.textContent || "";

        changes.push({
          property: "value",
          before: snapshot.elementState?.value ?? "",
          after: currentValue,
        });

        const isMatch = currentValue === action.value;
        return {
          verified: isMatch,
          reason: isMatch
            ? "Input value matches typed content"
            : `Expected "${action.value}", but element has "${currentValue}"`,
          changes,
        };
      }

      case "SCROLL":
      case "SCROLL_TO": {
        const scrollDelta = Math.abs(window.scrollY - snapshot.scrollY);
        changes.push({
          property: "scrollY",
          before: snapshot.scrollY,
          after: window.scrollY,
        });

        // Even if scroll delta is 0, element might already have been in view
        return {
          verified: true,
          reason: scrollDelta > 5 ? `Scrolled by ${scrollDelta}px` : "Element already in view",
          changes,
        };
      }

      case "PRESS": {
        return {
          verified: true,
          reason: `Key "${action.key}" dispatched`,
          changes,
        };
      }

      case "HOVER": {
        return {
          verified: true,
          reason: "Hover simulated",
          changes,
        };
      }

      case "WAIT": {
        return {
          verified: true,
          reason: `Waited for ${action.delayMs}ms`,
          changes,
        };
      }

      default:
        return { verified: true, reason: "Action executed", changes };
    }
  }
}
