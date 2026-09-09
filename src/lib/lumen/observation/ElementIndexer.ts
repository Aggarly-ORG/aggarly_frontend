import { BrowserElementRef, ElementBox } from "../protocol/BrowserObservation";

export class ElementIndexer {
  private static refToElementMap = new Map<string, HTMLElement>();
  private static elementToRefMap = new WeakMap<HTMLElement, string>();
  private static observationCounter = 0;

  /**
   * Clears the current ephemeral index and re-indexes all interactive elements.
   */
  static indexPage(): { elements: BrowserElementRef[]; observationId: string } {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return { elements: [], observationId: "obs_0" };
    }

    this.refToElementMap.clear();
    this.observationCounter++;
    const observationId = `obs_${this.observationCounter}_${Date.now().toString(36).slice(-4)}`;

    const elements: BrowserElementRef[] = [];
    let counter = 0;

    const interactiveSelectors = [
      "input:not([type='hidden'])",
      "textarea",
      "select",
      "button",
      "a[href]",
      "[role='button']",
      "[role='tab']",
      "[role='checkbox']",
      "[data-lumen-field]",
      "[data-lumen-action]",
      "[data-lumen-amenity-id]",
      "[data-amenity-id]",
      "[tabindex='0']",
      "summary",
    ].join(", ");

    const rawElements = Array.from(
      document.querySelectorAll<HTMLElement>(interactiveSelectors)
    );

    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const innerW = window.innerWidth || document.documentElement.clientWidth;
    const innerH = window.innerHeight || document.documentElement.clientHeight;

