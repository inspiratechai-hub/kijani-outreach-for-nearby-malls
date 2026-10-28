#!/usr/bin/env node
// OPTIONAL: issue a NEW master key, operator PIN and 468 matching shop phrases
// on your own computer. If you use the earlier matching private pair, do NOT run this.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {freshMasterKey,keyFromEnv,phraseFor} from '../lib/owner_access.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const secrets=path.resolve(process.argv[2]||path.join(os.homedir(),'Kijani_Vercel_Demo_Secrets_PRIVATE.env'));
const phrases=path.resolve(process.argv[3]||path.join(os.homedir(),'Kijani_Vercel_Demo_Phrases_PRIVATE.csv'));
const inside=(file,dir)=>file===dir||file.startsWith(dir+path.sep);
let gitRoot='';for(let dir=root;;dir=path.dirname(dir)){
  if(fs.existsSync(path.join(dir,'.git'))){gitRoot=dir;break;}
  if(dir===path.dirname(dir))break;
}
if(secrets===phrases||[secrets,phrases].some(f=>inside(f,root)||(gitRoot&&inside(f,gitRoot))))
  throw new Error('Private outputs must be OUTSIDE the project and enclosing Git repository.');
if([secrets,phrases].some(fs.existsSync))throw new Error('Private output already exists. NEVER overwrite a key with active matching phrases.');
const rows=JSON.parse(fs.readFileSync(path.join(root,'data/businesses.json'),'utf8'));
if(rows.length!==468||new Set(rows.map(b=>b.slug)).size!==468)throw new Error('Catalogue not ready.');
const master=freshMasterKey(),key=keyFromEnv(master),admin=randomBytes(32).toString('base64url');
const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[['business','mall','business_slug','individual_access_phrase_PRIVATE'].join(',')];
for(const b of rows)csv.push([b.shop,b.mall,b.slug,phraseFor(key,b.slug)].map(cell).join(','));
try{
  fs.writeFileSync(secrets,`# PRIVATE server-side secrets. NEVER upload this file.\nOWNER_DEMO_MASTER_KEY=${master}\nDEMO_ADMIN_PIN=${admin}\n`,{flag:'wx',mode:0o600});
  fs.writeFileSync(phrases,'\ufeff'+csv.join('\n')+'\n',{flag:'wx',mode:0o600});
}catch(e){console.error('Provisioning incomplete: review partial private outputs before retrying.');throw e;}
console.log(`Private outputs created OUTSIDE the repository: ${secrets} and ${phrases}.`);
console.log('Do not upload them to GitHub, Vercel source, Canva or prompts. Do not invite owners from this Hobby-only personal staging demo.');
