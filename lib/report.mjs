import {readFileSync} from 'node:fs';
const BLUEPRINTS=JSON.parse(readFileSync(new URL('../data/blueprints.json',import.meta.url),'utf8'));

export function blueprintFor(b){
  if(b.category!=='beauty')return BLUEPRINTS[b.category];
  if(b.type==='Day Spa & Massage')return BLUEPRINTS['beauty-spa'];
  if(b.type==='Hair Salon & Barbering')return BLUEPRINTS['beauty-salon'];
  if(b.type==='Nails & Lash Studio')return BLUEPRINTS['beauty-nails'];
  return BLUEPRINTS.beauty;
}
const byId=(q,id)=>q.options.find(o=>o.id===id)?.label||'Still exploring';

export function validateAnswers(bp,values){
  if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('Complete the six questions.');
  const clean={};
  for(const q of bp.questions){
    const val=values[q.id];
    if(typeof val!=='string'||!q.options.some(x=>x.id===val))
      throw new Error(`Select an answer for: ${q.prompt}`);
    clean[q.id]=val;
  }
  return clean;
}

function beautyInsight(bp,answers,uncertainty){
  const spa=bp.key==='personal_reset';
  const safety=answers.safety;
  const concern=spa?answers.focus:answers.frustration;
  const habit=spa?answers.habit:answers.routine_habit;
  const impact=spa?answers.impact:answers.upkeep_gap;
  const risk=spa?['changing','suitability','private'].includes(safety):
    ['scalp_symptoms','new_loss','reaction','private'].includes(safety);
  const noProblem=concern==='none'&&impact==='none'&&safety==='clear';
  const label=byId(bp.questions[0],concern);
  const habitLabel=byId(bp.questions[2],habit);
  const observed=`You selected “${label}” and described “${habitLabel}”. These are self-reported clues, not proof that one caused the other.`;
  if(risk)return {risk:true,noProblem:false,
    title:'First, a question for a qualified person',
    observation:'You flagged a concern this form cannot assess. A service, product or treatment should not be chosen from these answers.',
    freeStep:'Speak privately with an appropriate qualified professional before selecting a service. Do not rely on this demo for a medical decision.',
    teamQuestion:'What does an appropriate qualified person need to check before I consider a service?',
    boundary:'This is not a diagnosis, urgency assessment or suitability decision.'};
  if(uncertainty>=3)return {risk:false,noProblem:false,
    title:'One more clue would help',
    observation:'Several answers remain open. There is not enough here to infer a routine mismatch or recommend a service.',
    freeStep:'Notice one ordinary-day pattern that matters to you and write it down. You can keep that note without buying anything.',
    teamQuestion:'What would help me decide safely when I have more information?',
    boundary:'No treatment or product is inferred from incomplete answers.'};
  if(noProblem)return {risk:false,noProblem:true,
    title:'Nothing to fix. Keep what works.',
    observation:'You did not report a significant concern or daily cost, and selected nothing for a professional to check.',
    freeStep:'Keep the part of your current routine that already works. A purchase or visit is not required.',
    teamQuestion:'Is there anything I actually want to change, or is my current routine enough?',
    boundary:'No service or purchase is implied by these answers.'};
  const stepsSpa={
    dryness:'Try warm rather than hot water and gentle cleansing; this is general-care information, not an individual product prescription.',
    breakouts:'Consider gentle rather than harsh cleansing; persistent or worsening concerns need a qualified professional.',
    marks:'Review your everyday sun-protection habit and ask a professional about a changing or concerning mark.',
    hair:'Consider whether heat or styling tension is relevant to your routine; a professional must assess scalp concerns.',
    unwind:'Try a brief pause in your ordinary week that you can repeat without an appointment.',
  };
  const stepsHair={
    breakage:'Handle hair gently and note when breakage appears; a stylist or dermatologist must assess individual concerns.',
    dry_frizz:'Notice one part of your wash and styling routine you can make gentler before adding products.',
    scalp:'Write down the scalp question you want a qualified person to consider; do not choose a treatment from a quiz.',
    lasting:'Compare how long your preferred look lasts with the upkeep you actually want to do.',
    time:'Time one ordinary styling day and note which step matters most to you.',
  };
  const freeStep=(spa?stepsSpa:stepsHair)[concern]||'Notice what already works in your routine and write down one question before choosing anything new.';
  return {risk:false,noProblem:false,
    title:spa?'A small observation before a bigger decision':'A routine clue worth discussing',
    observation:observed,
    freeStep,
    teamQuestion:spa?'Which verified visit details and suitability checks would a person confirm?':
      'Which reviewed care details can a stylist confirm for my actual routine?',
    boundary:'These choices do not establish cause, diagnosis, individual suitability or an effective treatment.'};
}

export function evaluate(b,rawAnswers){
  const bp=blueprintFor(b);
  if(!bp)throw new Error('Category not configured.');
  const a=validateAnswers(bp,rawAnswers);
  const rows=bp.questions.map((q,index)=>({
    number:index+1,id:q.id,question:q.prompt,answerId:a[q.id],answer:byId(q,a[q.id]),
  }));
  const uncertainty=Object.values(a).filter(v=>v==='unsure').length;
  const isBeautyApproved=['personal_reset','hair_routine_fit'].includes(bp.key);
  const insight=isBeautyApproved?beautyInsight(bp,a,uncertainty):null;
  const noProblem=isBeautyApproved?insight.noProblem:
    a.q6==='save'&&uncertainty===0&&
    (a.q5==='none'||(bp.key==='project_clarity'&&a.q4==='none'));
  const first=rows[0].answer;
  const second=rows[1].answer;
  let summary;
  if(isBeautyApproved)summary=`You selected “${first}” and “${second}”. ${insight.observation}`;
  else if(noProblem)summary=`You chose “${first}” and “${second}”. You did not report a significant open question. Keep this brief; there is no reason here to manufacture a purchase.`;
  else if(uncertainty>=3)summary=`You chose “${first}” and “${second}”. Several details remain open. Take your questions to a person rather than treating this draft as a product recommendation.`;
  else summary=`You chose “${first}” and “${second}”. These stated preferences offer a starting point for a conversation; they do not prove fit, availability or a need to buy.`;
  const openQuestion=insight?.teamQuestion||
    (a.q5==='none'?'What live details should I verify before deciding?':`Can a person help clarify: ${rows[4].answer}?`);
  const recommendedAction=insight?.risk?'Speak to an appropriate qualified person before considering a service':
    noProblem?'Save the free report and decide later':
    a.q6==='save'?'Keep this free brief and decide later':
    'Ask the team to confirm relevant details, if you want to continue';
  return {
    assessmentTitle:bp.title,blueprintKey:bp.key,blueprintVersion:bp.version,
    reviewStatus:bp.review_status,business:b.shop,category:b.category,
    title:bp.reveal_title,summary,
    observation:insight?.title||'A brief based on the answers you gave',
    freeStep:insight?.freeStep||bp.free_step,
    openQuestion,boundary:insight?.boundary||bp.limitations,
    recommendation:recommendedAction,
    insufficientInformation:uncertainty>=3,
    noPurchaseNeeded:noProblem,
    professionalReviewNeeded:Boolean(insight?.risk),
    answers:rows,
    limitation:bp.limitations,
    method:'Six self-reported choices; deterministic, rules-based demo. No AI model, live stock, price, availability, booking or health assessment.',
  };
}
