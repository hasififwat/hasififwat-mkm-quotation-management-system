# Disposable authenticated revision runtime

These helpers create a local SQLite Convex backend, generated signing keys, and a synthetic account. They never copy project credentials. The source snapshot comes from the current committed `HEAD`. Commit the implementation before preparing the runtime.

Set distinct ports and an unused external run directory. Every helper requires REVISION_UI_RUN_DIR and rejects .next descendants. Use the installed local backend binary.

```sh
export FAMILY_BACKEND_BINARY=/absolute/path/to/convex-local-backend
export REVISION_UI_RUN_DIR="$(mktemp -d /private/tmp/mkm-revision-ui.XXXXXX)"
export REVISION_UI_BACKEND_PORT=13865
export REVISION_UI_WEB_PORT=3530
python3 scripts/revision-ui/prepare-local-backend.py
node scripts/revision-ui/configure-local-auth.mjs
node scripts/revision-ui/control-fixture.mjs install
node scripts/revision-ui/seed-local-fixture.mjs
```

`install` deploys only into the owned loopback snapshot and adds internal fixture controls there. `seed` signs up through the real password provider, creates a profile, client, package and baseline legacy quotation through public handlers, then rereads its total. The account path is recorded in `run.json`. Read it privately for browser login. Keep credentials and JWTs out of captures and committed evidence.

The initial backend has no migration freeze or active revision release. To rehearse cutover on this disposable backend only, run the following command.

```sh
node scripts/revision-ui/control-fixture.mjs migrate
```

This invokes the actual internal migration and then enables the existing gate through a fixture-only internal mutation. There is no product endpoint that enables release. Start the web app from the manifest's `sourceDir` with `pnpm dev:web --port "$REVISION_UI_WEB_PORT"`. Record the web process you own and stop that process before cleanup.

`dump [output-path]` saves exact quotation, item, family, receipt and artifact rows for persistence comparisons. `pdf-state REVISION_ID pending|failed|missing` creates deterministic artifact conditions only in the disposable fixture. Record any injected condition in the evidence. Never treat it as an organically observed worker failure.

For a source refresh, stop the owned web process, copy only changed source files into the snapshot, and redeploy using `install`. Preserve the snapshot's private environment and generated auth state. Record the exact new implementation commit and every fixture-only source change. A history API provided by a separate unmerged ticket must be identified by its exact dependency commit.

Finish with the following command.

```sh
node scripts/revision-ui/control-fixture.mjs stop
```

Cleanup validates the backend PID command, stops its process group, waits for it to exit, verifies both backend ports closed, and removes the snapshot, database, storage, account, JWT and signing-key files. It preserves logs, public synthetic proof files and `cleanup.json`. The manifest remains so an old directory cannot silently become a new run.
