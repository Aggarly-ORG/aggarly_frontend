import {
  PageSnapshot,
  PageSnapshotField,
  PageSnapshotButton,
  PageSnapshotCheckbox,
  PageSnapshotTab,
  PageSnapshotSection,
} from "./types";
import { ObservationBuilder } from "./lumen/observation/ObservationBuilder";

export class DomSnapshotAgent {
  /**
   * Captures a structured JSON representation of the active document's interactive elements.
   */
  static capture(): PageSnapshot {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return {
        url: "",
        pathname: "",
        fields: [],
        buttons: [],
        checkboxes: [],
        tabs: [],
        sections: [],
      };
    }

    const pathname = window.location.pathname;
    const url = window.location.href;

    // 1. Form fields (<input>, <textarea>, <select>)
    const fields: PageSnapshotField[] = [];
    const inputElements = document.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='file']), textarea, select");

    inputElements.forEach((el) => {
      // Don't capture inputs inside copilot drawer
      if (el.closest("[data-copilot-drawer]")) return;

      const id = el.id || el.getAttribute("name") || "";
      const name = el.getAttribute("name") || el.id || "";
      const type = el instanceof HTMLTextAreaElement ? "textarea" : el instanceof HTMLSelectElement ? "select" : el.type;
      const placeholder = el.getAttribute("placeholder") || undefined;
      const value = el.value ? el.value.slice(0, 100) : "";

      // Try finding an associated label
      let label: string | undefined = undefined;
      if (el.id) {
        const lblEl = document.querySelector(`label[for="${el.id}"]`);
        if (lblEl) label = lblEl.textContent?.trim();
      }
      if (!label) {
        const parentLbl = el.closest("label");
        if (parentLbl) label = parentLbl.textContent?.trim();
      }
      if (!label && el.getAttribute("aria-label")) {
        label = el.getAttribute("aria-label") || undefined;
      }

      if (id || name || label) {
        fields.push({ id, name, type, label, value, placeholder });
      }
    });

    // 2. Checkboxes (especially amenity tiles)
    const checkboxes: PageSnapshotCheckbox[] = [];
    const checkElements = document.querySelectorAll<HTMLElement>("input[type='checkbox'], [role='checkbox']");

    checkElements.forEach((el) => {
      if (el.closest("[data-copilot-drawer]")) return;

      const id = el.id || "";
      const name = el.getAttribute("name") || undefined;
      const dataAmenityId = el.getAttribute("data-amenity-id") || el.id?.replace(/^amenity-/, "") || undefined;
      const dataAmenityName = el.getAttribute("data-amenity-name") || undefined;
      const checked = el instanceof HTMLInputElement ? el.checked : el.getAttribute("aria-checked") === "true";

      let label = dataAmenityName;
      if (!label && el.id) {
        const lblEl = document.querySelector(`label[for="${el.id}"]`);
        if (lblEl) label = lblEl.textContent?.trim();
      }
      if (!label) {
        const parentText = el.closest("div, label")?.textContent?.trim();
        if (parentText && parentText.length < 60) label = parentText;
      }

      checkboxes.push({
        id,
        name,
        dataAmenityId,
        dataAmenityName: dataAmenityName || label,
        checked,
        label,
      });
    });

    // 3. Buttons and interactive clickable triggers
    const buttons: PageSnapshotButton[] = [];
    const buttonElements = document.querySelectorAll<HTMLButtonElement | HTMLElement>(
      "button, [role='button'], a[data-action]"
    );

    buttonElements.forEach((el) => {
      if (el.closest("[data-copilot-drawer]")) return;

      const text = el.textContent?.trim().replace(/\s+/g, " ") || "";
      if (!text || text.length > 50) return;

      let selector = "";
      if (el.id) {
        selector = `#${el.id}`;
      } else if (el.getAttribute("data-action")) {
        selector = `[data-action="${el.getAttribute("data-action")}"]`;
      } else if (el.getAttribute("data-amenity-id")) {
        selector = `[data-amenity-id="${el.getAttribute("data-amenity-id")}"]`;
      } else {
        selector = text;
      }

      buttons.push({
        id: el.id || undefined,
        text,
        selector,
      });
    });

    // 4. Tabs / Steps
    const tabs: PageSnapshotTab[] = [];
    const tabElements = document.querySelectorAll<HTMLElement>("[role='tab'], [data-wizard-step]");

    tabElements.forEach((el) => {
      if (el.closest("[data-copilot-drawer]")) return;

      const text = el.textContent?.trim().replace(/\s+/g, " ") || "";
      const isActive =
        el.getAttribute("aria-selected") === "true" ||
        el.classList.contains("active") ||
        el.getAttribute("data-active") === "true";

      tabs.push({
        id: el.id || undefined,
        text,
        isActive,
        selector: el.id ? `#${el.id}` : undefined,
      });
    });

    // 5. Headings / Sections
    const sections: PageSnapshotSection[] = [];
    const headingElements = document.querySelectorAll<HTMLHeadingElement>("h1, h2, h3");

    headingElements.forEach((el) => {
      if (el.closest("[data-copilot-drawer]")) return;

      const heading = el.textContent?.trim().replace(/\s+/g, " ") || "";
      if (heading && heading.length <= 80) {
        sections.push({ id: el.id || undefined, heading });
      }
    });

    return {
      url,
      pathname,
      fields: fields.slice(0, 30),
      buttons: buttons.slice(0, 30),
      checkboxes: checkboxes.slice(0, 50),
      tabs: tabs.slice(0, 10),
      sections: sections.slice(0, 15),
    };
  }

  /**
   * Generates a compact string summary suitable for prompt injection into Lumen's LLM turn.
   * Includes modern [el_X] element references and viewport geometry.
   */
  static captureCompact(): string {
    try {
      return ObservationBuilder.buildPromptContext();
    } catch (e) {
      // Safe fallback if ObservationBuilder throws
      const snapshot = this.capture();
      const parts: string[] = [];
      parts.push(`PATH: ${snapshot.pathname}`);
      if (snapshot.sections.length > 0) {
        parts.push(`SECTIONS: ${snapshot.sections.map((s) => `"${s.heading}"`).join(", ")}`);
      }
      if (snapshot.fields.length > 0) {
        const fieldList = snapshot.fields
          .map((f) => `${f.name || f.id}(${f.type}${f.value ? `="${f.value}"` : ""})`)
          .join(", ");
        parts.push(`FIELDS: ${fieldList}`);
      }
      if (snapshot.checkboxes.length > 0) {
        const checkList = snapshot.checkboxes
          .map(
            (c) =>
              `${c.dataAmenityId || c.id || c.label}:[${c.checked ? "CHECKED" : "UNCHECKED"}]`
          )
          .join(", ");
        parts.push(`AMENITIES/CHECKBOXES: ${checkList}`);
      }
      if (snapshot.buttons.length > 0) {
        const btnList = snapshot.buttons.slice(0, 20).map((b) => `"${b.text}"`).join(", ");
        parts.push(`BUTTONS: ${btnList}`);
      }
      return parts.join("\n");
    }
  }
}
