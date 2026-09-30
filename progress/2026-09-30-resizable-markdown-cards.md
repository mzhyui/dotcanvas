# Resizable Markdown cards and Apply shortcut

- Record format: `3`
- Record ID: `RCP-20260929T180410Z-7d8df5e3`
- Mode: `coding-progress`
- Task type: `feature`
- Task slug: `resizable-markdown-cards`
- Date: `2026-09-30`
- Project: `/home/mzhyui/git/dotcanvas`
- Priority: `unspecified`
- Owner: `Unassigned`
- Components: `None`
- Labels: `None`
- Status category: `done`
- Status: `done`
- Resolution: `completed`
- Created at: `2026-09-29T18:04:10Z`
- Started at: `unavailable`
- Updated at: `2026-09-30T04:53:45Z`
- Completed at: `2026-09-30T04:53:45Z`
- Due date: `Not applicable`
- Evidence state: `verified`
- Validation state: `fail`
- Implementation class: `fresh-implementation`

## Outcome

Implemented resizable cards, rendered Markdown with a full-source sidebar editor, and Ctrl/Cmd+S equivalent to Apply. Final permitted-host validation passed 23 unit/server/startup tests and 15 Chromium scenarios (V2, V6). Card and source-editor scrolling are retained; Ctrl/Cmd+S keeps editor focus and the caret. The strict aggregate below retains the initial restricted-sandbox invocation failure (V1).

## Task and Scope

E1 is the user brief. Changes cover the local DotCanvas UI, its static asset server, tests, and usage documentation. E4 requests conclusion and a local commit of all current changes. This record is finalized immediately before that commit; its hash is available from Git history. No installed plugin cache, active paper server, or manuscript canvas was changed.

## Lifecycle

Current blocker: None

| ID | At | Action | From | To | Actor | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | 2026-09-29T18:04:10Z | created | none | in-progress | record-tool | record created |
| L2 | 2026-09-29T18:09:03Z | transition | in-progress | done | codex | Requested UI changes implemented and verified by permitted-host tests and Chromium. |
| L3 | 2026-09-30T04:51:58Z | resume | done | in-progress | codex | User requested conclusion and a local commit of all current changes. |
| L4 | 2026-09-30T04:53:45Z | transition | in-progress | done | codex | Concluded all current changes, retained passing runtime validation, and corrected staged whitespace; ready for the requested local commit. |

Relationships: None

## Implementation

### Plan and Starting Status

The current-chat brief (E1) requested adjustable size, rendered Markdown, side-panel Markdown editing, preserved scrolling, and subsequently Ctrl+S as Apply. Before editing, cards displayed escaped plain text, split the first line into a separate title field, and had fixed dimensions. Initial live git status was clean; the recording tool was invoked late and captured task changes in its baseline status. Historical baseline HEAD and precise start time remain unavailable.

### Core Functions and Result

- `panel/app.js`: render full node text with the bundled parser; apply exact source; retain card/source scroll and editor focus; resize with pointer capture and zoom-aware dimensions; update connections; cancel on Escape/pointer cancellation; commit one undo step per drag; apply Ctrl/Cmd+S through native form submission and flush pending saves.
- `panel/styles.css`: Markdown typography, independently scrollable content, full-height source editor, and a bottom-right resize handle.
- `panel/vendor`: pinned markdown-it 15.0.2 UMD bundle, MIT license, embedded-library notices, and provenance. Package SHA-512 matched npm metadata before extraction. Raw HTML is disabled and normal parser URL checks are retained.
- `panel/index.html` and `scripts/serve.js`: load and serve the local parser without a runtime download; static assets participate in the existing build identity.
- `tests/browser.spec.js`: five new browser scenarios plus an updated plain-text editing assertion. Existing move/zoom/multiselect/link/delete/autosave behavior remains covered.

## Interface and Behavior Changes

The sidebar now edits complete Markdown, including its heading, instead of reconstructing a title and body. Apply and Ctrl/Cmd+S both honor numeric field validation. Ctrl/Cmd+S additionally flushes pending saves immediately and suppresses the browser save dialog. Card dimensions are editable numerically, by corner drag, or by arrow keys on the focused corner (10 units; Shift: 1). New resize gestures clamp at 180 by 120 canvas units; existing smaller cards load unchanged. Raw HTML renders literally. Existing same-origin image restrictions remain. The JSON canvas schema and unknown metadata are retained.

## Validation

### Test Result

Aggregate recorded validation: `fail` retains the initial sandbox failure (V1) and corrected initial staging whitespace failure (V7). Required final implementation checks passed (V2 through V6), and the corrected staged snapshot passed V8.

### V1 - fail

```text
node --test tests/*.test.js (restricted sandbox)
```

Restricted-sandbox invocation exited 1: geometry/model test files passed, server/startup test files failed. The permitted-host run in V2 passed all 23 tests.

### V2 - pass

```text
node --test tests/*.test.js
```

23/23 geometry, model, HTTP server, and startup tests passed on the permitted host.

### V3 - pass

```text
node /tmp/dotcanvas-render-preview.js
```

HTTP preview captured and visually inspected; standalone file preview rendered all five seed headings without JavaScript errors.

### V4 - pass

```text
node --check panel/app.js
```

JavaScript syntax check passed.

### V5 - pass

```text
git diff --check
```

Tracked changes have no whitespace errors.

