import assert from "node:assert/strict";

/**
 * Validates that a URL uses an allowed web protocol (http: or https:).
 * Mirrors the security checks in WhatsNewDialog and SubSlateCard.
 */
function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }
  const trimmed = url.trim();
  return trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

// 1. Safe URLs must be accepted
assert.equal(isSafeExternalUrl("https://github.com/tmoroney/auto-subs"), true);
assert.equal(isSafeExternalUrl("https://github.com/tmoroney/auto-subs/releases/latest"), true);
assert.equal(isSafeExternalUrl("https://subslate.app"), true);
assert.equal(isSafeExternalUrl("http://localhost:3000"), true);

// 2. Dangerous URI schemes must be rejected
assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
assert.equal(isSafeExternalUrl("file:///etc/passwd"), false);
assert.equal(isSafeExternalUrl("file:///C:/Windows/System32/calc.exe"), false);
assert.equal(isSafeExternalUrl("data:text/html,<script>alert(1)</script>"), false);
assert.equal(isSafeExternalUrl("vbscript:msgbox(1)"), false);
assert.equal(isSafeExternalUrl("shell:open"), false);
assert.equal(isSafeExternalUrl("ms-msdt:id%20PCWDiagnostic"), false);

// 3. Invalid inputs must be rejected
assert.equal(isSafeExternalUrl(""), false);
assert.equal(isSafeExternalUrl("   "), false);
assert.equal(isSafeExternalUrl(undefined), false);
assert.equal(isSafeExternalUrl(null), false);

console.log("url-security tests passed");
