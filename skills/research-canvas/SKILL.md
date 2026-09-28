---
name: research-canvas
description: Open or create a paper-planning canvas in the current repository and save it as .canvas.
---

# Research Canvas

Use this skill when the user wants to plan, decompose, or revise a research paper visually.

## Launch contract

1. Resolve the active paper repository root from the workspace context.
2. Use `<paper-root>/.canvas` as the canonical path.
3. Read that file if it exists. If it does not exist, initialize it from the standard section scaffold in `panel/app.js`.
4. Open `panel/index.html` in the Codex interactive panel and pass the JSON document with the `canvas:init` message.
5. Listen for `canvas:save` messages, validate the JSON, and atomically write the payload to `<paper-root>/.canvas`.

The panel uses this host bridge:

```ts
interface CanvasHost {
  readCanvas(path: string): Promise<string | null>;
  writeCanvas(path: string, contents: string): Promise<void>;
  resolvePaperRoot(): Promise<string>;
  notify(message: { type: string; payload?: unknown }): void;
}
```

The bridge may be implemented by the Codex host through `postMessage`, or injected as
`window.canvasHost`. The panel has a local preview fallback, but the skill must use the
repository bridge for normal operation. Writes should be debounced and performed through a
temporary sibling file followed by replacement so a malformed update cannot destroy the last
valid canvas.

## File contract

The persisted document follows the Obsidian Canvas node and edge shape. Nodes contain `id`,
`type`, `x`, `y`, `width`, `height`, `color`, and `text`; edges contain `id`, `fromNode`,
`toNode`, `fromSide`, `toSide`, and optional `label`. Unknown compatible fields should survive
round trips. Reject duplicate IDs, missing edge endpoints, and unsupported node types.
