import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fileRecord,validateMultiSpeakerAudioVerification,MULTI_SPEAKER_PROTOCOL_ID} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');
const run=openTeamRun(args[1]),source=validateTeamSourceStage(run),plan=run.read(run.local('audio/continuation-plan-1.json'));
run.check(plan.inventory);run.check(plan.authorization);
const reviewPath=run.revision?.audioReviewPath??run.local('audio/controller-review-1.json');
const review=run.read(reviewPath);
assert.equal(review.status,'completed-source-comparison');assert.equal(review.allSelectedMovesVerified,true);
assert.equal(review.reviewed.length,source.inventory.moves.length);assert.equal(new Set(review.reviewed.map(x=>x.moveId)).size,review.reviewed.length);
const inputRecords=[],clipRecords=[],attemptRecords=[];let estimatedSuccessfulCallTotalUsd=0;
const verifications=source.inventory.moves.map(move=>{
  const note=review.reviewed.find(x=>x.moveId===move.moveId),clip=plan.clips.find(x=>x.moveId===move.moveId);
  assert.equal(note.result,'supported');assert.equal(note.speaker,move.speaker);assert(note.notes.length>=100);
  assert.deepEqual(note.quoteWordsConfirmed,move.quoteEligibleExactSpans);
  assert.equal(fileRecord(clip.path).sha256,clip.sha256);
  assert(clip.startSeconds<=move.sourceSpan.startMs/1000&&clip.endSeconds>=move.sourceSpan.endMs/1000);
  clipRecords.push({...fileRecord(clip.path),moveId:move.moveId,startSeconds:clip.startSeconds,endSeconds:clip.endSeconds});
  const raw=run.local(`audio/${clip.reuse?'raw-pilot-1':'raw-continuation-1'}/${move.moveId}.json`),record=fileRecord(raw),output=run.read(raw);
  inputRecords.push(record);assert.equal(output.usage.type,'tokens');
  if(clip.reuse){assert.equal(record.sha256,clip.reuse.sha256);}else{
    const resultPath=run.local(`audio/continuation-attempts/${move.moveId}-result.json`),result=run.read(resultPath);
    assert.equal(result.status,'succeeded');assert.deepEqual(result.output,record);attemptRecords.push(fileRecord(resultPath));
  }
  estimatedSuccessfulCallTotalUsd+=(output.usage.input_tokens*plan.cost.inputUsdPerMillion+output.usage.output_tokens*plan.cost.outputUsdPerMillion)/1e6;
  return {moveId:move.moveId,speaker:move.speaker,speakerVerified:true,startBoundaryVerified:true,endBoundaryVerified:true,crossTalkResolved:true,result:'confirmed',quoteEligibleExactSpansVerified:move.quoteEligibleExactSpans,notes:note.notes};
});
assert(estimatedSuccessfulCallTotalUsd+plan.cost.priorRejectedRequestReserveUsd<=plan.cost.cumulativeMaximumUsd);
const audio={schemaVersion:'1.0-multi-speaker-audio-verification',protocolId:MULTI_SPEAKER_PROTOCOL_ID,status:'complete-and-schema-valid',debateNumber:run.record.debateNumber,debateId:run.record.debateId,inventorySha256:source.packet.inventory.sha256,
  method:review.method,limitations:'Automated named-reference speaker matching plus controller comparison, not direct human listening. Incidental moderator labels can be wrong; handoff wording and turn continuity are checked separately. The notes identify these cases. No substantive attribution remains unresolved.',
  sourceAudio:run.read(run.local('audio/clip-plan-1.json')).source,
  plan:fileRecord(run.local('audio/continuation-plan-1.json')),review:fileRecord(reviewPath),inputRecords,clipRecords,referenceRecords:plan.references,attemptRecords,
  verifications,correctionsApplied:source.ownershipRecovery?[{priorInventorySha256:source.ownershipRecovery.prior.packet.inventory.sha256,summary:'User-authorized source-boundary and attribution recovery preserves every unaffected move and narrows two mixed-speaker excerpts after independent re-audit; all original audio responses are reused.',reaudited:true,authorization:source.packet.recoveryAuthorization,inventoryAudit:source.packet.inventoryAudit}]:[],audit:{allSelectedMovesVerified:true,allSpeakerHandoffsVerified:true,allCrossTalkResolved:true,allQuoteEligibleSpansVerified:true,unresolvedAttributions:0},
  cost:{basis:'Returned token usage at the frozen official rates; estimated, not an account invoice.',estimatedSuccessfulCallTotalUsd,priorRejectedRequestUsageReported:false,priorRejectedRequestReserveUsd:plan.cost.priorRejectedRequestReserveUsd,cumulativeMaximumUsd:plan.cost.cumulativeMaximumUsd,newAutomaticRetries:0}};
validateMultiSpeakerAudioVerification(audio,source.inventory,{expectedInventorySha256:source.packet.inventory.sha256});
const target=run.local('audio/audio-verification.json');writeFileSync(target,JSON.stringify(audio,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'all-selected-moves-audio-verified',verifiedMoves:verifications.length,estimatedSuccessfulCallTotalUsd,output:fileRecord(target)}));
