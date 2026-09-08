// Development diagnostic: a minimal, isolated check of whether the app
// can currently reach the local background-removal backend at all,
// independent of everything removeImageBackground() does (upload,
// multipart parsing, saving to storage, etc). Useful for narrowing down
// "Remove BG failed" reports to either a pure network/reachability
// problem (this fails too) or something further down the pipeline
// (this succeeds, but Remove BG still fails).

import { API_CONFIG } from "@/config/api";

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_CONFIG.backendUrl}/health`);
    return response.ok;
  } catch (error) {
    if (__DEV__) {
      console.error("[StickerCut] backend health check failed:", error);
    }
    return false;
  }
}
