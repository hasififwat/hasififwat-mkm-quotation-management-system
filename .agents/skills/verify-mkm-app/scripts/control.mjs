#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const require = createRequire(path.join(repo, "package.json"));
const [command, ...args] = process.argv.slice(2);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getPage(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 10000 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body }));
    });
    request.on("timeout", () => request.destroy(new Error("HTTP health check timed out")));
    request.on("error", reject);
  });
}

async function assertFreePort(port) {
  for (const host of ["127.0.0.1", "::1"]) {
    const server = net.createServer();
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, resolve);
      });
      await new Promise((resolve) => server.close(resolve));
    } catch (error) {
      if (host === "::1" && ["EAFNOSUPPORT", "EADDRNOTAVAIL"].includes(error.code)) continue;
      throw error;
    }
  }
}

function readRun(dir) {
  const runDir = fs.realpathSync(dir);
  const run = JSON.parse(fs.readFileSync(path.join(runDir, "run.json"), "utf8"));
  if (run.repo !== repo || run.runDir !== runDir || !run.token || !Number.isInteger(run.pid)) {
    throw new Error("This manifest does not describe a run created for this repository");
  }
  return run;
}

function processExists(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === "ESRCH") return false; throw error; }
}

function assertOwnedProcess(run) {
  if (!processExists(run.pid)) return false;
  const actual = execFileSync("ps", ["-p", String(run.pid), "-o", "command="], { encoding: "utf8" });
  if (!actual.includes(run.ownerScript) || !actual.includes(run.token)) {
    throw new Error("PID ownership changed; refusing to signal this process");
  }
  return true;
}

async function stopRun(run) {
  if (assertOwnedProcess(run)) {
    process.kill(-run.pid, "SIGTERM");
    for (let attempt = 0; attempt < 30 && processExists(run.pid); attempt++) await sleep(100);
    if (processExists(run.pid)) {
      if (assertOwnedProcess(run)) process.kill(-run.pid, "SIGKILL");
    }
  }
  fs.rmSync(run.workspace, { recursive: true, force: true });
  fs.writeFileSync(path.join(run.runDir, "cleanup.json"), JSON.stringify({
    stoppedAt: new Date().toISOString(), workspaceRemoved: !fs.existsSync(run.workspace),
    evidenceRetained: true,
  }, null, 2) + "\n");
}

async function start() {
  const portIndex = args.indexOf("--port");
  const port = portIndex < 0 ? 3100 : Number(args[portIndex + 1]);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Use a port from 1024 to 65535");
  await assertFreePort(port);
  if (!fs.existsSync(path.join(repo, ".env.local"))) throw new Error("Configure .env.local as described in README.md first");
  const runDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mkm-verify-")));
  fs.chmodSync(runDir, 0o700);
  // Keep the snapshot inside the repository's dependency root for Turbopack.
  fs.mkdirSync(path.join(repo, ".next"), { recursive: true });
  const workspace = fs.mkdtempSync(path.join(repo, ".next/mkm-verify-"));
  const sourceFiles = ["src", "convex", "public", "package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"];
  for (const entry of sourceFiles) fs.cpSync(path.join(repo, entry), path.join(workspace, entry), { recursive: true });
  fs.copyFileSync(path.join(repo, ".env.local"), path.join(workspace, ".env.local"));
  fs.chmodSync(path.join(workspace, ".env.local"), 0o600);
  fs.symlinkSync(path.join(repo, "node_modules"), path.join(workspace, "node_modules"), "dir");
  const digest = createHash("sha256");
  function hashSource(entry, relative = entry) {
    const absolute = path.join(workspace, relative);
    if (fs.statSync(absolute).isDirectory()) {
      for (const child of fs.readdirSync(absolute).sort()) hashSource(entry, path.join(relative, child));
    } else {
      digest.update(relative).update("\0").update(fs.readFileSync(absolute)).update("\0");
    }
  }
  sourceFiles.forEach((entry) => hashSource(entry));
  const sourceDigest = digest.digest("hex");
  const token = randomUUID();
  const ownerScript = path.join(workspace, "verification-owner.cjs");
  fs.writeFileSync(ownerScript, `const { spawn } = require('node:child_process');
const child = spawn(process.execPath, ${JSON.stringify([require.resolve("next/dist/bin/next"), "dev", "--turbopack", "--hostname", "127.0.0.1", "--port", String(port)])}, { stdio: 'inherit' });
let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { stopping = true; child.kill(signal); });
child.on('exit', (code) => process.exit(stopping ? 0 : (code ?? 1)));
`);
  const log = fs.openSync(path.join(runDir, "server.log"), "a", 0o600);
  const child = spawn(process.execPath, [ownerScript, token], {
    cwd: workspace, detached: true, stdio: ["ignore", log, log],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  fs.closeSync(log);
  const run = {
    repo, runDir, workspace, token, ownerScript, pid: child.pid, port,
    url: `http://127.0.0.1:${port}`, startedAt: new Date().toISOString(),
    commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(),
    nextVersion: require("next/package.json").version,
    sourceDigest,
    backendIsolation: "Shared configured Convex deployment; anonymous UI only until disposable fixtures are supplied",
    bundler: "turbopack",
  };
  fs.writeFileSync(path.join(runDir, "run.json"), JSON.stringify(run, null, 2) + "\n", { mode: 0o600 });
  try {
    for (let attempt = 0; attempt < 90; attempt++) {
      if (!processExists(child.pid)) throw new Error("Verification server exited; inspect server.log");
      try {
        const page = await getPage(run.url);
        if (page.status === 200 && page.body.includes("MKM Quotation")) {
          console.log(JSON.stringify({ runDir, url: run.url, pid: run.pid, httpReady: true, next: run.nextVersion }));
          child.unref();
          return;
        }
      } catch { /* Wait for compilation; browser hydration is checked separately. */ }
      await sleep(500);
    }
    throw new Error("Server did not reach the login page; inspect server.log");
  } catch (error) {
    await stopRun(run);
    throw new Error(`${error.message}. Evidence retained in ${runDir}`);
  }
}

try {
  if (command === "start") await start();
  else if (command === "doctor") {
    const run = readRun(args[0]);
    if (!assertOwnedProcess(run)) throw new Error("Owned server is not running");
    const page = await getPage(run.url);
    if (page.status !== 200 || !page.body.includes("MKM Quotation")) throw new Error("Expected MKM login page was not served");
    if (require("next/package.json").version !== run.nextVersion) throw new Error("Dependencies changed; restart the snapshot");
    console.log(JSON.stringify({ healthy: true, url: run.url, pid: run.pid, next: run.nextVersion,
      scope: "anonymous UI; require hydrated Email/Password/Login controls before driving", backendAuthVerified: false }));
  } else if (command === "stop") {
    const run = readRun(args[0]);
    await stopRun(run);
    console.log(JSON.stringify({ stopped: true, runDir: run.runDir, evidenceRetained: true }));
  } else throw new Error("Usage: control.mjs start [--port 3100] | doctor RUN_DIR | stop RUN_DIR");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
