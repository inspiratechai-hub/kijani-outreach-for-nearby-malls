import {PDFDocument, StandardFonts, rgb} from 'pdf-lib';
const GREEN=rgb(0.055,0.218,0.171),MINT=rgb(0.80,0.89,0.82),GOLD=rgb(0.82,0.68,0.36);
const INK=rgb(0.14,0.23,0.20),MUTED=rgb(0.33,0.40,0.36);
const W=595.28,H=841.89,L=52,RIGHT=W-L;
const clean=value=>String(value??'').replace(/[“”]/g,'"').replace(/[‘’]/g,"'")
  .replace(/[–—]/g,'-').replace(/…/g,'...').replace(/\s+/g,' ').trim()
  .normalize('NFKD').replace(/[^\x20-\x7e]/g,'');

export async function buildPdf(record){
  const pdf=await PDFDocument.create();
  const reg=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`Free demo insight - ${clean(record.shop)}`);
  pdf.setAuthor('Kijani · private dummy-data demo');
  let page,y,pages=0;
  function newPage(){
    page=pdf.addPage([W,H]);pages++;
    page.drawRectangle({x:0,y:H-61,width:W,height:61,color:GREEN});
    page.drawText('KIJANI  /  SIGNATURE INSIGHT', {x:L,y:H-38,size:11,font:bold,color:rgb(1,1,1)});
    page.drawText('DEMO / DUMMY DATA ONLY', {x:RIGHT-150,y:H-38,size:8,font:bold,color:GOLD});
    page.drawLine({start:{x:L,y:61},end:{x:RIGHT,y:61},color:MINT,thickness:1});
    page.drawText('Discovery, not diagnosis · No booking, message, payment or sale confirmed.',
      {x:L,y:43,size:8,font:reg,color:MUTED});
    page.drawText(String(pages).padStart(2,'0'),{x:RIGHT-13,y:43,size:8,font:bold,color:MUTED});
    y=H-95;
  }
  function wrap(raw,font,size,maxWidth){
    const output=[];let line='';
    for(const original of clean(raw).split(' ')){
      if(!original)continue;
      let word=original;
      while(font.widthOfTextAtSize(word,size)>maxWidth){
        let cut=1;
        while(cut<word.length && font.widthOfTextAtSize(word.slice(0,cut+1),size)<=maxWidth)cut++;
        if(line){output.push(line);line='';}
        output.push(word.slice(0,cut));word=word.slice(cut);
      }
      if(!word)continue;
      const test=line?line+' '+word:word;
      if(font.widthOfTextAtSize(test,size)>maxWidth && line){output.push(line);line=word;}else line=test;
    }
    if(line)output.push(line);
    return output.length?output:[''];
  }
  function text(raw,{size=10,weight='regular',color=INK,gap=10,indent=0}={}){
    const face=weight==='bold'?bold:reg;
    const lines=wrap(raw,face,size,RIGHT-L-indent);
    const lineHeight=size*1.48;
    for(const line of lines){
      if(y-lineHeight<83)newPage();
      page.drawText(line,{x:L+indent,y,size,font:face,color});y-=lineHeight;
    }
    y-=gap;
  }
  function title(s){text(s,{size:22,weight:'bold',gap:14,color:GREEN});}
  function label(s){text(s.toUpperCase(),{size:9,weight:'bold',color:GREEN,gap:7});}
  newPage();
  const r=record.report;
  text(`${record.shop}  /  ${record.mall}`,{size:10,weight:'bold',color:GREEN,gap:15});
  title(r.assessmentTitle);
  text(`A personal demo brief for ${record.contact.name}. Based on your own six choices; no service or purchase is required.`,{size:11,gap:18});
  label('What your answers said');
  text(r.summary,{size:12,gap:18});
  label('A free step to try without buying');
  text(r.freeStep,{size:11,gap:18});
  label('Your next question');
  text(r.openQuestion,{size:11,gap:16});
  label('Only if you want to continue');
  text(r.recommendation,{size:11,gap:15});
  if(r.professionalReviewNeeded)text('Qualified-person check required before a service decision. This form cannot assess individual safety.',{size:10,weight:'bold',color:GREEN,gap:15});
  text('This report is a rules-based private demonstration, not a verified recommendation. You can keep it without requesting anything.',{size:9,color:MUTED});

  newPage();
  title('Your six choices');
  text('These are the answers entered for this dummy-data test. They are not measured improvements, predictions, ratings, diagnoses or evidence of a visit.',{size:10,gap:13});
  for(const row of r.answers){
    label(String(row.number).padStart(2,'0')+'  '+row.question);
    text(row.answer,{size:10,gap:13});
  }
  label('A useful boundary');
  text(r.boundary,{size:10,gap:14});
  label('What the demo cannot establish');
  text(r.limitation,{size:10,gap:13});
  text('Any service, product, menu, price, stock, opening time, access arrangement, practitioner suitability and appointment must be confirmed directly by an appropriate person. Marketing consent is separate from this free report.',{size:9,color:MUTED,gap:12});
  text(`Review status: ${r.reviewStatus}. ${r.method}`,{size:9,color:MUTED});
  return Buffer.from(await pdf.save());
}
