import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * Validates that a target URL strictly uses a safe web scheme (http: or https:).
 * Rejects harmful or unexpected URI schemes such as javascript:, file:, data:, shell:, etc.
 */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Safely opens an external URL using the system's default browser via Tauri's
 * opener plugin. Validates scheme first and fails safely if invalid or blocked.
 */
export async function openExternalUrl(url: string | null | undefined): Promise<boolean> {
  if (!isSafeExternalUrl(url)) {
    console.warn("[url-security] Blocked attempt to open unsafe URL:", url);
    return false;
  }

  try {
    await openUrl(url!.trim());
    return true;
  } catch (err) {
    console.warn("[url-security] Failed to open external URL:", err);
    return false;
  }
}
