import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileRecord,canonicalJson,sha256,validateMultiSpeakerInventoryAudit,validateMultiSpeakerPrimaryJudgment,validateMultiSpeakerAdjudication,validateMultiSpeakerAudioVerification,extractMultiSpeakerDisagreements,assembleMultiSpeakerFinalLedger,deriveMultiSpeakerScores,deriveMultiSpeakerScoreUncertainty,analyzeMultiSpeakerFormatSensitivity,buildMultiSpeakerPublicationDiagnostics,validateMultiSpeakerScoreStability,MULTI_SPEAKER_RUBRIC} from './assessment-production-multi-speaker-approximation-v1.mjs';
import {validateStandaloneTeamInventory,validateTeamSelection,TEAM_PROFILE} from './assessment-standalone-team-debate-v1.mjs';
import {validateTeamCandidate} from './assessment-standalone-team-publication-v1.mjs';
import {validateOwnershipSource,validateOwnershipJudgmentMerge} from './assessment-team-ownership-recovery-v1.mjs';
import {validateTeamProseProvenance,validateTeamTagProvenance,validateTeamEditorialAndRendering} from './assessment-team-publication-audit-v1.mjs';
import {clarityInputs,correctedClarityLedger,validateClarityScore,validateClarityExecution} from './assessment-team-clarity-correction-v1.mjs';
export const TEAM_ADAPTER_VERSION='1.0-standalone-team-site-ledger-adapter';
export function openTeamRun(number,root=process.cwd()){
  const resolve=relative=>{assert(!path.isAbsolute(relative)&&!relative.split('/').includes('..'));return path.join(root,relative);};
  const read=relative=>JSON.parse(readFileSync(resolve(relative),'utf8'));
  const registry=read('docs/assessment-production/standalone-debates-v1/registry.json');
  const record=registry.debates.find(r=>r.debateNumber===number);
  assert(record?.validationProfile===TEAM_PROFILE);assert.equal(record.root,`docs/assessment-production/standalone-debates-v1/debate-${number}`);
  const check=lock=>{const actual=fileRecord(resolve(lock.path));assert.equal(actual.sha256,lock.sha256,`changed bytes ${lock.path}`);if(lock.bytes!==undefined)assert.equal(actual.bytes,lock.bytes);};
  const baseLocal=suffix=>`${record.root}/${suffix}`;
  let revision=null;
  if(record.assessmentRevision){check(record.assessmentRevision);revision=read(record.assessmentRevision.path);assert.equal(revision.debateId,record.debateId);assert.equal(revision.status,'frozen-authorized-ownership-revision');
    const allowed=['judgments/judgment-packet.json','judgments/execution.json','judgments/pass-a/output.json','judgments/pass-b/output.json','disagreements/disagreements.json','audio/audio-verification.json'];
    assert.deepEqual(Object.keys(revision.pathOverrides).sort(),allowed.sort());
    for(const target of Object.values(revision.pathOverrides)){assert(target.startsWith(`${record.root}/recovery/`));resolve(target);}
  }
  const historicalLocal=suffix=>revision?.pathOverrides[suffix]??baseLocal(suffix);
  let correction=null;
  if(record.clarityCorrection){check(record.clarityCorrection);correction=read(record.clarityCorrection.path);assert.equal(correction.status,'activated-authorized-clarity-and-publication-correction');assert.equal(correction.debateId,record.debateId);assert(correction.folder.startsWith(`${record.root}/recovery/`));check(correction.assessmentAmendment);check(correction.proseExecution);}
  const local=suffix=>{
    if(correction){if(suffix==='final-ledger/final-ledger.json')return `${correction.folder}/final-ledger.json`;if(suffix.startsWith('score-pass/')||suffix==='publication/prose-output.json'||suffix==='publication/prose-execution.json'||suffix.startsWith('publication/rhetorical-tags'))return `${correction.folder}/${suffix}`;}
    return historicalLocal(suffix);
  };
  return {record,registry,resolve,read,check,local,baseLocal,revision,historicalLocal,correction};
}
export function historicalTeamRun(run){return {...run,correction:null,local:run.historicalLocal,record:{...run.record,clarityCorrection:undefined}};}
export function validateTeamSourceStage(run,options={}){
 const prior=validateOriginalTeamSourceStage(historicalTeamRun(run),options);if(!run.correction)return prior;
 const old=historicalTeamRun(run),judgments=validateOriginalTeamJudgmentStage(old,prior),inputs=clarityInputs(old,run.correction.folder,prior,judgments),am=run.read(run.correction.assessmentAmendment.path);
 for(const key of ['authorization','erratum','execution','correctedInventory','passA','passB','disagreements','finalLedger','scoreAttestation','originalScoreAttestation'])run.check(am[key]);assert.equal(am.status,'authenticated-and-scored-authorized-clarity-correction');assert.equal(am.folder,run.correction.folder);assert.deepEqual(run.read(am.correctedInventory.path),inputs.inventory);
 validateClarityExecution(run,am,inputs);assert.deepEqual(run.read(am.disagreements.path),inputs.disagreements);
 return {...prior,inventory:inputs.inventory,sourceCorrection:{prior,inputs,amendment:am}};
}
function validateOriginalTeamSourceStage(run,{repositoryOnly=false}={}){
  const {record,read,check,local}=run;
  const manifest=read(local('manifest.json')),authorization=read(local('authorization.json'));
  assert.equal(manifest.identity.debateId,record.debateId);assert.deepEqual(manifest.identity,authorization.identity);
  check(manifest.authorization);manifest.controls.forEach(check);
  for(const source of manifest.source){if(!repositoryOnly)check(source);}
  const packet=read(run.baseLocal('judgments/judgment-packet.json'));
  check(packet.inventory);check(packet.inventoryAudit);check(packet.sourceManifest);check(packet.exceptionAuthorization);
  const inventory=read(packet.inventory.path),inventoryAudit=read(packet.inventoryAudit.path);
  assert.equal(inventory.motion,authorization.identity.motion);
  const inventoryValidation=repositoryOnly?validateTeamSelection(inventory,authorization):validateStandaloneTeamInventory(inventory,read(`.assessment-cache/captions/${record.videoId}/events.json`),authorization);
  const transcriptLock=manifest.source.find(x=>x.path.endsWith('/transcript.txt')),eventsLock=manifest.source.find(x=>x.path.endsWith('/events.json'));
  validateMultiSpeakerInventoryAudit(inventoryAudit,inventory,{expectedInventorySha256:packet.inventory.sha256,expectedTranscriptSha256:transcriptLock.sha256,expectedEventsSha256:eventsLock.sha256});
  const exception=read(packet.exceptionAuthorization.path);
  assert.equal(exception.debateId,record.debateId);assert.equal(exception.inventoryRepair.additionalAttempts,1);
  assert.equal(inventoryAudit.exceptionAuthorization.sha256,packet.exceptionAuthorization.sha256);
  assert(inventoryAudit.priorAuditHistory.length>=2,'Exception must preserve the earlier failed cycle');
  inventoryAudit.priorAuditHistory.forEach(check);
  const prior={manifest,authorization,packet,inventory,inventoryAudit,inventoryValidation,transcriptLock,eventsLock};
  return run.revision?validateOwnershipSource(run,prior,{repositoryOnly}):prior;
}
export function validateTeamJudgmentStage(run,source){
 if(!run.correction)return validateOriginalTeamJudgmentStage(run,source);
 const prior=validateOriginalTeamJudgmentStage(historicalTeamRun(run),source.sourceCorrection.prior),{inputs,amendment}=source.sourceCorrection;
 assert.deepEqual(run.read(amendment.passA.path),inputs.passA);assert.deepEqual(run.read(amendment.passB.path),inputs.passB);
 return {...prior,passA:inputs.passA,passB:inputs.passB,clarityPrior:prior};
}
function validateOriginalTeamJudgmentStage(run,source){
  const {local,read,check}=run;
  const execution=read(local('judgments/execution.json'));
  assert.equal(execution.status,'completed-and-authenticated');assert.equal(execution.modelSlug,'gpt-5.6-sol');assert.equal(execution.reasoningEffort,'low');
  assert.equal(execution.authentication,'ChatGPT subscription');assert.equal(execution.directIncrementalCostUsd,0);
  assert.equal(execution.passes.length,2);assert.equal(new Set(execution.passes.map(p=>p.agentId)).size,2);
  const judgments={};
  for(const pass of ['pass-a','pass-b']){
    const meta=execution.passes.find(p=>p.pass===pass);assert(meta?.agentId&&meta.forkTurns==='none');assert.equal(meta.attempts,1);
    assert.deepEqual(meta.packet,source.packetRecord??{path:local('judgments/judgment-packet.json'),...Object.fromEntries(Object.entries(fileRecord(run.resolve(local('judgments/judgment-packet.json')))).filter(([k])=>k!=='path'))});
    check(meta.packet);check(meta.output);const output=read(meta.output.path);
    validateMultiSpeakerPrimaryJudgment(output,source.inventory,{expectedPass:pass,expectedInventorySha256:source.packet.inventory.sha256,expectedInventoryAuditSha256:source.packet.inventoryAudit.canonicalSha256});
    if(source.ownershipRecovery)validateOwnershipJudgmentMerge(run,source,execution,meta,output);
    judgments[pass==='pass-a'?'passA':'passB']=output;
  }
  return {...judgments,execution};
}
export function validateTeamAdjudicationExecution(run,judgments){
  const {read,local,check}=run;
  const execution=read(local('adjudication/execution.json'));
  assert.equal(execution.status,'completed-and-authenticated');assert.equal(execution.modelSlug,'gpt-5.6-sol');assert.equal(execution.reasoningEffort,'low');
  assert.equal(execution.authentication,'ChatGPT subscription');assert.equal(execution.directIncrementalCostUsd,0);
  assert.equal(execution.forkTurns,'none');assert.equal(execution.attempts,1);assert(execution.agentId);
  const excludedAgents=new Set(judgments.execution.passes.map(p=>p.agentId));
  for(const pass of read(run.baseLocal('judgments/execution.json')).passes)excludedAgents.add(pass.agentId);
  if(run.revision){const currentPacket=read(local('judgments/judgment-packet.json'));check(currentPacket.recoveryExecution);const recovery=read(currentPacket.recoveryExecution.path);excludedAgents.add(recovery.source.agentId);excludedAgents.add(recovery.audit.agentId);}
  assert(!excludedAgents.has(execution.agentId),'Adjudicator must be a fresh independent reviewer');
  for(const key of ['intent','dispatch','packet','prompt','output','audio'])check(execution[key]);
  const dispatch=read(execution.dispatch.path);for(const key of ['agentId','modelSlug','reasoningEffort','forkTurns','attempts','authentication','directIncrementalCostUsd'])assert.equal(execution[key],dispatch[key]);
  const intent=read(execution.intent.path);
  assert.equal(intent.status,'frozen-before-execution');assert.equal(intent.attemptsAllowed,1);
  for(const key of ['packet','prompt','audio'])assert.deepEqual(execution[key],intent[key]);
  assert.equal(execution.output.path,intent.output);assert.equal(execution.audio.path,local('audio/audio-verification.json'));
  const packet=read(execution.packet.path),disagreements=read(local('disagreements/disagreements.json'));
  assert.equal(packet.status,'frozen-anonymous-disputes-only');assert.deepEqual(packet.disputes,disagreements.disputes);
  assert.equal(packet.audioAuditSha256,execution.audio.sha256);
  return execution;
}
export function validateTeamResolvedStage(run,source,judgments){
 if(!run.correction)return validateOriginalTeamResolvedStage(run,source,judgments);
 const prior=validateOriginalTeamResolvedStage(historicalTeamRun(run),source.sourceCorrection.prior,judgments.clarityPrior),{inputs,amendment}=source.sourceCorrection;
 const locks=Object.fromEntries(['authorization','erratum','execution','correctedInventory'].map(k=>[k,amendment[k]]));
 const expected=correctedClarityLedger(source.sourceCorrection.prior,prior,inputs,locks),stored=run.read(amendment.finalLedger.path);assert.deepEqual(stored,expected);
 return {...prior,finalLedger:stored,clarityPrior:prior};
}
function validateOriginalTeamResolvedStage(run,source,judgments){
  const {read,local}=run,{inventory,inventoryAudit,packet,transcriptLock,eventsLock}=source,{passA,passB}=judgments;
  const disagreements=read(local('disagreements/disagreements.json'));
  assert.deepEqual(disagreements,extractMultiSpeakerDisagreements({inventory,passA,passB}));
  const adjudication=read(local('adjudication/output.json')),audio=read(local('audio/audio-verification.json'));
  validateTeamAdjudicationExecution(run,judgments);
  validateMultiSpeakerAdjudication(adjudication,disagreements);validateMultiSpeakerAudioVerification(audio,inventory,{expectedInventorySha256:packet.inventory.sha256});
  assert(audio.method&&audio.inputRecords?.length===inventory.moves.length);audio.inputRecords.forEach(run.check);
  const args={inventory,inventorySha256:packet.inventory.sha256,inventoryAudit,inventoryAuditSha256:sha256(canonicalJson(inventoryAudit)),expectedTranscriptSha256:transcriptLock.sha256,expectedEventsSha256:eventsLock.sha256,passA,passASha256:sha256(canonicalJson(passA)),passB,passBSha256:sha256(canonicalJson(passB)),disagreements,disagreementsSha256:sha256(canonicalJson(disagreements)),adjudication,adjudicationSha256:sha256(canonicalJson(adjudication)),audio,audioSha256:sha256(canonicalJson(audio))};
  const expected=assembleMultiSpeakerFinalLedger(args),stored=read(local('final-ledger/final-ledger.json'));
  assert.deepEqual(stored,expected,'Resolved ledger differs from its authenticated inputs');
  return {finalLedger:stored,audio,adjudication,disagreements};
}
export function validateTeamScoreStage(run,source,judgments,resolved){
 if(!run.correction)return {...validateOriginalTeamScoreStage(run,source,judgments,resolved),scorePasses:1};
 validateOriginalTeamScoreStage(historicalTeamRun(run),source.sourceCorrection.prior,judgments.clarityPrior,resolved.clarityPrior);
 return validateClarityScore(run,run.correction.folder,resolved.finalLedger,source,judgments);
}
function validateOriginalTeamScoreStage(run,source,judgments,resolved){
  const {read,local,check}=run;
  const attestation=read(local('score-pass/attestation.json'));
  assert.equal(attestation.status,'single-score-pass-complete');check(attestation.inputManifest);
  const inputManifest=read(attestation.inputManifest.path);assert.equal(inputManifest.status,'frozen-before-single-score-pass');assert.equal(inputManifest.scorePassOrdinal,1);assert.deepEqual(inputManifest.input,attestation.input);assert.deepEqual(inputManifest.controls,attestation.controls);
  assert.equal(attestation.scorePassOrdinal,1);assert.equal(attestation.manualScoreOverrides,0);assert.equal(attestation.modelAuthoredTotals,0);
  check(attestation.input);check(attestation.output);attestation.controls.forEach(check);
  assert.equal(attestation.input.path,local('final-ledger/final-ledger.json'));
  const scores=read(attestation.output.path);assert.deepEqual(scores,deriveMultiSpeakerScores(resolved.finalLedger));
  const stability=validateMultiSpeakerScoreStability({...source,...judgments,finalScores:scores});
  assert.deepEqual(read(local('score-pass/stability.json')),stability);
  const uncertainty=deriveMultiSpeakerScoreUncertainty({...source,...judgments,finalScores:scores});
  const sensitivity=analyzeMultiSpeakerFormatSensitivity({finalLedger:resolved.finalLedger,finalScores:scores});
  const diagnostics=buildMultiSpeakerPublicationDiagnostics({finalLedger:resolved.finalLedger,finalScores:scores,uncertainty,sensitivity});
  assert.deepEqual(read(local('score-pass/uncertainty.json')),uncertainty);assert.deepEqual(read(local('score-pass/sensitivity.json')),sensitivity);assert.deepEqual(read(local('score-pass/diagnostics.json')),diagnostics);
  if(sensitivity.formatSensitive)assert.equal(read(local('score-pass/sensitivity-review.json')).approvedForPublication,true,'Sensitive result requires review, never rescore');
  return {scores,stability,uncertainty,sensitivity,diagnostics};
}
export function validateTeamSiteLedgerAdapter({adapter,candidate,root=process.cwd(),repositoryOnly=true}){
  assert.equal(adapter.schemaVersion,TEAM_ADAPTER_VERSION);assert.equal(adapter.rubric,MULTI_SPEAKER_RUBRIC);assert.equal(adapter.model,'5.6 Sol');assert.equal(adapter.standalonePostCampaign,true);assert.equal(adapter.campaignBatch,null);
  const run=openTeamRun(candidate.number,root);assert.equal(run.record.debateId,candidate.id);
  assert.equal(adapter.debateNumber,run.record.debateNumber);assert.equal(adapter.debateId,run.record.debateId);assert.equal(adapter.audit.scorePasses,run.correction?2:1);assert.equal(adapter.audit.manualScoreOverrides,0);assert.equal(adapter.audit.modelAuthoredTotals,0);
  const expectedPaths=teamPublicationEvidencePaths(run);assert.deepEqual(Object.keys(adapter.evidenceLocks),Object.keys(expectedPaths));
  for(const [key,p] of Object.entries(expectedPaths))assert.equal(adapter.evidenceLocks[key].path,p);
  Object.values(adapter.evidenceLocks).forEach(run.check);
  const source=validateTeamSourceStage(run,{repositoryOnly}),judgments=validateTeamJudgmentStage(run,source),resolved=validateTeamResolvedStage(run,source,judgments),score=validateTeamScoreStage(run,source,judgments,resolved);
  assert.deepEqual(adapter.calculated,score.scores);
  const mapping=validateTeamCandidate(candidate,source.inventory,score.scores,score.diagnostics);
  assert(candidate.logicalExtension?.pro&&candidate.logicalExtension?.con);
  const prose=validateTeamProseProvenance(run);
  const tags=validateTeamTagProvenance(run,source,prose);
  assert.deepEqual(tags.publication.candidate,candidate);
  validateTeamEditorialAndRendering(run,candidate);
  const expected=run.read(run.local('publication/output.json')).candidate;assert.deepEqual(candidate,expected);
  return {status:'passed',debateNumber:candidate.number,mappedMoves:mapping.mappedMoves,repositoryScoreReplayPassed:true};
}
export function teamPublicationEvidencePaths(run){
  const paths=Object.fromEntries([
    ['authorization','authorization.json'],['manifest','manifest.json'],['judgmentPacket','judgments/judgment-packet.json'],['judgmentExecution','judgments/execution.json'],
    ['resolvedLedger','final-ledger/final-ledger.json'],['audio','audio/audio-verification.json'],['adjudicationExecution','adjudication/execution.json'],
    ['scoreAttestation','score-pass/attestation.json'],['scoreOutput','score-pass/output.json'],['proseExecution','publication/prose-execution.json'],
    ['tagExecution','publication/rhetorical-tags/execution.json'],['tagAudit','publication/rhetorical-tags/audit.json'],['publication','publication/output.json'],
    ['editorial','publication/editorial-audit.json'],['contentParity','publication/content-parity-audit.json'],['rendering','rendering/audit.json']
  ].map(([key,p])=>[key,run.local(p)]));
  if(run.correction){paths.clarityCorrection=run.record.clarityCorrection.path;paths.originalScoreAttestation=run.historicalLocal('score-pass/attestation.json');}
  return paths;
}
// Explicit pre-rendering check only. Normal publication always uses the complete
// adapter path above, including immutable rendering evidence and registry locks.
export function validateTeamStagingCandidate(candidate,root=process.cwd()){
  const run=openTeamRun(candidate.number,root);assert.notEqual(run.record.status,'published-and-frozen');assert(!run.record.publicationHold);
  const source=validateTeamSourceStage(run,{repositoryOnly:true}),judgments=validateTeamJudgmentStage(run,source),resolved=validateTeamResolvedStage(run,source,judgments),score=validateTeamScoreStage(run,source,judgments,resolved);
  const prose=validateTeamProseProvenance(run),tags=validateTeamTagProvenance(run,source,prose);
  assert.deepEqual(candidate,tags.publication.candidate);
  const mapping=validateTeamCandidate(candidate,source.inventory,score.scores,score.diagnostics);
  return {status:'passed-staging-candidate-only',publicationReady:false,mappedMoves:mapping.mappedMoves};
}
