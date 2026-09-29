# Bounded DotCanvas startup

- Record format: `3`
- Record ID: `RCP-20260929T172356Z-a049d065`
- Mode: `coding-progress`
- Task type: `bug`
- Task slug: `bounded-canvas-startup`
- Implementation class: `fresh-implementation`
- Date: `2026-09-30`
- Project: `/home/mzhyui/git/dotcanvas`
- Priority: `unspecified`
- Owner: `Unassigned`
- Components: `None`
- Labels: `None`
- Status category: `done`
- Status: `done`
- Resolution: `completed`
- Created at: `2026-09-29T17:23:56Z`
- Started at: `unavailable`
- Updated at: `2026-09-29T17:39:12Z`
- Completed at: `2026-09-29T17:39:12Z`
- Due date: `Not applicable`
- Evidence state: `verified`
- Validation state: `pass`

## Outcome

Implemented and locally installed DotCanvas 0.1.3. V1 and V2 pass: 23 unit/server tests and 11 browser scenarios. The installed launcher started the affected SP2027 server in 36 ms and reused it in 30 ms (V5). These are server-launch measurements; desktop tab rendering is not measured. The saved five-card, three-link canvas is unchanged. The final immediate-opening instructions (E11, E12) are synced to the installed plugin and validated. All implementation and record changes are prepared for the requested local commit.

## Task and Scope

E1 requests diagnosis and correction of the slow opening in the linked chat. The original turn took 456955 ms (7 min 37 sec): occupied ports 38473 and 38474 threw unhandled EADDRINUSE errors; health could not identify the repository/build; opening involved old-process inspection, a second launch, separate Chromium diagnostics with Snap/AppArmor noise, and repeated waiting on queued UI handoff (E2). The instruction follow-up (E9) requires immediate launch followed by the panel-opening tool. E10 authorizes a local commit of all changes. Manuscript edits and pushing are outside scope.

## Lifecycle

Current blocker: None

| ID | At | Action | From | To | Actor | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | 2026-09-29T17:23:56Z | created | none | in-progress | record-tool | record created |
| L2 | 2026-09-29T17:31:08Z | transition | in-progress | done | codex | Bounded startup implemented, regression-tested, installed, and verified on the affected repository without changing its canvas. |
| L3 | 2026-09-29T17:38:23Z | resume | done | in-progress | codex | User requested conclusion and local commit of all changes, including the immediate-opening instruction follow-up. |
| L4 | 2026-09-29T17:38:24Z | transition | in-progress | done | codex | Implementation, installed instructions, validation, and documentation are complete and ready for the user-requested local commit. |
| L5 | 2026-09-29T17:39:12Z | resume | done | in-progress | codex | Capture the successful staged-diff check and staged-file custody before committing. |
| L6 | 2026-09-29T17:39:12Z | transition | in-progress | done | codex | All changes are reviewed, validated, recorded, and staged for the requested local commit. |

Relationships: None

## Implementation

### Plan and Starting Status

The current request is E1; there is no separate plan file. Work began on a clean master checkout at 735574184d2ceaf7b0de0284f788b31edade641b. This is classified as fresh-implementation because it adds a launcher CLI and extends health output. The original launcher instructions required manual file initialization, a fixed port, and visible browser rendering before completion.

### Core Functions and Result

- `scripts/open.js`: one bounded command forks a detached server, probes loopback directly with 250 ms timeouts, verifies canonical root and build, and reuses a matching server. Stable fallback ports resolve conflicts and concurrent opens; a six-second deadline bounds startup. No other listener is stopped.
- `scripts/serve.js`: validates CLI arguments, reports occupied ports clearly, atomically creates an absent canvas without overwriting a concurrent winner, and returns repository/build/PID/counts in health. In-memory assets remain consistent with the process build identity across future installs.
- `skills/dotcanvas/SKILL.md` and README: invoke one launcher, open the returned URL once, forward its actual remote port when supported, and promptly report queued tabs. Headless browser diagnostics are reserved for an actual load failure or requested check.
- `tests/startup.test.js`: covers collisions, legacy/stale builds, hung endpoints, concurrent opens, aliases, invalid canvas preservation, detached-process reuse, and frozen asset identity.

## Interface and Behavior Changes

New CLI: `node scripts/open.js --root <paper-root> [--port <preferred>]`, emitting one JSON receipt. `--port 0` bypasses reuse and requests an OS-assigned port. Existing foreground serving and GET/PUT canvas API remain available; `/health` now validates the saved document and includes identity/counts. An absent canvas is persisted on first initialization. Package and plugin version are 0.1.3.

