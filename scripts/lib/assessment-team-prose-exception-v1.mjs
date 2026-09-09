import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
export function validateSecondProseException(run){
  const local=run.local('publication/repairs/second-exception-1'),execution=run.read(`${local}/execution.json`);
  assert.equal(execution.status,'passed-authorized-two-field-exception');assert.equal(execution.attempts,1);assert.equal(execution.forkTurns,'none');assert.equal(execution.modelSlug,'gpt-5.6-sol');assert.equal(execution.reasoningEffort,'low');assert.equal(execution.authentication,'ChatGPT subscription');assert.equal(execution.directIncrementalCostUsd,0);
  for(const key of ['intent','dispatch','authorization','supplement','guard','packet','prompt','output','editorialReview'])run.check(execution[key]);
  const intent=run.read(execution.intent.path),dispatch=run.read(execution.dispatch.path),authority=run.read(execution.authorization.path),packet=run.read(execution.packet.path),output=run.read(execution.output.path);
  assert.equal(intent.attemptsAllowed,1);assert.equal(intent.output,execution.output.path);assert.equal(dispatch.agentId,execution.agentId);
  for(const key of ['authorization','supplement','guard','packet','prompt'])assert.deepEqual(execution[key],intent[key]);
  run.check(authority.stop);authority.priorOutputs.forEach(run.check);assert.equal(authority.additionalAttempts,1);assert.equal(authority.maximumFields,2);assert.equal(authority.paidCallsAuthorized,0);
  const stop=run.read(authority.stop.path);assert.deepEqual(authority.allowedFields,stop.exhaustedFields);assert.deepEqual(Object.keys(output.fields).sort(),authority.allowedFields.toSorted());
  const supplement=run.read(execution.supplement.path);run.check(supplement.audioRecord);assert.equal(supplement.audit.unresolvedAttributions,0);assert(supplement.verification.every(v=>v.speakerVerified&&v.result==='confirmed'));assert.deepEqual(packet.supplement,execution.supplement);
  const result=spawnSync(process.execPath,['scripts/validate-team-prose-repair.mjs','--packet',execution.packet.path,'--file',execution.output.path],{cwd:run.resolve('.'),encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);assert.deepEqual(execution.validation,JSON.parse(result.stdout));
  const editorial=run.read(execution.editorialReview.path);assert.equal(editorial.status,'passed-two-field-editorial-review');assert.deepEqual(editorial.fields,authority.allowedFields);assert.deepEqual(editorial.output,execution.output);assert(editorial.noNewJudgments&&editorial.currentAudioStatusRespected&&editorial.internalIdentifiersRemoved&&editorial.frozenScoresPreserved);
  for(const text of Object.values(output.fields))assert(!/\bm\d{2}\b|pending audio|awaiting audio|jointly necessary|less ownership-centered/i.test(text));
  return {execution,authority,stop,output};
}
