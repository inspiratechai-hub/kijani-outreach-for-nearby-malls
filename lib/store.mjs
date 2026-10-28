import {randomUUID} from 'node:crypto';
import {put, get, list, del} from '@vercel/blob';

// The ONLY persistent customer-demo data on Vercel lives in a PRIVATE Blob store.
// Do not replace this with /tmp, a checked-in JSON file, SQLite, or a module Map.
const PREFIX='dummy-demo-v1/';
const recordPath=(slug,id)=>`${PREFIX}${slug}/${id}.json`;

export function blobIsConfigured(env=process.env){
  return Boolean((env.BLOB_STORE_ID && env.VERCEL_OIDC_TOKEN) || env.BLOB_READ_WRITE_TOKEN);
}

export class BlobStore {
  async create(slug,record){
    const id=randomUUID();
    const item={...record,id,slug,createdAt:new Date().toISOString(),kind:'dummy-only'};
    await put(recordPath(slug,id),JSON.stringify(item),{
      access:'private',contentType:'application/json',addRandomSuffix:false,cacheControlMaxAge:60,
    });
    return item;
  }
  async read(slug,id){
    const response=await get(recordPath(slug,id),{access:'private',useCache:false});
    if(!response || response.statusCode!==200 || !response.stream)return null;
    const value=JSON.parse(await new Response(response.stream).text());
    // Defence in depth: an accidental bad path or corrupted record cannot cross shops.
    if(value.id!==id || value.slug!==slug || value.kind!=='dummy-only')return null;
    return {item:value,etag:response.blob.etag};
  }
  async update(slug,id,mutate){
    const previous=await this.read(slug,id);
    if(!previous)return null;
    const next=mutate(structuredClone(previous.item));
    if(!next || next.slug!==slug || next.id!==id || next.kind!=='dummy-only')throw new Error('Record scope mismatch');
    await put(recordPath(slug,id),JSON.stringify(next),{
      access:'private',contentType:'application/json',allowOverwrite:true,addRandomSuffix:false,
      ifMatch:previous.etag,cacheControlMaxAge:60,
    });
    return next;
  }
  async list(slug,limit=25){
    const result=await list({prefix:`${PREFIX}${slug}/`,limit:1000});
    const paths=result.blobs.filter(x=>x.pathname.startsWith(`${PREFIX}${slug}/`))
      .sort((a,b)=>new Date(b.uploadedAt)-new Date(a.uploadedAt))
      .slice(0,limit);
    const rows=await Promise.all(paths.map(async blob=>{
      const id=/([a-f0-9-]{36})\.json$/.exec(blob.pathname)?.[1]||'';
      return id ? (await this.read(slug,id))?.item : null;
    }));
    return rows.filter(Boolean).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  async remove(slug,id){
    const record=await this.read(slug,id);
    if(!record)return false;
    await del(recordPath(slug,id),{ifMatch:record.etag});
    return true;
  }
}

// For automated tests and LOCAL development only; the deployed router refuses it.
export class MemoryStore {
  constructor(){this.items=new Map();}
  async create(slug,record){
    const id=randomUUID();
    const item={...structuredClone(record),id,slug,createdAt:new Date().toISOString(),kind:'dummy-only'};
    this.items.set(recordPath(slug,id),item);return structuredClone(item);
  }
  async read(slug,id){
    const v=this.items.get(recordPath(slug,id));
    return v?{item:structuredClone(v),etag:'local'}:null;
  }
  async update(slug,id,mutate){
    const old=await this.read(slug,id);if(!old)return null;
    const v=mutate(old.item);
    if(v.slug!==slug||v.id!==id)throw new Error('Record scope mismatch');
    this.items.set(recordPath(slug,id),structuredClone(v));return v;
  }
  async list(slug,limit=25){
    return [...this.items.values()].filter(v=>v.slug===slug)
      .sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0,limit).map(v=>structuredClone(v));
  }
  async remove(slug,id){return this.items.delete(recordPath(slug,id));}
}