The local Codex installer pruned the old cache. Exact runtime files from the clean baseline were restored under `/home/mzhyui/.codex/plugins/cache/personal/dotcanvas/0.1.2+codex.20260929120753` to preserve existing sessions. The active 0.1.3 cache is `/home/mzhyui/.codex/plugins/cache/personal/dotcanvas/0.1.3` (V4).

## Validation

### Test Result

Aggregate final validation: `pass`. The runtime, startup tests, and version manifest retain the SHA-256 values verified by V1/V2. Only instructions and README changed afterward; final source and installed skill checks pass. Browser tests use temporary canvases, including a copy of SP2027.

### V1 - pass

```text
node --test tests/*.test.js
```

Final host run: 23/23 tests pass. Sandbox attempt could not bind loopback (EPERM); rerun on the host passed. A draft invalid-JSON assertion was corrected to match the existing model error contract before the final run.

### V2 - pass

```text
DOTCANVAS_PLAYWRIGHT_MODULE=/tmp/dotcanvas-ui-n7Jsmf/browser-deps/node_modules/playwright DOTCANVAS_BROWSER=/home/mzhyui/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome DOTCANVAS_TEST_CANVAS=/home/mzhyui/git/sp2027/.canvas node --test tests/browser.spec.js
```

11 browser scenarios passed (12 TAP tests including parent), including a temporary copy of SP2027; no JavaScript errors or opening-time canvas rewrites.

### V3 - pass

```text
python3 /home/mzhyui/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/dotcanvas
```

Skill is valid.

### V4 - pass

```text
codex plugin add dotcanvas@personal --json
```

Installed local version 0.1.3; launcher, server, skill, and manifest bytes match source. Installer pruned the prior cache; exact baseline runtime assets restored for already-running 0.1.2 sessions.

### V5 - pass

```text
node /tmp/dotcanvas-verify-installed-startup.js
```

Installed startup: 36 ms; repeat: 30 ms, reused PID 3461681 at port 44627. Five cards and three links verified; SP2027 canvas bytes unchanged, SHA-256 2e8f9fe70f4894aeb39b021772917a615d265e4dd561365e437f50adc8f9309b.

### V6 - pass

```text
git diff --check
```

Final source diff has no whitespace errors.

### V7 - pass

```text
python3 /home/mzhyui/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/dotcanvas
```

Final source skill is valid.

### V8 - pass

```text
python3 /home/mzhyui/.codex/skills/.system/skill-creator/scripts/quick_validate.py /home/mzhyui/.codex/plugins/cache/personal/dotcanvas/0.1.3/skills/dotcanvas
```

Final installed skill is valid; its bytes and the installed README match the source.

### V9 - pass

```text
git diff --check
```

All current source changes pass whitespace validation before staging.

### V10 - pass

```text
git diff --cached --check
```

All nine staged files pass whitespace validation; no unstaged or non-ignored untracked paths remain outside the staged snapshot.

## Evidence Ledger

