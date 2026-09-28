# DotCanvas

DotCanvas is a dependency-free Codex plugin for planning a paper as connected cards. It stores one Obsidian-compatible JSON canvas at `<paper-repository>/.canvas`.

## Contents

- `.codex-plugin/plugin.json` — plugin metadata.
- `skills/dotcanvas/SKILL.md` — Codex launch and filesystem bridge contract.
- `panel/` — bundled static panel (`index.html`, `styles.css`, `app.js`).
- `src/model.js` — validation, seed, and serialization helpers.
- `tests/model.test.js` — model tests.

## Development

No dependencies are required. Run the model tests with:

```sh
node --test tests/model.test.js
```

Open `panel/index.html` directly for a local preview. The preview keeps edits in memory and emits `canvas:save` messages. A Codex host should inject `window.canvasHost` or handle those messages and atomically write the supplied contents to the repository's `.canvas` path.

## Canvas contract

Nodes use the Obsidian Canvas fields `id`, `type`, `x`, `y`, `width`, `height`, `color`, and `text`; edges use `id`, `fromNode`, `toNode`, `fromSide`, `toSide`, and optional `label`. DotCanvas adds optional `section`, `status`, `path`, and `anchor` fields to nodes. Unknown fields are retained by the panel unless a host-side validator removes them.

## Controls

Use **＋ Card** to add a card, select a card to edit it, and use **↗ Connect** followed by two cards to create a labeled directed edge. Drag the background to pan, use the wheel to zoom, and use Delete to remove the selected card. Changes autosave after a short debounce; undo and redo are available in the toolbar.
