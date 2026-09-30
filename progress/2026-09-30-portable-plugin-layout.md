# Portable OpenAI plugin layout

- Record format: `3`
- Record ID: `RCP-20260930T160122Z-b2c4ce81`
- Mode: `coding-progress`
- Task type: `migration`
- Task slug: `portable-plugin-layout`
- Date: `2026-09-30`
- Project: `/home/mzhyui/git/dotcanvas`
- Priority: `unspecified`
- Owner: `Unassigned`
- Components: `None`
- Labels: `None`
- Status category: `done`
- Status: `done`
- Resolution: `completed`
- Created at: `2026-09-30T16:01:22Z`
- Started at: `unavailable`
- Updated at: `2026-09-30T16:11:08Z`
- Completed at: `2026-09-30T16:11:08Z`
- Due date: `Not applicable`
- Evidence state: `verified`
- Validation state: `partial`
- Implementation class: `fresh-implementation`

## Outcome

Completed the source migration to Agent Plugins 1.0 at version 0.1.4. Host regression tests pass (V2), schema and preservation checks pass (V3), and syntax/whitespace checks pass (V4). The historical sandbox attempt remains partial (V1), so the record aggregate is partial. No product test failure remains in the host run.

## Task and Scope

The user requested an OpenAI-compatible layout for the current DotCanvas plugin (E1). The selected source repository previously had only a Codex compatibility manifest (E3). Official packaging guidance identifies the root manifest, fixed skills directory, and OpenAI extension namespace (E2). Scope covers manifests, the shared icon, runtime identity/asset loading, affected regression tests, and README. Existing skill instructions and canvas data retain their prior behavior.

## Lifecycle

Current blocker: None.

| ID | At | Action | From | To | Actor | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | 2026-09-30T16:01:22Z | created | none | in-progress | record-tool | record created |
| L2 | 2026-09-30T16:11:08Z | transition | in-progress | done | codex | Portable source layout implemented; host regression and schema checks complete; sandbox loopback restriction documented |

Local relationships: None.

## Implementation

### Plan and Starting Status

The confirmed plan was to convert the existing manifest without losing identity or presentation, retain Codex compatibility, place the shared icon under assets/, use the root manifest for runtime version/build identity, and validate preservation. Before editing, HEAD and six untracked data files were captured. The original manifest was copied to /tmp (E3), with the data-file hash inventory in E7.

### Core Functions and Result

| Path / function | Result |
| --- | --- |
| plugin.json | Canonical Agent Plugins 1.0 manifest; complete interface under extensions.com.openai, including both ordered prompts. |
| .codex-plugin/plugin.json | Retained skills discovery and synchronized identity, version, and presentation. |
| assets/icon.svg; panel/index.html | Relocated the existing icon byte-for-byte; relative reference works from the served page and direct-file preview. |
| scripts/serve.js: createServer | Loads assets from the plugin root, serves the new icon path and existing /icon.svg alias, reads/hashes root plugin.json, and freezes assets with process build identity. |
| tests/server.test.js; tests/startup.test.js | Verify icon bytes/routes, runtime without Codex overlay, and independent asset/manifest changes in build identity. |
| package.json; package-lock.json; README.md | Align version 0.1.4 and explain the canonical format and local runtime boundary. |

## Interface and Behavior Changes

Portable discovery now uses root plugin.json and skills/<name>/SKILL.md. OpenAI presentation uses extensions.com.openai.interface; the compatibility overlay remains synchronized. The subtitle changed from "Plan papers with connected cards" to "Plan papers with linked cards" to satisfy the 30-character limit. Icon paths now point to ./assets/icon.svg. Other interface values, including prompt type/order, are preserved (V3). Runtime health reports version 0.1.4 from the root manifest and includes that manifest in its content build hash. Canvas persistence and launcher CLI are unchanged.

## Validation

### Test Result

Aggregate manifest state: `partial` because V1 could not execute loopback tests in the sandbox. Final host result: 23/23 passing tests, zero failures or skips (V2). Final schema, migration preservation, syntax, and whitespace checks pass (V3-V4).

### V1 - partial

```text
npm test
```

Sandbox attempt: geometry/model files completed, but server/startup could not complete because loopback listen is prohibited. Direct node tests/server.test.js confirmed listen EPERM: operation not permitted 127.0.0.1. Host rerun is V2.

### V2 - pass

```text
npm test
```

Host permission route: 23/23 geometry, model, server and startup tests pass; zero failures or skips. Temporary roots only. Includes portable runtime without Codex overlay, manifest-sensitive build identity and relocated icon routes.

### V3 - pass

```text
python3 /tmp/dotcanvas-validate-layout.py
```

Agent Plugins 1.0 schema; synchronized identity, versions and full presentation; preserved prompt type/order; one skill; valid icon references and unchanged icon bytes; all six pre-existing data files unchanged.

### V4 - pass

```text
node --check scripts/serve.js
node --check panel/app.js
git diff --check
```

Server and panel JavaScript syntax checks and diff whitespace check pass.

