import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PDFDocument} from 'pdf-lib';
import {createApp} from '../lib/router.mjs';
import {MemoryStore} from '../lib/store.mjs';
import {keyFromEnv,phraseFor} from '../lib/owner_access.mjs';
import {blueprintFor,evaluate} from '../lib/report.mjs';
import {buildPdf} from '../lib/pdf.mjs';
const rows=JSON.parse(readFileSync(new URL('../data/businesses.json',import.meta.url),'utf8'));
const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const master=Buffer.alloc(32,0x23).toString('base64url');
const adminPin='TEST-ONLY-NOT-FOR-VERCEL-Private-Demo-Operator-89012345';
const env={OWNER_DEMO_MASTER_KEY:master,DEMO_ADMIN_PIN:adminPin,DEMO_ENABLE:'1',LOCAL_HTTP_TEST:'1'};
const store=new MemoryStore();
const handler=createApp({env,store});
const b1=rows.find(x=>x.slug==='ameerah-spa-rosslyn-riviera-mall');
const b2=rows.find(x=>x.slug==='360-degrees-pizza-rosslyn-riviera-mall');
const origin='https://private-demo.vercel.app';
async function request(path,{method='GET',cookie='',body,originHeader=origin,app=handler}={}){
  const headers={'host':'private-demo.vercel.app'};
  if(cookie)headers.Cookie=cookie;
  if(method==='POST')headers.Origin=originHeader;
  if(typeof body==='string')headers['Content-Type']='application/x-www-form-urlencoded';
  else if(body!==undefined){headers['Content-Type']='application/json';body=JSON.stringify(body);}
  return app(new Request(origin+path,{method,headers,...(body?{body}:{}),redirect:'manual'}));
}
const key=keyFromEnv(master);
async function ownerCookie(b){
  const phrase=phraseFor(key,b.slug);
  const response=await request(`/preview/${b.slug}/sign-in`,{method:'POST',body:`phrase=${encodeURIComponent(phrase)}`});
  assert.equal(response.status,303);
  return response.headers.get('set-cookie').split(';')[0];
}
const dummy={contact:{name:'Demo Guest',email:'guest@example.invalid',phone:'0000000000'},dataConsent:true,marketingConsent:false};
const answersFor=b=>Object.fromEntries(blueprintFor(b).questions.map(q=>[q.id,q.options[0].id]));

test('catalogue, questions, assets and Vercel entry are complete, no contacts in source',()=>{
  assert.equal(rows.length,468);
  assert.equal(new Set(rows.map(b=>b.slug)).size,468);
  assert.equal(new Set(rows.map(b=>b.category)).size,20);
  assert.equal(rows.filter(b=>b.salon_lane).length,23);
  for(const b of rows){
    assert.equal(blueprintFor(b).questions.length,6);
    assert.equal(blueprintFor(b).review_status==='approved',
      b.type==='Day Spa & Massage'||b.type==='Hair Salon & Barbering');
    assert(!('email' in b)||!b.email);
    assert(!('phone' in b)||!b.phone);
  }
  const rewrites=config.rewrites.map(x=>x.source).join(' ');
  for(const route of ['/studio','/preview/:slug','/journey/:slug','/api/demo/:slug/finish'])assert(rewrites.includes(route));
  assert(config.functions['api/index.mjs'].includeFiles.includes('data/'));
  assert.equal(config.outputDirectory,'public'); // private catalogue must NOT be statically served
  for(const filename of ['kijani-beauty-social.mp4','kijani-shared-introduction.mp4']){
    const size=readFileSync(new URL(`../data/private_media/${filename}`,import.meta.url)).length;
    assert(size>1e6 && size<25*1024*1024);
  }
  assert(rewrites.includes('/media/:name'));
  assert(config.functions['api/index.mjs'].includeFiles==='data/**/*');
});

test('fails closed when master key, Blob store or explicit enable flag are absent',async()=>{
  const broken=createApp({env:{DEMO_ENABLE:'1'},store:new MemoryStore()});
  assert.equal((await request('/studio',{app:broken})).status,503);
  const notEnabled=createApp({env:{...env,DEMO_ENABLE:'0'},store:new MemoryStore()});
  assert.equal((await request(`/preview/${b1.slug}`,{app:notEnabled})).status,503);
  const deployment=createApp({env:{...env,VERCEL:'1'},store:undefined});
  assert.equal((await request('/health',{app:deployment})).status,200);
  assert.equal((await (await request('/health',{app:deployment})).json()).ready,false);
  assert.throws(()=>createApp({env:{...env,VERCEL:'1'},store:new MemoryStore()}),/Cannot deploy memory-only/);
});

