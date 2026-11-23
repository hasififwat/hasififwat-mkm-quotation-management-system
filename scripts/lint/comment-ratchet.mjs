import { existsSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

const baseline = JSON.parse(
  readFileSync(new URL("./comment-baseline.json", import.meta.url), "utf8"),
);

export function deletedBaselineFiles() {
  return Object.keys(baseline).filter(path => !existsSync(join(repositoryRoot, path)));
}

const commentMigrationMessage =
  "Delete redundant or stale comments, file an issue for workarounds, or record the decision in an ADR.";

export function checkComments(filename, comments) {
  const path = relative(repositoryRoot, filename).split(sep).join("/");
  const remaining = new Map(Object.entries(baseline[path] ?? {}));
  const violations = [];

  for (const comment of comments) {
    const allowed = remaining.get(comment.text) ?? 0;
    if (allowed > 0) {
      remaining.set(comment.text, allowed - 1);
    } else {
      violations.push({ ...comment, message: commentMigrationMessage });
    }
  }

  if ([...remaining.values()].some(count => count > 0)) {
    violations.push({
      line: 1,
      column: 1,
      message: "Prune the removed comment from scripts/lint/comment-baseline.json.",
    });
  }

  return violations;
}

export const noComments = {
  meta: {
    type: "suggestion",
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const source = context.sourceCode;
        const comments = source.getAllComments()
          .filter(comment => comment.type !== "Shebang")
          .map(comment => ({
            text: source.getText(comment),
            line: comment.loc.start.line,
            column: comment.loc.start.column + 1,
          }));

        for (const { line, column, message } of checkComments(context.physicalFilename, comments)) {
          context.report({ loc: { line, column: column - 1 }, message });
        }
      },
    };
  },
};
