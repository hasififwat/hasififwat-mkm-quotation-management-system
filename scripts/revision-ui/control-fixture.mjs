import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { setTimeout } from 'node:timers/promises';
import { ConvexHttpClient } from 'convex/browser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runDir = path.resolve(process.env.REVISION_UI_RUN_DIR || path.join(root, '.next/mkm-issue59'));
const run = JSON.parse(await readFile(path.join(runDir, 'run.json'), 'utf8'));
if (run.owner !== 'quotation-revisions-59' || !/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(run.url)) throw new Error('Unexpected disposable backend');
const env = Object.fromEntries((await readFile(path.join(run.sourceDir, '.env.local'), 'utf8')).split('\n').filter(Boolean).map(line => {
  const index = line.indexOf('=');
  return [line.slice(0, index), line.slice(index + 1)];
}));
const client = new ConvexHttpClient(run.url);
client.setAdminAuth(env.CONVEX_SELF_HOSTED_ADMIN_KEY);
const [action, revisionId, state] = process.argv.slice(2);
const fixturePath = path.join(run.sourceDir, 'convex/issue59Fixture.ts');
if (action === 'install') {
  await writeFile(fixturePath, `import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
export const enable=internalMutation({args:{},handler:async ctx=>{
const migration=await ctx.db.query('quotation_family_migrations').withIndex('by_key',q=>q.eq('key','family-v1')).unique();
if(!migration?.done)throw new Error('Complete disposable migration first');
const row=await ctx.db.query('quotation_revision_release').withIndex('by_key',q=>q.eq('key','revision-v1')).unique();
if(row)await ctx.db.patch(row._id,{enabled:true});else await ctx.db.insert('quotation_revision_release',{key:'revision-v1',enabled:true});
}});
export const dump=internalQuery({args:{},handler:async ctx=>({quotations:await ctx.db.query('quotations').collect(),items:await ctx.db.query('quotation_items').collect(),families:await ctx.db.query('quotation_families').collect(),receipts:await ctx.db.query('quotation_save_receipts').collect(),artifacts:await ctx.db.query('quotation_pdf_artifacts').collect()})});
export const pdfState=internalMutation({args:{revision_id:v.id('quotations'),state:v.union(v.literal('pending'),v.literal('failed'),v.literal('missing'))},handler:async(ctx,args)=>{
const row=await ctx.db.query('quotation_pdf_artifacts').withIndex('by_revision',q=>q.eq('revision_id',args.revision_id)).unique();
if(!row)throw new Error('No fixture artifact');
if(args.state==='missing')await ctx.db.delete(row._id);else await ctx.db.patch(row._id,{state:args.state==='failed'?{kind:'failed',reason:'Disposable verification render failure'}:{kind:'pending'}});
}});
`);
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CONVEX_')));
  const result = spawnSync(path.join(root, 'node_modules/.bin/convex'), ['dev', '--once', '--typecheck', 'disable'], { cwd: run.sourceDir, env: environment, encoding: 'utf8' });
  await writeFile(path.join(runDir, 'fixture-deploy.log'), (result.stdout || '') + (result.stderr || ''));
  if (result.status !== 0) throw new Error('Fixture deployment failed. Inspect private fixture-deploy.log.');
  console.log('Installed fixture-only internal controls in disposable source.');
} else if (action === 'migrate') {
  await client.mutation('quotationFamilyMigration:freeze', { acknowledgement: 'Reviewed cutover write freeze' });
  let cursor = null;
  for (;;) {
    const result = await client.mutation('quotationFamilyMigration:backfill', { expectedCursor: cursor, limit: 50, dryRun: false });
    if (result.done) break;
    cursor = result.cursor;
  }
  await client.mutation('issue59Fixture:enable', {});
  console.log('Enabled revisions only on the owned disposable backend.');
} else if (action === 'dump') {
  const dump = await client.query('issue59Fixture:dump', {});
  const destination = path.resolve(revisionId || path.join(runDir, 'dump.json'));
  await writeFile(destination, JSON.stringify(dump, null, 2));
  console.log(JSON.stringify({ path: destination, revisions: dump.quotations.length, receipts: dump.receipts.length }));
} else if (action === 'pdf-state') {
  await client.mutation('issue59Fixture:pdfState', { revision_id: revisionId, state });
  console.log('Updated disposable artifact fixture.');
} else if (action === 'stop') {
  const processInfo = spawnSync('ps', ['-p', String(run.pid), '-o', 'command='], { encoding: 'utf8' });
  if (processInfo.status === 0) {
    if (!processInfo.stdout.includes(runDir) || !processInfo.stdout.includes('convex-local-backend')) throw new Error('Backend PID ownership mismatch');
    process.kill(-run.pid, 'SIGTERM');
  }
  for (let attempt = 0; attempt < 100; attempt++) {
    try { process.kill(-run.pid, 0); }
    catch (error) { if (error.code === 'ESRCH') break; throw error; }
    if (attempt === 99) throw new Error('Owned process group did not stop. Private state retained.');
    await setTimeout(100);
  }
  for (const url of [run.url, run.siteUrl]) {
    const port = Number(new URL(url).port);
    const occupied = await new Promise(resolve => {
      const socket = createConnection({host: '127.0.0.1', port});
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => resolve(false));
    });
    if (occupied) throw new Error('Verification port is still occupied. Private state retained.');
  }
  await rm(run.sourceDir, { recursive: true, force: true });
  for (const name of ['backend.sqlite3', 'backend.sqlite3-wal', 'backend.sqlite3-shm', 'storage', 'fixture-account.json', '.session.json', '.env.auth']) await rm(path.join(runDir, name), { recursive: true, force: true });
  await writeFile(path.join(runDir, 'cleanup.json'), JSON.stringify({ owner: run.owner, backendPid: run.pid, removedPrivateFixtureState: true }));
  console.log('Stopped owned backend and removed private disposable state.');
} else {
  throw new Error('Use install, migrate, dump [output], pdf-state ID pending|failed|missing, or stop.');
}
