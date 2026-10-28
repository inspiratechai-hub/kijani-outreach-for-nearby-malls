import {createHmac, hkdfSync, randomBytes, timingSafeEqual} from 'node:crypto';

const ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SESSION_SECONDS=60*60; // view-only browser session; not a live CRM identity

export function keyFromEnv(raw){
  if(!/^[A-Za-z0-9_-]{43}$/.test(String(raw||'')))return null;
  const key=Buffer.from(raw,'base64url');
  return key.length===32?key:null;
}
export function freshMasterKey(){return randomBytes(32).toString('base64url');}
export function revisionsFromEnv(raw){
  if(!raw)return {};
  let obj;
  try{obj=JSON.parse(raw);}catch{throw new Error('OWNER_DEMO_REVISIONS_JSON must be a JSON object');}
  if(!obj||Array.isArray(obj)||typeof obj!=='object'||Object.keys(obj).some(k=>
    !SLUG.test(k)||!Number.isSafeInteger(obj[k])||obj[k]<1||obj[k]>99999)){
    throw new Error('Invalid owner-demo revision map');
  }
  return obj;
}
export function revisionFor(slug,revisions={}){return revisions[slug]??1;}
function base32(buf){
  let bits=0,value=0,out='';
  for(const b of buf){
    value=(value<<8)|b;bits+=8;
    while(bits>=5){out+=ABC[(value>>(bits-5))&31];bits-=5;}
    value &= (1<<bits)-1;
  }
  if(bits)out+=ABC[(value<<(5-bits))&31];
  return out;
}
export function phraseFor(key,slug,revision=1){
  if(!key||key.length!==32||!SLUG.test(slug)||!Number.isSafeInteger(revision)||revision<1)throw new Error('Invalid credential input');
  const bytes=createHmac('sha256',key).update(`kijani-view-only-owner-v1|${slug}|${revision}`).digest().subarray(0,15);
  return base32(bytes).match(/.{1,4}/g).join('-'); // 120 bits, one phrase per shop
}
export function matchesPhrase(key,slug,revision,input){
  if(typeof input!=='string'||input.length>128||input.length<12)return false;
  const expected=Buffer.from(phraseFor(key,slug,revision),'utf8');
  const actual=Buffer.from(input.trim().toUpperCase(),'utf8');
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function sessionKey(key){return Buffer.from(hkdfSync('sha256',key,Buffer.from('kijani-owner-demo'),Buffer.from('read-only-session-v1'),32));}
export function sessionToken(key,slug,revision=1,now=Date.now()){
  const payload=Buffer.from(JSON.stringify({s:slug,v:revision,e:Math.floor(now/1000)+SESSION_SECONDS}), 'utf8').toString('base64url');
  const sig=createHmac('sha256',sessionKey(key)).update(payload).digest('base64url');
  return payload+'.'+sig;
}
export function verifySession(key,token,revisions={},now=Date.now()){
  if(!key||typeof token!=='string'||token.length>512||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))return '';
  const [payload,sig]=token.split('.');
  const correct=Buffer.from(createHmac('sha256',sessionKey(key)).update(payload).digest('base64url'));
  const received=Buffer.from(sig);
  if(received.length!==correct.length||!timingSafeEqual(received,correct))return '';
  let decoded;
  try{decoded=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{return '';}
  if(!decoded||!SLUG.test(decoded.s||'')||!Number.isSafeInteger(decoded.v)||
     decoded.v!==revisionFor(decoded.s,revisions)||!Number.isSafeInteger(decoded.e)||
     decoded.e<=Math.floor(now/1000)||decoded.e>Math.floor(now/1000)+SESSION_SECONDS)return '';
  return decoded.s;
}
export function sessionCookie(token,secure=true){return `kijani_view_owner=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=Lax${secure?'; Secure':''}`;}
export function clearCookie(secure=true){return `kijani_view_owner=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure?'; Secure':''}`;}
export function cookieValue(header){
  const field=String(header||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('kijani_view_owner='));
  return field?field.split('=',2)[1]:'';
}
