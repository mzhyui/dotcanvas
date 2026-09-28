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

No dependencies are required. Run the model tests with:

```sh
node --test tests/model.test.js
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

Use **＋ Card** to add a card, select a card to edit it, and use **↗ Connect** followed by two cards to create a labeled directed edge. Drag the background to pan, use the wheel to zoom, and use Delete to remove the selected card. Changes autosave after a short debounce; undo and redo are available in the toolbar.
