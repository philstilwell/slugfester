import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fileRecord,validateMultiSpeakerPrimaryJudgment} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
import {validateOwnershipReplacement} from './lib/assessment-team-ownership-recovery-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');
const run=openTeamRun(args[1]),source=validateTeamSourceStage(run);assert(source.ownershipRecovery);
const r=run.baseLocal('recovery/audio-ownership-1'),oldExecutionPath=run.baseLocal('judgments/execution.json'),oldExecution=run.read(oldExecutionPath);
const prepared=[];
for(const pass of ['pass-a','pass-b']){
  const folder=`${r}/${pass}`,intent=run.read(`${folder}/execution-intent.json`),dispatch=run.read(`${folder}/dispatch.json`);
  for(const key of ['packet','prompt','audio'])run.check(intent[key]);assert.equal(dispatch.attempts,1);
  const replacement=run.read(intent.output);validateOwnershipReplacement(source.packet,replacement,pass);
  const oldMeta=oldExecution.passes.find(p=>p.pass===pass);run.check(oldMeta.output);const old=run.read(oldMeta.output.path);
  const merged={...old,inventorySha256:source.packet.inventory.sha256,inventoryAuditSha256:source.packet.inventoryAudit.canonicalSha256,judgments:old.judgments.map(j=>replacement.judgments.find(x=>x.moveId===j.moveId)??j),burdenCompletionAdjustment:{...old.burdenCompletionAdjustment,...replacement.burdenCompletionAdjustment}};
  validateMultiSpeakerPrimaryJudgment(merged,source.inventory,{expectedPass:pass,expectedInventorySha256:source.packet.inventory.sha256,expectedInventoryAuditSha256:source.packet.inventoryAudit.canonicalSha256});
  const unaffected=old.judgments.filter(j=>!source.packet.affectedMoveIds.includes(j.moveId));
  for(const j of unaffected)assert.deepEqual(merged.judgments.find(x=>x.moveId===j.moveId),j);
  prepared.push({pass,folder,intent,dispatch,merged,unaffectedMoveIds:unaffected.map(j=>j.moveId)});
}
assert.equal(new Set(prepared.map(p=>p.dispatch.agentId)).size,2);
const passes=prepared.map(p=>{const target=run.local(`judgments/${p.pass}/output.json`);writeFileSync(target,JSON.stringify(p.merged,null,2)+'\n',{flag:'wx'});return {...p.dispatch,pass:p.pass,forkTurns:'none',intent:fileRecord(`${p.folder}/execution-intent.json`),dispatch:fileRecord(`${p.folder}/dispatch.json`),packet:p.intent.packet,prompt:p.intent.prompt,output:fileRecord(target),replacement:fileRecord(p.intent.output),unaffectedMoveIds:p.unaffectedMoveIds,carriedForwardMoveCount:p.unaffectedMoveIds.length,replacedMoveIds:source.packet.affectedMoveIds,replacedBurdenSides:source.packet.dependentBurdenSides};});
const execution={status:'completed-and-authenticated',at:new Date().toISOString(),modelSlug:'gpt-5.6-sol',reasoningEffort:'low',authentication:'ChatGPT subscription',directIncrementalCostUsd:0,isolation:'Fresh mutually isolated built-in replacement contexts with no history, original judgments, other pass or calculated totals; 20 unaffected judgments carried forward mechanically per pass.',composition:'These are authenticated composites, not claims that the replacement workers reassessed every move. Original and replacement raw outputs remain intact.',recoveryAuthorization:source.packet.recoveryAuthorization,priorExecution:fileRecord(oldExecutionPath),passes};
writeFileSync(run.local('judgments/execution.json'),JSON.stringify(execution,null,2)+'\n',{flag:'wx'});
validateTeamJudgmentStage(run,source);
console.log(JSON.stringify({status:'replacements-validated-and-merged',unchangedPerPass:passes.map(p=>p.carriedForwardMoveCount),replacedMoveIds:source.packet.affectedMoveIds}));
