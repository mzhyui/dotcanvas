# DotCanvas

DotCanvas is a self-contained Codex plugin for planning a paper as connected cards. It stores one Obsidian-compatible JSON canvas at `<paper-repository>/.canvas`.

In Codex, say **“open DotCanvas”** or **“open canvas.”** The [skill](skills/dotcanvas/SKILL.md) instructs Codex to immediately start or reuse the webserver, then call `open_in_codex` to show its URL in the current chat's right panel. A successful launch proceeds directly to opening; extra diagnostics run only for a failure or an explicit request. If the app queues the tab, Codex reports that status and returns promptly.

## Contents

- `.codex-plugin/plugin.json` — plugin metadata.
- `skills/dotcanvas/SKILL.md` — Codex launch and filesystem bridge contract.
- `panel/` — bundled static panel (`index.html`, `styles.css`, `app.js`).
- `scripts/serve.js` — localhost panel and atomic `.canvas` file bridge.
- `scripts/open.js` — bounded startup, repo/build verification, and server reuse.
- `src/model.js` — validation, seed, and serialization helpers.
- `tests/model.test.js` — model tests.

## Development

No dependency installation or build step is required to run the editor. Markdown rendering uses a bundled local copy of [markdown-it](panel/vendor/README.md). Run the geometry, model, and server tests with:

```sh
node --test tests/*.test.js
```

For an editable canvas, run:

```sh
node scripts/open.js --root /path/to/paper-repository
```

The command returns a JSON receipt with the verified URL, port, repository, build, PID, card/link counts, reuse status, and startup time. It reuses a healthy server for the same repository and build, or starts a detached server. It tries port 38473 and stable repository-specific fallback ports without stopping existing listeners. Startup has a six-second deadline; local probes bypass proxy environment variables. `--port 0` requests a fresh OS-assigned port. No process scanning or manual port retries are needed.

Open the returned URL on that machine. If the repository is on an SSH host, forward the **returned port** to the desktop's loopback interface and open the forwarded URL. A queued Codex browser tab is a UI handoff, not a loading loop: return the link promptly and let the app show the tab when its chat is visible. Do not launch headless Chromium during routine opening.

The server binds only to loopback, validates each canvas, and atomically writes `<paper-repository>/.canvas`. An absent canvas is initialized once; existing canvas bytes are preserved on opening. `/health` identifies the repository, plugin version, content build hash, and PID, and validates the saved canvas. Assets are held with their build identity for the lifetime of the process; starting a newer build does not alter another open session.

For foreground development, `node scripts/serve.js --root /path/to/paper-repository --port 0` prints its assigned URL and runs until stopped. An explicit occupied port produces a concise error recommending the launcher.

Open `panel/index.html` directly for a preview without file saving. A Codex host may also inject `window.canvasHost` or handle `canvas:save` messages.

## Canvas contract

Nodes use the Obsidian Canvas fields `id`, `type`, `x`, `y`, `width`, `height`, `color`, and `text`; edges use `id`, `fromNode`, `toNode`, `fromSide`, `toSide`, and optional `label`. DotCanvas adds optional `section`, `status`, `path`, and `anchor` fields to nodes. Unknown fields are retained by the panel unless a host-side validator removes them.

## Controls

Use **＋ Card** to add a card and select it to edit its full Markdown source in the sidebar. Headings, emphasis, lists, quotes, links, code blocks, and tables render on the card. **Apply** or **Ctrl/Cmd+S** applies the edit; the shortcut also immediately saves pending changes. Raw HTML stays literal text. **Source details** expands the path and anchor fields. Cards devote their remaining height to scrollable Markdown and show a compact source footer; hover that footer to read the full path. The sidebar source editor remains scrollable, and card scroll positions survive edits and redraws when their content still extends that far.

- Drag between the handles at the top, right, bottom, or left of two cards to create an unnamed directed connection. Invalid drops, self-connections, and exact duplicates are canceled. Existing side choices and labels are preserved.
- **Middle-drag empty canvas** to box-select fully enclosed cards. Hold Ctrl, Cmd, or Shift to add to the selection. Modifier-click a card to toggle it.
- Drag a selected card's header or footer to move all selected cards together. Markdown remains selectable and scrollable without moving the card.
- Drag a card's bottom-right corner to resize it, or edit **Width** and **Height** in the sidebar and apply. Resizing follows zoom, keeps connections attached, and stops at 180 × 120 canvas units. With the corner handle focused, arrow keys resize by 10 units; hold Shift for 1 unit. Existing smaller cards retain their saved dimensions until resized.
- Left-drag empty canvas to pan. Click empty canvas to clear selection. Use the wheel outside card text to zoom around the pointer. Right-click retains the normal browser menu.
- Click a connection to select it, edit **Name** in the sidebar, and press **Apply**, Enter, or Ctrl/Cmd+S. Leave Name blank to remove it. Names autosave after applying and support undo/redo. Delete/Backspace removes selected cards and connections; connections attached to removed cards are removed too.
- Escape cancels an active gesture. Each completed move, resize, connection, edit, or deletion is one undo step. Use the toolbar or Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z for undo/redo.

Changes autosave after a 450 ms debounce. Selection survives autosave. Opening a canvas, selecting, panning, or zooming does not rewrite it. Temporary selections are not saved group objects.

The selection behavior is adapted from [Research Canvas](https://github.com/mzhyui/research_canvas/blob/7f16c33ccb06487ff2a3de3df5ed219cf3ba7ef9/ui/src/App.tsx#L1246), with middle-button marquee selection. DotCanvas keeps its plain JavaScript runtime and existing JSON Canvas format.

## Browser regression tests

Playwright is a development-only dependency. Tests create temporary canvas roots and do not edit paper repositories:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

Set `DOTCANVAS_BROWSER` to use an existing Chromium executable. Set `DOTCANVAS_TEST_CANVAS` to an existing canvas path to also validate a temporary copy of that document, and `DOTCANVAS_SCREENSHOT` to save its rendered preview. `DOTCANVAS_PLAYWRIGHT_MODULE` can point to a separate Playwright installation.
