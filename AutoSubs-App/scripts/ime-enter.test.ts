import assert from "node:assert/strict";
import { guardIme, type GuardedKeyEvent } from "../src/lib/ime-enter.ts";

// Enter during IME composition (CJK input) is the composition's confirm key,
// not a submit. legacy-scan (ime-safe-enter-submit) flagged the preset name
// field's onKeyDown in fusion-preset-editor.tsx for saving on Enter without
// checking e.nativeEvent.isComposing / e.keyCode === 229. The component wraps
// its onKeyDown in guardIme (the full React/Vite toolchain is needed to
// render the component itself, so this drives the guard directly with
// composing and plain keydown events).

type TestEvent = GuardedKeyEvent & { key?: string };

{
  // composing keydowns never reach the guarded handler
  const seen: TestEvent[] = [];
  const handler = guardIme((e: TestEvent) => seen.push(e));
  handler({ key: "Enter", nativeEvent: { isComposing: true } });
  handler({ key: "Enter", keyCode: 229 });
  assert.equal(seen.length, 0, "composing Enter reached the handler");
}

{
  // plain keydowns reach the handler with the original event
  const seen: TestEvent[] = [];
  const handler = guardIme((e: TestEvent) => seen.push(e));
  const plain: TestEvent = { key: "Enter", nativeEvent: { isComposing: false, keyCode: 13 } };
  handler(plain);
  handler({ key: "Escape" });
  assert.equal(seen.length, 2, "plain keydown did not reach the handler");
  assert.equal(seen[0], plain, "handler did not get the original event");
}

console.log("ime-enter: passed");