    for (const el of rawElements) {
      // Exclude anything inside Lumen co-pilot drawer or overlays
      if (el.closest("[data-copilot-drawer]") || el.closest("[data-lumen-overlay]")) {
        continue;
      }

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      const isHidden =
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        rect.width === 0 ||
        rect.height === 0;

      const visible = !isHidden;
      const inViewport =
        visible &&
        rect.bottom >= 0 &&
        rect.top <= innerH &&
        rect.right >= 0 &&
        rect.left <= innerW;

      const box: ElementBox = {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        documentX: Math.round(rect.left + scrollX),
        documentY: Math.round(rect.top + scrollY),
      };

      // Determine semantic role
      let role = el.getAttribute("role") || "";
      if (!role) {
        const tag = el.tagName.toLowerCase();
        if (tag === "button") role = "button";
        else if (tag === "textarea") role = "textbox";
        else if (tag === "select") role = "combobox";
        else if (tag === "a") role = "link";
        else if (tag === "input") {
          const type = (el as HTMLInputElement).type || "text";
          if (type === "checkbox") role = "checkbox";
          else if (type === "number") role = "spinbutton";
          else if (type === "radio") role = "radio";
          else if (type === "range") role = "slider";
          else if (type === "search") role = "searchbox";
          else role = "textbox";
        } else if (el.hasAttribute("data-amenity-id")) {
          role = "checkbox";
        } else if (el.hasAttribute("data-wizard-step")) {
          role = "tab";
        } else {
          role = "button";
        }
      }

      // Determine label / name
      let name: string | undefined = undefined;
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) {
        name = ariaLabel.trim();
      } else if (el.id) {
        const labelEl = document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`);
        if (labelEl) name = labelEl.textContent?.trim();
      }
      if (!name) {
        const parentLabel = el.closest("label");
        if (parentLabel) name = parentLabel.textContent?.trim();
      }
      if (!name && el.getAttribute("data-step-name")) {
        name = el.getAttribute("data-step-name")?.trim();
      }
      if (!name && el.getAttribute("data-amenity-name")) {
        name = el.getAttribute("data-amenity-name")?.trim();
      }
      if (!name && el.getAttribute("title")) {
        name = el.getAttribute("title")?.trim();
      }
      if (!name && el instanceof HTMLInputElement && el.placeholder) {
        name = el.placeholder.trim();
      }
      if (!name) {
        const textContent = el.textContent?.trim().replace(/\s+/g, " ");
        if (textContent && textContent.length <= 60) {
          name = textContent;
        }
      }

      // Generic Icon & Surrounding Context Inference (Works across any page, gallery, table, or list)
      const svgEl = el.querySelector("svg");
      let iconAction: string | undefined = undefined;
      if (svgEl) {
        const svgClass = (svgEl.getAttribute("class") || "") + " " + (el.className || "");
        if (/trash|delete|remove|rubbish/i.test(svgClass)) iconAction = "Remove";
        else if (/plus|add|create/i.test(svgClass)) iconAction = "Add";
        else if (/minus|subtract/i.test(svgClass)) iconAction = "Minus";
        else if (/move-left|chevron-left|arrow-left/i.test(svgClass)) iconAction = "Move Left";
        else if (/move-right|chevron-right|arrow-right/i.test(svgClass)) iconAction = "Move Right";
        else if (/x|close|dismiss/i.test(svgClass)) iconAction = "Close";
        else if (/edit|pencil/i.test(svgClass)) iconAction = "Edit";
        else if (/camera|photo|image|upload/i.test(svgClass)) iconAction = "Upload Photo";
        else if (/search/i.test(svgClass)) iconAction = "Search";
      }

      // Check if button is inside an item container (such as an image card, table row, or list item)
      const itemCard = el.closest<HTMLElement>(
        "[data-image-card], .group, tr, li, [class*='card'], [class*='slot'], [class*='item']"
      );
      if (itemCard) {
        // 1. Detect image in container
        const cardImg = itemCard.querySelector<HTMLImageElement>("img");
        if (cardImg) {
          const allPageImgs = Array.from(document.querySelectorAll<HTMLImageElement>("main img, #main-content img, body img"))
            .filter((im) => !im.closest("[data-copilot-drawer]"));
          const imgIndex = allPageImgs.indexOf(cardImg) + 1;
          const imgDesc = cardImg.alt || cardImg.getAttribute("title") || `image ${imgIndex}`;

          const isRemove = iconAction === "Remove" || /remove|delete|trash/i.test(name || "");
          const isCover = /cover/i.test(name || "") || /cover/i.test(el.textContent || "");
          const isMoveLeft = iconAction === "Move Left" || /left/i.test(name || "");
          const isMoveRight = iconAction === "Move Right" || /right/i.test(name || "");

          if (isRemove) {
            name = imgIndex > 0 ? `Remove image ${imgIndex}` : `Remove ${imgDesc}`;
          } else if (isCover) {
            name = imgIndex > 0 ? `Make image ${imgIndex} cover` : `Make cover`;
          } else if (isMoveLeft) {
            name = imgIndex > 0 ? `Move image ${imgIndex} left` : `Move left`;
          } else if (isMoveRight) {
            name = imgIndex > 0 ? `Move image ${imgIndex} right` : `Move right`;
          }
        }

        // 2. Detect numbered ordinal badge (e.g. 01, 02, 03 or 1, 2, 3) inside item card
        if (!name || name === "Button" || name === "Remove") {
          const badgeEl = itemCard.querySelector<HTMLElement>("[class*='tabular'], [class*='badge'], [class*='number']");
          const badgeMatch = badgeEl?.textContent?.trim().match(/^0?(\d+)$/);
          if (badgeMatch) {
            const itemNum = badgeMatch[1];
            if (iconAction === "Remove" || /remove/i.test(name || "")) {
              name = `Remove item ${itemNum}`;
            }
          }
        }
      }

      if (!name && iconAction) {
        name = iconAction;
      }

      // Determine value
      let value: string | undefined = undefined;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        value = el.value !== undefined ? String(el.value) : undefined;
      }

      // Determine checked
      let checked: boolean | undefined = undefined;
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        checked = el.checked;
      } else if (el.getAttribute("aria-checked") !== null) {
        checked = el.getAttribute("aria-checked") === "true";
      } else if (el.hasAttribute("data-amenity-id")) {
        checked = el.getAttribute("data-amenity-selected") === "true" || el.classList.contains("border-state-success") || el.classList.contains("bg-obsidian-bubble");
      }

      // Determine selected
      let selected: boolean | undefined = undefined;
      if (el.getAttribute("aria-selected") !== null) {
        selected = el.getAttribute("aria-selected") === "true";
      } else if (el.getAttribute("data-active") !== null) {
        selected = el.getAttribute("data-active") === "true";
      }

      const isNativeDisabled = "disabled" in el && Boolean((el as any).disabled);
      const isAriaDisabled = el.getAttribute("aria-disabled") === "true";
      const isClassDisabled =
        el.classList.contains("disabled") ||
        el.classList.contains("pointer-events-none") ||
        el.getAttribute("data-disabled") === "true";
      const enabled = !isNativeDisabled && !isAriaDisabled && !isClassDisabled;

      // Custom Lumen Attributes
      const lumenField =
        el.getAttribute("data-lumen-field") ||
        el.id ||
        el.getAttribute("name") ||
        undefined;
      const lumenAction = el.getAttribute("data-lumen-action") || el.getAttribute("data-action") || undefined;
      const lumenAmenityId = el.getAttribute("data-lumen-amenity-id") || el.getAttribute("data-amenity-id") || undefined;

      counter++;
      const ref = `el_${counter}`;

      this.refToElementMap.set(ref, el);
      this.elementToRefMap.set(el, ref);

      elements.push({
        ref,
        role,
        name: name || undefined,
        value,
        placeholder: (el as HTMLInputElement).placeholder || undefined,
        checked,
        selected,
        visible,
        inViewport,
        enabled,
        box,
        lumenField,
        lumenAction,
        lumenAmenityId,
      });
    }

    return { elements, observationId };
  }

  /**
   * Resolves an ephemeral ref (e.g. "el_18") to its live DOM element.
   */
  static getElementByRef(ref: string): HTMLElement | null {
    return this.refToElementMap.get(ref) || null;
  }

  /**
   * Resolves a live DOM element to its assigned ephemeral ref.
   */
  static getRefByElement(el: HTMLElement): string | null {
    return this.elementToRefMap.get(el) || null;
  }
}
