import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileRecord} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');
const read=p=>JSON.parse(readFileSync(p));
const record=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(r=>r.debateNumber===args[1]);
assert(record?.validationProfile==='team-approximation-v1');
const root=record.root,planPath=`${root}/audio/continuation-plan-1.json`,plan=read(planPath);
for(const lock of [plan.inventory,plan.authorization,plan.independentAudit])assert.deepEqual(fileRecord(lock.path),lock);
const binding=read(`${root}/audit/metadata-binding-1.json`);
for(const lock of [binding.preservedOriginal,binding.authenticatedOutput,binding.authorization])assert.deepEqual(fileRecord(lock.path),lock);
assert.deepEqual(binding.preservedOriginal,plan.independentAudit);assert.deepEqual(binding.authorization,plan.authorization);
assert.equal(read(binding.authenticatedOutput.path).inventorySha256,plan.inventory.sha256);
for(const ref of plan.references)assert.equal(fileRecord(ref.path).sha256,ref.sha256);
assert.equal(plan.debateId,record.debateId);
const attempts=`${root}/audio/continuation-attempts`;mkdirSync(attempts,{recursive:true});
const cli='/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py';
const launcher='import importlib.util,sys; from openai import OpenAI; p=sys.argv.pop(1); s=importlib.util.spec_from_file_location("skill_transcribe",p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); m._create_client=lambda:OpenAI(max_retries=0,timeout=600); m.main()';
let usd=plan.cost.knownSuccessfulCallEstimatedUsd,seconds=0;
const newClips=plan.clips.filter(c=>!c.reuse);
for(const [index,clip] of newClips.entries()){
  assert.equal(fileRecord(clip.path).sha256,clip.sha256);
  const output=`${root}/audio/raw-continuation-1/${clip.moveId}.json`;
  const startPath=`${attempts}/${clip.moveId}-start.json`,resultPath=`${attempts}/${clip.moveId}-result.json`;
  if(existsSync(startPath)){
    assert(existsSync(resultPath),'Unresolved prior attempt: do not retry');
    const prior=read(resultPath);assert.equal(prior.status,'succeeded');assert.deepEqual(fileRecord(output),prior.output);
    usd+=prior.estimatedBilledUsd;seconds+=clip.durationSeconds;continue;
  }
  const remaining=newClips.slice(index).reduce((s,c)=>s+c.durationSeconds,0);
  const projectedRate=seconds>0 ? Math.max((usd-plan.cost.knownSuccessfulCallEstimatedUsd)/seconds,(plan.cost.projectedTotalUsd-plan.cost.knownSuccessfulCallEstimatedUsd)/newClips.reduce((s,c)=>s+c.durationSeconds,0)) : (plan.cost.projectedTotalUsd-plan.cost.knownSuccessfulCallEstimatedUsd)/remaining;
  assert(usd+remaining*projectedRate+plan.cost.priorRejectedRequestReserveUsd<=plan.cost.cumulativeMaximumUsd,'Revised projected cumulative cost exceeds authorization; no next request sent');
  assert(!existsSync(output));mkdirSync(`${root}/audio/raw-continuation-1`,{recursive:true});
  writeFileSync(startPath,JSON.stringify({status:'request-started',at:new Date().toISOString(),plan:fileRecord(planPath),input:fileRecord(clip.path),model:plan.model,automaticRetries:0,output},null,2)+'\n',{flag:'wx'});
  const command=['-c',launcher,cli,clip.path,'--model',plan.model,'--response-format','diarized_json','--language','en',...plan.references.flatMap(r=>['--known-speaker',`${r.speaker}=${r.path}`]),'--out',output];
  const result=spawnSync('python3',command,{encoding:'utf8',timeout:620000,maxBuffer:4*1024*1024});
  if(result.status!==0){writeFileSync(resultPath,JSON.stringify({status:'failed-or-transport-uncertain',at:new Date().toISOString(),exitCode:result.status,error:result.error?.message??null,stdout:result.stdout,stderr:result.stderr,automaticRetryPermitted:false},null,2)+'\n',{flag:'wx'});throw new Error(`Audio call ${clip.moveId} failed; preserved attempt, do not retry`);}
  const response=read(output);assert(response.usage?.type==='tokens','Missing returned usage: stop before any next request');
  const cost=(response.usage.input_tokens*plan.cost.inputUsdPerMillion+response.usage.output_tokens*plan.cost.outputUsdPerMillion)/1e6;
  usd+=cost;seconds+=clip.durationSeconds;
  writeFileSync(resultPath,JSON.stringify({status:'succeeded',at:new Date().toISOString(),output:fileRecord(output),usage:response.usage,estimatedBilledUsd:cost,cumulativeSuccessfulCallEstimatedUsd:usd,durationSeconds:response.duration,expectedClipDurationSeconds:clip.durationSeconds,attributionVerified:false},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({moveId:clip.moveId,status:'transcribed-not-yet-attribution-verified',estimatedCumulativeUsd:usd}));
  assert(usd+plan.cost.priorRejectedRequestReserveUsd<=plan.cost.cumulativeMaximumUsd);
}
console.log(JSON.stringify({status:'all-selected-clips-have-preserved-responses',estimatedSuccessfulCallTotalUsd:usd,attributionAuditRequired:true}));
