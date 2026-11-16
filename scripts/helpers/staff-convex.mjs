import { execFileSync } from "node:child_process";
import path from "node:path";

export function staffConvexArgs(fn, args = {}, identity = process.env.CONVEX_RUN_IDENTITY) {
  if (!identity) {
    throw new Error('Set CONVEX_RUN_IDENTITY to the authorized staff identity JSON for Convex CLI --identity. Deployment admin access is also required.');
  }
  const parsed = JSON.parse(identity);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("CONVEX_RUN_IDENTITY must be a JSON object");
  }
  return ["run", fn, JSON.stringify(args), "--identity", identity];
}

export function runStaffConvex(root, fn, args = {}) {
  return execFileSync(process.execPath, [path.join(root, "node_modules/convex/bin/main.js"), ...staffConvexArgs(fn, args)], {
    cwd: root,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}
