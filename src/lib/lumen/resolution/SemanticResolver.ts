export class SemanticResolver {
  static resolve(criteria: {
    role?: string;
    name?: string;
    lumenField?: string;
    lumenAction?: string;
    lumenAmenityId?: string;
  }): HTMLElement | null {
    if (typeof document === "undefined") return null;

    // 1. Direct custom lumen attributes
    if (criteria.lumenField) {
      const el = document.querySelector<HTMLElement>(`[data-lumen-field="${criteria.lumenField}"]`);
      if (el) return el;
    }

    if (criteria.lumenAction) {
      const el =
        document.querySelector<HTMLElement>(`[data-lumen-action="${criteria.lumenAction}"]`) ||
        document.querySelector<HTMLElement>(`[data-action="${criteria.lumenAction}"]`);
      if (el) return el;
    }

    if (criteria.lumenAmenityId) {
      const el =
        document.querySelector<HTMLElement>(`[data-lumen-amenity-id="${criteria.lumenAmenityId}"]`) ||
        document.querySelector<HTMLElement>(`[data-amenity-id="${criteria.lumenAmenityId}"]`) ||
        document.getElementById(`amenity-${criteria.lumenAmenityId}`);
      if (el) return el;
    }

    // 2. Role + Name matching
    if (criteria.name) {
      const nameLower = criteria.name.trim().toLowerCase();
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>("button, input, textarea, select, a, [role]")
      ).filter((c) => !c.closest("[data-copilot-drawer]") && !c.closest("[data-lumen-overlay]"));

      for (const cand of candidates) {
        if (criteria.role) {
          const r = cand.getAttribute("role") || cand.tagName.toLowerCase();
          if (r !== criteria.role.toLowerCase() && cand.tagName.toLowerCase() !== criteria.role.toLowerCase()) {
            continue;
          }
        }

        const aria = (cand.getAttribute("aria-label") || "").toLowerCase();
        const text = (cand.textContent || "").trim().toLowerCase();
        const placeholder = (cand.getAttribute("placeholder") || "").toLowerCase();
        const stepName = (cand.getAttribute("data-step-name") || "").toLowerCase();

        if (
          aria === nameLower ||
          text === nameLower ||
          stepName === nameLower ||
          (text.includes(nameLower) && text.length < 80) ||
          (placeholder && placeholder.includes(nameLower))
        ) {
          return cand;
        }
      }
    }

    return null;
  }
}
