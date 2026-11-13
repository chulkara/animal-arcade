/* Build-only helper. Assembles exact, approved image bytes without re-encoding.
 * Source fragments are retained in Git; published Pages has one normal PNG. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const fragments=Array.from({length:20},(_,i)=>{
  const name='part-'+String(i).padStart(2,'0')+'.txt';
  return readFileSync('assets/approved-menu-png/'+name,'utf8');
});
const raw=Buffer.from(fragments.join(''),'base64');
const digest=createHash('sha256').update(raw).digest('hex');
if(raw.length!==3170023 || digest!=='90fffe36338fc7c939c5e41c62a656a83532f0c1e3254b05cefd6bb9249fc9f4')
  throw new Error('Approved menu image integrity failure');
mkdirSync('public/assets',{recursive:true});
writeFileSync('public/assets/approved-menu.png',raw);
console.log('Exact approved menu image published:',raw.length,'bytes; SHA-256',digest);
