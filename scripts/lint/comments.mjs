import { ESLint } from "eslint";
import "./non-eslint-comments.mjs";
import { repositoryRoot } from "./comment-ratchet.mjs";

const eslint = new ESLint({
  cwd: repositoryRoot,
  ruleFilter: ({ ruleId }) => ruleId === "project/no-comments",
});
const results = await eslint.lintFiles(".");
const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);
if (output) process.stdout.write(output);
if (results.some(result => result.errorCount > 0)) process.exitCode = 1;
