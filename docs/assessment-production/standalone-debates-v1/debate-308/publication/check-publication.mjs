import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateStandaloneCandidate} from '../../../../../scripts/lib/assessment-production-standalone-debate-v1.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(dir,p),'utf8'));
const skeleton=read('skeleton.json'), inventory=read('../inventory/inventory.json'), scores=read('../score-pass/output.json'), refs=read('reference-metrics.json');
export function assemble(parts){
 const c=structuredClone(skeleton), cards=c.sections.flatMap(s=>s.exchanges.flatMap(e=>['pro','con'].filter(k=>e[k]).map(k=>e[k])));
 assert.deepEqual(Object.keys(parts).sort(),['summary','quotes','moves','overall','logicalExtension','noveltyMap','editorialReview'].sort());
 assert.deepEqual(parts.moves.map(m=>m.moveId),cards.map(c=>c.ledgerMoveId),'Card order or count changed');
 for(let i=0;i<cards.length;i++){assert.deepEqual(Object.keys(parts.moves[i]).sort(),['moveId','words','critique'].sort());cards[i].words=parts.moves[i].words;cards[i].critique=parts.moves[i].critique;}
 for(const key of ['summary','quotes','logicalExtension'])c[key]=parts[key];
 for(const side of ['pro','con']){assert.deepEqual(Object.keys(parts.overall[side]).sort(),['blunders','strengths']);Object.assign(c.overall[side],parts.overall[side]);}
 return c;
}
export function check(parts){
 const c=assemble(parts), errors=[],wc=x=>String(x??'').trim().split(/\s+/).filter(Boolean).length, need=(ok,msg)=>{if(!ok)errors.push(msg);}, words=(s,lo,hi,label)=>need(typeof s==='string'&&wc(s)>=lo&&wc(s)<=hi,`${label}: ${wc(s)} words; required ${lo}–${hi}`);
 validateStandaloneCandidate(c,scores);words(c.summary,8,35,'summary');
 const cards=c.sections.flatMap(s=>s.exchanges.flatMap(e=>[e.pro,e.con].filter(Boolean))),labels=['Strongest feature:','Principal limitation:','Live burden:','Locked score:'];
 for(const m of cards){words(m.words,8,55,m.ledgerMoveId+' description');words(m.critique,105,130,m.ledgerMoveId+' critique');need(m.critique.length>=880,`${m.ledgerMoveId}: ${m.critique.length} characters; minimum880`);const ps=m.critique.split(/(?=Principal limitation:|Live burden:|Locked score:)/).map(s=>s.trim());need(ps.length===4&&ps.every((p,i)=>p.startsWith(labels[i])&&/[.!?]$/.test(p))&&(m.critique.match(/[.!?](?=\s|$)/g)||[]).length===4,m.ledgerMoveId+' four labeled sentences');need(ps[3]?.includes(m.score+'/100'),m.ledgerMoveId+' exact score');need(!/[\u3400-\u9fff\uac00-\ud7af\ufffd]/u.test(m.critique),m.ledgerMoveId+' unexpected characters');}
 const counts=cards.map(m=>wc(m.words)),mean=counts.reduce((a,b)=>a+b)/counts.length;need(mean>=refs.minimumArgumentDescriptionMean,'Description mean too low');need(counts.filter(n=>n<20).length/counts.length<=.25,'Too many short descriptions');
 for(const side of ['pro','con']){const q=c.quotes[side];words(q.text,3,18,side+' quote');words(q.context,12,55,side+' quote context');need(inventory.moves.some(m=>m.side===side&&m.quoteEligibleExactSpans.includes(q.text)),side+' quote not exact frozen choice');const o=c.overall[side];o.strengths.forEach((s,i)=>words(s,8,100,side+' strength '+i));o.blunders.forEach((s,i)=>{words(s.text,8,100,side+' blunder '+i);need(Array.isArray(s.links)&&s.links.length===0,'Premature overall tags');});const e=c.logicalExtension[side],f=e.finalArgument;words(f.thesis,12,200,side+' thesis');need(f.premises.length>=4&&f.premises.length<=6,side+' premise count');f.premises.forEach((p,i)=>words(p,12,150,side+' premise '+i));words(f.conclusion,15,200,side+' conclusion');need(e.newArguments.length>=2&&e.newArguments.length<=4,side+' new argument count');e.newArguments.forEach((a,i)=>{words(a.title,2,8,side+' argument title '+i);words(a.text,45,130,side+' new argument '+i);need(parts.noveltyMap.some(n=>n.side===side&&n.title===a.title&&n.closestMoveIds?.every(id=>inventory.moves.some(m=>m.moveId===id))&&wc(n.distinctInferentialContribution)>=12),side+' novelty map '+i);});}
 for(const k of ['sourceFidelity','completeQuotes','scoreConsistency','nonformulaicCritiques','aiContributionNonformulaic','aiPunctuation','referenceComparison'])need(typeof parts.editorialReview[k]==='string'&&parts.editorialReview[k].length>=40,'Editorial review '+k);
 const toks=cards.map(m=>m.critique.toLowerCase().replace(/[^a-z0-9/]+/g,' ').trim().split(/\s+/)),freq=new Map();for(const t of toks){const seen=new Set();for(let i=0;i<=t.length-6;i++)seen.add(t.slice(i,i+6).join(' '));for(const s of seen)freq.set(s,(freq.get(s)||0)+1);}const common=new Set([...freq].filter(([,n])=>n>=Math.max(3,Math.ceil(cards.length/4))).map(([s])=>s));const ratios=toks.map(t=>{let seen=new Set();for(let i=0;i<=t.length-6;i++)if(common.has(t.slice(i,i+6).join(' ')))for(let j=0;j<6;j++)seen.add(i+j);return seen.size/t.length;});need(ratios.reduce((a,b)=>a+b)/ratios.length<=.15&&Math.max(...ratios)<=.25,'Critique boilerplate exceeds gate');
 assert.equal(errors.length,0,JSON.stringify(errors,null,2));return {status:'passed-unsaved-publication-mechanics',cards:cards.length,descriptionMean:mean,critiqueBoilerplateMean:ratios.reduce((a,b)=>a+b)/ratios.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const n=process.argv.indexOf('--debate');assert(n>=0&&process.argv[n+1]===skeleton.number);const raw=fs.readFileSync(0,'utf8'),parts=JSON.parse(raw);console.log(JSON.stringify({...check(parts),candidateSha256:createHash('sha256').update(raw).digest('hex')}));}
