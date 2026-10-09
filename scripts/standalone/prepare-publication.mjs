import {openRun} from '../lib/standalone-workflow.mjs';
const runArg=process.argv.indexOf('--debate');
openRun(process.cwd(),process.argv[runArg+1],{writable:!process.argv.includes('--check-only')});
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileRecord,sha256} from '../../scripts/lib/assessment-production-standalone-debate-v1.mjs';
const args=process.argv.slice(2),value=n=>{const i=args.indexOf(n);assert(i>=0,`${n} required`);return args[i+1];};
const root=process.cwd(),read=p=>JSON.parse(fs.readFileSync(p));
const entry=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(e=>e.debateNumber===value('--debate'));assert(entry);
const base=entry.root,auth=read(`${base}/authorization.json`),manifest=read(`${base}/manifest.json`),source=read(`${base}/source/source-lock.json`),inventory=read(`${base}/inventory/inventory.json`),scores=read(`${base}/score-pass/output.json`);
assert.equal(scores.debateId,entry.debateId);assert.equal(scores.status,'single-deterministic-score-pass-complete');
const date=value('--date');assert(/^\d{4}-\d{2}-\d{2}$/.test(date));
const sourceNote=value('--source-note');assert(sourceNote.length>100);
if(auth.availableRecordingScope){assert.equal(auth.availableRecordingScope.videoId,entry.videoId);assert(sourceNote.includes(auth.availableRecordingScope.requiredReaderDisclosure),'Approved source-scope disclosure must be preserved verbatim');}
const timestamp=ms=>{const sec=Math.floor(ms/1000),s=String(sec%60).padStart(2,'0'),min=Math.floor(sec/60);return min>=60?`${Math.floor(min/60)}:${String(min%60).padStart(2,'0')}:${s}`:`${min}:${s}`;};
const window=inventory.assessedDebateWindowMs;assert(Number.isFinite(window.start)&&Number.isFinite(window.end)&&window.end>window.start);
// A scoped conversation can contain excluded gaps between retained exchanges.
// Display the retained duration, while keeping original timestamps on every card.
const retained=auth.availableRecordingScope?.retainedIntervals ?? source.retainedIntervals;
let durationMs=window.end-window.start;
if(Array.isArray(retained)&&retained.length){
 const ordered=[...retained].sort((a,b)=>a.startMs-b.startMs);let lastEnd=-Infinity;durationMs=0;
 for(const interval of ordered){assert(Number.isFinite(interval.startMs)&&Number.isFinite(interval.endMs)&&interval.endMs>interval.startMs);durationMs+=Math.max(0,interval.endMs-Math.max(interval.startMs,lastEnd));lastEnd=Math.max(lastEnd,interval.endMs);}
} else if(auth.identity.editorApprovedScope && Array.isArray(source.excludedIntervals)) {
 // Approved main discussion and closings can be separated by excluded audience Q&A.
 // Subtract the clipped interval union so overlaps and outer introductions are not double-counted.
 const excluded=source.excludedIntervals.map(interval=>{
  assert(Number.isFinite(interval.startMs)&&Number.isFinite(interval.endMs)&&interval.endMs>interval.startMs);
  return {startMs:Math.max(window.start,interval.startMs),endMs:Math.min(window.end,interval.endMs)};
 }).filter(interval=>interval.endMs>interval.startMs).sort((a,b)=>a.startMs-b.startMs);
 let lastEnd=window.start;
 for(const interval of excluded){durationMs-=Math.max(0,interval.endMs-Math.max(interval.startMs,lastEnd));lastEnd=Math.max(lastEnd,interval.endMs);}
 assert(durationMs>0,'Approved exclusions leave no assessed duration');
}
const durationMinutes=Math.round(durationMs/60000),hours=Math.floor(durationMinutes/60),minutes=durationMinutes%60;
const duration=hours?`${hours} hr ${minutes} min`:`${minutes} min`;
const byId=new Map(inventory.moves.map(m=>[m.moveId,m]));
const sections=scores.sections.map(s=>{
 const sides=Object.fromEntries(['pro','con'].map(side=>[side,s.sides[side].moves.map(sm=>{const m=byId.get(sm.moveId);assert(m&&m.sectionId===s.sectionId&&m.side===side);return {ledgerMoveId:m.moveId,time:timestamp(m.sourceSpan.startMs),score:sm.score,role:m.moveKind==='reply'?'Reply':'Constructive',words:null,critique:null,tags:[]};})]));
 const moves=inventory.moves.filter(m=>m.sectionId===s.sectionId),exchanges=Array.from({length:Math.max(sides.pro.length,sides.con.length)},(_,i)=>Object.fromEntries(['pro','con'].filter(side=>sides[side][i]).map(side=>[side,sides[side][i]])));
 return {sectionId:s.sectionId,title:s.title,timebox:`${timestamp(Math.min(...moves.map(m=>m.sourceSpan.startMs)))}–${timestamp(Math.max(...moves.map(m=>m.sourceSpan.endMs)))}`,score:{pro:s.sides.pro.score,con:s.sides.con.score},exchanges};
});
const identity=auth.identity,pro=scores.overall.pro.score,con=scores.overall.con.score;
const candidate={number:entry.debateNumber,id:entry.debateId,date,title:identity.title,label:identity.label,topicCategory:identity.topicCategory,youtubeUrl:identity.canonicalUrl,duration,motion:identity.motion,assessmentModel:manifest.modelSettings.displayLabel,assessmentRubric:'Slugfester Reassessment Rubric v2',sourceNote,scoringNote:'Scores are AI-generated estimates of argumentative performance, rather than judgments about worldview truth; the separate AI Contribution does not affect these scores.',sides:Object.fromEntries(['pro','con'].map(side=>[side,{name:identity[side].position,speaker:identity[side].speaker,color:side==='pro'?'teal':'coral'}])),score:{pro,con,winner:pro>con?'pro':con>pro?'con':'tie'},summary:null,quotes:{pro:null,con:null},sections,overall:{pro:{score:pro,strengths:[],blunders:[]},con:{score:con,strengths:[],blunders:[]}},logicalExtension:{pro:null,con:null}};
const skeletonPath=`${base}/publication/skeleton.json`,packetPath=`${base}/publication/build-packet.json`;
const skeletonBytes=Buffer.from(JSON.stringify(candidate,null,2)+'\n');
const packet={schemaVersion:'1.0-publication-assembly-packet',protocolId:auth.protocolId,debateNumber:entry.debateNumber,debateId:entry.debateId,model:manifest.modelSettings,buildInputs:{inventory:fileRecord(`${base}/inventory/inventory.json`,root),scores:fileRecord(`${base}/score-pass/output.json`,root),skeleton:{path:skeletonPath,sha256:sha256(skeletonBytes),bytes:skeletonBytes.length},referenceMetrics:fileRecord(`${base}/publication/reference-metrics.json`,root)},validatorPath:'scripts/lib/assessment-production-standalone-debate-v1.mjs',permittedAuthorFields:['summary','quotes','moves','overall','logicalExtension','noveltyMap','editorialReview']};
if(args.includes('--check-only')){console.log(JSON.stringify({status:'passed-check-only',debateNumber:entry.debateNumber,duration,sections:sections.length,moves:sections.reduce((a,s)=>a+s.exchanges.reduce((n,e)=>n+Object.keys(e).length,0),0),candidate},null,2));process.exit(0);}
assert(!fs.existsSync(skeletonPath)&&!fs.existsSync(packetPath));
fs.writeFileSync(skeletonPath,skeletonBytes,{flag:'wx'});
fs.writeFileSync(packetPath,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'prepared',skeleton:fileRecord(skeletonPath,root),packet:fileRecord(packetPath,root)}));
