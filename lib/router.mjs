import {readFileSync} from 'node:fs';
import {makeAuth} from './access.mjs';
import {blobIsConfigured,BlobStore,MemoryStore} from './store.mjs';
import {blueprintFor,evaluate} from './report.mjs';
import {buildPdf} from './pdf.mjs';
import {privateMovie} from './media.mjs';
import {unavailable,notFound,adminSignIn,ownerSignIn,ownerPage,journeyPage,activityPage,studioPage} from './views.mjs';

const businesses=JSON.parse(readFileSync(new URL('../data/businesses.json',import.meta.url),'utf8'));
if(businesses.length!==468||new Set(businesses.map(b=>b.slug)).size!==468||new Set(businesses.map(b=>b.category)).size!==20)
  throw new Error('Expected 468 unique businesses and 20 categories');
const catalogue=new Map(businesses.map(b=>[b.slug,b]));
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const securityHeaders={
  'Cache-Control':'private, no-store, max-age=0',
  'X-Robots-Tag':'noindex, nofollow',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};
const html=(body,status=200,extra={})=>new Response(body,{status,headers:{...securityHeaders,'Content-Type':'text/html; charset=utf-8',...extra}});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...securityHeaders,'Content-Type':'application/json; charset=utf-8'}});
const redirect=(url,extra={})=>new Response(null,{status:303,headers:{...securityHeaders,'Location':url,...extra}});

