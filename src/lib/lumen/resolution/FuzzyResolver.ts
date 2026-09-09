export interface FuzzyTargetDetails {
  raw: string;
  cleanText: string;
  alphanumeric: string;
  isCssSelector: boolean;
}

function normalizeOrdinals(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/\b(first|1st)\b/g, "1")
    .replace(/\b(second|2nd)\b/g, "2")
    .replace(/\b(third|3rd)\b/g, "3")
    .replace(/\b(fourth|4th)\b/g, "4")
    .replace(/\b(fifth|5th)\b/g, "5")
    .replace(/\b(sixth|6th)\b/g, "6")
    .replace(/\b(seventh|7th)\b/g, "7")
    .replace(/\b(eighth|8th)\b/g, "8")
    .replace(/\b(ninth|9th)\b/g, "9")
    .replace(/\b(tenth|10th)\b/g, "10");
}

export class FuzzyResolver {
  static parseTarget(rawTarget: string): FuzzyTargetDetails {
    const raw = (rawTarget || "").trim();

    // Extract from jQuery :contains('...') or :contains("...")
    const containsMatch = raw.match(/:contains\(\s*['"]?([^'"]+?)['"]?\s*\)/i);
    let cleanText = containsMatch ? containsMatch[1].trim() : "";

    if (!cleanText) {
      cleanText = raw
        .replace(/^['"`]|['"`]$/g, "")
        .replace(/^[a-z]+:/i, "")
        .trim();
    }

    const alphanumeric = cleanText.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isCssSelector =
      (raw.startsWith("#") ||
        raw.startsWith(".") ||
        raw.startsWith("[") ||
        (raw.includes("[") && raw.includes("]"))) &&
      !raw.includes(":contains");

    return { raw, cleanText, alphanumeric, isCssSelector };
  }

  static resolveClickable(
    rawTarget: string,
    description?: string
  ): { element: HTMLElement | null; targetStep: number | null; isAmenity: boolean; matchedAmenityId?: string } {
    if (typeof document === "undefined") {
      return { element: null, targetStep: null, isAmenity: false };
    }

    const details = this.parseTarget(rawTarget);
    const combined = `${details.raw} ${details.cleanText} ${description || ""}`.toLowerCase();
    const cleanAlnum = combined.replace(/[^a-z0-9]/g, "");

    // 1. Generic Navigation Intent Resolution (next/prev/continue/back)
    const isNext = ["next", "continue", "proceed", "advance", "forward"].some((kw) => combined.includes(kw));
    const isPrev = ["prev", "previous", "back", "return"].some((kw) => combined.includes(kw));

    if (isNext) {
      const btn =
        document.querySelector<HTMLElement>('[data-lumen-action="next"]') ||
        document.querySelector<HTMLElement>('[data-lumen-action="next-step"]') ||
        document.querySelector<HTMLElement>('[data-lumen-action="wizard.next"]') ||
        document.querySelector<HTMLElement>('[data-action="next-step"]') ||
        Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((b) => {
          const t = (b.textContent || "").toLowerCase();
          return t.includes("continue") || t.includes("next");
        }) ||
        document.querySelector<HTMLElement>('[type="submit"]');
      if (btn) return { element: btn, targetStep: null, isAmenity: false };
    }

    if (isPrev) {
      const btn =
        document.querySelector<HTMLElement>('[data-lumen-action="prev"]') ||
        document.querySelector<HTMLElement>('[data-lumen-action="prev-step"]') ||
        document.querySelector<HTMLElement>('[data-lumen-action="wizard.prev"]') ||
        document.querySelector<HTMLElement>('[data-action="prev-step"]') ||
        Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((b) => {
          const t = (b.textContent || "").toLowerCase();
          return t.includes("previous") || t.includes("back");
        });
      if (btn) return { element: btn, targetStep: null, isAmenity: false };
    }

    // 4. Amenity tile matching
    const amenityElements = Array.from(document.querySelectorAll<HTMLElement>("[data-amenity-id]"));
    for (const aEl of amenityElements) {
      const aId = aEl.getAttribute("data-amenity-id") || "";
      const aName = aEl.getAttribute("data-amenity-name") || "";
      const aAlnum = (aId + aName).toLowerCase().replace(/[^a-z0-9]/g, "");

      if (details.alphanumeric && (aAlnum.includes(details.alphanumeric) || details.alphanumeric.includes(aAlnum))) {
        return { element: aEl, targetStep: null, isAmenity: true, matchedAmenityId: aId };
      }
    }

    // 5. Scored interactive element search
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, a, [role='button'], [role='tab'], input[type='button'], input[type='submit'], [data-action], label, summary, [tabindex='0']"
      )
    ).filter((c) => !c.closest("[data-copilot-drawer]") && !c.closest("[data-lumen-overlay]"));

    let bestMatch: HTMLElement | null = null;
    let highestScore = 0;
    const targetLower = details.cleanText.toLowerCase();

    for (const cand of candidates) {
      const candText = (cand.textContent || "").trim().toLowerCase();
      const candAlnum = candText.replace(/[^a-z0-9]/g, "");
      const aria = (cand.getAttribute("aria-label") || "").toLowerCase();
      const stepName = (cand.getAttribute("data-step-name") || "").toLowerCase();
      const lumenAction = (cand.getAttribute("data-lumen-action") || cand.getAttribute("data-action") || "").toLowerCase();

      const normCandText = normalizeOrdinals(candText);
      const normAria = normalizeOrdinals(aria);
      const normTarget = normalizeOrdinals(targetLower);
      const normCombined = normalizeOrdinals(combined);

      let score = 0;
      if (candText === targetLower || (lumenAction && (lumenAction === targetLower || lumenAction === normTarget))) score = 100;
      else if (aria === targetLower || (normAria && normAria === normTarget)) score = 95;
      else if (candAlnum === details.alphanumeric && details.alphanumeric.length > 2) score = 90;
      else if (stepName && (stepName.includes(targetLower) || targetLower.includes(stepName))) score = 85;
      else if (aria && (aria.includes(targetLower) || targetLower.includes(aria) || (normAria && normAria.includes(normTarget)) || (normTarget && normTarget.includes(normAria)))) score = 80;
      else if (lumenAction && (normTarget.includes(lumenAction) || normCombined.includes(lumenAction))) score = 80;
      else if (candText.includes(targetLower) && targetLower.length > 2) score = 70;
      else if (targetLower.includes(candText) && candText.length > 2) score = 60;

      if (score > highestScore) {
        highestScore = score;
        bestMatch = cand;
      }
    }

    if (bestMatch && highestScore >= 50) {
      const isAmenity = !!bestMatch.getAttribute("data-amenity-id");
      return {
        element: bestMatch,
        targetStep: null,
        isAmenity,
        matchedAmenityId: bestMatch.getAttribute("data-amenity-id") || undefined,
      };
    }

    // 6. Deep DOM text node search
    if (details.cleanText.length >= 3) {
      const allTextEls = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, span, p, div, li"))
        .filter((el) => !el.closest("[data-copilot-drawer]") && !el.closest("[data-lumen-overlay]"));
      for (const tEl of allTextEls) {
        const t = (tEl.textContent || "").trim().toLowerCase();
        if (t === targetLower || (t.includes(targetLower) && t.length < 80)) {
          const clickable = tEl.closest<HTMLElement>("button, a, [role='button'], [role='tab'], label, [data-action], [tabindex='0']");
          return {
            element: clickable || tEl,
            targetStep: null,
            isAmenity: !!(clickable || tEl).getAttribute("data-amenity-id"),
            matchedAmenityId: (clickable || tEl).getAttribute("data-amenity-id") || undefined,
          };
        }
      }
    }

    return { element: null, targetStep: null, isAmenity: false };
  }

