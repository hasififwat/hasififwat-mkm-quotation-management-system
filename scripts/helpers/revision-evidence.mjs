import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import net from 'node:net';
import assert from 'node:assert/strict';

export async function verifyRevisionSource(run,repo=process.cwd()) {
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),run.sourceCommit,'Manifest must identify current combined commit');
  execFileSync('git',['diff','--quiet','HEAD','--','next.config.ts','convex','src','public','convex.json','package.json','constants.ts','types.ts','utils.ts','tsconfig.json','postcss.config.mjs','pnpm-lock.yaml','pnpm-workspace.yaml'],{cwd:repo});
  const files=execFileSync('git',['ls-files','convex','src','public','convex.json','package.json','constants.ts','types.ts','utils.ts','tsconfig.json','postcss.config.mjs','pnpm-lock.yaml','pnpm-workspace.yaml'],{cwd:repo,encoding:'utf8'}).trim().split('\n');
  const hashes={};
  for(const file of files) {
    const expected=await fs.readFile(path.join(repo,file));
    const actual=await fs.readFile(path.join(run.sourceDir,file));
    assert.deepEqual(actual,expected,`Snapshot source differs ${file}`);
    hashes[file]=createHash('sha256').update(actual).digest('hex');
  }
  for(const file of ['scripts/check-integrated-revision-backend.mjs','scripts/check-revision-invariants.mjs','scripts/check-revision-restore.mjs','scripts/check-revision-http.mjs','scripts/helpers/revision-evidence.mjs'])hashes[file]=createHash('sha256').update(await fs.readFile(path.join(repo,file))).digest('hex');
  const config=await fs.readFile(path.join(run.sourceDir,'next.config.ts'));
  const productConfig=await fs.readFile(path.join(repo,'next.config.ts'));
  const override=Buffer.from(productConfig.toString().replace('const nextConfig: NextConfig = {',"const nextConfig: NextConfig = {\n allowedDevOrigins: ['127.0.0.1'],"));
  assert.ok(config.equals(productConfig)||config.equals(override),'Unexpected snapshot config change');
  return {sourceCommit:run.sourceCommit,sourceDir:run.sourceDir,files:hashes,sourceDigest:createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),snapshotNextConfigSha256:createHash('sha256').update(config).digest('hex'),snapshotConfigOverride:config.equals(productConfig)?null:'allowedDevOrigins includes 127.0.0.1 for isolated browser host; product next.config.ts unchanged',runtime:{node:process.version,convex:JSON.parse(await fs.readFile(path.join(repo,'node_modules/convex/package.json'),'utf8')).version,next:JSON.parse(await fs.readFile(path.join(repo,'node_modules/next/package.json'),'utf8')).version}};
}

export async function requireFreePorts(ports) {
  for(const port of ports) await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(resolve));});
}

export function guardRevisionManifest(run,runDir) {
  assert.equal(run.owner,'issue-61');
  assert.equal(path.resolve(run.sourceDir),path.join(runDir,'source'));
  assert.equal(path.resolve(run.fixtureAccountPath),path.join(runDir,'fixture-account.json'));
  assert.equal(run.url,'http://127.0.0.1:13965');
  assert.equal(run.siteUrl,'http://127.0.0.1:13966');
  assert.ok(Number.isSafeInteger(run.pid));
  const command=execFileSync('ps',['-p',String(run.pid),'-o','command='],{encoding:'utf8'});
  assert.ok(command.includes(runDir)&&command.includes('convex-local-backend'),'Owned backend process mismatch');
}

export function guardRevisionTarget(run,runDir,environment,cwd) {
  guardRevisionManifest(run,runDir);
  assert.equal(path.resolve(cwd),run.sourceDir);
  assert.equal(environment.CONVEX_SELF_HOSTED_URL,run.url);
  assert.equal(environment.CONVEX_URL,run.url);
  assert.equal(environment.NEXT_PUBLIC_CONVEX_URL,run.url);
  assert.equal(environment.NEXT_PUBLIC_CONVEX_SITE_URL,run.siteUrl);
  assert.ok(environment.CONVEX_SELF_HOSTED_ADMIN_KEY);
  assert.equal(environment.CONVEX_DEPLOYMENT,undefined);
  assert.equal(environment.CONVEX_DEPLOY_KEY,undefined);
}
