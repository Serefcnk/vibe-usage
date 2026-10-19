# Reliability and everyday workflows

> Execution: GPT-6.1 Sol / High implementation agents, with independent parent verification and review. The user approved the preceding repository assessment and requested implementation of its fixes and additions. No further design approval is required for routine choices within that scope.

**Goal:** Make quota-based launches and handovers reliable, then expose useful recovery, diagnostics, project preferences, and distribution workflows.

**Architecture:** Keep provider adapters read-only. Put policy, persistence, diagnostics and briefing logic in small core modules; expose validated IPC methods and localized UI. Preserve strict TypeScript, sandbox/CSP, credential isolation and private atomic persistence. No external AI summarization or telemetry.

**Stack:** TypeScript, Node 24, Electron, node:test, existing vanilla UI and 13 locales.

## Acceptance and execution order

### 1. Correctness and trustworthy checks

- [x] Make npm test and coverage platform-independent; explicitly reject an empty test set. Keep coverage gates (95/85/90) and ignore worktrees in lint.
- [x] Repair Windows-specific test assumptions without concealing regressions. Permission-dependent symlink tests may skip only their unsupported case with a clear reason. Retry transient Windows cleanup locks in test helpers, not production behavior.
- [x] On accepting a continuation, revalidate current enabled account, fresh quota and model eligibility; never fall back to an ineligible remembered target.
- [x] Persist failed/pending/successful transition state and support explicit retry; do not lose work on launch failures or mark failures successfully handled. Prevent duplicate automatic starts and concurrent acceptance.
- [x] Bind return offers to the original project and exact known target session; never pick another project's latest session. Suppress a return offer when exact identity cannot be determined.
- [x] Smart Launch must reject when no eligible quota exists, including stale previews and model-scoped limits. Refresh at the execution boundary and apply warning/running-session checks consistently to window and notification actions.
- [x] Add regression tests demonstrating failure before each behavior fix, then pass.

### 2. Observable and recoverable workflows

- [x] Show a bounded, persisted transition history: timestamp, project, source, destination, status and safe error code. Retain no conversation text or credentials in this history. Failed entries expose a safe retry with current validation.
- [x] Add a diagnostics screen listing installed/available tools, account/auth/quota status, freshness and specific localized remedies; no sign-in token extraction or raw logs. Allow copy/export of a redacted diagnostic report.
- [x] Add a read-only handover preview before explicit execution. Include a bounded recent chronological conversation, original goal, latest request, relevant files and git state. Preserve explicit constraints and reported decisions/test outcomes through that recent context; do not invent semantic facts. Sanitize secret patterns and mark imported context untrusted. Retain atomic private writes and avoid clobbering arbitrary user files/symlinks.
- [x] Add per-project preferences for tool, model, account and auto-continue permission. Canonical local paths; explicit 'off' wins, preferences never bypass verified-quota requirements. UI supports choosing, saving and removing a project's overrides.
- [x] Add configurable low-quota notification threshold and local quiet hours, including overnight ranges. Quiet hours suppress optional notifications, not background data refresh. Defaults preserve current behavior.
- [x] Version settings; migrate existing settings, maintain a last-known-good private backup and recover malformed current settings with an explicit nonfatal notice. Provide validated export/import/reset UI; never silently discard a future schema or overwrite unrecoverable files.
- [x] Add integration coverage for IPC to service/policy/persistence with fake external processes. All new visible text is localized consistently; preserve keyboard accessibility and run UI checks at normal and narrow widths.

### 3. Distribution and updates

- [x] Prepare signed Windows installer and macOS notarization workflows using optional configured secrets, with an honest unsigned development path.
- [x] Implement a safe user-initiated update installation flow suitable for packaged distributions; preserve opt-out, validate update origin and integrity, do not silently execute arbitrary downloads. Use established Electron tooling and official documentation for any new dependency/API.
- [x] Update release documentation, privacy/storage description and user-facing README behavior. Certificate provisioning and actual production publication are external requirements and must be reported as unperformed, never simulated.

### 4. Acceptance review

- [x] Parent inspects requirement coverage and actual diff; an independent fresh reviewer checks code quality and regressions.
- [x] Fix actionable review findings, rerun affected tests, then run build, lint, format:check, full tests/coverage and UI checks.
- [x] Record honest validation and remaining external limitations; no real provider sign-ins, task launches, publication or certificate changes during tests.

## Validation record (2026-10-18)

Phases 2–4 were completed by Claude Opus 5.5 after the handover; two background agents wrote the handover preview and
diagnostics core modules, and a fresh agent reviewed the whole branch. Its findings and their fixes:

- High: a signed macOS build merged `identity: null` and finished unsigned. The ad-hoc identity now lives only in the
  unsigned plan, and signed builds set `forceCodeSigning`. A test reads package.json to keep it that way.
- Medium: an unsigned Windows install would self-update on a checksum alone. It now needs a `publisherName` in its
  `app-update.yml` (only signed builds have one).
- Medium: a failed state write after a continuation started reported it as failed. Writes after dispatch, and at the
  end of an observation, no longer hide what happened; a write that fails before dispatch records the offer as failed.
- Low/medium: stranded stops no longer show a card with a target that has no quota; redaction covers URL user info,
  `Authorization: Basic` and colon-style secrets; the test runner fails on any unmatched pattern; Claude session lookup
  reads only the named transcript or each project's newest; project folders compare case-insensitively on macOS.

Final checks on Windows with Node 24: prettier, eslint, `tsc -b` clean; `npm run test:coverage` 257 tests, 254 pass,
0 fail, 3 skipped (symlink cases need a privilege this user lacks), coverage 98.0 / 90.7 / 92.6; build; real-preload
UI check in all 13 languages at 430px and 340px; a local unsigned `npm run build:win` produced the zips, the NSIS
installer (unsigned, as intended), `latest.yml` with SHA-512 and an `app-update.yml` fixed to the repository, with
electron-updater packed into the app.

Not done, needs the maintainer: code-signing certificates and Apple notarization credentials, a first signed release,
an in-app update from one published release to the next, and running the macOS build and updater on a Mac. The
translated READMEs under `docs/readme/` do not yet describe the new features.

## Known baseline evidence

Base commit: 6f567c5df6d8b194c0ffa7d55525b9cf5e315b22. Main working tree was clean.
Windows default npm scripts falsely ran 0 tests. Direct Node 24 run: 191 total, 173 pass, 15 fail, 3 skip; failures included POSIX path/mode assumptions and temporary-directory locks. Build/format and lint excluding .worktrees passed. UI check passed all 13 languages at 430px.

Bundled Node 24: C:/Users/musta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe. Prepend its directory to process PATH for all npm commands. Parent node_modules can be resolved from this nested worktree; install only if required. Tests involving localhost TLS/processes need sandbox escalation; this is already authorized routine validation. No code signing certificates are assumed to exist.