async function parseBody(req,type){
  const ct=(req.headers.get('content-type')||'').split(';')[0].toLowerCase();
  if(ct!==type)throw new Error(type==='application/json'?'Expected JSON.':'Expected form data.');
  const len=Number(req.headers.get('content-length')||'0');
  if(!Number.isSafeInteger(len)||len>12000)throw new Error('Request too large.');
  const text=await req.text();
  if(text.length>12000)throw new Error('Request too large.');
  return type==='application/json'?JSON.parse(text):new URLSearchParams(text);
}
function demoContact(c){
  const name=String(c?.name||'').trim();
  const email=String(c?.email||'').trim().toLowerCase();
  const phone=String(c?.phone||'').trim();
  if(name.length>60||!/^Demo(?: [A-Za-z0-9'-]+){1,5}$/i.test(name))
    throw new Error('Use a fake name beginning with Demo, e.g. Demo Guest.');
  if(email.length>100||!/^[A-Za-z0-9._+-]+@(?:example\.(?:com|org|net)|[A-Za-z0-9-]+\.invalid)$/i.test(email))
    throw new Error('Use an example email such as demo@example.invalid.');
  if(!/^0{8,15}$/.test(phone))throw new Error('Use an all-zero, non-dialable phone.');
  return {name,email,phone};
}
function ownOrigin(req,url,env){
  const host=req.headers.get('host');
  const allowedScheme=url.protocol==='https:' ||
    (env.LOCAL_HTTP_TEST==='1'&&url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname));
  return allowedScheme && host===url.host && req.headers.get('origin')===url.origin;
}
function requestedPath(url){
  // The route parameter is appended by vercel.json if a same-app rewrite
  // presents /api/index to the function. If Vercel preserves the source URL,
  // the original pathname is used. It never bypasses authorization checks.
  if(url.pathname==='/api/index'&&url.searchParams.has('route')){
    const route=url.searchParams.get('route')||'';
    if(route.length>200||route.includes('?')||route.includes('#')||route.includes('..'))return '/404';
    return '/'+route.replace(/^\/+/, '');
  }
  return url.pathname.replace(/\/$/,'')||'/';
}

export function createApp({env=process.env,store}={}){
  const auth=makeAuth(env);
  if(env.VERCEL==='1' && store instanceof MemoryStore)throw new Error('Cannot deploy memory-only store to Vercel');
  const dataStore=store||(blobIsConfigured(env)?new BlobStore():null);
  const localOnly=env.LOCAL_HTTP_TEST==='1' && env.VERCEL!=='1';
  const ready=Boolean(auth.enabled&&dataStore && (blobIsConfigured(env)||localOnly));
  return async function handle(req){
    let path='/';
    try{
      const url=new URL(req.url);
      path=requestedPath(url);
      if(path==='/health')return json({ok:true,ready,mode:'personal-dummy-staging',businesses:468,categories:20,store:ready?'private-blob-or-local-test':'not-ready'});
      if(!ready)return html(unavailable(),503);
      if(req.method==='POST'&&!ownOrigin(req,url,env))return json({error:'Origin not permitted.'},403);
      if(path==='/api/index'||path==='/404')return html(notFound(),404);
      const media=/^\/media\/(kijani-(?:shared-introduction|beauty-social)\.mp4)$/.exec(path);
      if(media && (req.method==='GET'||req.method==='HEAD')){
        const owner=auth.ownerSession(req);
        const authorized=auth.adminSession(req)||Boolean(catalogue.has(owner) &&
          (media[1]==='kijani-shared-introduction.mp4'||catalogue.get(owner).salon_lane));
        return authorized?privateMovie(req,media[1],securityHeaders):html(notFound(),404);
      }
      if(req.method==='GET'){
        if(path==='/'||path==='/studio'){
          if(!auth.adminSession(req))return html(adminSignIn());
          return html(studioPage(businesses,{q:url.searchParams.get('q')||'',cat:url.searchParams.get('cat')||''}));
        }
        const match=/^\/preview\/([a-z0-9-]+)(?:\/(activity))?$/.exec(path);
        if(match){
          const b=catalogue.get(match[1]);if(!b)return html(notFound(),404);
          if(!auth.canView(req,b.slug))return match[2]?html(notFound(),404):html(ownerSignIn(b));
          if(match[2])return html(activityPage(b,await dataStore.list(b.slug,25)));
          return html(ownerPage(b));
        }
        const journey=/^\/journey\/([a-z0-9-]+)$/.exec(path);
        if(journey){
          const b=catalogue.get(journey[1]);
          if(!b||!auth.canView(req,b.slug))return html(notFound(),404);
          return html(journeyPage(b,blueprintFor(b)));
        }
        const pdf=/^\/api\/demo\/([a-z0-9-]+)\/([0-9a-f-]{36})\/pdf$/.exec(path);
        if(pdf){
          const [_,slug,id]=pdf;
          if(!ID.test(id)||!catalogue.has(slug)||!auth.canView(req,slug))return html(notFound(),404);
          const found=await dataStore.read(slug,id);
          if(!found)return html(notFound(),404);
          const bytes=await buildPdf(found.item);
          return new Response(bytes,{status:200,headers:{...securityHeaders,'Content-Type':'application/pdf',
            'Content-Disposition':`attachment; filename="${slug.slice(0,55)}-free-demo-report.pdf"`}});
        }
        return html(notFound(),404);
      }
      if(req.method==='POST'){
        if(path==='/studio/sign-in'){
          const data=await parseBody(req,'application/x-www-form-urlencoded');
          if(!auth.adminMatches(data.get('pin')))
            return html(adminSignIn('The operator PIN was not recognised.'),401);
          return redirect('/studio',{'Set-Cookie':auth.adminCookie(!localOnly)});
        }
        if(path==='/studio/sign-out')return redirect('/',{'Set-Cookie':auth.adminClearCookie(!localOnly)});
        const ownerLogin=/^\/preview\/([a-z0-9-]+)\/(sign-in|sign-out)$/.exec(path);
        if(ownerLogin){
          const [_,slug,action]=ownerLogin;
          const b=catalogue.get(slug);if(!b)return html(notFound(),404);
          if(action==='sign-out')return redirect(`/preview/${slug}`,{'Set-Cookie':auth.ownerClearCookie(!localOnly)});
          const data=await parseBody(req,'application/x-www-form-urlencoded');
          if(!auth.ownerMatches(slug,data.get('phrase')))
            return html(ownerSignIn(b,'Access phrase not recognised. Use this business’s separately supplied demo phrase.'),401);
          return redirect(`/preview/${slug}`,{'Set-Cookie':auth.ownerCookie(slug,!localOnly)});
        }
        const finish=/^\/api\/demo\/([a-z0-9-]+)\/finish$/.exec(path);
        if(finish){
          const b=catalogue.get(finish[1]);
          if(!b||!auth.canView(req,b.slug))return json({error:'Private business demo unavailable.'},404);
          const data=await parseBody(req,'application/json');
          if(data?.dataConsent!==true)return json({error:'Agree to private dummy test storage first.'},400);
          const contact=demoContact(data.contact);
          const report=evaluate(b,data.answers);
          const record=await dataStore.create(b.slug,{
            shop:b.shop,mall:b.mall,category:b.category,contact,
            marketingConsent:data.marketingConsent===true,dataConsentAt:new Date().toISOString(),
            answers:Object.fromEntries(report.answers.map(x=>[x.id,x.answerId])),
            report,actions:[],
          });
          return json({ok:true,id:record.id,report:{assessmentTitle:report.assessmentTitle,summary:report.summary,
            freeStep:report.freeStep,openQuestion:report.openQuestion,reviewStatus:report.reviewStatus},
            pdfUrl:`/api/demo/${b.slug}/${record.id}/pdf`},201);
        }
        const action=/^\/api\/demo\/([a-z0-9-]+)\/([0-9a-f-]{36})\/(action|delete)$/.exec(path);
        if(action){
          const [_,slug,id,kind]=action;
          if(!ID.test(id)||!catalogue.has(slug)||!auth.canView(req,slug))
            return json({error:'Private business record unavailable.'},404);
          if(kind==='delete'){
            if(!await dataStore.remove(slug,id))return html(notFound(),404);
            return redirect(`/preview/${slug}/activity`);
          }
          const data=await parseBody(req,'application/json');
          const label={help:'Help requested (demo only; not sent)',
            appointment:'Appointment enquiry (demo only; unconfirmed and unsent)',
            save_later:'Free report saved for later (demo only)'}[data?.action];
          if(!label)return json({error:'Unsupported demo action.'},400);
          const result=await dataStore.update(slug,id,record=>{
            if(record.actions.length>=8)throw new Error('Demo action limit reached.');
            record.actions.push({type:data.action,label,status:'simulated_only',at:new Date().toISOString(),
              externalMessageSent:false,availabilityChecked:false,confirmed:false,paymentTaken:false});
            return record;
          });
          if(!result)return json({error:'Private business record unavailable.'},404);
          return json({ok:true,status:'simulated_only',confirmed:false,externalMessageSent:false,
            message:`${label}. No external message, booking or payment occurred.`});
        }
      }
      return html(notFound(),404);
    }catch(err){
      const expected=err instanceof SyntaxError || /^Select an answer|^Complete the six|^Use an? |^Agree |^Expected |^Request too large/.test(err?.message||'');
      // Never log the submitted dummy contact, answers, cookies, access phrases or secrets.
      if(!expected)console.error('Private demo request failed at',path,err?.name||'Error');
      return json({error:expected?err.message:'Private demo is temporarily unavailable. Try again later.'},expected?400:503);
    }
  };
}
