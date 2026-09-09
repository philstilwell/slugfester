import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileRecord} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage,validateTeamResolvedStage,validateTeamScoreStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
import {validateTeamProse} from './lib/assessment-team-prose-v1.mjs';
import {validateSecondProseException} from './lib/assessment-team-prose-exception-v1.mjs';
import {validateTeamProseRestoration} from './lib/assessment-team-prose-restoration-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');
const r=openTeamRun(args[1]),s=validateTeamSourceStage(r),j=validateTeamJudgmentStage(r,s),l=validateTeamResolvedStage(r,s,j);validateTeamScoreStage(r,s,j,l);
assert(!r.record.publicationHold,'An unresolved publication hold requires its own explicit authorization and authenticated resolution before assembly');
const root=r.local('publication'),planPath=`${root}/repairs/plan.json`,plan=r.read(planPath),stopPath=`${root}/stop-1.json`,stop=r.read(stopPath),exceptionFolder=`${root}/repairs/01-exception-1`,authority=r.read(`${exceptionFolder}/authorization.json`);
r.check(plan.initial);r.check(plan.rejection);r.check(authority.stop);r.check(authority.priorOutput);assert.deepEqual(authority.allowedFields,stop.exhaustedFields);assert.equal(authority.additionalAttempts,1);assert.equal(authority.paidCallsAuthorized,0);
const initial=r.read(plan.initial.path),candidate=structuredClone(initial),initialIntent=r.read(`${root}/execution-intent.json`),initialDispatch=r.read(`${root}/dispatch.json`);
for(const key of ['packet','prompt'])r.check(initialIntent[key]);assert.equal(initialIntent.output,plan.initial.path);assert.equal(initialDispatch.attempts,1);
const set=(object,field,value)=>{const path=field.split('.');let target=object;for(const k of path.slice(0,-1))target=target[k];assert.equal(typeof target[path.at(-1)],'string');target[path.at(-1)]=value;};
const contexts=[],seen=new Set();
const second=validateSecondProseException(r),secondFields=second.authority.allowedFields;
const restored=validateTeamProseRestoration(r);
function validateContext(folder,packetRecord,promptRecord,intentRecord,outputPath,exception=false){
  for(const rec of [packetRecord,promptRecord,intentRecord])r.check(rec);const intent=r.read(intentRecord.path),dispatchPath=`${folder}/dispatch.json`,dispatch=r.read(dispatchPath);assert.equal(dispatch.attempts,1);assert.equal(dispatch.forkTurns,'none');assert.equal(dispatch.modelSlug,'gpt-5.6-sol');assert.equal(dispatch.reasoningEffort,'low');assert.equal(dispatch.authentication,'ChatGPT subscription');assert.equal(dispatch.directIncrementalCostUsd,0);assert.equal(intent.output,outputPath);assert.deepEqual(intent.packet,packetRecord);assert.deepEqual(intent.prompt,promptRecord);
  const result=spawnSync(process.execPath,['scripts/validate-team-prose-repair.mjs','--packet',packetRecord.path,'--file',outputPath],{encoding:'utf8'});assert.equal(result.status,0,`${outputPath}: ${result.stdout}${result.stderr}`);
  const output=r.read(outputPath),validation=JSON.parse(result.stdout);contexts.push({...dispatch,status:'passed-repair',intent:intentRecord,dispatch:fileRecord(dispatchPath),packet:packetRecord,prompt:promptRecord,output:fileRecord(outputPath),validation,exception});return output;
}
for(const shard of plan.shards){
  const folder=`${root}/repairs/${shard.shardId}`;
  if(shard.shardId==='18'){
    assert.deepEqual(shard.fields,restored.authority.allowedFields);assert.deepEqual(shard.packet,restored.intent.packet);assert.equal(shard.output,restored.authority.originalOutput.path);
    for(const [field,value] of Object.entries(restored.output.fields)){assert(!seen.has(field));seen.add(field);set(candidate.candidate,field,value);}continue;
  }
  if(shard.fields.some(f=>secondFields.includes(f))){
    const old=r.read(shard.output);r.check(second.authority.priorOutputs.find(p=>p.path===shard.output));
    for(const [field,value] of Object.entries(old.fields)){if(secondFields.includes(field))continue;assert(!seen.has(field));seen.add(field);set(candidate.candidate,field,value);}continue;
  }
  if(shard.fields.some(f=>authority.allowedFields.includes(f))){
    const old=r.read(shard.output);for(const [field,value] of Object.entries(old.fields)){if(authority.allowedFields.includes(field))continue;assert(stop.passingFieldsPreserved.includes(field));assert(!seen.has(field));seen.add(field);set(candidate.candidate,field,value);}
    continue;
  }
  const output=validateContext(folder,shard.packet,shard.prompt,shard.intent,shard.output);
  for(const [field,value] of Object.entries(output.fields)){assert(!seen.has(field));seen.add(field);set(candidate.candidate,field,value);}
}
const exceptionIntent=fileRecord(`${exceptionFolder}/execution-intent.json`),ei=r.read(exceptionIntent.path);r.check(ei.authorization);r.check(ei.guard);
const replacement=validateContext(exceptionFolder,ei.packet,ei.prompt,exceptionIntent,ei.output,true);assert.deepEqual(Object.keys(replacement.fields),authority.allowedFields);
for(const [field,value] of Object.entries(replacement.fields)){assert(!seen.has(field));seen.add(field);set(candidate.candidate,field,value);}
contexts.push({...second.execution,exception:'second',status:'passed-repair'});
for(const [field,value] of Object.entries(second.output.fields)){assert(!seen.has(field));seen.add(field);set(candidate.candidate,field,value);}
assert.equal(new Set(contexts.map(c=>c.agentId)).size,contexts.length);assert(!contexts.some(c=>c.agentId===initialDispatch.agentId));assert.equal(seen.size,plan.fieldCount);
assert(!contexts.some(c=>c.agentId===restored.dispatch.agentId));assert.notEqual(initialDispatch.agentId,restored.dispatch.agentId);
const validation=validateTeamProse(candidate.candidate);assert.equal(validation.status,'passed',JSON.stringify(validation));
const outputPath=`${root}/prose-output.json`;writeFileSync(outputPath,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
const check=spawnSync(process.execPath,['scripts/validate-team-publication-prose.mjs','--debate',r.record.debateNumber,'--file',outputPath],{encoding:'utf8'});assert.equal(check.status,0,check.stdout+check.stderr);
const execution={status:'passed-publication-prose',at:new Date().toISOString(),debateNumber:r.record.debateNumber,debateId:r.record.debateId,initial:{...initialDispatch,status:'rejected-output-preserved',intent:fileRecord(`${root}/execution-intent.json`),dispatch:fileRecord(`${root}/dispatch.json`),packet:initialIntent.packet,prompt:initialIntent.prompt,output:plan.initial,rejection:plan.rejection},plan:fileRecord(planPath),priorStop:fileRecord(stopPath),priorRepairCheckpoint:fileRecord(`${root}/repairs/execution-checkpoint-1.json`),exceptionAuthorization:fileRecord(`${exceptionFolder}/authorization.json`),contexts,changedFields:[...seen],output:fileRecord(outputPath),validation,judgmentChanges:0,scoreChanges:0,additionalDirectCostUsd:0};
execution.secondException=fileRecord(r.local('publication/repairs/second-exception-1/execution.json'));
execution.secondCheckpoint=fileRecord(r.local('publication/repairs/execution-checkpoint-2.json'));
execution.serializationRestoration=fileRecord(r.local('publication/repairs/18-serialization-recovery-1/execution.json'));
execution.thirdCheckpoint=fileRecord(r.local('publication/repairs/execution-checkpoint-3.json'));
writeFileSync(`${root}/prose-execution.json`,JSON.stringify(execution,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:execution.status,output:execution.output,validation}));
