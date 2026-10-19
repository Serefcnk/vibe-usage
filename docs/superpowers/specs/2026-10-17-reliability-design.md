# Reliable launches and recovery workflows

This design implements the repository assessment approved by the user on 2026-10-17. It preserves the local-only quota model and existing provider adapters.

## Launch invariants

Automatic selection and Smart Launch require a fresh successful measurement for the selected model. All applicable quota windows must be known and have room. An explicit project account preference narrows eligible candidates; it never grants an exemption from quota checks. Manual explicit account launch retains its existing warning flow.

A continuation identifies its source account, project and session. A return identifies the same transferred work, never whichever session the destination account most recently used. Unknown target session identity means no automatic return recommendation. User acceptance, notification actions and explicit retry share validation. A resumed source, removed account, exhausted destination or unsupported session invalidates the action without starting another process.

Persist an operation before dispatch, then record dispatched/failed outcomes. A terminal spawn is reported as dispatched, not as a completed task. An interrupted dispatch after a crash needs explicit user action; do not blindly repeat it. Bound history and store safe error codes, not raw exceptions, credentials or transcript text.

## Recovery and preferences

Keep settings in the existing user data folder with a schema version. Migrate unversioned settings without changing their behavior. A validated successful save maintains a private last-known-good backup. Malformed current settings recover from a valid backup with a visible notice; preserve the malformed original. If neither copy is usable, provide an explicit recovery/reset path rather than silently overwriting evidence. Newer unsupported schemas are never overwritten. Import/export validate a complete document, exclude credentials, and explain that local account/project paths are machine-specific.

Project overrides use a canonical local project path, optional tool/model/account choices, and an explicit automatic-continuation setting including inherit/off/accounts/tools. The settings UI can select a folder, edit overrides and remove them. A project configured off never launches automatically even when the global setting permits it.

Notification preferences expose a low-quota percentage threshold and optional local quiet hours. Ranges can cross midnight; equal start/end means disabled or is rejected consistently by validation/UI. Quiet hours affect notifications, not refresh, persistence or the user's explicit actions.

## User-facing workflows

Use focused dialogs or sections reachable from Settings; do not crowd the compact tray surface. History shows the latest bounded operations with understandable statuses and a retry action only where supported. Diagnostics shows provider availability, account state, measurement freshness and a concrete next step. Its copy/export report excludes addresses, profile/project paths, tokens and raw upstream errors.

Handover offers a preview before writing files or launching a process. The preview contains the original goal, latest request, bounded chronological recent conversation, relevant files and git state. Reported decisions and tests remain attributed conversation context, never claims invented by a summarizer. Redact recognizable secrets, mark the brief untrusted and write privately/atomically without following an existing symlink. Preview/execution changes must not silently switch to a different source session.

New controls remain usable by keyboard, have labels, and fit at 430px and narrow-window widths. Add representative states to the real-preload fixture UI checker and cover their interactions. Existing 13 locales remain complete.

## Distribution

Keep portable archives available and add a Windows NSIS installer. Production signing/notarization is conditional on deliberately configured CI credentials and must fail closed when a signed release is requested without them. Untrusted pull requests never receive signing credentials.

Use electron-updater for packaged supported installations, following the installed electron-builder version's schema. Updates are user initiated: check, download, show progress/error, then explicit restart/install. Disable automatic download and install-on-quit. No development forced-update settings. Keep the repository feed fixed, preserve opt-out and enforce package hash/signature verification. Unsigned/portable unsupported installations retain the release-page path with an honest explanation.

The official references are [Auto Update](https://www.electron.build/v26/docs/features/auto-update/), [Windows signing](https://www.electron.build/v26/docs/features/code-signing/code-signing-win/) and [macOS signing](https://www.electron.build/v26/docs/features/code-signing/code-signing-mac/). They are implementation references; validate configuration against locally installed types. Real certificates, notarization and a published upgrade cannot be tested without maintainer credentials/releases.

## Verification matrix

1. Test runner: ordinary npm invocation on Windows discovers tests; an unmatched pattern or empty suite fails; failing tests preserve a nonzero status; coverage gates stay enabled.
2. Continuation: exhausted/disabled/stale target, source resumed, concurrent clicks/refresh, persistence failure, restart before/after dispatch, explicit retry, wrong-project latest session, model-only exhaustion.
3. Settings: legacy migration, valid backup, malformed current, both malformed, unsupported future version, failed save, invalid import, quiet hours around midnight, removed preferred account, project off overriding global on.
4. UI/IPC: untrusted arguments rejected, action errors displayed, keyboard-accessible dialogs, preview has no write/launch side effects, diagnostics export redacts identity, history cannot replay a dispatched operation.
5. Updater: disabled/unpackaged/unsigned states, repeated download clicks, failure/retry, stale or replaced update, checksums/signature failures delegated to verified updater, explicit installation only.
6. Acceptance: full Windows suite, coverage, build, lint, formatting, real-preload UI checks; fresh independent diff review and parent reruns. macOS behavior receives portable unit coverage and CI configuration, not a claim of a locally executed macOS build.
