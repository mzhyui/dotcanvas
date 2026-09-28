---
name: dotcanvas
description: Open or create a paper-planning canvas in the current repository and save it as .canvas.
---

# DotCanvas

Use this skill when the user wants to plan, decompose, or revise a research paper visually.

## Launch contract

1. Resolve the active paper repository root from the workspace context.
2. Use `<paper-root>/.canvas` as the canonical path.
3. Read that file if it exists. If it does not exist, initialize it from the standard section scaffold in `panel/app.js`.
4. Start `node <plugin-root>/scripts/serve.js --root <paper-root> --port 38473`. It binds to `127.0.0.1` and serves the panel with a validated, atomic `.canvas` save API. Keep it running while the user edits.
5. Open `http://127.0.0.1:38473` in a browser tab. When the Codex task runs on an SSH host, forward that host's port 38473 to the desktop's loopback interface before opening the URL. Never open a remote `file://` path in the desktop browser.
6. Verify the panel loads the repository's existing `.canvas` and that the browser shows no load error. Do not report the canvas as open until the browser tab renders.

The panel can also use an injected host bridge:

```ts
interface CanvasHost {
  readCanvas(path: string): Promise<string | null>;
  writeCanvas(path: string, contents: string): Promise<void>;
  resolvePaperRoot(): Promise<string>;
  notify(message: { type: string; payload?: unknown }): void;
}
```

The bridge may be implemented by the Codex host through `postMessage`, or injected as
`window.canvasHost`. The local HTTP bridge is the default for Codex file and SSH tasks.
The panel has a preview fallback when no bridge is available. The HTTP bridge validates
each save and writes through a temporary sibling file followed by replacement.

## File contract

The persisted document follows the Obsidian Canvas node and edge shape. Nodes contain `id`,
`type`, `x`, `y`, `width`, `height`, `color`, and `text`; edges contain `id`, `fromNode`,
`toNode`, `fromSide`, `toSide`, and optional `label`. Unknown compatible fields should survive
round trips. Reject duplicate IDs, missing edge endpoints, and unsupported node types.