| ID | Class | Locator / conclusion |
| --- | --- | --- |
| E1 | user-stated | Current user request: explain the slow opening in chat 01a0ee27-5c41-7a73-b4e1-3db6c17951b1 and fix the DotCanvas implementation; implementation decision: bounded launcher, identity-based reuse, occupied-port fallback, and prompt queued-tab handoff. |
| E2 | verified | Linked chat opening: 456955 ms; EADDRINUSE on 38473 and 38474; old cached server; headless Chromium diagnostics; queued browser handoff.; /tmp/dotcanvas-linked-opening-evidence.json; SHA-256 `4ad0d8d653d4bcdc152b663502f9114df04612d8145b6176b9ada5a100d0450a` |
| E3 | verified | Installed version 0.1.3 SP2027 startup and reuse receipt; /tmp/dotcanvas-installed-startup-receipt.json; SHA-256 `4895fca9618b18f0245bb4bf3013124cbdd7cdbaf89f3ea27f970697854b7fb3` |
| E4 | verified | scripts/open.js; /home/mzhyui/git/dotcanvas/scripts/open.js; SHA-256 `68a8fa54ed35f96b5d5ce8c95203732442df3999dbab55ee29f4d5389dac6970` |
| E5 | verified | scripts/serve.js; /home/mzhyui/git/dotcanvas/scripts/serve.js; SHA-256 `b684e25d30d634fc6e112daab1be59de2647a92693d57cbfbef0173785c97214` |
| E6 | verified | skills/dotcanvas/SKILL.md (initial skill before the E9 instruction follow-up; final skill is E11); /home/mzhyui/git/dotcanvas/skills/dotcanvas/SKILL.md; SHA-256 `eb8095d07b4cd96488760f906905e9c6c811ee9358aa5f17099f387340fb7d5d` |
| E7 | verified | tests/startup.test.js; /home/mzhyui/git/dotcanvas/tests/startup.test.js; SHA-256 `d809808d199c7bbbcfb5dadb6b5cd9765bbf4b0ef00d8ae6d69816bda5313642` |
| E8 | verified | .codex-plugin/plugin.json; /home/mzhyui/git/dotcanvas/.codex-plugin/plugin.json; SHA-256 `dc39f42776e57605cad9050fd86599f411e39be083ca690a62645c1e2c58353f` |
| E9 | user-stated | Follow-up request: add clear instructions so Codex immediately starts the webserver and opens the plugin panel. |
| E10 | user-stated | Current request: conclude and commit all changes locally; no push requested. |
| E11 | verified | Final immediate-opening instructions: skills/dotcanvas/SKILL.md; /home/mzhyui/git/dotcanvas/skills/dotcanvas/SKILL.md; SHA-256 `812954e35d524d3eeaffca0912400ac6a3ce3b3f604fccac986ffbbbf49515ca` |
| E12 | verified | Final immediate-opening instructions: README.md; /home/mzhyui/git/dotcanvas/README.md; SHA-256 `8edada3fea9198fed6bb3025ddaa66feedd2198700c24be7949bb6c144d67a73` |
| V1 | verified | Final host run: 23/23 tests pass. Sandbox attempt could not bind loopback (EPERM); rerun on the host passed. A draft invalid-JSON assertion was corrected to match the existing model error contract before the final run. |
| V2 | verified | 11 browser scenarios passed (12 TAP tests including parent), including a temporary copy of SP2027; no JavaScript errors or opening-time canvas rewrites. |
| V3 | verified | Skill is valid. |
| V4 | verified | Installed local version 0.1.3; launcher, server, skill, and manifest bytes match source. Installer pruned the prior cache; exact baseline runtime assets restored for already-running 0.1.2 sessions. |
| V5 | verified | Installed startup: 36 ms; repeat: 30 ms, reused PID 3461681 at port 44627. Five cards and three links verified; SP2027 canvas bytes unchanged, SHA-256 2e8f9fe70f4894aeb39b021772917a615d265e4dd561365e437f50adc8f9309b. |
| V6 | verified | Final source diff has no whitespace errors. |
| V7 | verified | Final source skill is valid. |
| V8 | verified | Final installed skill is valid; its bytes and the installed README match the source. |
| V9 | verified | All current source changes pass whitespace validation before staging. |
| V10 | verified | All nine staged files pass whitespace validation; no unstaged or non-ignored untracked paths remain outside the staged snapshot. |

## Git Custody

- Branch: `master`.
- Baseline HEAD and pre-commit HEAD: `735574184d2ceaf7b0de0284f788b31edade641b`.
- History relation at record finalization: `same`; commits since baseline: None. The requested local commit follows record finalization; its hash is available in Git history. No push was requested or performed.
- Explicit scopes: `.codex-plugin/plugin.json`, `README.md`, `package-lock.json`, `package.json`, `scripts/open.js`, `scripts/serve.js`, `skills/dotcanvas/SKILL.md`, `tests/startup.test.js`.
- Scoped diff: `files=8; insertions=430; deletions=34; binary_files=0; untracked_files=0`.
- Task-owned changed paths: `.codex-plugin/plugin.json`, `README.md`, `package-lock.json`, `package.json`, `progress/2026-09-30-bounded-canvas-startup.md`, `scripts/open.js`, `scripts/serve.js`, `skills/dotcanvas/SKILL.md`, `tests/startup.test.js`.
- Pre-existing changes: None. Pre-existing overlaps: None. Outside-scope source changes: None.
- Ownership caveat: local installed caches were updated/restored as described in V4. This record is tracked separately from implementation diff counts.

## Evidence Boundary

The installed server receipt is E3: URL `http://127.0.0.1:44627`, PID `3461681`, root `/home/mzhyui/git/sp2027`, build `03378d1fe34f300169fd3fa685f3ff76014bc52947ff94680c8774f681ab4b89`. The paper canvas SHA-256 before and after is `2e8f9fe70f4894aeb39b021772917a615d265e4dd561365e437f50adc8f9309b`. Server health and browser regression checks do not certify desktop tab visibility, remote forwarding, or total future agent-turn latency. The original Snap/AppArmor messages came from ad hoc Chromium diagnostics; no host security policy was changed.

## Next Steps

Use the installed 0.1.3 skill for subsequent openings. The server was verified during V5; that receipt is a point-in-time observation. Codex owns queued-tab presentation and remote port forwarding; a queued response remains reported as queued.
