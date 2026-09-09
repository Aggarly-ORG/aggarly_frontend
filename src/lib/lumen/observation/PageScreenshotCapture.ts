import { toJpeg } from "html-to-image";
import { VisionClient } from "@/lib/visionClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface ScreenshotCaptureResult {
  dataUrl: string | null;
  minioUrl: string | null;
  objectKey: string | null;
}

export class PageScreenshotCapture {
  /**
   * Captures a JPEG screenshot data URL of the active application page,
   * excluding the Lumen copilot drawer and overlays so the capture represents
   * the true page state.
   */
  static async capture(): Promise<string | null> {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }

    try {
      // Find the main content area, or fall back to document.body
      const root =
        document.getElementById("main-content") ||
        document.querySelector("main") ||
        document.body;

      if (!root) return null;

      const filter = (node: HTMLElement) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (
            el.hasAttribute?.("data-copilot-drawer") ||
            el.closest?.("[data-copilot-drawer]") ||
            el.hasAttribute?.("data-lumen-overlay") ||
            el.id === "lumen-cursor-tracker" ||
            el.id === "lumen-cursor-beacon" ||
            el.classList?.contains("copilot-drawer")
          ) {
            return false;
          }
        }
        return true;
      };

      const capturePromise = toJpeg(root as HTMLElement, {
        quality: 0.72,
        pixelRatio: 1, // 1x is fast, lightweight, and crystal clear for UI preview
        backgroundColor: "#0d0c0b",
        filter: filter as any,
        skipFonts: true,
        cacheBust: false,
      });

      // 3-second safety timeout so CORS or external font issues never block the agent
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 3000)
      );

      const dataUrl = await Promise.race([capturePromise, timeoutPromise]);
      return dataUrl;
    } catch (err) {
      console.warn("[PageScreenshotCapture] Failed to capture screenshot:", err);
      return null;
    }
  }

  /**
   * Captures the screenshot and uploads it directly to MinIO file storage via /api/v1/storage/files.
   * Returns both the local dataUrl and the persistent MinIO view link.
   */
  static async captureAndUpload(): Promise<ScreenshotCaptureResult> {
    const dataUrl = await this.capture();
    if (!dataUrl) {
      return { dataUrl: null, minioUrl: null, objectKey: null };
    }

    try {
      const arr = dataUrl.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const file = new File([u8arr], `screen_${Date.now()}.jpg`, { type: mime });

      const uploaded = await VisionClient.uploadImageFile(file);
      if (uploaded && uploaded.objectKey) {
        const minioUrl = `${API_BASE_URL}/api/v1/storage/files/view?key=${encodeURIComponent(uploaded.objectKey)}`;
        return {
          dataUrl,
          minioUrl,
          objectKey: uploaded.objectKey,
        };
      }
    } catch (uploadErr) {
      console.warn("[PageScreenshotCapture] MinIO upload failed, falling back to dataUrl:", uploadErr);
    }

    return { dataUrl, minioUrl: null, objectKey: null };
  }
}
