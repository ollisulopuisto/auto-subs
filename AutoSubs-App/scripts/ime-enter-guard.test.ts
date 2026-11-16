import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Enter during IME composition (CJK input) is the composition's confirm key,
// not a submit. legacy-scan (ime-safe-enter-submit) flagged the preset name
// field's onKeyDown in fusion-preset-editor.tsx for saving the preset without
// checking e.isComposing / e.keyCode === 229. The component needs the full
// React/Vite toolchain to render, so this anchors the guard in source.
const source = readFileSync(
  new URL("../src/components/captions/fusion-preset-editor.tsx", import.meta.url),
  "utf8",
).split("\n");

const handler = source.findIndex((line) => line.includes("onKeyDown={(e) => {"));
assert.notEqual(handler, -1, "preset name onKeyDown not found; re-anchor the test");
const head = source.slice(handler + 1, handler + 4).join("\n");
assert.match(head, /isComposing/, "no isComposing guard at the top of the handler");
