import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {debates} from '../src/data/debates.js';
import {fileRecord} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
import {validateTeamProseProvenance,validateTeamTagProvenance} from './lib/assessment-team-publication-audit-v1.mjs';
import {publicationCards} from './lib/assessment-team-prose-v1.mjs';
import {validateTeamTagReview,validateTeamTagAdjudication,teamTagUnion,publicTag} from './lib/assessment-team-tags-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');
const run=openTeamRun(args[1]),prose=validateTeamProseProvenance(run),folder=run.local('publication/rhetorical-tags'),base=`${folder}/adjudication`,sourcePacket=fileRecord(`${folder}/source-packet.json`),packet=run.read(sourcePacket.path),reviewerExecution=run.read(`${base}/reviewer-execution.json`),contexts=reviewerExecution.contexts;
const put=(path,value)=>{writeFileSync(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return fileRecord(path);};
const intent=run.read(`${base}/execution-intent.json`),dispatch=run.read(`${base}/dispatch.json`);run.check(intent.packet);run.check(intent.prompt);
assert.equal(intent.attemptsAllowed,1);assert.equal(dispatch.attempts,1);assert.equal(dispatch.forkTurns,'none');assert.equal(dispatch.modelSlug,'gpt-5.6-sol');assert.equal(dispatch.reasoningEffort,'low');assert.equal(dispatch.authentication,'ChatGPT subscription');assert.equal(dispatch.directIncrementalCostUsd,0);
assert(!contexts.some(c=>c.agentId===dispatch.agentId));assert(!prose.agents.has(dispatch.agentId));
for(const c of contexts){for(const key of ['intent','dispatch','input','prompt','output'])run.check(c[key]);validateTeamTagReview(packet,run.read(c.output.path));}
const adjPacket=run.read(intent.packet.path);assert.deepEqual(adjPacket.candidates,teamTagUnion(packet,contexts.map(c=>run.read(c.output.path))));assert.deepEqual(adjPacket.moves,packet.moves);
const adjudication=run.read(intent.output);validateTeamTagAdjudication(adjPacket,adjudication);
contexts.push({...dispatch,role:'anonymous-adjudication',retries:0,intent:fileRecord(`${base}/execution-intent.json`),dispatch:fileRecord(`${base}/dispatch.json`),input:intent.packet,prompt:intent.prompt,output:fileRecord(intent.output)});
const candidate=structuredClone(prose.publication),accepted=adjudication.decisions.filter(d=>d.decision==='accepted').map(publicTag);
for(const card of publicationCards(candidate.candidate))card.tags=accepted.filter(t=>t.moveId===card.ledgerMoveId).map(({moveId,rationale,...tag})=>tag);
const output=put(run.local('publication/output.json'),candidate);
const execution=put(`${folder}/execution.json`,{status:'passed-two-blind-reviews-adjudication-and-final-definition-check',at:new Date().toISOString(),debateNumber:run.record.debateNumber,debateId:run.record.debateId,model:{slug:'gpt-5.6-sol',label:'5.6 Sol',reasoningEffort:'low'},catalogSnapshot:fileRecord(`${folder}/catalog.json`),sourcePacket,proseOutput:prose.execution.output,contexts,isolation:{existingTagsUnavailable:true,reviewerOutputsUnavailableToOtherReviewer:true,scoresUnavailable:true,otherDebatesAndTagFrequenciesUnavailableToModels:true},audit:{blindReviews:2,retries:0},output});
const baseline=debates.filter(d=>Number(d.number)>=171&&Number(d.number)<=195),rows=baseline.map(d=>{const m=publicationCards(d);return {debateNumber:d.number,moves:m.length,taggedArguments:m.filter(x=>x.tags.length).length,tags:m.reduce((n,x)=>n+x.tags.length,0)};}),sum=k=>rows.reduce((n,r)=>n+r[k],0),sorted=rows.map(r=>r.tags).sort((a,b)=>a-b);
const audit=put(`${folder}/audit.json`,{status:'passed-rhetorical-tag-review',debateNumber:run.record.debateNumber,debateId:run.record.debateId,independentReview:{executionPath:execution.path,executionSha256:execution.sha256},reviewedMoveIds:packet.moves.map(m=>m.moveId),candidateReviews:adjudication.decisions,acceptedTags:publicationCards(candidate.candidate).flatMap(c=>accepted.filter(t=>t.moveId===c.ledgerMoveId)),controllerOverrides:[],baselineComparison:{debateCount:baseline.length,debateNumbers:baseline.map(d=>d.number),moves:sum('moves'),taggedArguments:sum('taggedArguments'),tags:sum('tags'),taggedArgumentRate:Number((sum('taggedArguments')/sum('moves')).toFixed(3)),perDebateTagMinimum:sorted[0],perDebateTagMedian:sorted[Math.floor(sorted.length/2)],perDebateTagMaximum:sorted.at(-1),zeroTagDebates:rows.filter(r=>!r.tags).map(r=>r.debateNumber),interpretation:'Descriptive context only, calculated after all independent decisions; no tag quota or score adjustment is imposed.'},audit:{judgmentChanges:0,scoreChanges:0,moveChanges:0,acceptedTagCount:accepted.length,rejectedCandidateCount:adjudication.decisions.filter(d=>d.decision==='rejected').length}});
run.record.rhetoricalTagReview={auditPath:audit.path,executionPath:execution.path,modelLabel:'5.6 Sol',modelSlug:'gpt-5.6-sol',reasoningEffort:'low'};
validateTeamTagProvenance(run,validateTeamSourceStage(run),prose);
// Registry is a living route map; all judgment, score and publication bytes stay immutable.
writeFileSync('docs/assessment-production/standalone-debates-v1/registry.json',JSON.stringify(run.registry,null,2)+'\n');
console.log(JSON.stringify({status:'passed-rhetorical-tag-review',output,execution,audit,accepted:accepted.length}));