### V6 - pass

```text
DOTCANVAS_PLAYWRIGHT_MODULE=/tmp/dotcanvas-ui-n7Jsmf/browser-deps/node_modules/playwright DOTCANVAS_BROWSER=/home/mzhyui/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome node --test tests/browser.spec.js
```

Final Chromium run passed all 15 browser scenarios (16 TAP tests including the parent suite), including Ctrl/Cmd+S, source focus/scroll, Markdown, resizing, and existing interactions.

### V7 - fail

```text
git diff --cached --check (initial staging)
```

Initial staged check found a trailing blank line in THIRD-PARTY-NOTICES.txt; removed the extra EOF blank line without changing license text.

### V8 - pass

```text
git diff --cached --check
```

Final staged snapshot passes whitespace validation after correcting the license notice EOF.

## Evidence Ledger

| ID | Class | Locator / conclusion |
| --- | --- | --- |
| E1 | user-stated | Current chat: adjustable card size, rendered Markdown with side-panel source editing, scrolling retained, and Ctrl+S equivalent to Apply. |
| E2 | verified | panel/app.js: Markdown rendering, source editor, resize gestures, and Apply keyboard shortcut. SHA-256 `cc70beebb66269c8bb09b5d07e8ae80ce354e36f30bcee80da45f1f2c7ffcda7`. |
| E3 | verified | /tmp/dotcanvas-markdown-preview.png: Chromium visual check of temporary sample canvas. SHA-256 `23a8f18ff11dd527816ccabecae2d5d4a5dfe5707f81be3c30ea98cbcab4bdeb`. |
| E4 | user-stated | Current chat follow-up: conclude and commit all current changes. |
| V1 | verified | Restricted-sandbox invocation exited 1: geometry/model test files passed, server/startup test files failed. The permitted-host run in V2 passed all 23 tests. |
| V2 | verified | 23/23 geometry, model, HTTP server, and startup tests passed on the permitted host. |
| V3 | verified | HTTP preview captured and visually inspected; standalone file preview rendered all five seed headings without JavaScript errors. |
| V4 | verified | JavaScript syntax check passed. |
| V5 | verified | Tracked changes have no whitespace errors. |
| V6 | verified | Final Chromium run passed all 15 browser scenarios (16 TAP tests including the parent suite), including Ctrl/Cmd+S, source focus/scroll, Markdown, resizing, and existing interactions. |
| V7 | verified | Initial staged check found a trailing blank line in THIRD-PARTY-NOTICES.txt; removed the extra EOF blank line without changing license text. |
| V8 | verified | Final staged snapshot passes whitespace validation after correcting the license notice EOF. |

## Git Custody

The record uses the pre-commit HEAD; the committed record cannot contain its own commit hash.

Actual reviewed implementation staged diff: `12 files changed, 453 insertions(+), 24 deletions(-)`. The tool-generated scoped diff below has an unavailable historical baseline; it is not the staged snapshot count.

- Branch: `master`. Final HEAD: `7242a7b5ab3a69acb9d6379bf6540b2b00f42d4c`.
- Baseline HEAD: unavailable. History relation: unavailable. E4 authorizes a local commit, created after record finalization; its hash is available from Git history. No push was requested.
- Scoped diff: `files=0; insertions=0; deletions=0; binary_files=0; untracked_files=0`.
- Record path: `progress/2026-09-30-resizable-markdown-cards.md`.
- Explicit task scopes: `README.md`, `package.json`, `panel/app.js`, `panel/index.html`, `panel/styles.css`, `panel/vendor`, `scripts/serve.js`, `tests/browser.spec.js`, `tests/server.test.js`.
- Task-owned changed paths: `README.md`, `package.json`, `panel/app.js`, `panel/index.html`, `panel/styles.css`, `panel/vendor/README.md`, `panel/vendor/THIRD-PARTY-NOTICES.txt`, `panel/vendor/markdown-it.LICENSE`, `panel/vendor/markdown-it.min.js`, `progress/2026-09-30-resizable-markdown-cards.md`, `scripts/serve.js`, `tests/browser.spec.js`, `tests/server.test.js`.
- Paths already dirty at late record capture: `panel/app.js`, `panel/index.html`, `panel/styles.css`, `panel/vendor/markdown-it.LICENSE`, `panel/vendor/markdown-it.min.js`, `scripts/serve.js`, `tests/browser.spec.js`, `tests/server.test.js`.
- Late-capture overlap: `panel/app.js`, `panel/index.html`, `panel/styles.css`, `panel/vendor/markdown-it.LICENSE`, `panel/vendor/markdown-it.min.js`, `scripts/serve.js`, `tests/browser.spec.js`, `tests/server.test.js`.
- Outside-scope changes: None.

The record tool was started after implementation began; its preexisting/overlap lists describe that late capture, not unrelated user edits. The initial live status was clean. Source changes belong to this request.

## Evidence Boundary

Browser checks used temporary canvas roots. E3 is a synthetic visual preview, not manuscript evidence. The direct-file preview rendered all five seed headings without JavaScript errors. Tests verify this checkout; no claim is made that an existing desktop tab or installed plugin has been upgraded. Existing servers retain the build they loaded.

## Next Steps

Implementation and handoff are complete. This note accompanies the requested local commit, whose hash is available from Git history. To use this version, launch DotCanvas from this checkout against the intended repository.
