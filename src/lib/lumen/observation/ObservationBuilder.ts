import { BrowserObservation } from "../protocol/BrowserObservation";
import { ViewportObserver } from "./ViewportObserver";
import { ElementIndexer } from "./ElementIndexer";

export class ObservationBuilder {
  /**
   * Captures the full machine BrowserObservation.
   */
  static build(): BrowserObservation {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return {
        id: "obs_empty",
        timestamp: Date.now(),
        url: "",
        pathname: "",
        title: "",
        viewport: ViewportObserver.capture(),
        elements: [],
        sections: [],
      };
    }

    const { elements, observationId } = ElementIndexer.indexPage();
    const viewport = ViewportObserver.capture();

    const sections: string[] = Array.from(
      document.querySelectorAll<HTMLElement>("h1, h2, h3")
    )
      .filter((h) => !h.closest("[data-copilot-drawer]") && !h.closest("[data-lumen-overlay]"))
      .map((h) => (h.textContent || "").trim().replace(/\s+/g, " "))
      .filter((t) => t.length > 0 && t.length <= 80)
      .slice(0, 10);

    const activeEl = document.activeElement as HTMLElement | null;
    const focusRef = activeEl ? ElementIndexer.getRefByElement(activeEl) || undefined : undefined;

    return {
      id: observationId,
      timestamp: Date.now(),
      url: window.location.href,
      pathname: window.location.pathname,
      title: document.title,
      viewport,
      focusRef,
      elements,
      sections,
    };
  }

  /**
   * Builds the compact, token-efficient representation for injection into Lumen's LLM context.
   * Formatted with [el_X] references, roles, bounding boxes, and action semantics.
   */
  static buildPromptContext(): string {
    const obs = this.build();
    const lines: string[] = [];

    const propMatch = obs.pathname.match(/\/host\/manage\/([a-zA-Z0-9-]+)/);
    const propId = propMatch?.[1] || (typeof window !== "undefined" ? localStorage.getItem("lumen_last_property_id") : null);
    const propHeader = propId ? ` | PROPERTY_ID: ${propId}` : "";
    lines.push(`OBSERVATION: ${obs.id} | PATH: ${obs.pathname}${propHeader}`);
    lines.push(`VIEWPORT: ${obs.viewport.width}x${obs.viewport.height} | SCROLL: ${obs.viewport.scrollY}/${obs.viewport.maxScrollY}`);

    if (obs.sections.length > 0) {
      lines.push(`SECTIONS: ${obs.sections.map((s) => `"${s}"`).join(", ")}`);
    }

    // Filter relevant elements for LLM context (avoid overloading context)
    const formFields = obs.elements.filter(
      (e) =>
        e.role === "textbox" ||
        e.role === "spinbutton" ||
        e.role === "combobox" ||
        e.role === "searchbox" ||
        e.role === "slider"
    );
    const tabs = obs.elements.filter((e) => e.role === "tab");
    const toggles = obs.elements.filter(
      (e) => !!e.lumenAmenityId || e.role === "checkbox" || e.role === "switch" || e.role === "radio"
    );
    const actions = obs.elements.filter(
      (e) =>
        (e.role === "button" || e.role === "link" || e.role === "menuitem") &&
        !toggles.includes(e) &&
        !tabs.includes(e)
    );

    // 1. Interactive Elements with [el_X] refs
    lines.push("ELEMENTS:");
    if (tabs.length > 0) {
      const tabStr = tabs
        .map((t) => `[${t.ref}] tab "${t.name}"${t.selected ? "(ACTIVE)" : ""}${!t.enabled ? " (DISABLED)" : ""}`)
        .join(", ");
      lines.push(`TABS: ${tabStr}`);
    }

    if (formFields.length > 0) {
      const fieldStr = formFields
        .slice(0, 25)
        .map((f) => {
          const val = f.value ? `="${f.value}"` : "";
          const nameStr = f.name ? `"${f.name}"` : "";
          const fieldTag = f.lumenField ? ` field="${f.lumenField}"` : "";
          const disTag = !f.enabled ? " (DISABLED)" : "";
          return `[${f.ref}] ${f.role} ${nameStr}${val}${fieldTag}${disTag} (${f.inViewport ? "visible" : "scroll-needed"})`;
        })
        .join("\n");
      lines.push(`FIELDS:\n${fieldStr}`);
    }

    if (toggles.length > 0) {
      const toggleStr = toggles
        .slice(0, 50)
        .map((a) => {
          const state = a.checked ? "CHECKED" : "UNCHECKED";
          const disTag = !a.enabled ? " (DISABLED)" : "";
          return `[${a.ref}] ${a.lumenAmenityId || a.name || a.role}:[${state}]${disTag}`;
        })
        .join(", ");
      lines.push(`AMENITIES/CHECKBOXES: ${toggleStr}`);
    }

    // Extract and list images on the page for visual and item-targeting awareness
    if (typeof document !== "undefined") {
      const pageImages = Array.from(document.querySelectorAll<HTMLImageElement>("main img, #main-content img, body img"))
        .filter((im) => !im.closest("[data-copilot-drawer]"))
        .slice(0, 15);

      if (pageImages.length > 0) {
        const imgLines = pageImages.map((img, idx) => {
          const desc = img.alt || img.title || (img.src.split("/").pop()?.split("?")[0] || `Photo ${idx + 1}`);
          return `[img_${idx + 1}] Image ${idx + 1}: "${desc}"`;
        });
        lines.push(`IMAGES (${pageImages.length} total): ${imgLines.join(", ")}`);
      }
    }

    if (actions.length > 0) {
      // Prioritize primary and high-intent actions (navigation, submit, remove, delete, media)
      const priorityActionWords = [
        "save",
        "continue",
        "next",
        "submit",
        "publish",
        "confirm",
        "approve",
        "apply",
        "previous",
        "remove",
        "delete",
        "cover",
        "upload",
        "cancel",
      ];
      const priorityButtons = actions.filter((b) =>
        priorityActionWords.some((w) => (b.name || "").toLowerCase().includes(w))
      );
      const otherButtons = actions.filter(
        (b) => !priorityActionWords.some((w) => (b.name || "").toLowerCase().includes(w))
      );
      const actionList = [...priorityButtons, ...otherButtons].slice(0, 60);

      const actionStr = actionList
        .map((a) => {
          const disTag = !a.enabled ? " (DISABLED)" : "";
          const actionAttr = a.lumenAction ? ` action="${a.lumenAction}"` : "";
          return `[${a.ref}] "${a.name || "Button"}"${disTag}${actionAttr} (${a.inViewport ? "visible" : "scroll-needed"})`;
        })
        .join(", ");
      lines.push(`BUTTONS: ${actionStr}`);
    }

    return lines.join("\n");
  }
}
