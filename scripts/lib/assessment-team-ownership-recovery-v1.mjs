import assert from 'node:assert/strict';
import {fileRecord,canonicalJson,sha256,validateMultiSpeakerInventoryAudit,DIMENSION_KEYS} from './assessment-production-multi-speaker-approximation-v1.mjs';
import {validateTeamSelection,validateStandaloneTeamInventory} from './assessment-standalone-team-debate-v1.mjs';
export function validateOwnershipReplacement(packet,replacement,pass){
  const contract=packet.outputContract;
  assert.deepEqual(Object.keys(replacement).sort(),Object.keys(contract).sort());
  for(const key of ['status','debateId','inventorySha256','inventoryAuditSha256'])assert.equal(replacement[key],contract[key]);
  assert.equal(replacement.pass,pass);assert.deepEqual(replacement.isolation,contract.isolation);
  assert.deepEqual(replacement.judgments.map(x=>x.moveId),packet.affectedMoveIds);
  for(const j of replacement.judgments){assert.deepEqual(Object.keys(j).sort(),['moveId','assessmentConfidence','dimensions'].sort());assert(['high','medium','low'].includes(j.assessmentConfidence));assert.deepEqual(Object.keys(j.dimensions).sort(),[...DIMENSION_KEYS].sort());for(const d of Object.values(j.dimensions)){assert.deepEqual(Object.keys(d).sort(),['value','rationale'].sort());assert(Number.isInteger(d.value)&&d.value>=0&&d.value<=100);assert(typeof d.rationale==='string'&&d.rationale.trim().length>=40);}}
  assert.deepEqual(Object.keys(replacement.burdenCompletionAdjustment).sort(),packet.dependentBurdenSides.toSorted());
  const ids=new Set(packet.evidence.moves.map(m=>m.moveId));
  for(const b of Object.values(replacement.burdenCompletionAdjustment)){assert.deepEqual(Object.keys(b).sort(),['value','rationale','distinctUnscoredConsequence','relatedMoveIds'].sort());assert(Number.isInteger(b.value)&&b.value>=-5&&b.value<=5);assert(typeof b.rationale==='string'&&b.rationale.trim().length>=40);assert(Array.isArray(b.relatedMoveIds)&&b.relatedMoveIds.every(id=>ids.has(id)));if(b.value!==0){assert(typeof b.distinctUnscoredConsequence==='string'&&b.distinctUnscoredConsequence.trim().length>=30);assert(b.relatedMoveIds.length>0);}else assert(b.distinctUnscoredConsequence===null||(typeof b.distinctUnscoredConsequence==='string'&&b.distinctUnscoredConsequence.trim()));}
  return {status:'passed',replacementMoves:replacement.judgments.length,burdenFields:Object.keys(replacement.burdenCompletionAdjustment).length};
}
export function validateOwnershipSource(run,prior,{repositoryOnly=false}={}){
  const packet=run.read(run.local('judgments/judgment-packet.json'));
  for(const key of ['previousPacket','recoveryAuthorization','inventory','inventoryAudit','sourceManifest','recoveryExecution'])run.check(packet[key]);
  assert.equal(packet.previousPacket.path,run.baseLocal('judgments/judgment-packet.json'));
  const authority=run.read(packet.recoveryAuthorization.path);
  assert.equal(authority.status,'user-authorized-before-recovery');assert.equal(authority.additionalInventoryAttempts,1);assert.equal(authority.independentReauditAttempts,1);assert.equal(authority.judgmentReplacementAttemptsPerPass,1);assert.equal(authority.paidCallsAuthorized,0);
  assert.equal(authority.debateId,run.record.debateId);assert.deepEqual(authority.priorInventory,prior.packet.inventory);assert.deepEqual(authority.priorAudit,prior.packet.inventoryAudit);
  for(const key of ['priorStop','priorInventory','priorAudit','priorExecution'])run.check(authority[key]);
  const inventory=run.read(packet.inventory.path),inventoryAudit=run.read(packet.inventoryAudit.path);
  assert.equal(packet.inventoryAudit.canonicalSha256,sha256(canonicalJson(inventoryAudit)));
  assert.deepEqual(packet.evidence,inventory);assert.equal(packet.inventorySha256,packet.inventory.sha256);
  const inventoryValidation=repositoryOnly?validateTeamSelection(inventory,prior.authorization):validateStandaloneTeamInventory(inventory,run.read(`.assessment-cache/captions/${run.record.videoId}/events.json`),prior.authorization);
  assert.deepEqual(inventory.moves.map(m=>m.moveId),prior.inventory.moves.map(m=>m.moveId));
  const allowed=new Set(authority.affectedMoveIds);
  for(const move of prior.inventory.moves){const next=inventory.moves.find(m=>m.moveId===move.moveId);if(!allowed.has(move.moveId))assert.deepEqual(next,move,`Unrelated move changed: ${move.moveId}`);else for(const key of ['moveId','speaker','side','sectionId','moveKind','importance','burdenContact','quoteEligibleExactSpans','respondsToIds','adoptsMoveIds','inferenceGroupId','extendsMoveIds','repeatedInferenceOnly'])assert.deepEqual(next[key],move[key],`Unauthorized ${move.moveId}.${key}`);}
  for(const key of ['motion','sides','sections','burdenRoutes','formatFitness','selectionBalanceAudit','speakerCoverage','sourceScope'])assert.deepEqual(inventory[key],prior.inventory[key],`Unauthorized inventory ${key}`);
  validateMultiSpeakerInventoryAudit(inventoryAudit,inventory,{expectedInventorySha256:packet.inventory.sha256,expectedTranscriptSha256:prior.transcriptLock.sha256,expectedEventsSha256:prior.eventsLock.sha256});
  assert.equal(inventoryAudit.exceptionAuthorization.sha256,packet.recoveryAuthorization.sha256);assert(inventoryAudit.priorAuditHistory.some(x=>x.sha256===prior.packet.inventoryAudit.sha256));inventoryAudit.priorAuditHistory.forEach(run.check);
  const execution=run.read(packet.recoveryExecution.path);
  assert.equal(execution.status,'source-correction-and-independent-audit-authenticated');
  assert.equal(execution.source.modelSlug,'gpt-5.6-sol');assert.equal(execution.audit.modelSlug,'gpt-5.6-sol');
  assert.notEqual(execution.source.agentId,execution.audit.agentId);
  for(const stage of [execution.source,execution.audit]){assert.equal(stage.reasoningEffort,'low');assert.equal(stage.forkTurns,'none');assert.equal(stage.attempts,1);assert.equal(stage.directIncrementalCostUsd,0);for(const key of ['intent','packet','prompt'])run.check(stage[key]);stage.outputs.forEach(run.check);}
  return {...prior,packet,inventory,inventoryAudit,inventoryValidation,ownershipRecovery:{authority,prior,execution}};
}
export function validateOwnershipJudgmentMerge(run,source,execution,meta,output){
  const {authority,prior}=source.ownershipRecovery;
  run.check(execution.recoveryAuthorization);assert.equal(execution.recoveryAuthorization.sha256,source.packet.recoveryAuthorization.sha256);
  run.check(execution.priorExecution);assert.equal(execution.priorExecution.path,run.baseLocal('judgments/execution.json'));
  const oldExecution=run.read(execution.priorExecution.path),oldMeta=oldExecution.passes.find(p=>p.pass===meta.pass);
  run.check(oldMeta.output);run.check(meta.replacement);run.check(meta.intent);run.check(meta.prompt);
  const old=run.read(oldMeta.output.path),replacement=run.read(meta.replacement.path),intent=run.read(meta.intent.path);
  validateOwnershipReplacement(source.packet,replacement,meta.pass);
  assert(!oldExecution.passes.some(p=>p.agentId===meta.agentId));assert(![source.ownershipRecovery.execution.source.agentId,source.ownershipRecovery.execution.audit.agentId].includes(meta.agentId));
  assert.equal(intent.status,'frozen-before-execution');assert.equal(intent.attemptsAllowed,1);assert.deepEqual(intent.packet,meta.packet);assert.deepEqual(intent.prompt,meta.prompt);assert.equal(intent.output,meta.replacement.path);
  assert.equal(replacement.status,'complete-affected-field-replacement');assert.equal(replacement.pass,meta.pass);assert.equal(replacement.debateId,run.record.debateId);assert.equal(replacement.inventorySha256,source.packet.inventory.sha256);assert.equal(replacement.inventoryAuditSha256,source.packet.inventoryAudit.canonicalSha256);
  assert.deepEqual(Object.keys(replacement).sort(),['status','pass','debateId','inventorySha256','inventoryAuditSha256','judgments','burdenCompletionAdjustment','isolation'].sort());
  assert.equal(replacement.isolation.otherPassUnavailable,true);assert.equal(replacement.isolation.priorJudgmentsUnavailable,true);assert.equal(replacement.isolation.calculatedTotalsUnavailable,true);assert.equal(replacement.isolation.contaminationDetected,false);
  assert.deepEqual(replacement.judgments.map(j=>j.moveId),authority.affectedMoveIds);
  assert.deepEqual(Object.keys(replacement.burdenCompletionAdjustment).sort(),authority.dependentBurdenFields[meta.pass].toSorted());
  for(const move of old.judgments){const actual=output.judgments.find(j=>j.moveId===move.moveId),changed=replacement.judgments.find(j=>j.moveId===move.moveId);assert.deepEqual(actual,changed??move,`Unauthorized judgment change ${meta.pass}:${move.moveId}`);}
  for(const side of ['pro','con'])assert.deepEqual(output.burdenCompletionAdjustment[side],replacement.burdenCompletionAdjustment[side]??old.burdenCompletionAdjustment[side]);
  const expected={...old,inventorySha256:source.packet.inventory.sha256,inventoryAuditSha256:source.packet.inventoryAudit.canonicalSha256,judgments:old.judgments.map(j=>replacement.judgments.find(r=>r.moveId===j.moveId)??j),burdenCompletionAdjustment:{...old.burdenCompletionAdjustment,...replacement.burdenCompletionAdjustment}};
  assert.deepEqual(output,expected,'Composite differs beyond exactly authorized replacements and source hash binding');
}
