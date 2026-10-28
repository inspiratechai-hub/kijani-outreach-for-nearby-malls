/* This script changes a PRIVATE on-site demo only. It never calls social, chat, mail or payment services. */
(() => {
  'use strict';
  const root=document.getElementById('demo');
  if(!root)return;
  const slug=root.dataset.slug;
  const ids=root.dataset.questionIds.split(',');
  const steps=[...root.querySelectorAll('.step')];
  const progress=document.getElementById('progress');
  let current=0,recordId='';
  function show(index){
    current=index;
    steps.forEach((s,i)=>s.hidden=i!==index);
    progress.textContent=index===0?'Step 1: simulated social':index===1?'Step 2: simulated DM':
      index===2?'Step 3: dummy contact details before questions':index<9?`Question ${index-2} of 6`:
      'Your answer-derived demo report';
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function error(message){progress.textContent='Please check: '+message;progress.setAttribute('role','alert');}
  document.getElementById('social-next').addEventListener('click',()=>show(1));
  document.getElementById('dm-next').addEventListener('click',()=>show(2));
  document.getElementById('contact-next').addEventListener('click',()=>{
    const name=document.getElementById('name').value.trim();
    const email=document.getElementById('email').value.trim();
    const phone=document.getElementById('phone').value.trim();
    if(!/^Demo(?: [A-Za-z0-9'-]+){1,5}$/i.test(name))return error('Use a fake name beginning with Demo, e.g. Demo Guest.');
    if(!/^[A-Za-z0-9._+-]+@(?:example\.(?:com|org|net)|[A-Za-z0-9-]+\.invalid)$/i.test(email))return error('Use an example email such as demo@example.invalid.');
    if(!/^0{8,15}$/.test(phone))return error('Use a non-dialable all-zero phone, e.g. 0000000000.');
    if(!document.getElementById('data-consent').checked)return error('Confirm dummy test storage before answering.');
    show(3);
  });
  const qSteps=[...document.querySelectorAll('.step[data-step="question"]')];
  qSteps.forEach((section,i)=>{
    section.querySelector('.next-question').addEventListener('click',async event=>{
      if(!section.querySelector('input[type="radio"]:checked'))return error('Choose an answer, including Not sure if needed.');
      if(i<5)return show(i+4);
      const button=event.currentTarget;
      button.disabled=true;button.textContent='Creating your free report…';
      const answers={};
      ids.forEach((id,k)=>{answers[id]=qSteps[k].querySelector('input[type="radio"]:checked')?.value;});
      try{
        const response=await fetch(`/api/demo/${encodeURIComponent(slug)}/finish`,{
          method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
          body:JSON.stringify({
            contact:{name:document.getElementById('name').value.trim(),email:document.getElementById('email').value.trim(),phone:document.getElementById('phone').value.trim()},
            dataConsent:document.getElementById('data-consent').checked,
            marketingConsent:document.getElementById('marketing').checked,answers,
          }),
        });
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'Could not create a private demo record.');
        recordId=data.id;
        document.getElementById('result-title').textContent=data.report.assessmentTitle;
        document.getElementById('result-summary').textContent=data.report.summary;
        document.getElementById('result-step').textContent=data.report.freeStep;
        document.getElementById('result-question').textContent=data.report.openQuestion;
        document.getElementById('pdf-link').href=data.pdfUrl;
        show(9);
      }catch(e){error(e.message||'The report could not be created. Try again later.');}
      finally{button.disabled=false;button.textContent='Create my free demo report →';}
    });
  });
  for(const button of root.querySelectorAll('.nina-faq')){
    button.addEventListener('click',()=>{
      const reply=button.dataset.faq==='location'?`${root.dataset.shop} is listed at ${root.dataset.mall} in this demo catalogue. Confirm access and hours with the business.`:
        button.dataset.faq==='availability'?'This demonstration has not checked availability. An appointment button only logs a dummy, unsent, unconfirmed enquiry. A person must confirm any visit.':
        `The free independent step in your answer-derived report is: ${document.getElementById('result-step').textContent}`;
      document.getElementById('nina-answer').textContent=reply;
    });
  }
  for(const button of root.querySelectorAll('.demo-action')){
    button.addEventListener('click',async()=>{
      if(!recordId)return;
      button.disabled=true;
      try{
        const response=await fetch(`/api/demo/${encodeURIComponent(slug)}/${encodeURIComponent(recordId)}/action`,{
          method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
          body:JSON.stringify({action:button.dataset.action}),
        });
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'Action not saved.');
        document.getElementById('result-status').textContent=data.message;
      }catch(e){document.getElementById('result-status').textContent=e.message||'Action not saved.';}
      finally{button.disabled=false;}
    });
  }
  show(0);
})();
