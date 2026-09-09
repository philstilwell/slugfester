import assert from 'node:assert/strict';
import {fileRecord,canonicalJson,sha256,extractMultiSpeakerDisagreements,assembleMultiSpeakerFinalLedger,deriveMultiSpeakerScores,deriveMultiSpeakerScoreUncertainty,analyzeMultiSpeakerFormatSensitivity,buildMultiSpeakerPublicationDiagnostics,validateMultiSpeakerScoreStability} from './assessment-production-multi-speaker-approximation-v1.mjs';
export function validateClarityOutput(packet,output){
 assert.deepEqual(Object.keys(output).sort(),['status','moveId','dimension','value','rationale'].sort());
 assert.equal(output.status,'complete-clarity-only-review');assert.equal(output.moveId,packet.move.moveId);assert.equal(output.dimension,'precisionClarity');assert(Number.isInteger(output.value)&&output.value>=0&&output.value<=100);assert(typeof output.rationale==='string'&&output.rationale.trim().length>=40);
}
export function clarityInputs(run,folder,source,judgments){
 const {read,check}=run,authority=read(`${folder}/authorization.json`),erratum=read(`${folder}/source-erratum.json`),packet=read(`${folder}/packet.json`);
 assert.equal(authority.status,'explicitly-authorized-bounded-clarity-correction');assert.equal(authority.debateId,run.record.debateId);assert.equal(authority.scope.dimension,'precisionClarity');assert.equal(authority.scope.primaryReviewers,2);assert.equal(authority.scope.attemptsPerReviewer,1);assert.equal(authority.scope.maximumExceptionalReplacementCalculations,1);assert.equal(authority.directIncrementalCostUsd,0);authority.controls.forEach(check);authority.protectedFiles.forEach(check);check(authority.confirmation);check(authority.originalScoreAttestation);
 check(erratum.authorization);check(erratum.confirmation);check(erratum.originalInventory);assert.deepEqual(erratum.originalInventory,source.packet.inventory);
 const confirmation=read(authority.confirmation.path);assert.equal(confirmation.confirmedWord,authority.scope.sourceReplacement.after);assert.equal(confirmation.captionWord,authority.scope.sourceReplacement.before);assert.equal(confirmation.moveId,authority.scope.moveId);
 const inventory=structuredClone(source.inventory),move=inventory.moves.find(m=>m.moveId===authority.scope.moveId);assert(move);assert.deepEqual(move.sourceSpan,erratum.before);
 const before=authority.scope.sourceReplacement.before,after=authority.scope.sourceReplacement.after;assert.equal(move.sourceSpan.excerpt.split(` ${before} `).length,2);move.sourceSpan.excerpt=move.sourceSpan.excerpt.replace(` ${before} `,` ${after} `);assert.deepEqual(move.sourceSpan,erratum.after);assert.deepEqual(packet.move.sourceSpan,move.sourceSpan);
 assert.deepEqual(packet.blinding,{priorJudgmentsUnavailable:true,priorProseUnavailable:true,totalsUnavailable:true,tagsUnavailable:true,otherReviewUnavailable:true});
 const next=structuredClone(judgments),contexts=[];
 for(const [key,pass] of [['passA','pass-a'],['passB','pass-b']]){
  const intent=read(`${folder}/${pass}/execution-intent.json`),dispatch=read(`${folder}/${pass}/dispatch.json`),output=read(intent.output);validateClarityOutput(packet,output);
  assert.equal(intent.status,'frozen-before-execution');assert.equal(intent.attemptsAllowed,1);assert.equal(intent.output,`${folder}/${pass}/output.json`);assert.equal(intent.packet.path,`${folder}/packet.json`);assert.equal(intent.authorization.path,`${folder}/authorization.json`);assert.equal(intent.sourceErratum.path,`${folder}/source-erratum.json`);for(const k of ['packet','prompt','authorization','sourceErratum'])check(intent[k]);
  for(const obj of [intent,dispatch]){assert.equal(obj.modelSlug,'gpt-5.6-sol');assert.equal(obj.reasoningEffort,'low');assert.equal(obj.forkTurns,'none');assert.equal(obj.authentication,'ChatGPT subscription');assert.equal(obj.directIncrementalCostUsd,0);}assert.equal(dispatch.attempts,1);assert(dispatch.agentId);assert(!judgments.execution.passes.some(p=>p.agentId===dispatch.agentId));
  next[key].judgments.find(m=>m.moveId===move.moveId).dimensions[output.dimension]={value:output.value,rationale:output.rationale};contexts.push({pass,...dispatch,intent,output});
 }
 assert.notEqual(contexts[0].agentId,contexts[1].agentId);
 const disagreements=extractMultiSpeakerDisagreements({inventory,...next}),old=extractMultiSpeakerDisagreements({...source,...judgments});
 // Existing decisions can be carried forward only when the complete extracted
 // dispute population and anonymous options remain byte-equivalent. Otherwise
 // stop for a fresh, separately authenticated disputes-only stage.
 assert.deepEqual(disagreements,old,'A changed dispute requires its own authenticated adjudication before proceeding');
 return {authority,erratum,packet,inventory,passA:next.passA,passB:next.passB,disagreements,contexts};
}
export function validateClarityExecution(run,amendment,inputs){
 const {read,check}=run,execution=read(amendment.execution.path);assert.equal(execution.status,'authenticated-two-fresh-clarity-only-reviews');assert.deepEqual(execution.authorization,amendment.authorization);assert.deepEqual(execution.sourceErratum,amendment.erratum);assert.equal(execution.packet.path,`${amendment.folder}/packet.json`);check(execution.packet);assert.equal(execution.disputesChanged,0);assert.equal(execution.newAdjudicationRequired,false);assert.equal(execution.otherJudgmentChanges,0);assert.equal(execution.burdenChanges,0);assert.equal(execution.directIncrementalCostUsd,0);assert.equal(execution.contexts.length,2);
 for(const [i,context] of execution.contexts.entries()){
  const source=inputs.contexts[i];for(const key of ['pass','agentId','modelSlug','reasoningEffort','forkTurns','attempts','authentication','directIncrementalCostUsd'])assert.equal(context[key],source[key]);
  for(const key of ['intent','dispatch','packet','prompt','output'])check(context[key]);assert.equal(context.intent.path,`${amendment.folder}/${source.pass}/execution-intent.json`);assert.equal(context.dispatch.path,`${amendment.folder}/${source.pass}/dispatch.json`);assert.deepEqual(context.packet,source.intent.packet);assert.deepEqual(context.prompt,source.intent.prompt);assert.equal(context.output.path,source.intent.output);assert.deepEqual(read(context.output.path),source.output);
 }
 assert.deepEqual(amendment.scope,inputs.authority.scope);assert.deepEqual(amendment.originalScoreAttestation,inputs.authority.originalScoreAttestation);
}
export function correctedClarityLedger(source,priorResolved,inputs,locks){
 const {inventoryAudit,packet,transcriptLock,eventsLock}=source;
 // Reuse the frozen assembler against the audited original inventory, then
 // attach the explicitly confirmed source erratum. The inventory hash remains
 // a BASE-source lock, never a claim that corrected bytes have that hash.
 const ledger=assembleMultiSpeakerFinalLedger({inventory:source.inventory,inventorySha256:packet.inventory.sha256,inventoryAudit,inventoryAuditSha256:sha256(canonicalJson(inventoryAudit)),expectedTranscriptSha256:transcriptLock.sha256,expectedEventsSha256:eventsLock.sha256,passA:inputs.passA,passB:inputs.passB,passASha256:sha256(canonicalJson(inputs.passA)),passBSha256:sha256(canonicalJson(inputs.passB)),disagreements:inputs.disagreements,disagreementsSha256:sha256(canonicalJson(inputs.disagreements)),adjudication:priorResolved.adjudication,adjudicationSha256:sha256(canonicalJson(priorResolved.adjudication)),audio:priorResolved.audio,audioSha256:sha256(canonicalJson(priorResolved.audio))});
 ledger.moves.find(m=>m.moveId===inputs.authority.scope.moveId).sourceSpan=structuredClone(inputs.erratum.after);
 ledger.evidenceLocks.clarityCorrection=locks;
 ledger.audit.readyForSingleScorePass=false;ledger.audit.readyForAuthorizedReplacementScorePass=true;ledger.audit.originalResultPreserved=true;
 return ledger;
}
export function annotateReplacementScore(raw){return {...raw,status:'authorized-exceptional-replacement-score-pass-complete',audit:{...raw.audit,scorePassOrdinal:2,originalScorePassRetained:true,exceptionalReplacementOrdinal:1}};}
export function validateClarityScore(run,folder,finalLedger,source,judgments){
 const att=run.read(`${folder}/score-pass/attestation.json`);assert.equal(att.status,'authorized-exceptional-replacement-score-pass-complete');assert.equal(att.scorePassOrdinal,2);assert.equal(att.exceptionalReplacementOrdinal,1);assert.equal(att.manualScoreOverrides,0);assert.equal(att.modelAuthoredTotals,0);
 for(const k of ['inputManifest','input','output','rawCalculatorOutput','originalAttestation','authorization'])run.check(att[k]);att.controls.forEach(run.check);
 const im=run.read(att.inputManifest.path);assert.equal(im.status,'frozen-before-authorized-exceptional-replacement');assert.equal(im.scorePassOrdinal,2);assert.deepEqual(im.input,att.input);assert.deepEqual(im.controls,att.controls);assert.deepEqual(im.originalAttestation,att.originalAttestation);assert.deepEqual(im.authorization,att.authorization);assert.equal(att.input.path,`${folder}/final-ledger.json`);
 assert.deepEqual(run.read(att.input.path),finalLedger);const raw=run.read(att.rawCalculatorOutput.path);assert.deepEqual(raw,deriveMultiSpeakerScores(finalLedger));const scores=run.read(att.output.path);assert.deepEqual(scores,annotateReplacementScore(raw));
 const stability=validateMultiSpeakerScoreStability({...source,...judgments,finalScores:scores}),uncertainty=deriveMultiSpeakerScoreUncertainty({...source,...judgments,finalScores:scores}),sensitivity=analyzeMultiSpeakerFormatSensitivity({finalLedger,finalScores:scores});assert.equal(stability.passed,true);assert.equal(sensitivity.formatSensitive,false,'Changed format sensitivity requires review');
 const diagnostics=buildMultiSpeakerPublicationDiagnostics({finalLedger,finalScores:scores,uncertainty,sensitivity});for(const [name,value]of Object.entries({stability,uncertainty,sensitivity,diagnostics}))assert.deepEqual(run.read(`${folder}/score-pass/${name}.json`),value);
 return {scores,stability,uncertainty,sensitivity,diagnostics,scorePasses:2};
}
