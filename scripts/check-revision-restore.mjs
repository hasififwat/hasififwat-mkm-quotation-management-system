import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {ConvexHttpClient} from 'convex/browser';
import {verifyRevisionSource,guardRevisionManifest,guardRevisionTarget,requireFreePorts} from './helpers/revision-evidence.mjs';
import {checkRevisionInvariants} from './check-revision-invariants.mjs';

process.umask(0o077);
const repo=process.cwd();
const runDir=path.resolve('/private/tmp/mkm-issue61-run');
const run=JSON.parse(await fs.readFile(path.join(runDir,'run.json'),'utf8'));
assert.equal(run.owner,'issue-61');assert.equal(run.url,'http://127.0.0.1:13965');
assert.equal(path.resolve(run.sourceDir),path.join(runDir,'source'));
guardRevisionManifest(run,runDir);
const sourceEnv=Object.fromEntries((await fs.readFile(path.join(run.sourceDir,'.env.local'),'utf8')).split('\n').filter(Boolean).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
guardRevisionTarget(run,runDir,sourceEnv,run.sourceDir);
const sourceEvidence=await verifyRevisionSource(run);
const binary=process.env.FAMILY_BACKEND_BINARY;assert.ok(binary);
const root=await fs.mkdtemp(path.join(os.tmpdir(),'issue61-restore-'));
const url='http://127.0.0.1:13985';const siteUrl='http://127.0.0.1:13986';
await requireFreePorts([13985,13986]);
const name='issue61-restored';const secret=randomBytes(32).toString('hex');
const adminKey=execFileSync(binary,['keygen','admin-key','--instance-name',name,'--instance-secret',secret],{encoding:'utf8'}).trim();
const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('CONVEX_'))),CONVEX_SELF_HOSTED_URL:url,CONVEX_SELF_HOSTED_ADMIN_KEY:adminKey};
const cli=path.join(repo,'node_modules/.bin/convex');
const execute=(args,environment=env,cwd=root)=>{assert.equal(environment.CONVEX_SELF_HOSTED_URL,cwd===run.sourceDir?run.url:url);assert.ok(cwd===run.sourceDir||cwd===path.join(root,'source'));assert.equal(environment.CONVEX_DEPLOYMENT,undefined);assert.equal(environment.CONVEX_DEPLOY_KEY,undefined);const r=spawnSync(cli,args,{cwd,env:environment,encoding:'utf8'});assert.equal(r.status,0,`Local restore operation failed ${args[0]}. ${String(r.stderr).replaceAll(adminKey,'[redacted]').replaceAll(sourceEnv.CONVEX_SELF_HOSTED_ADMIN_KEY,'[redacted]')}`);};
const backend=spawn(binary,['--interface','127.0.0.1','--port','13985','--site-proxy-port','13986','--instance-name',name,'--instance-secret',secret,'--disable-beacon','--local-storage',path.join(root,'storage'),path.join(root,'restore.sqlite3')],{cwd:root,stdio:'ignore',detached:true});
try {
  const source=path.join(root,'source');await fs.mkdir(source);
  const archive=execFileSync('git',['archive',run.sourceCommit,'convex','src','public','package.json','convex.json'],{maxBuffer:64*1024*1024});
  execFileSync('tar',['-xf','-','-C',source],{input:archive});
  await fs.symlink(path.join(repo,'node_modules'),path.join(source,'node_modules'));
  await fs.copyFile(path.join(run.sourceDir,'convex/issue61Fixture.ts'),path.join(source,'convex/issue61Fixture.ts'));
  for(let i=0;i<100;i++){try{if((await fetch(url+'/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  execute(['dev','--once','--typecheck','disable','--codegen','disable'],env,source);
  const admin=new ConvexHttpClient(url);admin.setAdminAuth(adminKey);
  assert.ok(Object.values(await admin.query('issue61Fixture:dump',{})).every(rows=>rows.length===0),'Independent target starts empty');
  const original=new ConvexHttpClient(run.url);original.setAdminAuth(sourceEnv.CONVEX_SELF_HOSTED_ADMIN_KEY);
  const before=await original.query('issue61Fixture:dump',{});assert.ok(before.quotation_pdf_artifacts.some(a=>a.state.kind==='ready'));
  const zip=path.join(root,'snapshot.zip');
  execute(['export','--include-file-storage','--path',zip],{...env,...sourceEnv},run.sourceDir);
  const storageInventory=JSON.parse(execFileSync('python3',['-c',"import zipfile,json,hashlib,sys;z=zipfile.ZipFile(sys.argv[1]);print(json.dumps({n:{'sha256':hashlib.sha256(z.read(n)).hexdigest(),'size':len(z.read(n))} for n in z.namelist() if n.startswith('_storage/') and not n.endswith('/') and not n.endswith('.jsonl')}))",zip],{encoding:'utf8'}));
  assert.ok(Object.keys(storageInventory).length,'Export contains nonempty storage bytes');
  execute(['import','--yes',zip],env,source);
  const after=await admin.query('issue61Fixture:dump',{});
  const normalize=t=>Object.fromEntries(Object.entries(t).map(([k,v])=>[k,[...v].sort((a,b)=>a._id.localeCompare(b._id))]));
  assert.deepEqual(normalize(after),normalize(before),'Retained rows and IDs match independent restore');
  checkRevisionInvariants(after);
  const authFile=path.join(root,'.env.auth');
  await fs.writeFile(authFile,(await fs.readFile(path.join(runDir,'.env.auth'),'utf8')).replaceAll(run.siteUrl,siteUrl));
  execute(['env','set','--from-file',authFile],env,source);
  const account=JSON.parse(await fs.readFile(run.fixtureAccountPath,'utf8'));
  const user=new ConvexHttpClient(url);
  const login=await user.action('auth:signIn',{provider:'password',params:{...account,flow:'signIn'}});assert.ok(login.tokens?.token);user.setAuth(login.tokens.token);
  const hashes=[];
  for(const artifact of after.quotation_pdf_artifacts.filter(a=>a.state.kind==='ready')) {
    const pdf=await user.action('quotationPdfWorker:download',{revision_id:artifact.revision_id});
    const sha256=createHash('sha256').update(new Uint8Array(pdf.bytes)).digest('hex');assert.equal(sha256,artifact.state.sha256);assert.equal(pdf.size,artifact.state.size);
    hashes.push({revisionId:artifact.revision_id,storageId:artifact.state.storage_id,sha256,size:pdf.size});
  }
  const proof={source:sourceEvidence,sourceCommit:run.sourceCommit,sourceBackend:run.url,restoreBackend:url,independentEmptyTarget:true,restoredRowsIdentical:true,authenticatedPasswordLogin:true,counts:checkRevisionInvariants(after),storageInventory,authenticatedDownloads:hashes,scope:'Real separate local backend and restored password account; public authenticated Convex download action. Next.js route proof is separate.'};
  await fs.writeFile(path.join(runDir,'restore-proof.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify({sourceCommit:run.sourceCommit,restoredReadyPDFs:hashes.length,identicalRows:true,authenticatedHashesMatch:true}));
} finally {
  if(backend.exitCode===null)process.kill(-backend.pid,'SIGTERM');
  await new Promise(resolve=>backend.exitCode!==null?resolve():backend.once('exit',resolve));
  await fs.rm(root,{recursive:true,force:true});
}