  static resolveInput(
    rawTarget: string,
    description?: string
  ): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
    if (typeof document === "undefined") return null;

    const details = this.parseTarget(rawTarget);
    const targetLower = `${details.raw} ${details.cleanText}`.toLowerCase().trim();
    const descLower = (description || "").toLowerCase().trim();

    // 1. Description / Textarea (Check FIRST so it cannot be intercepted by title or others)
    const isDesc =
      targetLower.includes("desc") ||
      targetLower.includes("curatorial") ||
      targetLower.includes("monograph") ||
      targetLower.includes("caption") ||
      (descLower.includes("description") && !descLower.includes("title")) ||
      (descLower.includes("curatorial") && !descLower.includes("title"));

    if (isDesc) {
      const el =
        document.getElementById("description") ||
        document.querySelector<HTMLElement>("[data-lumen-field='description']") ||
        document.querySelector<HTMLElement>("[data-lumen-field='property.description']") ||
        document.querySelector<HTMLElement>("textarea[name='description']") ||
        document.querySelector<HTMLElement>("textarea");
      if (el && isFormElement(el)) return el;
    }

    // 2. Street / Address
    const isStreet =
      targetLower.includes("street") ||
      targetLower.includes("address") ||
      targetLower.includes("way") ||
      (descLower.includes("street") && !descLower.includes("title")) ||
      (descLower.includes("address") && !descLower.includes("title"));

    if (isStreet) {
      const el =
        document.getElementById("street") ||
        document.querySelector<HTMLElement>("[data-lumen-field='street']") ||
        document.querySelector<HTMLElement>("[data-lumen-field='property.street']") ||
        document.querySelector<HTMLElement>("input[name='street']");
      if (el && isFormElement(el)) return el;
    }

