---
name: dotcanvas
description: Open DotCanvas immediately in the current Codex browser panel. Start or reuse its local webserver and preserve the repository's .canvas. Use for open canvas, open DotCanvas, or show the paper-planning panel.
---

# DotCanvas

Use this skill when the user asks to open DotCanvas or wants to plan, decompose, or revise a research paper visually.

## Open immediately

Treat “open canvas”, “open DotCanvas”, and “open the plugin panel” as requests to
perform the opening now. Starting the server and opening its browser panel are both
part of the request. Do not stop at a URL or tell the user to open it manually when
the panel-opening tool is available. Do not ask whether to launch or open it again.

After reading required workspace instructions, follow this short path:

1. **Launch first.** Use the paper repository specified by the user, otherwise the active workspace repository. The plugin root is two directories above this skill directory. Run `node "<plugin-root>/scripts/open.js" --root "<paper-root>"` immediately, with a short command wait (about 1 second). If execution yields, collect that command's result. The launcher returns within 6 seconds or reports a startup error. It already preserves/validates `.canvas`, initializes it only if absent, and starts or reuses a server.
2. **Open next.** Read `url` and `port` from the successful JSON receipt. The next tool action should open the panel; only discovering the opener or establishing required SSH forwarding may intervene. Call `open_in_codex` with the concrete URL and these arguments:

   ```json
   {"target":{"type":"browser","url":"<returned-or-forwarded-url>"},"placement":"right"}
   ```

   Omit `threadId` so the panel belongs to the calling chat. Discover `open_in_codex` if deferred. The localhost web page **is** the DotCanvas plugin panel; no separate plugin-panel tool or `file://` page is needed. For an SSH workspace, use the host's supported forwarding facility for the **returned port**, then open its desktop URL. If forwarding or the opener is unavailable, return the verified endpoint and the specific limitation.
3. **Return promptly.** Give the link and the actual opener status. If it reports `queued`, say the panel is queued and finish; the app will present it when the chat is shown in the same window. Do not poll, sleep, or submit repeated opens to wait for visibility. Report a visible panel only when observed.

Do not put optional repository inventories, manuscript reads, process/port scans,
canvas dumps, repeated health checks, dependency installs, test suites, or headless
Chromium runs between the user's opening request and the panel-opening call.
The launch receipt already verifies the server identity and canvas. Additional
diagnostics are for a failed launch/load or an explicit user request.

## Failure handling

The launcher leaves existing listeners untouched, including older builds and other repositories.
`--port <port>` changes the preferred port; `--port 0` requests an OS-assigned port without reuse.
On a sandbox bind/connect restriction, use the normal permission route to run the same command on
the workspace host; a sandbox port scan is not proof a host port is free. Invalid canvas data is
reported without replacing the file. Do not try more ports for a permissions or validation error.

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
