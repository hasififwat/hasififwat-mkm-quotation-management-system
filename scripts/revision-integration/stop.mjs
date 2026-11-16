import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {guardRevisionManifest,requireFreePorts} from '../helpers/revision-evidence.mjs';

const runDir='/private/tmp/mkm-issue61-run';
const run=JSON.parse(await fs.readFile(path.join(runDir,'run.json'),'utf8'));
guardRevisionManifest(run,runDir);
const groups=new Set();
let listeners=[];
try {listeners=execFileSync('lsof',['-t','-iTCP:3540','-sTCP:LISTEN'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);}
catch(error){if(error.status!==1)throw error;}
for(const pid of listeners) {
  const group=execFileSync('ps',['-p',pid,'-o','pgid='],{encoding:'utf8'}).trim();
  const members=execFileSync('ps',['-axo','pid=,pgid='],{encoding:'utf8'}).trim().split('\n').map(line=>line.trim().split(/\s+/)).filter(parts=>parts[1]===group).map(parts=>parts[0]);
  assert.ok(members.length);
  for(const member of members) {
    const cwd=execFileSync('lsof',['-a','-p',member,'-d','cwd','-Fn'],{encoding:'utf8'}).split('\n').find(line=>line.startsWith('n'))?.slice(1);
    assert.equal(cwd,run.sourceDir,'Web process group contains a process outside the owned source');
  }
  groups.add(Number(group));
}
const proof={owner:run.owner,sourceCommit:run.sourceCommit,runDir,backendGroup:run.pid,webGroups:[...groups],ports:[3540,13965,13966],privateFixtureRemoved:false};
if(process.argv.includes('--check-only')) {console.log(JSON.stringify(proof));process.exit(0);}
groups.add(run.pid);
for(const group of groups) {
  try {process.kill(-group,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}
  let stopped=false;
  for(let attempt=0;attempt<100;attempt++) {
    try {process.kill(-group,0);}catch(error){if(error.code==='ESRCH'){stopped=true;break;}throw error;}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(stopped,'Owned process group did not stop. Private state retained.');
}
await requireFreePorts(proof.ports);
assert.equal(runDir,'/private/tmp/mkm-issue61-run');
await fs.rm(runDir,{recursive:true,force:true});
proof.privateFixtureRemoved=true;
proof.closedPortsVerified=true;
proof.groupsStopped=true;
proof.scope='Only the owned local backend/web groups and exact private fixture directory. No user browser window or shared deployment was closed or changed.';
await fs.writeFile(path.resolve('docs/evidence/issue-61/cleanup.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
