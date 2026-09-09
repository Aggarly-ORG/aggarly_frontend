import { CursorTracker } from "./CursorTracker";
import { setCursorBeacon, clearCursorBeacon, CursorBeaconState } from "@/store/slices/uiSlice";
import { AppDispatch } from "@/store/store";

export type PointerPhase =
  | "idle"
  | "moving"
  | "hovering"
  | "clicking"
  | "typing"
  | "scrolling"
  | "verifying"
  | "success"
  | "error";

export class CursorController {
  private dispatch: AppDispatch | null = null;
  private currentX = 0;
  private currentY = 0;

  constructor(dispatch?: AppDispatch) {
    if (dispatch) this.dispatch = dispatch;
  }

  setDispatch(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  /**
   * Glides the pointer to coordinates (x, y) with phase and optional label.
   */
  async moveTo(
    targetX: number,
    targetY: number,
    label?: string,
    phase: PointerPhase = "moving"
  ): Promise<void> {
    if (!this.dispatch) return;

    const distance = Math.hypot(targetX - this.currentX, targetY - this.currentY);
    const duration = Math.min(900, Math.max(200, Math.round(distance * 0.9)));

    this.dispatch(
      setCursorBeacon({
        isActive: true,
        x: targetX,
        y: targetY,
        label,
        phase,
        isClicking: false,
      })
    );

    this.currentX = targetX;
    this.currentY = targetY;

    await new Promise((resolve) => setTimeout(resolve, duration));
  }

  /**
   * Glides pointer to an element, starting continuous RAF tracking so it sticks
   * to the element's center even if the window scrolls or layout shifts.
   */
  async trackElement(
    element: HTMLElement,
    label?: string,
    phase: PointerPhase = "hovering"
  ): Promise<DOMRect> {
    const initialRect = element.getBoundingClientRect();
    const initialX = initialRect.left + initialRect.width / 2;
    const initialY = initialRect.top + initialRect.height / 2;

    await this.moveTo(initialX, initialY, label, phase);

    if (this.dispatch) {
      CursorTracker.track(element, (x, y, rect) => {
        this.currentX = x;
        this.currentY = y;
        this.dispatch?.(
          setCursorBeacon({
            isActive: true,
            x,
            y,
            label,
            phase,
            highlightBox: {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          })
        );
      });
    }

    return initialRect;
  }

  /**
   * Triggers the clicking ripple wave animation.
   */
  async triggerClick(label?: string): Promise<void> {
    if (!this.dispatch) return;

    this.dispatch(
      setCursorBeacon({
        isActive: true,
        x: this.currentX,
        y: this.currentY,
        label,
        phase: "clicking",
        isClicking: true,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 280));

    this.dispatch(
      setCursorBeacon({
        isActive: true,
        x: this.currentX,
        y: this.currentY,
        label,
        phase: "hovering",
        isClicking: false,
      })
    );
  }

  /**
   * Updates current phase and label.
   */
  setPhase(phase: PointerPhase, label?: string) {
    if (!this.dispatch) return;
    this.dispatch(
      setCursorBeacon({
        isActive: true,
        x: this.currentX,
        y: this.currentY,
        label,
        phase,
        isClicking: phase === "clicking",
      })
    );
  }

  /**
   * Stops tracking and clears cursor overlay after optional delay.
   */
  hide(delayMs = 800) {
    CursorTracker.stop();
    setTimeout(() => {
      this.dispatch?.(clearCursorBeacon());
    }, delayMs);
  }
}