    // 3. City / Municipality
    if (targetLower.includes("city") || targetLower.includes("municipality") || descLower.includes("city")) {
      const el =
        document.getElementById("city") ||
        document.querySelector<HTMLElement>("[data-lumen-field='city']") ||
        document.querySelector<HTMLElement>("[data-lumen-field='property.city']") ||
        document.querySelector<HTMLElement>("input[name='city']");
      if (el && isFormElement(el)) return el;
    }

    // 4. State / Region / Province
    if (targetLower.includes("state") || targetLower.includes("region") || targetLower.includes("province")) {
      const el =
        document.getElementById("stateRegion") ||
        document.querySelector<HTMLElement>("[data-lumen-field='stateRegion']") ||
        document.querySelector<HTMLElement>("input[name='stateRegion']");
      if (el && isFormElement(el)) return el;
    }

    // 5. Postal / Zip Code
    if (targetLower.includes("postal") || targetLower.includes("zip")) {
      const el =
        document.getElementById("postalCode") ||
        document.querySelector<HTMLElement>("[data-lumen-field='postalCode']") ||
        document.querySelector<HTMLElement>("input[name='postalCode']");
      if (el && isFormElement(el)) return el;
    }

    // 6. Country
    if (targetLower.includes("country")) {
      const el =
        document.getElementById("country") ||
        document.querySelector<HTMLElement>("[data-lumen-field='country']") ||
        document.querySelector<HTMLElement>("input[name='country']");
      if (el && isFormElement(el)) return el;
    }

    // 7. Title (ONLY if explicitly matching title, and NOT matching description or address)
    const isTitle =
      targetLower === "title" ||
      targetLower.includes("title") ||
      targetLower.includes("listing title") ||
      targetLower.includes("sanctuary title") ||
      targetLower.includes("listing name") ||
      targetLower.includes("sanctuary name") ||
      (descLower.includes("title") && !descLower.includes("desc") && !descLower.includes("address"));

    if (isTitle && !targetLower.includes("desc") && !targetLower.includes("address") && !targetLower.includes("street")) {
      const el =
        document.getElementById("title") ||
        document.querySelector<HTMLElement>("[data-lumen-field='title']") ||
        document.querySelector<HTMLElement>("[data-lumen-field='property.title']") ||
        document.querySelector<HTMLElement>("input[name='title']") ||
        document.querySelector<HTMLElement>("input[placeholder*='Villa Cala Salada']");
      if (el && isFormElement(el)) return el;
    }

    // 8. Price / Tariff
    if (targetLower.includes("price") || targetLower.includes("tariff") || targetLower.includes("rate") || descLower.includes("price")) {
      const el =
        document.getElementById("basePrice") ||
        document.querySelector<HTMLElement>("[data-lumen-field='basePrice']") ||
        document.querySelector<HTMLElement>("[data-lumen-field='property.basePrice']") ||
        document.querySelector<HTMLElement>("input[name='basePrice']") ||
        document.querySelector<HTMLElement>("input[type='number']");
      if (el && isFormElement(el)) return el;
    }

    // 9. Guests / Capacity
    if (targetLower.includes("guest") || targetLower.includes("capacity") || descLower.includes("guest")) {
      const el =
        document.getElementById("maxGuests") ||
        document.querySelector<HTMLElement>("[data-lumen-field='maxGuests']") ||
        document.querySelector<HTMLElement>("input[name='maxGuests']");
      if (el && isFormElement(el)) return el;
    }

    // 10. Bedrooms
    if (targetLower.includes("bedroom") || targetLower.includes("bed") || descLower.includes("bedroom")) {
      const el =
        document.getElementById("bedrooms") ||
        document.querySelector<HTMLElement>("[data-lumen-field='bedrooms']") ||
        document.querySelector<HTMLElement>("input[name='bedrooms']");
      if (el && isFormElement(el)) return el;
    }

    // 11. Bathrooms
    if (targetLower.includes("bathroom") || targetLower.includes("bath") || descLower.includes("bathroom")) {
      const el =
        document.getElementById("bathrooms") ||
        document.querySelector<HTMLElement>("[data-lumen-field='bathrooms']") ||
        document.querySelector<HTMLElement>("input[name='bathrooms']");
      if (el && isFormElement(el)) return el;
    }

    // 12. Label search
    const labels = Array.from(document.querySelectorAll<HTMLLabelElement>("label"))
      .filter((lbl) => !lbl.closest("[data-copilot-drawer]") && !lbl.closest("[data-lumen-overlay]"));
    for (const lbl of labels) {
      if ((lbl.textContent || "").toLowerCase().includes(details.cleanText.toLowerCase())) {
        if (lbl.htmlFor) {
          const targetEl = document.getElementById(lbl.htmlFor);
          if (targetEl && isFormElement(targetEl)) return targetEl;
        }
        const child = lbl.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea, select");
        if (child) return child;
        const sibling = lbl.closest("div")?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea, select");
        if (sibling) return sibling;
      }
    }

    return null;
  }
}

function isFormElement(el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}
