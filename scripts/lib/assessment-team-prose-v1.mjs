import assert from 'node:assert/strict';
export const wordCount=value=>String(value??'').trim().split(/\s+/).filter(Boolean).length;
export const publicationCards=c=>c.sections.flatMap(s=>s.exchanges.flatMap(r=>['pro','con'].flatMap(side=>r[side]?[r[side]]:[])));
export function critiqueBoilerplate(candidate){
  const documents=publicationCards(candidate).map(c=>c.critique.toLowerCase().replace(/[^a-z0-9/]+/g,' ').trim().split(/\s+/)),minimumDocuments=Math.max(3,Math.ceil(documents.length*.25)),counts=new Map();
  for(const words of documents){const seen=new Set();for(let i=0;i<=words.length-6;i++)seen.add(words.slice(i,i+6).join(' '));for(const key of seen)counts.set(key,(counts.get(key)??0)+1);}
  const common=new Set([...counts].filter(([,n])=>n>=minimumDocuments).map(([key])=>key));
  const ratios=documents.map(words=>{const covered=new Set();for(let i=0;i<=words.length-6;i++)if(common.has(words.slice(i,i+6).join(' ')))for(let j=i;j<i+6;j++)covered.add(j);return covered.size/words.length;});
  return {ngramSize:6,minimumDocuments,commonNgrams:common.size,meanCoveredRatio:Number((ratios.reduce((a,b)=>a+b,0)/ratios.length).toFixed(3)),maximumCoveredRatio:Number(Math.max(...ratios).toFixed(3))};
}
export function validateTeamProse(candidate){
  const errors=[];
  const range=(value,min,max,field)=>{const n=wordCount(value);if(typeof value!=='string'||n<min||n>max)errors.push({field,message:`Expected ${min}–${max} words; found ${n}`});};
  range(candidate.summary,8,35,'summary');
  for(const [si,section] of candidate.sections.entries())for(const [ri,row] of section.exchanges.entries())for(const side of ['pro','con']){
    const c=row[side];if(!c)continue;const p=`sections.${si}.exchanges.${ri}.${side}`;
    range(c.words,8,55,`${p}.words`);range(c.critique,105,130,`${p}.critique`);
    if(c.critique.length<880)errors.push({field:`${p}.critique`,message:`Expected at least 880 characters; found ${c.critique.length}`});
    const parts=c.critique.split(/(?=Principal limitation:|Live burden:|Locked score:)/).map(x=>x.trim()),labels=['Strongest feature:','Principal limitation:','Live burden:','Locked score:'];
    if(parts.length!==4||!parts.every((p,i)=>p.startsWith(labels[i])&&/[.!?]$/.test(p))||(c.critique.match(/[.!?](?=\s|$)/g)??[]).length!==4)errors.push({field:`${p}.critique`,message:'Exactly four ordered labeled sentences required'});
    if(/[\u3400-\u9fff\uac00-\ud7af\ufffd]/u.test(c.critique))errors.push({field:`${p}.critique`,message:'Unexpected characters'});
  }
  const cards=publicationCards(candidate),mean=cards.reduce((n,c)=>n+wordCount(c.words),0)/cards.length,shortShare=cards.filter(c=>wordCount(c.words)<20).length/cards.length;
  if(mean<20||shortShare>.25)errors.push({field:'argumentDescriptions',message:`Depth floor failed: mean ${mean}, short share ${shortShare}`});
  for(const side of ['pro','con']){
    range(candidate.quotes[side].text,3,18,`quotes.${side}.text`);range(candidate.quotes[side].context,12,55,`quotes.${side}.context`);
    assert(candidate.overall[side].strengths.length>=3&&candidate.overall[side].blunders.length>=2);
    candidate.overall[side].strengths.forEach((s,i)=>range(s,8,Infinity,`overall.${side}.strengths.${i}`));
    candidate.overall[side].blunders.forEach((s,i)=>range(s.text,8,Infinity,`overall.${side}.blunders.${i}.text`));
    const e=candidate.logicalExtension[side],p=`logicalExtension.${side}`;
    range(e.finalArgument.thesis,12,Infinity,`${p}.finalArgument.thesis`);assert(e.finalArgument.premises.length>=4&&e.finalArgument.premises.length<=6);
    e.finalArgument.premises.forEach((s,i)=>range(s,12,Infinity,`${p}.finalArgument.premises.${i}`));range(e.finalArgument.conclusion,15,Infinity,`${p}.finalArgument.conclusion`);
    assert(e.newArguments.length>=2&&e.newArguments.length<=4);
    e.newArguments.forEach((s,i)=>{range(s.title,2,8,`${p}.newArguments.${i}.title`);range(s.text,45,130,`${p}.newArguments.${i}.text`);if(/AI[- ](?:generated|developed)|possible extension|AI reconstruction/i.test(s.text))errors.push({field:`${p}.newArguments.${i}.text`,message:'Formulaic provenance launcher'});});
  }
  const boilerplate=critiqueBoilerplate(candidate);
  if(boilerplate.meanCoveredRatio>.15||boilerplate.maximumCoveredRatio>.25)errors.push({field:'critiques',message:`Repeated six-word coverage exceeds corpus gate: mean ${boilerplate.meanCoveredRatio}, maximum ${boilerplate.maximumCoveredRatio}`});
  return {status:errors.length?'failed':'passed',errors,argumentWordsMean:Number(mean.toFixed(1)),shortCardShare:Number(shortShare.toFixed(3)),moves:cards.length,boilerplate};
}
