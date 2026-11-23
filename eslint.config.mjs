import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { noComments } from "./scripts/lint/comment-ratchet.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agents/**",
  ]),
  {
    ignores: ["convex/_generated/**", "docs/evidence/**", "docs/verification/**", "work/**"],
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    linterOptions: { noInlineConfig: true },
    plugins: { project: { rules: { "no-comments": noComments } } },
    rules: { "project/no-comments": "error" },
  },
]);

export default eslintConfig;
