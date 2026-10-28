import {createHash,createHmac,hkdfSync,timingSafeEqual} from 'node:crypto';
import {keyFromEnv,revisionsFromEnv,revisionFor,matchesPhrase,sessionToken,verifySession,sessionCookie,clearCookie,cookieValue} from './owner_access.mjs';

const ADMIN_COOKIE='kijani_demo_admin';
const TTL=60*60;
const safeEqual=(a,b)=>{
  const aa=Buffer.isBuffer(a)?a:Buffer.from(String(a||''));
  const bb=Buffer.isBuffer(b)?b:Buffer.from(String(b||''));
  return aa.length===bb.length && timingSafeEqual(aa,bb);
};
export function makeAuth(env=process.env){
  const master=keyFromEnv(env.OWNER_DEMO_MASTER_KEY||'');
  const pin=String(env.DEMO_ADMIN_PIN||'');
  const revisions=revisionsFromEnv(env.OWNER_DEMO_REVISIONS_JSON||'');
  const enabled=Boolean(master && pin.length>=24 && pin.length<=128 &&
    !/^demo|^password|^1234/i.test(pin) && env.DEMO_ENABLE==='1');
  const adminKey=master?Buffer.from(hkdfSync('sha256',master,Buffer.from('kijani-dummy-staging'),Buffer.from('admin-session-v1'),32)):null;
  function adminToken(now=Date.now()){
    const body=Buffer.from(JSON.stringify({e:Math.floor(now/1000)+TTL})).toString('base64url');
    const sig=createHmac('sha256',adminKey).update(body).digest('base64url');
    return body+'.'+sig;
  }
  function adminSession(req,now=Date.now()){
    if(!enabled)return false;
    const raw=String(req.headers.get('cookie')||'').split(';').map(x=>x.trim())
      .find(x=>x.startsWith(ADMIN_COOKIE+'='))?.split('=',2)[1]||'';
    if(!/^[\w-]{2,256}\.[\w-]{43}$/.test(raw))return false;
    const [body,sig]=raw.split('.');
    if(!safeEqual(sig,createHmac('sha256',adminKey).update(body).digest('base64url')))return false;
    try{
      const val=JSON.parse(Buffer.from(body,'base64url').toString());
      return Number.isSafeInteger(val.e)&&val.e>Math.floor(now/1000)&&val.e<=Math.floor(now/1000)+TTL;
    }catch{return false;}
  }
  return {
    enabled,master,
    adminSession,
    adminMatches(value){
      if(!enabled||typeof value!=='string'||value.length>128||value.length<24)return false;
      return safeEqual(createHash('sha256').update(value).digest(),createHash('sha256').update(pin).digest());
    },
    adminCookie(secure=true){return `${ADMIN_COOKIE}=${adminToken()}; Path=/; Max-Age=${TTL}; HttpOnly; SameSite=Strict${secure?'; Secure':''}`;},
    adminClearCookie(secure=true){return `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure?'; Secure':''}`;},
    ownerMatches(slug,phrase){return !!enabled && matchesPhrase(master,slug,revisionFor(slug,revisions),phrase);},
    ownerSession(req){return enabled?verifySession(master,cookieValue(req.headers.get('cookie')),revisions):'';},
    ownerCookie(slug,secure=true){return sessionCookie(sessionToken(master,slug,revisionFor(slug,revisions)),secure);},
    ownerClearCookie(secure=true){return clearCookie(secure);},
    canView(req,slug){return enabled && (adminSession(req)||verifySession(master,cookieValue(req.headers.get('cookie')),revisions)===slug);},
  };
}
