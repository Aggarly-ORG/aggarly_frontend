export class CursorTracker {
  private static animationFrameId: number | null = null;
  private static activeElement: HTMLElement | null = null;

  /**
   * Tracks an element's viewport center continuously using requestAnimationFrame.
   * Invokes callback with updated (x, y) on every frame, keeping the cursor attached
   * while the page or element is moving/scrolling.
   */
  static track(
    element: HTMLElement,
    onPositionUpdate: (x: number, y: number, rect: DOMRect) => void
  ) {
    this.stop();
    this.activeElement = element;

    const loop = () => {
      if (!this.activeElement || !document.contains(this.activeElement)) {
        this.stop();
        return;
      }

      const rect = this.activeElement.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      onPositionUpdate(x, y, rect);
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Cancels active tracking loop.
   */
  static stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.activeElement = null;
  }

  /**
   * Waits for smooth scrolling to physically settle across frames.
   */
  static waitForScrollToSettle(timeoutMs = 1500, stableFramesThreshold = 4): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();

    return new Promise((resolve) => {
      let lastY = window.scrollY;
      let lastX = window.scrollX;
      let stableFrames = 0;
      const startTime = performance.now();

      const check = () => {
        const currentY = window.scrollY;
        const currentX = window.scrollX;

        if (Math.abs(currentY - lastY) < 1 && Math.abs(currentX - lastX) < 1) {
          stableFrames++;
        } else {
          stableFrames = 0;
          lastY = currentY;
          lastX = currentX;
        }

        if (stableFrames >= stableFramesThreshold || performance.now() - startTime >= timeoutMs) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };

      requestAnimationFrame(check);
    });
  }
}
