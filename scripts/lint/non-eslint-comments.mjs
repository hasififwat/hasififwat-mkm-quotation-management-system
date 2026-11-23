import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { Input } from "postcss";
import tokenize from "postcss/lib/tokenize";
import { checkComments, deletedBaselineFiles, repositoryRoot } from "./comment-ratchet.mjs";

const ignoredDirectories = new Set([
  ".agents", ".git", ".next", ".pnpm-store", ".vercel", "build", "coverage",
  "convex/_generated", "database", "docs/evidence", "docs/verification",
  "out", "work",
]);

function sourceFiles(directory = "") {
  const files = [];
  for (const entry of readdirSync(join(repositoryRoot, directory), { withFileTypes: true })) {
    const path = posix.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && !ignoredDirectories.has(path)) {
      files.push(...sourceFiles(path));
    } else if (entry.isFile() && /\.(css|py)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

const files = sourceFiles().sort();

function cssComments(filename) {
  const css = new Input(readFileSync(filename, "utf8"), { from: filename });
  const scanner = tokenize(css);
  const comments = [];
  while (!scanner.endOfFile()) {
    const [type, text, offset] = scanner.nextToken();
    if (type === "comment") {
      const { line, col } = css.fromOffset(offset);
      comments.push({ text, line, column: col });
    }
  }
  return comments;
}

const pythonFiles = files.filter(file => file.endsWith(".py"));
const pythonComments = pythonFiles.length === 0 ? {} : JSON.parse(execFileSync(
  "python3",
  ["scripts/lint/python-comments.py", ...pythonFiles],
  { cwd: repositoryRoot, encoding: "utf8" },
));

for (const file of files) {
  const filename = join(repositoryRoot, file);
  const comments = pythonComments[file] ?? cssComments(filename);
  for (const { line, column, message } of checkComments(filename, comments)) {
    console.error(`${file}:${line}:${column} ${message}`);
    process.exitCode = 1;
  }
}

for (const file of deletedBaselineFiles()) {
  console.error(`${file} was deleted. Prune its entry from scripts/lint/comment-baseline.json.`);
  process.exitCode = 1;
}
