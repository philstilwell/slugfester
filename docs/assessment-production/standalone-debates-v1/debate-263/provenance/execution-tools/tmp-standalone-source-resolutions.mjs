import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileRecord} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
export function authenticateSourceResolutions(records, inventory, expectedInventoryHash){
 const read=p=>JSON.parse(fs.readFileSync(p));
 return (records??[]).map(lock=>{
  assert.equal(fileRecord(lock.path).sha256,lock.sha256);
  const resolution=read(lock.path);
  assert.equal(resolution.status,'resolved-without-frozen-substance-change');
  assert.equal(resolution.debateId,inventory.debateId);
  assert.equal(resolution.frozenInventorySha256,expectedInventoryHash);
  const move=inventory.moves.find(m=>m.moveId===resolution.moveId);assert(move);
  assert.deepEqual(resolution.sourceEventRange,[move.sourceSpan.startEvent,move.sourceSpan.endEvent]);
  assert(resolution.materialMeaningResolved&&resolution.originalReviewerFlagsPreserved);
  for(const key of ['attributionChanged','frozenSourceChanged','inventoryChanged','ratingsChanged','assessmentConfidenceChanged'])assert.equal(resolution[key],false);
  assert.equal(resolution.unresolvedMaterialSourceIssues,0);
  for(const input of resolution.verificationInputs)assert.equal(fileRecord(input.path).sha256,input.sha256);
  const executionRecord=resolution.verificationInputs.find(r=>r.path.endsWith('/execution.json'));
  const responseRecord=resolution.verificationInputs.find(r=>r.path.endsWith('/response.json'));assert(executionRecord&&responseRecord);
  const execution=read(executionRecord.path);assert.equal(execution.status,'successful-single-call');assert.equal(execution.responseSha256,responseRecord.sha256);assert.equal(execution.retries,0);
  return {...lock,moveId:resolution.moveId};
 });
}
export function requireResolvedSourceChecks(checks,resolutions){
 for(const check of checks){
  assert.equal(check.attributionSupported,true,check.moveId+' ownership unresolved');
  assert(check.materialUncertainty===false||resolutions.some(r=>r.moveId===check.moveId),check.moveId+' material wording unresolved');
 }
}
export function authenticateSubmissionHistory(execution,review,packet){
 const prewrite=review.prewritePatchFailures??[];
 assert.equal(execution.failedWriteContainingCells.length,prewrite.length);
 for(const failure of execution.failedWriteContainingCells){
  const proof=prewrite.find(p=>p.callId===failure.callId);assert(proof);
  assert.equal(proof.classification,'patch-parse-failure-before-any-file-write');
  assert(proof.onlyPatchOperationInCell&&proof.sameCheckedDraftUsedForSuccessfulSubmission);
  assert.equal(proof.assessmentEditsBetweenAttempts,0);
  assert(failure.diagnostic.includes('apply_patch verification failed: invalid hunk'));
  assert(failure.diagnostic.includes(proof.diagnostic));
 }
 if(execution.successfulSubmissionCells.length===1){assert(!review.metadataCorrection);return;}
 // A second substantive assessment is never accepted. This branch authenticates
 // only an exact copied source-hash typo, preserving the entire initial submission.
 assert.equal(execution.successfulSubmissionCells.length,2);
 const lock=review.metadataCorrection;assert(lock);assert.equal(fileRecord(lock.path).sha256,lock.sha256);
 const read=p=>JSON.parse(fs.readFileSync(p)),c=read(lock.path);
 assert.equal(c.status,'exact-metadata-only-correction-authenticated');
 assert.equal(c.field,'readingAuthentication.sourceSha256');
 assert.equal(c.numericEdits,0);assert.equal(c.semanticEdits,0);
 assert.equal(c.modelJudgmentSubmissions,1);assert.equal(c.mechanicalMetadataCorrections,1);
 for(const r of [c.preservedPriorOutput,c.afterOutput])assert.equal(fileRecord(r.path).sha256,r.sha256);
 assert.equal(c.afterOutput.sha256,execution.output.sha256);
 assert.equal(c.correctedValue,packet.source.sha256);
 const original=read(c.preservedPriorOutput.path),current=read(c.afterOutput.path);
 assert.equal(original.readingAuthentication.sourceSha256,c.originalValue);
 assert.equal(current.readingAuthentication.sourceSha256,c.correctedValue);
 original.readingAuthentication.sourceSha256=current.readingAuthentication.sourceSha256;
 assert.deepEqual(original,current,'Metadata repair changed assessment substance');
 assert.equal(c.originalSubmissionCallId,execution.successfulSubmissionCells[0].callId);
 assert.equal(c.correctionCallId,execution.successfulSubmissionCells[1].callId);
}
