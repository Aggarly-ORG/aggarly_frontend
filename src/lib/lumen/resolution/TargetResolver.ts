import { ComputerTarget, TargetInput } from "../protocol/ComputerAction";
import { RefResolver } from "./RefResolver";
import { SemanticResolver } from "./SemanticResolver";
import { FuzzyResolver } from "./FuzzyResolver";

export interface ResolvedTarget {
  element: HTMLElement | null;
  targetStep: number | null;
  isAmenity: boolean;
  matchedAmenityId?: string;
  ref?: string;
}

export class TargetResolver {
  /**
   * Resolves any target input (ref, semantic criteria, CSS selector, or raw text)
   * through prioritized resolution tiers.
   */
  static resolve(
    target: TargetInput,
    description?: string
  ): ResolvedTarget {
    let targetObj: ComputerTarget = {};

    if (typeof target === "string") {
      const trimmed = target.trim();
      if (trimmed.startsWith("el_") || /^\[el_\d+\]$/.test(trimmed)) {
        targetObj = { ref: trimmed.replace(/[\[\]]/g, "") };
      } else if (trimmed.startsWith("#") || trimmed.startsWith(".") || trimmed.startsWith("[")) {
        targetObj = { selector: trimmed };
      } else {
        targetObj = { text: trimmed };
      }
    } else if (target && typeof target === "object") {
      targetObj = target;
    }

    // Tier 1: Ephemeral Ref Resolution
    if (targetObj.ref) {
      const el = RefResolver.resolve(targetObj.ref);
      if (el) {
        const isAmenity = el.hasAttribute("data-amenity-id") || el.hasAttribute("data-lumen-amenity-id");
        return {
          element: el,
          targetStep: null,
          isAmenity,
          matchedAmenityId: el.getAttribute("data-amenity-id") || el.getAttribute("data-lumen-amenity-id") || undefined,
          ref: targetObj.ref,
        };
      }
    }

    // Tier 2: Semantic Criteria Resolution (role, name, data-lumen-*)
    if (targetObj.role || targetObj.name || targetObj.lumenField || targetObj.lumenAction || targetObj.lumenAmenityId) {
      const el = SemanticResolver.resolve(targetObj);
      if (el) {
        const isAmenity = el.hasAttribute("data-amenity-id") || el.hasAttribute("data-lumen-amenity-id") || !!targetObj.lumenAmenityId;
        return {
          element: el,
          targetStep: null,
          isAmenity,
          matchedAmenityId: el.getAttribute("data-amenity-id") || targetObj.lumenAmenityId || undefined,
        };
      }
    }

    // Tier 3: CSS Selector Resolution
    if (targetObj.selector) {
      try {
        const el = document.querySelector<HTMLElement>(targetObj.selector);
        if (el) {
          const isAmenity = el.hasAttribute("data-amenity-id") || el.hasAttribute("data-lumen-amenity-id");
          return {
            element: el,
            targetStep: null,
            isAmenity,
            matchedAmenityId: el.getAttribute("data-amenity-id") || undefined,
          };
        }
      } catch (e) {
        // Ignored: fall through to fuzzy resolution
      }
    }

    // Tier 4: Fuzzy Text & Navigation Intent Resolution
    const queryText = targetObj.text || targetObj.selector || targetObj.name || (typeof target === "string" ? target : "");
    const fuzzyResult = FuzzyResolver.resolveClickable(queryText, description);

    return {
      element: fuzzyResult.element,
      targetStep: fuzzyResult.targetStep,
      isAmenity: fuzzyResult.isAmenity,
      matchedAmenityId: fuzzyResult.matchedAmenityId,
    };
  }

  /**
   * Resolves form input element with direct selector/ID/field priority before fuzzy heuristics.
   */
  static resolveInput(
    target: TargetInput,
    description?: string
  ): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
    if (typeof document === "undefined") return null;

    // Tier 1: Ephemeral Ref Resolution (el_X or [el_X])
    let ref: string | undefined;
    if (typeof target === "object" && target !== null && target.ref) {
      ref = target.ref;
    } else if (typeof target === "string") {
      const trimmed = target.trim();
      if (trimmed.startsWith("el_") || /^\[el_\d+\]$/.test(trimmed)) {
        ref = trimmed.replace(/[\[\]]/g, "");
      }
    }
    if (ref) {
      const el = RefResolver.resolve(ref);
      if (el && isFormElement(el)) return el;
    }

    // Tier 2: Direct ID, Name, or LumenField matching
    if (typeof target === "string") {
      const trimmed = target.trim();
      const idToTry = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

      const elById = document.getElementById(idToTry);
      if (elById && isFormElement(elById)) return elById;

      const elByField = document.querySelector<HTMLElement>(
        `[data-lumen-field="${idToTry}"], [data-lumen-field="property.${idToTry}"]`
      );
      if (elByField && isFormElement(elByField)) return elByField;

      const elByName = document.querySelector<HTMLElement>(
        `input[name="${idToTry}"], textarea[name="${idToTry}"], select[name="${idToTry}"]`
      );
      if (elByName && isFormElement(elByName)) return elByName;

      if (trimmed.startsWith("#") || trimmed.startsWith(".") || trimmed.startsWith("[")) {
        try {
          const elBySel = document.querySelector<HTMLElement>(trimmed);
          if (elBySel && isFormElement(elBySel)) return elBySel;
        } catch {
          // Ignore invalid selector syntax
        }
      }
    } else if (target && typeof target === "object") {
      if (target.lumenField) {
        const el =
          document.getElementById(target.lumenField) ||
          document.querySelector<HTMLElement>(
            `[data-lumen-field="${target.lumenField}"], [data-lumen-field="property.${target.lumenField}"]`
          ) ||
          document.querySelector<HTMLElement>(
            `input[name="${target.lumenField}"], textarea[name="${target.lumenField}"]`
          );
        if (el && isFormElement(el)) return el;
      }

      if (target.selector) {
        try {
          const el = document.querySelector<HTMLElement>(target.selector);
          if (el && isFormElement(el)) return el;
        } catch {
          // Ignore
        }
      }

      if (target.name) {
        const el =
          document.getElementById(target.name) ||
          document.querySelector<HTMLElement>(
            `input[name="${target.name}"], textarea[name="${target.name}"]`
          );
        if (el && isFormElement(el)) return el;
      }
    }

    // Tier 3: Semantic and Fuzzy Heuristics
    const query =
      typeof target === "string"
        ? target
        : target.lumenField || target.selector || target.name || target.text || "";
    return FuzzyResolver.resolveInput(query, description);
  }
}

function isFormElement(
  el: HTMLElement
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}
