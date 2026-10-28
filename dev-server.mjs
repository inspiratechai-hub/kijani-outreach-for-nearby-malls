// Optional machine-local test server; Vercel uses api/index.mjs instead.
import http from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from './lib/router.mjs';
import {MemoryStore} from './lib/store.mjs';
const host='127.0.0.1';
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
if(process.env.LOCAL_HTTP_TEST!=='1'||process.env.VERCEL==='1')throw new Error('Local-only server must explicitly set LOCAL_HTTP_TEST=1.');
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public','assets');
const handle=createApp({store:new MemoryStore()});
const MIME={'.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.js':'text/javascript; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${host}:${port}`);
    const file=/^\/assets\/([a-zA-Z0-9-]+\.(?:jpg|png|mp4|js))$/.exec(url.pathname);
    if(file && (req.method==='GET'||req.method==='HEAD')){
      const target=path.join(root,file[1]);
      const s=statSync(target);let start=0,end=s.size-1;
      const raw=req.headers.range;
      if(raw){const m=/^bytes=(\d+)-(\d*)$/.exec(raw);
        if(!m||Number(m[1])>=s.size){res.writeHead(416);res.end();return;}
        start=Number(m[1]);end=m[2]?Math.min(s.size-1,Number(m[2])):s.size-1;
      }
      res.writeHead(raw?206:200,{'Content-Type':MIME[path.extname(target)],
        'Content-Length':end-start+1,'Accept-Ranges':'bytes','X-Robots-Tag':'noindex, nofollow',
        'Cache-Control':'no-store',...(raw?{'Content-Range':`bytes ${start}-${end}/${s.size}`}:{})});
      if(req.method==='HEAD'){res.end();return;}
      const {createReadStream}=await import('node:fs');
      createReadStream(target,{start,end}).pipe(res);return;
    }
    const chunks=[];for await(const chunk of req){chunks.push(chunk);if(chunks.reduce((a,c)=>a+c.length,0)>12000)break;}
    const request=new Request(url,{method:req.method,headers:{...req.headers,host:`${host}:${port}`},
      ...(req.method==='GET'||req.method==='HEAD'?{}:{body:Buffer.concat(chunks)})});
    const response=await handle(request);
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(404);res.end('Unavailable');}
}).listen(port,host,()=>console.log(`LOCAL-ONLY dummy demo at http://${host}:${port} (in-memory records reset on restart)`));