test('operator Studio locked, shows all 3 malls, 20 categories only with own PIN',async()=>{
  const unauth=await request('/studio');
  assert.equal(unauth.status,200);
  assert((await unauth.text()).includes('Operator sign-in'));
  assert.equal((await request('/studio/sign-in',{method:'POST',body:'pin=bad'})).status,401);
  const signed=await request('/studio/sign-in',{method:'POST',body:'pin='+encodeURIComponent(adminPin)});
  assert.equal(signed.status,303);
  const cookie=signed.headers.get('set-cookie').split(';')[0];
  const index=await (await request('/studio',{cookie})).text();
  assert(index.includes('468 business-specific previews'));
  assert(index.includes('All 20 categories'));
  assert(index.includes('Rosslyn Riviera Mall'));
  assert((await (await request('/studio?q=Two%20Rivers',{cookie})).text()).includes('Two Rivers Mall'));
  assert((await (await request('/studio?q=Village%20Market',{cookie})).text()).includes('Village Market'));
  const filtered=await (await request('/studio?q=360%20Degrees',{cookie})).text();
  assert(filtered.includes('360 Degrees Pizza'));
  assert(!filtered.includes('Ameerah Ladies Spa &amp; Salon'));
  assert((await request(`/preview/${b2.slug}`,{cookie})).status===200);
  const signedOut=await request('/studio/sign-out',{method:'POST',cookie});
  assert.equal(signedOut.status,303);
});

test('business-specific sign-in, origin safety, film placement, exact spa caption and cross-shop isolation',async()=>{
  assert.equal((await request(`/journey/${b1.slug}`)).status,404);
  assert.equal((await request(`/preview/${b1.slug}/activity`)).status,404);
  assert.equal((await request(`/preview/${b1.slug}`)).status,200);
  assert.equal((await request(`/preview/${b2.slug}/sign-in`,{method:'POST',body:`phrase=${encodeURIComponent(phraseFor(key,b1.slug))}`})).status,401);
  assert.equal((await request(`/preview/${b1.slug}/sign-in`,{method:'POST',body:`phrase=${encodeURIComponent(phraseFor(key,b1.slug))}`,originHeader:'https://evil.example'})).status,403);
  const cookie=await ownerCookie(b1);
  assert.equal((await request(`/preview/${b2.slug}/activity`,{cookie})).status,404);
  assert.equal((await request(`/journey/${b2.slug}`,{cookie})).status,404);
  assert.equal((await request('/media/kijani-shared-introduction.mp4')).status,404);
  assert.equal((await request('/media/kijani-beauty-social.mp4')).status,404);
  const movie=await handler(new Request(origin+'/media/kijani-beauty-social.mp4',{
    headers:{host:'private-demo.vercel.app',Cookie:cookie,Range:'bytes=0-1023'}}));
  assert.equal(movie.status,206);
  assert.equal(movie.headers.get('content-range').endsWith('/15648856'),true);
  assert.equal((await movie.arrayBuffer()).byteLength,1024);
  assert.equal((await request('/media/kijani-beauty-social.mp4',{cookie:await ownerCookie(b2)})).status,404);
  const page=await (await request(`/preview/${b1.slug}`,{cookie})).text();
  assert(page.includes('kijani-shared-introduction.mp4'));
  assert(page.includes('kijani-beauty-social.mp4'));
  assert(page.includes('<strong>Comment GLOW and we’ll send the link. 💚</strong>'));
  assert(page.includes('Try their journey'));
  assert(page.indexOf('class="teaser"')<page.indexOf('class="film"'));
  assert(page.indexOf('class="film"')<page.indexOf('id="phone"'));
  const pizza=await (await request(`/preview/${b2.slug}`,{cookie:await ownerCookie(b2)})).text();
  assert(!pizza.includes('kijani-beauty-social.mp4'));
  assert(!pizza.includes('GLOW'));
  assert(!pizza.includes('Ameerah Ladies Spa'));
});

