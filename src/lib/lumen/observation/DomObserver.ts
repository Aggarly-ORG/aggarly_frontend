import { ObservationBuilder } from "./ObservationBuilder";
import { BrowserObservation } from "../protocol/BrowserObservation";

export type ObservationCallback = (observation: BrowserObservation) => void;

export class DomObserver {
  private observer: MutationObserver | null = null;
  private debounceTimer: any = null;
  private lastHash: string = "";
  private listeners: Set<ObservationCallback> = new Set();

  constructor() {}

  start() {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (this.observer) return;

    this.observer = new MutationObserver(() => {
      this.scheduleRebuild();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "disabled", "aria-selected", "aria-checked", "data-active", "value"],
    });

    // Also listen to scroll and resize
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("resize", this.handleScroll, { passive: true });
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("scroll", this.handleScroll);
      window.removeEventListener("resize", this.handleScroll);
    }
  }

  subscribe(callback: ObservationCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private handleScroll = () => {
    this.scheduleRebuild();
  };

  private scheduleRebuild() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const observation = ObservationBuilder.build();
      const hash = this.computeHash(observation);

      if (hash !== this.lastHash) {
        this.lastHash = hash;
        this.listeners.forEach((cb) => cb(observation));
      }
    }, 60);
  }

  private computeHash(obs: BrowserObservation): string {
    const elSummary = obs.elements
      .map((e) => `${e.ref}:${e.name}:${e.value || ""}:${e.checked}:${e.inViewport}`)
      .join("|");
    return `${obs.pathname}:${obs.viewport.scrollY}:${elSummary}`;
  }
}
