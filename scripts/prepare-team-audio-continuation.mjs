import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileRecord} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
const args=process.argv.slice(2);
assert.deepEqual(args.filter((_,i)=>i%2===0),['--debate','--inventory','--authorization']);
const read=p=>JSON.parse(readFileSync(p));
const registry=read('docs/assessment-production/standalone-debates-v1/registry.json');
const record=registry.debates.find(r=>r.debateNumber===args[1]);
assert(record?.validationProfile==='team-approximation-v1');
const root=record.root, inventoryPath=`${root}/${args[3]}`, authorizationPath=`${root}/${args[5]}`;
assert(!args[3].includes('..')&&!args[5].includes('..'));
const inventory=read(inventoryPath),authorization=read(authorizationPath),audit=read(`${root}/audit/audit-3.json`);
assert.equal(inventory.debateId,record.debateId);assert.equal(authorization.debateId,record.debateId);
assert.equal(audit.approvedForScoring,true);assert.equal(audit.inventorySha256,fileRecord(inventoryPath).sha256);
const prior=read(`${root}/audio/clip-plan-1.json`),repair=read(`${root}/audio/reference-repair-1.json`),pilot=read(`${root}/audio/pilot-summary-1.json`);
assert.equal(fileRecord(prior.source.path).sha256,prior.source.sha256);
for(const ref of repair.references)assert.equal(fileRecord(ref.path).sha256,ref.sha256);
const out=`output/transcribe/team-${record.debateNumber}-continuation`;
mkdirSync(out,{recursive:true});
const clips=inventory.moves.map(move=>{
  const startSeconds=Math.max(0,move.sourceSpan.startMs/1000-5),endSeconds=move.sourceSpan.endMs/1000+5;
  const old=prior.clips.find(c=>c.moveId===move.moveId && c.startSeconds===startSeconds && c.endSeconds===endSeconds);
  let clip;
  if(old){assert.equal(fileRecord(old.path).sha256,old.sha256);clip=old;}
  else{
    const path=`${out}/${move.moveId}.wav`;assert(!existsSync(path));
    const r=spawnSync('ffmpeg',['-nostdin','-v','error','-n','-ss',String(startSeconds),'-i',prior.source.path,'-t',String(endSeconds-startSeconds),'-vn','-ac','1','-ar','16000',path],{encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);clip={moveId:move.moveId,expectedSpeaker:move.speaker,path,sha256:fileRecord(path).sha256,startSeconds,endSeconds,durationSeconds:endSeconds-startSeconds};
  }
  const successful=pilot.outputs.find(p=>p.moveId===move.moveId && old);
  if(successful)assert.deepEqual(fileRecord(successful.record.path),successful.record);
  return {...clip,sourceSpan:move.sourceSpan,reuse:successful?.record??null};
});
const knownCost=pilot.cost.knownSuccessfulCallEstimatedUsd;
const remainingSeconds=clips.filter(c=>!c.reuse).reduce((s,c)=>s+c.durationSeconds,0);
const pilotSeconds=pilot.outputs.reduce((s,c)=>s+c.durationSeconds,0);
const projected=knownCost+knownCost/pilotSeconds*remainingSeconds;
assert(projected<authorization.audio.cumulativeMaximumUsd);
const plan={status:'prepared-before-paid-calls',debateNumber:record.debateNumber,debateId:record.debateId,inventory:fileRecord(inventoryPath),authorization:fileRecord(authorizationPath),independentAudit:fileRecord(`${root}/audit/audit-3.json`),references:repair.references,clips,model:prior.model,outputDirectory:out,cost:{knownSuccessfulCallEstimatedUsd:knownCost,priorRejectedRequestUsageUnavailable:true,priorRejectedRequestReserveUsd:0.05,projectedTotalUsd:projected,cumulativeMaximumUsd:authorization.audio.cumulativeMaximumUsd,inputUsdPerMillion:2.5,outputUsdPerMillion:10},retryPolicy:{automaticRetries:0,attemptsPerNewClip:1,reuseSuccessfulCalls:true}};
writeFileSync(`${root}/audio/continuation-plan-1.json`,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({clips:clips.length,newCalls:clips.filter(c=>!c.reuse).length,projectedTotalUsd:projected,cumulativeMaximumUsd:plan.cost.cumulativeMaximumUsd}));
