---
name: delete-comment
description: Audit and remove source comments in the MKM quotation repository. Use for /delete-comment, $delete-comment, or requests to classify comments, move decisions into ADRs, file workaround issues, or shrink the comment lint baseline.
---

# Delete comment

Use the requested paths or diff. For a repository-wide sweep, cover first-party application, Convex, configuration, maintenance, and verification source. Leave generated files, installed skills, historical evidence, and local scratch out of the sweep.

Run `pnpm lint:comments`. For an inventory that includes grandfathered entries, use ESLint’s parsed comment tokens, the PostCSS tokenizer, and Python’s `tokenize` as appropriate. For each comment, read the surrounding code and check related tests or history when the wording is ambiguous.

- **Tautology** repeats the implementation. Delete it.
- **Stale** describes removed behavior, obsolete assumptions, or commented-out code. Delete it.
- **Excuse** justifies an avoidable workaround. Delete the prose and file or reuse an issue for the verified problem when issue filing is part of the request. Group comments that describe the same fix. Link the issue from the audit output.
- **Decision Record** explains an important choice whose rationale is absent from the code. Preserve the rationale in a matching ADR or create one under `docs/adr/` using the repository’s domain-modeling ADR format. Delete the comment after recording the decision.

Treat a compiler directive, parser pragma, shebang, or required license notice according to its tooling or distribution contract. Verify behavior before removing anything with semantics. If a workaround needs its directive temporarily, record the tracked fix and prune the entry when it is resolved.

Use parser token ranges for edits and remove the enclosing braces of JSX comment-only expressions. Preserve line breaks needed by the language. Prune deleted entries from `scripts/lint/comment-baseline.json`. Its entries are repository-relative paths mapped to exact comment text and occurrence counts. The baseline may shrink during a sweep.

Verify the targeted comment lint, typecheck, and relevant tests. Compare emitted code when practical. Report counts by category, the number of physical source lines removed, remaining baseline entries, ADRs and issues, and any verification limits.
