import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {debates} from '../../src/data/debates.js';
import {fileRecord,validateStandaloneCandidate} from '../../scripts/lib/assessment-production-standalone-debate-v1.mjs';
const args=process.argv.slice(2),di=args.indexOf('--debate');assert(di>=0);
const read=p=>JSON.parse(fs.readFileSync(p));
const registryPath='docs/assessment-production/standalone-debates-v1/registry.json',registry=read(registryPath);
const entry=registry.debates.find(e=>e.debateNumber===args[di+1]);assert(entry);
const base=entry.root,folder=`${base}/publication/rhetorical-tag-review-1`,pubPath=`${base}/publication/output.json`,checkOnly=args.includes('--check-only');
const source=read(`${folder}/source-packet.json`),catalog=read(`${folder}/catalog.json`),ids=source.moves.map(m=>m.moveId),manifest=read(`${base}/manifest.json`);
const overrides=read(`${folder}/controller-initialization.json`);
for(const key of ['acceptanceOverrides','rejectionOverrides','relabelingOverrides','contextOverrides'])assert.deepEqual(overrides[key],[],'nonempty overrides require separately authorized handling');
const names=['pass-a','pass-b','adjudication'];
for(const name of names){
 const r=spawnSync('node',[`${folder}/check-review.mjs`,'--debate',entry.debateNumber,'--packet',`${folder}/${name}/packet.json`],{input:fs.readFileSync(`${folder}/${name}/output.json`),encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);
 const receipt=read(`${folder}/${name}/execution.json`);assert.equal(receipt.status,'authenticated-completed-first-submission');
 assert.deepEqual(receipt.actualContextModels,[{model:manifest.modelSettings.model,reasoningEffort:manifest.modelSettings.reasoningEffort}]);
 if(!checkOnly){const review=read(`${folder}/${name}/source-definition-review.json`);assert(review.status.startsWith('passed'));assert.deepEqual(review.violations,[]);}
}
const packet=read(`${folder}/adjudication/packet.json`),resolved=read(`${folder}/adjudication/output.json`),definition=(type,label)=>catalog.definitions.find(d=>d.type===type&&d.label===label);
const union=packet.candidates.map(({anonymousReviews,...c})=>({...c,reviews:anonymousReviews}));
const priorPath=`${folder}/preserved-prior-output.json`,before=fs.readFileSync(checkOnly?priorPath:pubPath),pub=JSON.parse(before);
assert.deepEqual(pub.candidate.sections.flatMap(s=>s.exchanges.flatMap(e=>[e.pro,e.con].filter(Boolean))).map(m=>m.ledgerMoveId),ids);
const accepted=resolved.decisions.filter(d=>d.decision==='accepted').map(d=>({moveId:d.moveId,type:d.type,label:d.label,url:definition(d.type,d.label).url,context:d.context,rationale:d.rationale}));
const fields=[];
for(const [si,s] of pub.candidate.sections.entries())for(const [ei,e] of s.exchanges.entries())for(const side of ['pro','con'])if(e[side]){
 const card=e[side];assert.deepEqual(card.tags,[]);const tags=accepted.filter(t=>t.moveId===card.ledgerMoveId).map(({moveId,rationale,...t})=>t);
 if(tags.length){fields.push({path:`candidate.sections.${si}.exchanges.${ei}.${side}.tags`,moveId:card.ledgerMoveId,before:[],after:tags});card.tags=tags;}
}
validateStandaloneCandidate(pub.candidate,read(`${base}/score-pass/output.json`));
const reverse=structuredClone(pub);for(const f of fields){let x=reverse;const keys=f.path.split('.');for(const key of keys.slice(0,-1))x=x[key];x[keys.at(-1)]=[];}
assert.deepEqual(reverse,JSON.parse(before),'non-tag change');
if(checkOnly){assert.deepEqual(pub,read(pubPath));console.log(JSON.stringify({status:'passed-read-only-tag-application-fixture',debateNumber:entry.debateNumber,accepted:accepted.length,fields:fields.length,candidates:union.length}));process.exit(0);}
const summaries=population=>{
 const rows=population.map(d=>{const cards=d.sections.flatMap(s=>s.exchanges.flatMap(e=>[e.pro,e.con].filter(Boolean)));return {debateNumber:d.number,moves:cards.length,taggedArguments:cards.filter(c=>c.tags.length).length,tags:cards.reduce((n,c)=>n+c.tags.length,0)};});
 const sum=k=>rows.reduce((n,r)=>n+r[k],0),counts=rows.map(r=>r.tags).sort((a,b)=>a-b);
 return {debateCount:rows.length,debateNumbers:rows.map(r=>r.debateNumber),moves:sum('moves'),taggedArguments:sum('taggedArguments'),tags:sum('tags'),taggedArgumentRate:Number((sum('taggedArguments')/sum('moves')).toFixed(3)),perDebateTagMinimum:counts[0],perDebateTagMedian:counts[Math.floor(counts.length/2)],perDebateTagMaximum:counts.at(-1),zeroTagDebates:rows.filter(r=>!r.tags).map(r=>r.debateNumber)};
};
const baseline=summaries(debates.filter(d=>Number(d.number)>=171&&Number(d.number)<=195));assert.equal(baseline.debateCount,25);
const recent=summaries(debates.filter(d=>Number(d.number)<Number(entry.debateNumber)).sort((a,b)=>Number(b.number)-Number(a.number)).slice(0,25));assert.equal(recent.debateCount,25);
const outputs=names.map(n=>fileRecord(`${folder}/${n}/output.json`));
const execution={schemaVersion:'1.0-source-grounded-rhetorical-execution',status:'passed-two-blind-reviews-adjudication-and-final-definition-check',debateNumber:entry.debateNumber,debateId:entry.debateId,model:{label:manifest.modelSettings.displayLabel,slug:manifest.modelSettings.model,reasoningEffort:manifest.modelSettings.reasoningEffort},isolation:{existingTagsUnavailable:true,reviewerOutputsUnavailableToOtherReviewer:true,scoresUnavailable:true,freshAnonymousAdjudicator:true,method:'Fresh fork-none ChatGPT subscription contexts with authenticated literal reads; protocol isolation, not an operating-system sandbox.'},catalogSnapshot:fileRecord(`${folder}/catalog.json`),sourcePacket:fileRecord(`${folder}/source-packet.json`),contexts:names.map((n,i)=>({role:['blind-review-a','blind-review-b','anonymous-adjudication'][i],input:fileRecord(`${folder}/${n}/packet.json`),output:outputs[i],executionReceipt:fileRecord(`${folder}/${n}/execution.json`),sourceDefinitionReview:fileRecord(`${folder}/${n}/source-definition-review.json`),attempts:1,retries:0})),controllerOverrides:overrides,audit:{blindReviews:2,adjudicators:1,retries:0,judgmentChanges:0,scoreChanges:0,moveChanges:0},directIncrementalCostUsd:0};
const write=(p,o)=>{assert(!fs.existsSync(p),p);fs.writeFileSync(p,JSON.stringify(o,null,2)+'\n',{flag:'wx'});};
for(const p of [`${folder}/execution.json`,`${folder}/audit.json`,priorPath,`${base}/publication/correction-rhetorical-tags.json`])assert(!fs.existsSync(p),p);
write(`${folder}/execution.json`,execution);
const audit={schemaVersion:'1.0-source-grounded-rhetorical-audit',status:'passed-rhetorical-tag-review',debateNumber:entry.debateNumber,debateId:entry.debateId,reviewedMoveIds:ids,baselineComparison:baseline,recentWindowComparison:recent,comparisonInterpretation:'Both independent windows detect drift; neither supplies a tag quota. Acceptance requires a source-specific defect already reflected in the frozen critique and supported by the exact local definition. No numerical assessment changes.',independentReview:{executionPath:`${folder}/execution.json`,executionSha256:fileRecord(`${folder}/execution.json`).sha256,reviewerOutputs:outputs},completeCandidateUnion:union,candidateReviews:resolved.decisions,acceptedTags:accepted,controllerOverrides:overrides,audit:{reviewedMoveCount:ids.length,candidateCount:union.length,acceptedTagCount:accepted.length,rejectedCandidateCount:resolved.decisions.filter(d=>d.decision==='rejected').length,judgmentChanges:0,scoreChanges:0,moveChanges:0}};
write(`${folder}/audit.json`,audit);
if(!fields.length){
 write(`${folder}/application-no-changes.json`,{status:'review-complete-no-tags-accepted',debateNumber:entry.debateNumber,debateId:entry.debateId,publication:fileRecord(pubPath),audit:fileRecord(`${folder}/audit.json`),scoreChanges:0,publicationWrites:0});
 entry.rhetoricalTagReview={auditPath:`${folder}/audit.json`,executionPath:`${folder}/execution.json`,modelLabel:manifest.modelSettings.displayLabel,modelSlug:manifest.modelSettings.model,reasoningEffort:manifest.modelSettings.reasoningEffort,renderingAuditPath:`${base}/rendering/post-rhetorical-tag-audit.json`};
 fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');console.log(JSON.stringify({status:'review-complete-no-tags-accepted',debateNumber:entry.debateNumber,candidates:union.length,accepted:0,publicationWrites:0}));process.exit(0);
}
fs.writeFileSync(priorPath,before,{flag:'wx'});assert(fs.readFileSync(pubPath).equals(before),'concurrent publication change');
fs.writeFileSync(pubPath,JSON.stringify(pub,null,2)+'\n');
const shards=[];for(let i=0;i<fields.length;i+=2)shards.push({shard:shards.length+1,fields:fields.slice(i,i+2),writableFieldCount:fields.slice(i,i+2).length,attempts:1,retries:0,method:'Deterministic exact metadata application from authenticated adjudication; no model rewrite.'});
write(`${base}/publication/correction-rhetorical-tags.json`,{schemaVersion:'1.0-rhetorical-tag-application',status:'applied-once-and-frozen',debateNumber:entry.debateNumber,debateId:entry.debateId,originalPublicationPath:pubPath,preservedPriorOutput:fileRecord(priorPath),evidence:{after:fileRecord(pubPath),rhetoricalTagAudit:fileRecord(`${folder}/audit.json`),rhetoricalTagExecution:fileRecord(`${folder}/execution.json`)},writableShards:shards,audit:{judgmentChanges:0,scoreChanges:0,moveChanges:0,critiqueChanges:0,descriptionChanges:0,tagChanges:fields.length,acceptedTagCount:accepted.length,maximumWritableFieldsPerShard:2}});
entry.rhetoricalTagReview={auditPath:`${folder}/audit.json`,executionPath:`${folder}/execution.json`,modelLabel:manifest.modelSettings.displayLabel,modelSlug:manifest.modelSettings.model,reasoningEffort:manifest.modelSettings.reasoningEffort,correctionPath:`${base}/publication/correction-rhetorical-tags.json`,priorPublicationPath:priorPath,renderingAuditPath:`${base}/rendering/post-rhetorical-tag-audit.json`};
fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
console.log(JSON.stringify({status:'applied-reviewed-tags-only',debateNumber:entry.debateNumber,candidates:union.length,accepted:accepted.length,shards:shards.length}));
