# Coordinator baseline and probe evidence

These synthetic baseline and probe artifacts support the coordinator's decision trail. They do not replace the final integrated release evidence in #61. No credentials, session tokens, signing keys, database, or private storage were copied here.

`manifest.json` maps eight retained files to their original locations and SHA-256 values. The original locations were temporary or inside `.next`; use the adjacent copies after cleanup. `baseline-cleanup.json` records removal of the owned baseline source, database, storage and credentials after ports 3500, 3510 and 3511 were closed. User browser windows were preserved; an inert fixture tab may remain.

The 172-test log belongs to baseline commit `3d18ab73179abc8a4d1d6407c0e6b65d7bc9a3da`. The overwrite JSON and browser proof used `http://localhost:3500` with the isolated backend at `http://127.0.0.1:3510`. The notes had already changed through an actual-handler probe before the later browser Save. That Save reopened the same quotation ID and reference. A second view and reload confirmed persistence. The later wrong-window capture was excluded; no reload image is claimed.

The original family backend verifier used one client whose default queue serialized its allocation calls. Its report establishes unique sequential allocation, rollback and idempotent backfill. The coordinator's earlier concurrency wording is explicitly withdrawn in the append-only decision trail. The corrected queue-bypassing allocation proof is #61's `migration-rehearsal.json`.

The PDF action probe established actual local Node rendering and storage with `@react-pdf/renderer` externalized. It is not proof of durable artifact jobs, authenticated application retrieval, hosted behavior, or complete revision history. Those are covered by the later #58 and #61 reports.

The published coordinator log is a snapshot of the canonical working log. Historical paths remain unchanged in that append-only record; later preservation and correction rows map them to stable evidence. Implementation owners retain their own scoped decision trails and exact tested commits.
