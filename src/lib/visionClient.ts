import { VisionSearchResultItem, VisionSearchBlockData } from "./types";
import { AggarlyChatBridgeClient } from "./chatBridgeClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export interface VisionUploadSearchOptions {
  city?: string;
  country?: string;
  minGuests?: number;
  maxPricePerNight?: number;
  pageSize?: number;
}

export interface VisionSearchResponseWrapper {
  success: boolean;
  results: VisionSearchResultItem[];
  count: number;
  error?: string;
  errorCode?: string;
}

export interface StorageUploadResponse {
  objectKey: string;
  viewUrl: string;
  fileSize?: number;
  contentType?: string;
}

export class VisionClient {
  /**
   * Performs an end-to-end multimodal or visual similarity search by uploading an image directly
   * to POST /api/v1/vision/search/upload
   */
  static async searchByImageUpload(
    file: File,
    textQuery?: string,
    options?: VisionUploadSearchOptions
  ): Promise<VisionSearchResponseWrapper> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      if (textQuery && textQuery.trim()) {
        formData.append("textQuery", textQuery.trim());
      }
      if (options?.city) {
        formData.append("city", options.city);
      }
      if (options?.country) {
        formData.append("country", options.country);
      }
      if (options?.minGuests) {
        formData.append("minGuests", String(options.minGuests));
      }
      if (options?.maxPricePerNight) {
        formData.append("maxPricePerNight", String(options.maxPricePerNight));
      }
      formData.append("pageSize", String(options?.pageSize || 8));

      const response = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/vision/search/upload`, {
        method: "POST",
        body: formData,
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          body?.message ||
          body?.error ||
          `Vision search upload failed (HTTP ${response.status})`;
        const errorCode = body?.errorCode || "VISION_SEARCH_FAILED";

        return {
          success: false,
          results: [],
          count: 0,
          error: errorMsg,
          errorCode,
        };
      }

      const results: VisionSearchResultItem[] = body?.data?.results || [];
      const count = body?.data?.count ?? results.length;

      return {
        success: true,
        results,
        count,
      };
    } catch (err: any) {
      console.error("VisionClient.searchByImageUpload error:", err);
      return {
        success: false,
        results: [],
        count: 0,
        error: err?.message || "Network error occurred during visual search",
        errorCode: "NETWORK_ERROR",
      };
    }
  }

  /**
   * Upload an image to /api/v1/storage/files to get an objectKey and viewUrl
   */
  static async uploadImageFile(file: File): Promise<StorageUploadResponse | null> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await AggarlyChatBridgeClient.authFetch(`${API_BASE_URL}/api/v1/storage/files`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.warn("File storage upload returned non-200:", response.status);
        return null;
      }

      const data = await response.json();
      return (data?.data || data) as StorageUploadResponse;
    } catch (e) {
      console.warn("File storage upload failed:", e);
      return null;
    }
  }
}