test('customer path starts social, requires dummy contact before questions and produces an answer-derived PDF and matching private record',async()=>{
  const cookie=await ownerCookie(b1);
  const html=await (await request(`/journey/${b1.slug}`,{cookie})).text();
  assert(html.indexOf('data-step="social"')<html.indexOf('data-step="dm"'));
  assert(html.indexOf('data-step="contact"')<html.indexOf('data-step="question"'));
  assert.equal((html.match(/data-step="question"/g)||[]).length,6);
  assert(html.includes('data-consent'));
  assert(html.includes('id="marketing"'));
  assert(html.includes('Nina · scripted demo help'));
  assert(html.includes('not a live AI agent'));
  const route=`/api/demo/${b1.slug}/finish`;
  const answers=answersFor(b1);
  assert.equal((await request(route,{method:'POST',body:{...dummy,answers},cookie:'wrong'})).status,404);
  assert.equal((await request(route,{method:'POST',body:{...dummy,contact:{...dummy.contact,phone:'+254700000000'},answers},cookie})).status,400);
  assert.equal((await request(route,{method:'POST',body:{...dummy,dataConsent:false,answers},cookie})).status,400);
  assert.equal((await request(route,{method:'POST',body:{...dummy,answers:{...answers,focus:'invalid'}},cookie})).status,400);
  const created=await request(route,{method:'POST',body:{...dummy,answers},cookie});
  assert.equal(created.status,201);
  const data=await created.json();
  assert.equal(data.report.assessmentTitle,blueprintFor(b1).title);
  assert.equal(data.report.reviewStatus,'approved');
  assert(data.report.summary.includes('You selected'));
  const pdf=await request(data.pdfUrl,{cookie});
  assert.equal(pdf.status,200);
  assert.equal(pdf.headers.get('content-type'),'application/pdf');
  const bytes=new Uint8Array(await pdf.arrayBuffer());
  assert.equal(Buffer.from(bytes.slice(0,8)).toString().slice(0,4),'%PDF');
  const loaded=await PDFDocument.load(bytes);
  assert(loaded.getPageCount()>=2);
  assert.equal((await request(data.pdfUrl,{cookie:await ownerCookie(b2)})).status,404);
  const rows=await store.list(b1.slug);
  assert.equal(rows.length,1);
  assert.equal(rows[0].contact.name,'Demo Guest');
  assert.equal(rows[0].marketingConsent,false);
  assert.equal(rows[0].actions.length,0);
  assert.equal((await store.list(b2.slug)).length,0);
  const changed=evaluate(b1,{...answers,focus:'none',impact:'none',safety:'clear'});
  assert.notEqual(rows[0].report.summary,changed.summary);
  assert(changed.noPurchaseNeeded);
  assert(evaluate(b1,{...answers,safety:'changing'}).professionalReviewNeeded);
  const activity=await (await request(`/preview/${b1.slug}/activity`,{cookie})).text();
  assert(activity.includes('Demo Guest'));
  assert(!activity.includes('360 Degrees Pizza'));
});

test('all categories support a personalised report; risky details are never implied as confirmed',()=>{
  const cats=new Map(rows.map(b=>[b.category,b]));
  for(const b of cats.values()){
    const report=evaluate(b,answersFor(b));
    assert.equal(report.answers.length,6);
    assert.equal(report.business,b.shop);
    assert(report.summary.includes('“'));
    assert(report.freeStep.length>20);
    assert(report.limitation.length>25);
  }
  const meal=evaluate(b2,answersFor(b2));
  assert.equal(meal.reviewStatus,'draft');
  assert(!meal.summary.toLowerCase().includes('table is booked'));
});

test('Vercel rewrite target retains path and authentication boundaries',async()=>{
  const cookie=await ownerCookie(b1);
  const source=await request(`/preview/${b1.slug}`,{cookie});
  const rewritten=await request(`/api/index?route=preview/${b1.slug}`,{cookie});
  assert.equal(rewritten.status,source.status);
  assert((await rewritten.text()).includes('Try their journey'));
  assert.equal((await request('/api/index?route=preview/'+b2.slug+'/activity',{cookie})).status,404);
  assert.equal((await request('/api/index?route=data/businesses.json',{cookie})).status,404);
});

test('reports create valid answer-derived PDFs across all 20 categories and beauty subtypes',async()=>{
  const sampled=[...new Map(rows.map(b=>[b.category,b])).values()];
  for(const kind of ['Day Spa & Massage','Hair Salon & Barbering','Nails & Lash Studio']){
    const match=rows.find(b=>b.type===kind);
    if(!sampled.includes(match))sampled.push(match);
  }
  for(const b of sampled){
    const report=evaluate(b,answersFor(b));
    const pdf=await buildPdf({shop:b.shop,mall:b.mall,contact:dummy.contact,report});
    assert(pdf.length>1800,`${b.slug} empty PDF`);
    const doc=await PDFDocument.load(pdf);
    assert(doc.getPageCount()>=2,`${b.slug} fewer than two pages`);
  }
});

test('optional actions are unsent and unconfirmed; delete removes only that shop’s dummy entry',async()=>{
  const cookie=await ownerCookie(b1);
  const rec=(await store.list(b1.slug))[0];assert(rec);
  const url=`/api/demo/${b1.slug}/${rec.id}`;
  const action=await request(url+'/action',{method:'POST',cookie,body:{action:'appointment'}});
  assert.equal(action.status,200);
  const result=await action.json();
  assert.equal(result.confirmed,false);
  assert.equal(result.externalMessageSent,false);
  assert.equal(result.status,'simulated_only');
  assert.equal((await store.read(b1.slug,rec.id)).item.actions[0].availabilityChecked,false);
  assert.equal((await request(url+'/action',{method:'POST',cookie:await ownerCookie(b2),body:{action:'help'}})).status,404);
  assert.equal((await request(url+'/action',{method:'POST',cookie,body:{action:'purchase'}})).status,400);
  assert.equal((await request(url+'/delete',{method:'POST',cookie,originHeader:'https://other.test'})).status,403);
  assert.equal((await request(url+'/delete',{method:'POST',cookie})).status,303);
  assert.equal(await store.read(b1.slug,rec.id),null);
  assert.equal((await request(url+'/pdf',{cookie})).status,404);
});
