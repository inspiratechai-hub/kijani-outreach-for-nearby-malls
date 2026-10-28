import {createReadStream,statSync} from 'node:fs';
import {Readable} from 'node:stream';
const MOVIES=new Set(['kijani-shared-introduction.mp4','kijani-beauty-social.mp4']);
const MAX_PART=1024*1024; // capped Range responses; never buffer an entire video

export function privateMovie(request,name,securityHeaders){
  if(!MOVIES.has(name))return new Response('Not found',{status:404,headers:securityHeaders});
  const file=new URL(`../data/private_media/${name}`,import.meta.url);
  let size;
  try{size=statSync(file).size;}catch{return new Response('Not found',{status:404,headers:securityHeaders});}
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:securityHeaders});
  const raw=request.headers.get('range');
  let start=0,end=size-1,status=200;
  if(raw){
    const m=/^bytes=(\d*)-(\d*)$/.exec(raw.trim());
    if(!m||(!m[1]&&!m[2]))return new Response('Invalid range',{status:416,headers:{...securityHeaders,'Content-Range':`bytes */${size}`}});
    if(m[1]){
      start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),size-1):size-1;
    }else{
      const suffix=Number(m[2]);start=Math.max(0,size-suffix);end=size-1;
    }
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=size)
      return new Response('Invalid range',{status:416,headers:{...securityHeaders,'Content-Range':`bytes */${size}`}});
    end=Math.min(end,start+MAX_PART-1);
    status=206;
  }
  const headers={...securityHeaders,'Content-Type':'video/mp4','Content-Length':String(end-start+1),
    'Accept-Ranges':'bytes',...(status===206?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})};
  if(request.method==='HEAD')return new Response(null,{status,headers});
  return new Response(Readable.toWeb(createReadStream(file,{start,end})),{status,headers});
}
