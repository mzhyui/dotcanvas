# DotCanvas connection and interaction implementation

- Record format: `3`
- Record ID: `RCP-20260929T103639Z-42a74053`
- Mode: `coding-progress`
- Task type: `feature`
- Task slug: `canvas-interactions`
- Implementation class: `fresh-implementation`
- Date: `2026-09-29`
- Project: `/home/mzhyui/git/dotcanvas`
- Priority: `unspecified`
- Owner: `Unassigned`
- Components: `None`
- Labels: `None`
- Status category: `done`
- Status: `done`
- Resolution: `completed`
- Created at: `2026-09-29T10:36:39Z`
- Started at: `2026-09-29T10:36:39Z`
- Updated at: `2026-09-29T15:25:20Z`
- Completed at: `2026-09-29T15:25:20Z`
- Due date: `Not applicable`
- Evidence state: `verified`
- Validation state: `pass`

## Outcome

Implemented and installed the approved UI changes. Validation passed: 12 unit/server tests and 10 browser scenarios (V1–V2). The installed COLING editor rendered 19 cards and 76 handles without changing the canvas (V4). The source plugin manifest now declares version `0.1.2+codex.20260929120753` (E4); current diff whitespace validation passes (V5). Desktop navigation to the existing forwarded URL was queued by the app; desktop rendering was not directly observed. The work and this record are ready for the requested local commit.

## Task and Scope

E1 authorizes source changes in this plugin, direct four-side connections, middle-button marquee selection, temporary multi-card movement, and a text-first card/inspector layout. Persistent group rectangles and manuscript editing are outside scope. Source work began on a clean checkout. Runtime remains dependency-free; Playwright is development-only.

## Lifecycle

Current blocker: None

| ID | At | Action | From | To | Actor | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | 2026-09-29T10:36:39Z | created | none | in-progress | record-tool | record created |
| L2 | 2026-09-29T10:52:36Z | transition | in-progress | done | codex | Approved UI behavior implemented, tested, installed, and checked against the live COLING server. |
| L3 | 2026-09-29T15:14:26Z | resume | done | in-progress | codex | User requested the existing DotCanvas interaction work be concluded and committed locally. |
| L4 | 2026-09-29T15:14:38Z | transition | in-progress | done | codex | User requested local conclusion and commit; feature and prior behavioral validation are complete, the current source diff passes whitespace checking, and implementation plus its record are prepared for local commit. |
| L5 | 2026-09-29T15:25:20Z | resume | done | in-progress | codex | Recording the required staged-diff whitespace check before the user-requested local commit. |
| L6 | 2026-09-29T15:25:20Z | transition | in-progress | done | codex | Feature implementation and recorded validation are complete; the explicit 14-file staged diff passed whitespace checking and is ready for the requested local commit. |

Relationships: None

## Implementation

### Plan and Starting Status

The approved conversation plan is E1. Originally, edges used card centers and a separate SVG transform origin; pointer movement rebuilt the captured card DOM, selection held only one ID, and core text was clipped to 80 px. Research Canvas supplied the fully-enclosed/additive selection behavior (E2), with the user-requested middle-button mapping.

### Core Functions and Result

| Path / function | Result |
| --- | --- |
| `panel/geometry.js` / anchors, curves, coordinates, selection | Shared pure geometry; exact side endpoints; pointer-centered zoom; full containment. |
| `panel/app.js` / gesture lifecycle, selection, immutable save payloads | Stable viewport capture, position-only movement, four handles, multi-selection, atomic undo/redo and cancellation. Earlier save debounces cannot serialize transient drag positions. |
| `panel/styles.css`, `panel/index.html` | Shared transformed world, flexible scrollable body, single-line source footer, larger Core editor, collapsed source details. |
| `scripts/serve.js` | Serves the new shared geometry asset under the existing API and CSP. |
| `tests/`, `package.json`, `package-lock.json` | Unit, HTTP, and real Chromium interaction coverage; development-only Playwright. |

## Interface and Behavior Changes

Connect-button mode was replaced by handle-to-handle dragging. Middle-drag selects enclosed visible cards; Ctrl/Meta/Shift adds or toggles selection. Header/footer drag moves selected cards together; body scrolling/text selection stays independent. Right-click keeps browser behavior. Delete and undo operate atomically across selected objects. Existing `.canvas` fields, labels, IDs, and compatible unknown fields survive round trips. No file-format or HTTP API migration.

Installed version observed during V4: `0.1.1+codex.20260929104923`. The current source manifest declares `0.1.2+codex.20260929120753` (E4); the later source version was not separately checked against the live installed panel. The COLING server was PID `2723133` in screen `2723132.dotcanvas_coling27_38474`, port `38474`, root `/home/mzhyui/git/coling27`. The existing sp2027 server remained PID `611650`, port `38473`. Source and installed asset bytes matched at the V4 check. Rollout canvas SHA-256 before and after: `40ffce5da8de049074d8cc323f70faf251add8d3e232f898cbbbf2e3cc2b3f6b` (E3, V4).

## Validation

### Test Result

Aggregate final validation: `pass`. Browser endpoints remain within one screen pixel during movement, zoom, and pan. Tests use temporary canvas roots, including a copy of the current manuscript. An initial draft browser test clicked an off-screen top curve; the test now targets the visible bottom curve, and final source checks pass.

### V1 - pass

```text
node --test tests/*.test.js
```

