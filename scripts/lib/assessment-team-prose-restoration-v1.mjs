import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
export function validateTeamProseRestoration(run){
  const folder=run.local('publication/repairs/18-serialization-recovery-1');
  const authority=run.read(`${folder}/authorization.json`);
  assert.equal(authority.status,'authorized-exact-original-draft-restoration');
  assert.equal(authority.userApproval,'Yes. Proceed.');
  assert.equal(authority.newModelCalls,0);assert.equal(authority.textChanges,0);assert.equal(authority.scoreChanges,0);
  for(const key of ['stop','originalDraft','originalOutput','originalIntent','originalDispatch'])run.check(authority[key]);
  const stop=run.read(authority.stop.path),draft=run.read(authority.originalDraft.path),intent=run.read(authority.originalIntent.path),dispatch=run.read(authority.originalDispatch.path);
  assert.deepEqual(authority.originalDraft,stop.precheckedOriginalDraft);assert.deepEqual(authority.originalOutput,stop.failedOutput);
  assert.deepEqual(authority.allowedFields,stop.exhaustedFields);assert.equal(intent.output,authority.originalOutput.path);
  for(const key of ['packet','prompt'])run.check(intent[key]);
  for(const key of ['additionalInstruction','currentStatusSupplement'])run.check(dispatch[key]);
  assert.equal(dispatch.agentId,draft.agentId);assert.equal(dispatch.modelSlug,'gpt-5.6-sol');assert.equal(dispatch.reasoningEffort,'low');assert.equal(dispatch.forkTurns,'none');assert.equal(dispatch.attempts,1);
  const expected={status:'complete-publication-field-repair',shardId:'18',fields:{[authority.allowedFields[0]]:draft.originalDraft.description,[authority.allowedFields[1]]:draft.originalDraft.critique}};
  const outputPath=`${folder}/output.json`,output=run.read(outputPath);assert.deepEqual(output,expected);
  const result=spawnSync(process.execPath,['scripts/validate-team-prose-repair.mjs','--packet',intent.packet.path,'--file',outputPath],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);
  return {authority,stop,draft,intent,dispatch,output,outputPath,validation:JSON.parse(result.stdout)};
}
