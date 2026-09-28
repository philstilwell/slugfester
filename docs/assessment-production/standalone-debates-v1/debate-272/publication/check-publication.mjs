import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const argv=process.argv.slice(2);
const packetPath=argv[argv.indexOf('--packet')+1];
assert(packetPath && !path.isAbsolute(packetPath));
const packet=JSON.parse(fs.readFileSync(path.join(root,packetPath),'utf8'));
const get=record=>{
 assert(!path.isAbsolute(record.path));
 const absolute=path.resolve(root,record.path);
 assert(absolute.startsWith(root+path.sep));
 const bytes=fs.readFileSync(absolute);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256);
 assert.equal(bytes.length,record.bytes);
 return JSON.parse(bytes.toString('utf8'));
};
const inventory=get(packet.buildInputs.inventory), scores=get(packet.buildInputs.scores);
const skeleton=get(packet.buildInputs.skeleton), reference=get(packet.buildInputs.referenceMetrics);
const input=JSON.parse(fs.readFileSync(0,'utf8'));
const candidate=structuredClone(skeleton);
const errors=[];
const fail=(ok,msg)=>{if(!ok) errors.push(msg)};
const wc=x=>String(x??'').trim().split(/\s+/).filter(Boolean).length;
const text=(v,label,min,max=Infinity)=>fail(typeof v==='string'&&wc(v)>=min&&wc(v)<=max,label+': word count '+wc(v)+'; expected '+min+'..'+max);
const keys=(obj,expected,label)=>fail(obj&&JSON.stringify(Object.keys(obj).sort())===JSON.stringify(expected.toSorted()),label+': unexpected or missing fields');
keys(input,['summary','quotes','moves','overall','logicalExtension','noveltyMap','editorialReview'],'parts');
text(input.summary,'summary',8,35);candidate.summary=input.summary;
fail(Array.isArray(input.moves)&&input.moves.length===inventory.moves.length,'Move count differs');
fail(JSON.stringify(input.moves?.map(x=>x.moveId))===JSON.stringify(inventory.moves.map(x=>x.moveId)),'Move order differs');
const byId=new Map((input.moves??[]).map(x=>[x.moveId,x]));
const labels=['Strongest feature:','Principal limitation:','Live burden:','Locked score:'];
const cards=candidate.sections.flatMap(s=>s.exchanges.flatMap(e=>[e.pro,e.con].filter(Boolean)));
for(const card of cards){
 const authored=byId.get(card.ledgerMoveId);if(!authored){errors.push(card.ledgerMoveId+': missing');continue;}
 keys(authored,['moveId','words','critique'],card.ledgerMoveId);
 text(authored.words,card.ledgerMoveId+'.words',8,55);
 text(authored.critique,card.ledgerMoveId+'.critique',105,130);
 const c=String(authored.critique??'');
 fail(c.length>=880,card.ledgerMoveId+': critique '+c.length+' characters, minimum 880');
 const parts=c.split(/(?=Principal limitation:|Live burden:|Locked score:)/).map(x=>x.trim());
 fail(parts.length===4&&parts.every((p,i)=>p.startsWith(labels[i])&&/[.!?]$/.test(p))&&(c.match(/[.!?](?=\s|$)/g)??[]).length===4,card.ledgerMoveId+': four labeled sentences required');
 fail(!/[\u3400-\u9fff\uac00-\ud7af\ufffd]/u.test(c),card.ledgerMoveId+': text integrity');
 fail(c.includes('Locked score: '+card.score+' '),card.ledgerMoveId+': copy locked score exactly after label');
 card.words=authored.words;card.critique=authored.critique;
}
const sourceQuoteAudit=[];
for(const side of ['pro','con']){
 const q=input.quotes?.[side];keys(q,['text','context'],'quotes.'+side);
 text(q?.text,'quotes.'+side+'.text',3,18);text(q?.context,'quotes.'+side+'.context',12,55);
 const move=inventory.moves.find(m=>m.side===side&&m.quoteEligibleExactSpans.some(s=>s.includes(q?.text??'')&&q?.text));
 fail(Boolean(move),'quotes.'+side+': not an exact quote-eligible source substring');
 candidate.quotes[side]=q;
 if(move)sourceQuoteAudit.push({side,moveId:move.moveId,text:q.text,sourceStartMs:move.sourceSpan.startMs,sourceEndMs:move.sourceSpan.endMs,exactSubstring:true});
 const overall=input.overall?.[side];keys(overall,['strengths','blunders'],'overall.'+side);
 fail(Array.isArray(overall?.strengths)&&overall.strengths.length>=3,'overall.'+side+': three strengths required');
 fail(Array.isArray(overall?.blunders)&&overall.blunders.length>=2,'overall.'+side+': two material blunders required');
 for(const [i,v] of (overall?.strengths??[]).entries())text(v,side+'.strengths.'+i,8);
 for(const [i,v] of (overall?.blunders??[]).entries()){keys(v,['text','links'],side+'.blunders.'+i);text(v.text,side+'.blunders.'+i,8);fail(Array.isArray(v.links)&&v.links.length===0,'Blunder links deferred');}
 candidate.overall[side]={score:candidate.overall[side].score,...overall};
 const extension=input.logicalExtension?.[side];keys(extension,['finalArgument','newArguments'],'logicalExtension.'+side);
 const fa=extension?.finalArgument;keys(fa,['thesis','premises','conclusion'],side+'.finalArgument');
 text(fa?.thesis,side+'.thesis',12);text(fa?.conclusion,side+'.conclusion',15);
 fail(Array.isArray(fa?.premises)&&fa.premises.length>=4&&fa.premises.length<=6,side+': 4–6 premises required');
 (fa?.premises??[]).forEach((p,i)=>text(p,side+'.premises.'+i,12));
 fail(Array.isArray(extension?.newArguments)&&extension.newArguments.length>=2&&extension.newArguments.length<=4,side+': 2–4 reinforcing arguments required');
 (extension?.newArguments??[]).forEach((a,i)=>{keys(a,['title','text'],side+'.newArguments.'+i);text(a.title,side+'.newArguments.'+i+'.title',2,8);text(a.text,side+'.newArguments.'+i+'.text',45,130)});
}
candidate.logicalExtension=input.logicalExtension;
const lengths=cards.map(x=>wc(x.words));
const mean=Number((lengths.reduce((a,b)=>a+b,0)/lengths.length).toFixed(1));
const refMeans=reference.requiredIndependentWindow.map(x=>x.argumentMean).sort((a,b)=>a-b);
const median=refMeans[Math.floor(refMeans.length/2)];
const minimumMean=Number(Math.max(20,median-1).toFixed(1));
fail(mean>=minimumMean,'Argument description mean '+mean+' below '+minimumMean);
fail(lengths.filter(x=>x<20).length/lengths.length<=0.25,'More than one quarter of descriptions under 20 words');
const tokens=cards.map(c=>String(c.critique).toLowerCase().replace(/[^a-z0-9/]+/g,' ').trim().split(/\s+/));
const freq=new Map(), threshold=Math.max(3,Math.ceil(cards.length*.25));
for(const t of tokens){const local=new Set();for(let i=0;i<=t.length-6;i++)local.add(t.slice(i,i+6).join(' '));for(const n of local)freq.set(n,(freq.get(n)??0)+1);}
const common=new Set([...freq].filter(([,n])=>n>=threshold).map(([n])=>n));
const ratios=tokens.map(t=>{const covered=new Set();for(let i=0;i<=t.length-6;i++)if(common.has(t.slice(i,i+6).join(' ')))for(let j=0;j<6;j++)covered.add(i+j);return covered.size/t.length;});
const repetition={mean:Number((ratios.reduce((a,b)=>a+b,0)/ratios.length).toFixed(3)),max:Number(Math.max(...ratios).toFixed(3))};
fail(repetition.mean<=.15&&repetition.max<=.25,'Critique boilerplate gate failed');
const expectedNovelty=['pro','con'].flatMap(side=>[{side,path:'candidate.logicalExtension.'+side+'.finalArgument'},...(input.logicalExtension?.[side]?.newArguments??[]).map((_,i)=>({side,path:'candidate.logicalExtension.'+side+'.newArguments.'+i}))]);
fail(Array.isArray(input.noveltyMap)&&input.noveltyMap.length===expectedNovelty.length,'Novelty-map population differs');
for(const expected of expectedNovelty){const row=input.noveltyMap?.find(x=>x.path===expected.path);fail(Boolean(row)&&row.side===expected.side&&row.hypothetical===true,expected.path+': novelty record required');if(row){text(row.explanation,expected.path+'.novelty',18);fail(Array.isArray(row.sourceMoveIds)&&row.sourceMoveIds.length>0&&row.sourceMoveIds.every(id=>inventory.moves.some(m=>m.moveId===id)),expected.path+': invalid source move links');}}
for(const key of ['completeSourceCompared','allCardStrengthsAndLimitationsReviewed','correctBurdenPreserved','nonformulaicAiProseReviewed','ordinaryPunctuationPreserved','noJudgmentOrScoreChanges'])fail(input.editorialReview?.[key]===true,'Editorial review missing '+key);
const publication={schemaVersion:'1.0-standalone-publication-output',protocolId:packet.protocolId,status:'complete-publication-prose-candidate',debateNumber:packet.debateNumber,debateId:packet.debateId,candidate,sourceQuoteAudit,noveltyMap:input.noveltyMap,audit:{model:packet.model.model,reasoningEffort:packet.model.reasoningEffort,directIncrementalCostUsd:0,cardCount:cards.length,sectionCount:candidate.sections.length,tagsDeferred:true,blunderLinksDeferred:true,scoresChanged:false,publicationAttempt:1,editorialReview:input.editorialReview}};
if(!errors.length){const lib=await import(pathToFileURL(path.join(root,packet.validatorPath)));try{lib.validateStandaloneCandidate(candidate,scores)}catch(e){errors.push(e.message);}}
if(errors.length){console.log(JSON.stringify({status:'invalid-unsaved-candidate',errors,argumentMean:mean,repetition},null,2));process.exitCode=1;}
else if(argv.includes('--emit'))console.log(JSON.stringify(publication,null,2));
else console.log(JSON.stringify({status:'passed-unsaved-candidate',cards:cards.length,sections:candidate.sections.length,argumentMean:mean,minimumMean,repetition,publicationSha256:crypto.createHash('sha256').update(JSON.stringify(publication,null,2)+'\n').digest('hex')}));