Final source repository: 12 geometry/model/server tests passed.

### V2 - pass

```text
DOTCANVAS_PLAYWRIGHT_MODULE=/tmp/dotcanvas-ui-n7Jsmf/browser-deps/node_modules/playwright DOTCANVAS_BROWSER=/home/mzhyui/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome DOTCANVAS_TEST_CANVAS=/home/mzhyui/git/coling27/.canvas DOTCANVAS_SCREENSHOT=/tmp/dotcanvas-ui-n7Jsmf/final-preview.png node --test tests/browser.spec.js
```

Final source repository: 10 browser scenarios passed (11 TAP tests including the parent suite); endpoint error at most one screen pixel; current manuscript copied to a temporary root and not rewritten.

### V3 - pass

```text
git diff --check
```

No whitespace errors in the final source diff.

### V4 - pass

```text
node /tmp/dotcanvas-ui-n7Jsmf/verify-installed.js
```

Installed editor rendered 19 cards and 76 handles with no JavaScript errors or PUT requests; manuscript canvas bytes unchanged. Other sp2027 server remains on original PID 611650. Desktop browser navigation is queued, not directly observed.

### V5 - pass

```text
git diff --check
```

Current tracked source diff has no whitespace errors.

### V6 - pass

```text
git diff --cached --check
```

The staged 14-file diff has no whitespace errors.

## Evidence Ledger

| ID | Class | Locator / conclusion |
| --- | --- | --- |
| E1 | user-stated | Current chat: approved DotCanvas connection and interaction implementation plan; middle-button marquee and temporary multi-card selection. |
| E2 | verified | https://github.com/mzhyui/research_canvas/blob/7f16c33ccb06487ff2a3de3df5ed219cf3ba7ef9/ui/src/App.tsx |
| E3 | verified | /tmp/dotcanvas-ui-n7Jsmf/rollout.json; SHA-256 `90d3911cbfcecda479b3df089b9a03a105f36f84e422cfcb49ede201905924a1` |
| E4 | verified | `.codex-plugin/plugin.json: current plugin version declaration`; current source version `0.1.2+codex.20260929120753`; SHA-256 `dc539fecdff6fbfb0fae1495e6bda73286dc70ca1dd8fd5b7a6b816a49a63f96` |
| E5 | verified | `README.md: current controls and development/browser-test instructions`; SHA-256 `9d5192102e1172241d3dd2eb0ddb0f15b7ee182455e68da8ea9fae2f3860a488` |
| E6 | verified | `package.json: current development scripts and Playwright dependency`; SHA-256 `6398aca2704d6575344f39a2040aadbb82656935dcf888f07b2deaa1013e0b52` |
| E7 | verified | `package-lock.json: pinned development dependency lock`; SHA-256 `b9a6dd7608b9b2a3334db781b24f83ac06b21cdfb41eb3d05192c3755773c563` |
| V1 | verified | Final source repository: 12 geometry/model/server tests passed. |
| V2 | verified | Final source repository: 10 browser scenarios passed (11 TAP tests including the parent suite); endpoint error at most one screen pixel; current manuscript copied to a temporary root and not rewritten. |
| V3 | verified | No whitespace errors in the final source diff. |
| V4 | verified | Installed editor rendered 19 cards and 76 handles with no JavaScript errors or PUT requests; manuscript canvas bytes unchanged. Other sp2027 server remains on original PID 611650. Desktop browser navigation is queued, not directly observed. |
| V5 | verified | Current tracked source diff has no whitespace errors. |
| V6 | verified | The staged 14-file diff has no whitespace errors. |

## Git Custody

- Branch: `master`.
- Baseline HEAD: `0ea068168863cb36e89b867076c4752d65274eba`; pre-commit HEAD: `0ea068168863cb36e89b867076c4752d65274eba`.
- History relation at record finalization: `same`; commits since baseline: None. The local commit requested by the user is created after this record is finalized; its hash is available in Git history. No push was requested or performed.
- Explicit scopes: `.codex-plugin/plugin.json`, `.gitignore`, `README.md`, `package-lock.json`, `package.json`, `panel`, `scripts/serve.js`, `tests`.
- Scoped diff: `files=13; insertions=938; deletions=79; binary_files=0; untracked_files=0`.
- Task-owned changed paths: `.codex-plugin/plugin.json`, `.gitignore`, `README.md`, `package-lock.json`, `package.json`, `panel/app.js`, `panel/geometry.js`, `panel/index.html`, `panel/styles.css`, `progress/2026-09-29-canvas-interactions.md`, `scripts/serve.js`, `tests/browser.spec.js`, `tests/geometry.test.js`, `tests/server.test.js`.
- Pre-existing changes: None. Pre-existing overlaps: None. Outside-scope source changes: None.
- Ownership caveat: at record finalization, all task-owned changes and this record were staged for the requested local commit; the installed plugin cache and named COLING runtime were also refreshed as authorized. This record is tracked separately from the numeric implementation diff.

## Evidence Boundary

V1–V4 establish the tested editor behavior and installed server rendering. The app returned `queued` for opening `http://localhost:50265/`; this is not evidence of a rendered desktop tab. No claim is made about paper results, theorem correctness, or submission readiness. The manuscript canvas was not changed by this implementation or rollout.

## Next Steps

No implementation work remains. If the existing desktop tab still shows the previous UI, refresh it to load the installed assets. The requested local commit is recorded in Git history; no push was performed.
