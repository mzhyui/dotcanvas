# DotCanvas

DotCanvas is a dependency-free Codex plugin for planning a paper as connected cards. It stores one Obsidian-compatible JSON canvas at `<paper-repository>/.canvas`.

## Contents

- `.codex-plugin/plugin.json` — plugin metadata.
- `skills/dotcanvas/SKILL.md` — Codex launch and filesystem bridge contract.
- `panel/` — bundled static panel (`index.html`, `styles.css`, `app.js`).
- `scripts/serve.js` — localhost panel and atomic `.canvas` file bridge.
- `src/model.js` — validation, seed, and serialization helpers.
- `tests/model.test.js` — model tests.

## Development

No dependencies or build step are required to run the editor. Run the geometry, model, and server tests with:

```sh
node --test tests/*.test.js
```

For an editable canvas, run:

```sh
node scripts/serve.js --root /path/to/paper-repository --port 38473
```

Open `http://127.0.0.1:38473` on that machine. If the repository is on an SSH host, forward its port 38473 to the desktop's loopback interface and open the forwarded URL. The server binds only to loopback, validates each canvas, and atomically writes `<paper-repository>/.canvas`.

Open `panel/index.html` directly for a preview without file saving. A Codex host may also inject `window.canvasHost` or handle `canvas:save` messages.

## Canvas contract

Nodes use the Obsidian Canvas fields `id`, `type`, `x`, `y`, `width`, `height`, `color`, and `text`; edges use `id`, `fromNode`, `toNode`, `fromSide`, `toSide`, and optional `label`. DotCanvas adds optional `section`, `status`, `path`, and `anchor` fields to nodes. Unknown fields are retained by the panel unless a host-side validator removes them.

## Controls

Use **＋ Card** to add a card and select its header to edit it. The Core editor fills the sidebar; **Source details** expands the path and anchor fields. Cards devote their remaining height to scrollable core text and show a compact source footer; hover that footer to read the full path.

- Drag between the handles at the top, right, bottom, or left of two cards to create an unnamed directed connection. Invalid drops, self-connections, and exact duplicates are canceled. Existing side choices and labels are preserved.
- **Middle-drag empty canvas** to box-select fully enclosed cards. Hold Ctrl, Cmd, or Shift to add to the selection. Modifier-click a card to toggle it.
- Drag a selected card's header or footer to move all selected cards together. Core text remains selectable and scrollable without moving the card.
- Left-drag empty canvas to pan. Click empty canvas to clear selection. Use the wheel outside card text to zoom around the pointer. Right-click retains the normal browser menu.
- Click a connection to select it, edit **Name** in the sidebar, and press **Apply** or Enter. Leave Name blank to remove it. Names autosave after applying and support undo/redo. Delete/Backspace removes selected cards and connections; connections attached to removed cards are removed too.
- Escape cancels an active gesture. Each completed move, connection, edit, or deletion is one undo step. Use the toolbar or Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z for undo/redo.

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
