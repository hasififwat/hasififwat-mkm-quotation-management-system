---
name: verify-mkm-app
description: Drive the MKM Quotation Next.js web app with the shared browser, capture user-path evidence, and clean up an isolated local server. Use when proving login, theme, package, client, or quotation UI behavior.
---

# Verify the MKM app

Read [the feature map](features/README.md), then the matching journey. Commands
below run from the repository root. This is a real Next.js/Turbopack app backed
by Convex; an HTTP 200 alone does not prove that it hydrated or authenticated.

## Launch

Prerequisites: the repository's `pnpm install` has completed, Node 24 is available,
and `.env.local` is configured using the repository README. Do not print that
file. The app uses `NEXT_PUBLIC_CONVEX_URL`; server routes prefer `CONVEX_URL`
when supplied. Existing configuration may point at a shared cloud deployment.

```sh
node .agents/skills/verify-mkm-app/scripts/control.mjs start --port 3100
```

The command returns a JSON object containing `runDir`, `url`, and the owned PID.
Use that returned directory for later commands. It copies current source,
including uncommitted work, into an ignored `.next/mkm-verify-*` directory and
starts the same `next dev --turbopack` bundler used by `pnpm dev:web`. The
snapshot shares installed dependencies. Restart it after editing source.
The normal `pnpm dev` command also starts a Convex watcher via mprocs; this helper
starts only the web service against the already configured deployment.

An empty snapshot needs no application rows for the anonymous login and theme
journeys. The helper first requires a 200 response with the MKM page title.
Then open the returned port with `preview_open` in an `incognito` profile and
wait for `Email`, `Password`, `Login`, and `Toggle theme`. Only that hydrated
state is ready for the anonymous journey.

Data journeys additionally need an authenticated verification agent and
disposable Convex fixtures. This repository has no automated empty-deployment
seed. Report the missing precondition rather than treating an empty screen as a
pass. Use a disposable deployment before creating, editing, or deleting records.
Do not run `convex dev`, import data, or deploy code against a shared backend as
an implicit part of a UI check.

## Doctor

```sh
node .agents/skills/verify-mkm-app/scripts/control.mjs doctor "$MKM_VERIFY_RUN_DIR"
```

Set `MKM_VERIFY_RUN_DIR` to the exact directory returned by `start`. This check
reads the run manifest, verifies its owned process and dependency version, and
requires the expected login response. In the browser, also require the expected
port, page title `MKM Quotation`, and hydrated login controls. For authenticated
journeys, require the intended agent and expected disposable records through
the UI; the doctor does not claim backend health or valid credentials.

Run doctor whenever navigation, authentication, or data looks wrong. A missing
owned process means restart this run, not attach to whichever app uses port 3000.

## Drive

Use T3's shared browser: `preview_status` first, then `preview_open` with
`target: {kind: "environment-port", port: 3100}`, `profileId: "incognito"`, and
`reuseExistingTab: false`. Substitute the chosen port if launching another run.
Keep the returned tab ID. Use `preview_snapshot` to discover ARIA refs and
`preview_act` to click/type. Refresh refs after navigation or another snapshot.
If no ARIA ref is available, use the verified label/ID selectors in the feature
map. Use `preview_evaluate` to read resulting DOM, native input validity, and
storage; perform user actions through browser controls.

The first runnable journey is [appearance](features/appearance.md). Toggle the
real `Toggle theme` button, reload, and compare the rendered `dark` class and
`localStorage.theme`. [Authentication](features/authentication.md) adds a
credential-free required-field check. Do not substitute either for a successful
login, save, or PDF download when that is the behavior under investigation.

The server's source/cache and the browser's origin are isolated by snapshot and
port. The Convex backend is **not** isolated by this helper. Do not double-drive
another agent's port or tab, and do not mutate shared application data. Use the
host's private secret-entry tool if a data journey needs credentials; omit
passwords, tokens, and filled credential fields from proof artifacts.

## Evidence

Keep evidence in the returned `runDir`, outside the disposable snapshot:

- `run.json` records source digest, commit, dependency version, port, and scope.
- `server.log` records launch and compilation.
- Save browser snapshots as `before.json`, `after.json`, and `reload.json`,
  including their action timelines, visible text, console, and network records.
- `preview_snapshot` with `save: true` returns a PNG path. Copy the PNGs into
  `runDir` as `before.png`, `after.png`, and `reload.png`.
- Write `proof.json` with the feature ID, entry point, actions, assertions,
  observed result, and unmet preconditions. Redact customer information when a
  data journey is authorized.

Exercise the real UI, capture both the action and its consequence, and read the
persisted result through a second user-facing view after a save. For theme, the
side effect is `localStorage.theme` plus persistence after reload; no backend
rows should be written. Native blank-field validation must leave the login
form and URL unchanged without a sign-in request. A toast or screenshot alone
does not establish a successful save. Do not use internal setters or mocked
pages to stand in for the user journey.

## Cleanup

Close only the preview tab created for this run with `t3_preview_close`. Then:

```sh
node .agents/skills/verify-mkm-app/scripts/control.mjs stop "$MKM_VERIFY_RUN_DIR"
```

The helper signals only its token-checked process group and deletes its source
snapshot, including the copied environment file. It preserves the run directory,
logs, screenshots, and `cleanup.json`. Run cleanup after failed attempts too.
Confirm the saved evidence still exists and the verification port is free.
Never kill the user's server by process name or remove their database records.

## Helpers

The executable [control.mjs](scripts/control.mjs) supports `start --port 3100`,
`doctor RUN_DIR`, and `stop RUN_DIR`; those are its complete command surface.
It requires macOS/Linux process-group signals and `ps`. It rejects occupied
ports. All browser operations remain visible through the host browser tools.

Keep the feature map current with `/maintain-verification-skill`.
