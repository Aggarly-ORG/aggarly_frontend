import { ViewportState } from "../protocol/BrowserObservation";

export class ViewportObserver {
  static capture(): ViewportState {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return {
        width: 1440,
        height: 900,
        scrollX: 0,
        scrollY: 0,
        maxScrollX: 0,
        maxScrollY: 0,
      };
    }

    const width = window.innerWidth || document.documentElement.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight;
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const scrollHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );

    const scrollWidth = Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.body.clientWidth,
      document.documentElement.clientWidth
    );

    const maxScrollX = Math.max(0, scrollWidth - width);
    const maxScrollY = Math.max(0, scrollHeight - height);

    return {
      width,
      height,
      scrollX,
      scrollY,
      maxScrollX,
      maxScrollY,
    };
  }
}
