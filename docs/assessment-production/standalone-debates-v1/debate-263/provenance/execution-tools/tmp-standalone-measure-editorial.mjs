import fs from 'node:fs';
import assert from 'node:assert/strict';
import { debates } from './src/data/debates.js';
import { fileRecord } from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const words=s=>String(s??'').trim().split(/\s+/).filter(Boolean);
const normalized=s=>String(s??'').toLowerCase().replace(/[^a-z0-9/]+/g,' ').trim().split(/\s+/).filter(Boolean);
const sixgrams=s=>{const ts=normalized(s);return Array.from({length:Math.max(0,ts.length-5)},(_,i)=>ts.slice(i,i+6).join(' '));};
const leaves=(o,p='')=>typeof o==='string'?[{path:p,text:o}]:Array.isArray(o)?o.flatMap((v,i)=>leaves(v,p+'['+i+']')):o&&typeof o==='object'?Object.entries(o).flatMap(([k,v])=>leaves(v,p?p+'.'+k:k)):[];
const profile=d=>{const text=leaves(d.logicalExtension).map(l=>l.text).join(' '),n=words(text).length,commas=(text.match(/,/g)||[]).length;return{debateNumber:d.number,words:n,commas,commaDensity:n?commas/n:0};};
export function measureEditorial(debateNumber){
 const registry=read('docs/assessment-production/standalone-debates-v1/registry.json'),rec=registry.debates.find(r=>r.debateNumber===debateNumber);assert(rec);
 const publicationPath=rec.root+'/publication/output.json',candidate=read(publicationPath).candidate;
 const standaloneNumbers=new Set(registry.debates.map(r=>Number(r.debateNumber)));
 const refs=debates.filter(d=>Number(d.number)<Number(debateNumber)&&!standaloneNumbers.has(Number(d.number))).slice(-25);assert.equal(refs.length,25);
 const referenceGrams=new Set(refs.flatMap(d=>leaves(d.logicalExtension).flatMap(l=>sixgrams(l.text))));
 const allCorpus=[...debates.filter(d=>d.number!==debateNumber&&!d.draft&&!d.sections.some(s=>s.__draft)),candidate].map(profile).filter(p=>p.words>=300);
 const densities=allCorpus.map(p=>p.commaDensity).sort((a,b)=>a-b),median=densities[Math.floor(densities.length/2)],threshold=median/4;
 const targetLeaves=leaves(candidate.logicalExtension).filter(l=>!l.path.endsWith('.title'));
 const paragraphChecks=targetLeaves.map(l=>({path:l.path,words:words(l.text).length,commas:(l.text.match(/,/g)||[]).length,opening:words(l.text).slice(0,12).join(' '),referenceSixgramMatches:[...new Set(sixgrams(l.text).filter(g=>referenceGrams.has(g)))],provenanceLauncher:/AI-generated extension|AI-developed extension|possible extension|AI reconstruction|unassailable/i.test(l.text)}));
 const repeatedOpenings=[];for(let i=0;i<paragraphChecks.length;i++)for(let j=i+1;j<paragraphChecks.length;j++){const a=normalized(paragraphChecks[i].opening).slice(0,8).join(' '),b=normalized(paragraphChecks[j].opening).slice(0,8).join(' ');if(a===b)repeatedOpenings.push([paragraphChecks[i].path,paragraphChecks[j].path]);}
 return{schemaVersion:'1.0-ai-contribution-prose-measurements',status:'measured-direct-editorial-review-required',debateNumber,debateId:rec.debateId,publication:fileRecord(publicationPath),referenceNumbers:refs.map(d=>d.number),allPublishedPunctuationProfiles:allCorpus,corpusMedianCommaDensity:median,strippedPunctuationThreshold:threshold,flaggedPunctuationDebates:allCorpus.filter(p=>p.commaDensity<threshold).map(p=>p.debateNumber),targetProfile:profile(candidate),paragraphChecks,repeatedEightWordOpenings:repeatedOpenings,automaticAcceptance:false};
}
if(process.argv[2]==='--debate')console.log(JSON.stringify(measureEditorial(process.argv[3]),null,2));