## Evidence Ledger

| ID | Class | Locator and hash |
| --- | --- | --- |
| E1 | user-stated | Current conversation: use openai compatible plugin layout to refactor current plugin |
| E2 | verified | https://developers.openai.com/plugins/build/plugins |
| E3 | verified | /tmp/dotcanvas-original-plugin.json: pre-refactor Codex-only manifest; SHA-256 dc39f42776e57605cad9050fd86599f411e39be083ca690a62645c1e2c58353f |
| E4 | verified | plugin.json: canonical portable manifest; SHA-256 99f43867ea2906213dbbc2142414111236eb427513af21381b7e15adf37a5828 |
| E5 | verified | .codex-plugin/plugin.json: synchronized Codex compatibility overlay; SHA-256 4fca03b620c3ab265ed02a76a976d4c2e19f492c119d057742ec357ce7b00ebf |
| E6 | verified | https://agent-plugins.org/schemas/1.0.0/plugin.schema.json; /tmp/dotcanvas-agent-plugin-schema.json: fetched public schema; SHA-256 0a4aad95ce337878ad38802ebf0daa3fde76abe3f65400c86bcbb1ec0b3ab883 |
| E7 | verified | /tmp/dotcanvas-preserved-data.json: six pre-existing data-file SHA-256 values; SHA-256 91a2399c698f3ce0d1948f9951f43d0eba9e95e07614cc4478b2beaf7eeecc52 |
| E8 | verified | /tmp/dotcanvas-validate-layout.py: schema and migration preservation checks; SHA-256 df6e45b51c03bed4efa7edeebbcf1f7bac91259179a923b24e89ce4366f07ff9 |
| V1 | verified | Sandbox attempt: geometry/model files completed, but server/startup could not complete because loopback listen is prohibited. Direct node tests/server.test.js confirmed listen EPERM: operation not permitted 127.0.0.1. Host rerun is V2. |
| V2 | verified | Host permission route: 23/23 geometry, model, server and startup tests pass; zero failures or skips. Temporary roots only. Includes portable runtime without Codex overlay, manifest-sensitive build identity and relocated icon routes. |
| V3 | verified | Agent Plugins 1.0 schema; synchronized identity, versions and full presentation; preserved prompt type/order; one skill; valid icon references and unchanged icon bytes; all six pre-existing data files unchanged. |
| V4 | verified | Server and panel JavaScript syntax checks and diff whitespace check pass. |

## Git Custody

- Branch: `master`.
- Baseline HEAD: `3c6108afaf87a92625a5894ad4331cdc4f894830`.
- Final HEAD: `3c6108afaf87a92625a5894ad4331cdc4f894830`.
- History relation: `same`. Commits since baseline: None. Source changes are uncommitted; no push or installation was requested.
- Explicit task scopes: `.codex-plugin/plugin.json`, `README.md`, `assets/icon.svg`, `package-lock.json`, `package.json`, `panel/icon.svg`, `panel/index.html`, `plugin.json`, `scripts/serve.js`, `tests/server.test.js`, `tests/startup.test.js`.
- Record path: `progress/2026-09-30-portable-plugin-layout.md`.
- Task-owned changed paths: `.codex-plugin/plugin.json`, `README.md`, `assets/icon.svg`, `package-lock.json`, `package.json`, `panel/icon.svg`, `panel/index.html`, `plugin.json`, `progress/2026-09-30-portable-plugin-layout.md`, `scripts/serve.js`, `tests/server.test.js`, `tests/startup.test.js`.
- Pre-existing paths: `.canvas`, `papers/2609.32964/paper.canvas`, `papers/2609.32964/previous.canvas`, `papers/2609.32964/source.json`, `papers/2609.32964/source.pdf`, `papers/2609.32964/source.txt`.
- Pre-existing overlap: None.
- Outside-scope changed paths: `.canvas`, `papers/2609.32964/paper.canvas`, `papers/2609.32964/previous.canvas`, `papers/2609.32964/source.json`, `papers/2609.32964/source.pdf`, `papers/2609.32964/source.txt`. These were already untracked; V3 verifies their bytes did not change.
- Scoped implementation diff: `files=9; insertions=47; deletions=25; binary_files=0; untracked_files=2`. New untracked manifests/assets are counted separately from tracked-file line totals.
- Ownership caveat: This record assigns scope only to the local source changes; no prior commits are relabeled as task-owned.

## Evidence Boundary

Schema validation used the fetched public Agent Plugins 1.0 schema (E6) with jsonschema, plus checks of metadata synchronization and OpenAI listing constraints (E8/V3). This establishes package structure and tested local runtime behavior. It does not establish directory submission acceptance or live ChatGPT/Codex installation/loading. The installed cache and existing listeners were not changed. Browser regression tests were not run because Playwright is absent from this checkout; the icon route and bytes are verified at HTTP level. No external publication or account update occurred.

## Next Steps

None within the requested source refactor. Reloading an installed plugin is a separate operation when requested.
