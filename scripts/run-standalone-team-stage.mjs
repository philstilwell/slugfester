import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileRecord,canonicalJson,sha256,validateMultiSpeakerPrimaryJudgment,extractMultiSpeakerDisagreements,assembleMultiSpeakerFinalLedger,validateMultiSpeakerAdjudication,validateMultiSpeakerAudioVerification,deriveMultiSpeakerScores,deriveMultiSpeakerScoreUncertainty,analyzeMultiSpeakerFormatSensitivity,buildMultiSpeakerPublicationDiagnostics,validateMultiSpeakerScoreStability} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage,validateTeamAdjudicationExecution,validateTeamResolvedStage,validateTeamScoreStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,3);assert.equal(args[0],'--debate');
const mode=args[2];assert(['--freeze-judgments','--disagreements','--assemble-ledger','--score-once','--audit-assessment'].includes(mode));
const run=openTeamRun(args[1]),{read,local,check}=run;
const source=validateTeamSourceStage(run);
const put=(suffix,value)=>{const target=local(suffix);assert(!existsSync(target),`${target}: preserve existing artifact`);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return fileRecord(target);};
if(mode==='--freeze-judgments'){
  const intent=read(local('judgments/execution-intent.json')),dispatch=read(local('judgments/dispatch.json'));
  const passes=intent.passes.map(p=>{
    check(p.packet);check(p.prompt);const d=dispatch.passes.find(x=>x.pass===p.pass);assert(d&&d.attempts===1);
    const output=read(p.output);validateMultiSpeakerPrimaryJudgment(output,source.inventory,{expectedPass:p.pass,expectedInventorySha256:source.packet.inventory.sha256,expectedInventoryAuditSha256:source.packet.inventoryAudit.canonicalSha256});
    return {...d,forkTurns:'none',packet:p.packet,prompt:p.prompt,output:fileRecord(p.output)};
  });
  put('judgments/execution.json',{status:'completed-and-authenticated',completedAt:new Date().toISOString(),modelSlug:intent.modelSlug,modelLabel:intent.modelLabel,reasoningEffort:intent.reasoningEffort,authentication:intent.authentication,isolation:intent.isolation,directIncrementalCostUsd:0,intent:fileRecord(local('judgments/execution-intent.json')),dispatch:fileRecord(local('judgments/dispatch.json')),passes});
  console.log('Both independent judgments validated and authenticated.');process.exit(0);
}
const judgments=validateTeamJudgmentStage(run,source);
if(mode==='--disagreements'){
  const disagreements=extractMultiSpeakerDisagreements({...source,...judgments});
  put('disagreements/disagreements.json',disagreements);
  console.log(JSON.stringify({status:'disagreements-extracted',count:disagreements.disputes.length}));process.exit(0);
}
if(mode==='--assemble-ledger'){
  validateTeamAdjudicationExecution(run,judgments);
  const disagreements=read(local('disagreements/disagreements.json')),adjudication=read(local('adjudication/output.json')),audio=read(local('audio/audio-verification.json'));
  assert.deepEqual(disagreements,extractMultiSpeakerDisagreements({...source,...judgments}));
  validateMultiSpeakerAdjudication(adjudication,disagreements);validateMultiSpeakerAudioVerification(audio,source.inventory,{expectedInventorySha256:source.packet.inventory.sha256});
  const finalLedger=assembleMultiSpeakerFinalLedger({inventory:source.inventory,inventorySha256:source.packet.inventory.sha256,inventoryAudit:source.inventoryAudit,inventoryAuditSha256:sha256(canonicalJson(source.inventoryAudit)),expectedTranscriptSha256:source.transcriptLock.sha256,expectedEventsSha256:source.eventsLock.sha256,...judgments,passASha256:sha256(canonicalJson(judgments.passA)),passBSha256:sha256(canonicalJson(judgments.passB)),disagreements,disagreementsSha256:sha256(canonicalJson(disagreements)),adjudication,adjudicationSha256:sha256(canonicalJson(adjudication)),audio,audioSha256:sha256(canonicalJson(audio))});
  put('final-ledger/final-ledger.json',finalLedger);console.log('Resolved final ledger assembled without calculating scores.');process.exit(0);
}
const resolved=validateTeamResolvedStage(run,source,judgments);
if(mode==='--score-once'){
  assert(!existsSync(local('score-pass/input-manifest.json')),'A score attempt already exists: never rerun automatically');
  const controls=source.manifest.controls.filter(c=>/score|rubric|multi-speaker/.test(c.path));controls.forEach(check);
  const input=fileRecord(local('final-ledger/final-ledger.json'));
  const inputManifest=put('score-pass/input-manifest.json',{status:'frozen-before-single-score-pass',createdAt:new Date().toISOString(),input,controls,scorePassOrdinal:1,manualScoreOverrides:0,modelAuthoredTotals:0});
  const scores=deriveMultiSpeakerScores(resolved.finalLedger),output=put('score-pass/output.json',scores);
  put('score-pass/attestation.json',{status:'single-score-pass-complete',at:new Date().toISOString(),inputManifest,input,output,controls,scorePassOrdinal:1,manualScoreOverrides:0,modelAuthoredTotals:0});
  const uncertainty=deriveMultiSpeakerScoreUncertainty({...source,...judgments,finalScores:scores}),sensitivity=analyzeMultiSpeakerFormatSensitivity({finalLedger:resolved.finalLedger,finalScores:scores});
  put('score-pass/uncertainty.json',uncertainty);put('score-pass/sensitivity.json',sensitivity);put('score-pass/diagnostics.json',buildMultiSpeakerPublicationDiagnostics({finalLedger:resolved.finalLedger,finalScores:scores,uncertainty,sensitivity}));
  const stability=validateMultiSpeakerScoreStability({...source,...judgments,finalScores:scores});put('score-pass/stability.json',stability);
  console.log(JSON.stringify({status:'scored-once',overall:scores.overall,formatSensitive:sensitivity.formatSensitive,stability:stability.passed}));process.exit(0);
}
const result=validateTeamScoreStage(run,source,judgments,resolved);console.log(JSON.stringify({status:'assessment-audit-passed-publication-still-required',overall:result.scores.overall}));
