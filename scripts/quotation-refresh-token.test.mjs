import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {typescriptLoader} from './helpers/load-typescript.mjs';
const {quotationRefreshToken}=typescriptLoader(process.cwd())(path.resolve('convex/lib/quotationRefreshToken.ts'));
const quotation={_id:'q:1',notes:'a|b',updated_at:'same',total_amount:100};
const items=[{_id:'i:2',quantity:1,description:'食事'}, {_id:'i:1',quantity:2,description:'a,b'}];
test('SHA256 token has fixed size and ignores property and row order',async()=>{
 const a=await quotationRefreshToken(quotation,items);const b=await quotationRefreshToken(Object.fromEntries(Object.entries(quotation).reverse()),[...items].reverse());assert.equal(a,b);assert.match(a,/^quotation-refresh-v1:[a-f0-9]{64}$/);
});
test('same timestamp, legacy snapshot, item and delimiter changes remain distinct',async()=>{
 const originals=[quotation,{...quotation,notes:'a',branch:'b'}, {...quotation,notes:'a|',branch:'b'}, {...quotation,notes:'食事'}, {...quotation,notes:'食|事'}, {...quotation,package_snapshot:{}}, {...quotation,total_amount:101}];
 const tokens=await Promise.all(originals.map(q=>quotationRefreshToken(q,items)));assert.equal(new Set(tokens).size,tokens.length);
 assert.notEqual(await quotationRefreshToken(quotation,items),await quotationRefreshToken(quotation,[{...items[0],quantity:2},items[1]]));
});
