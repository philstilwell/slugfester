import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileRecord,validateMultiSpeakerAudioVerification,extractMultiSpeakerDisagreements} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');
const run=openTeamRun(args[1]),source=validateTeamSourceStage(run),judgments=validateTeamJudgmentStage(run,source);
const audio=run.read(run.local('audio/audio-verification.json'));
validateMultiSpeakerAudioVerification(audio,source.inventory,{expectedInventorySha256:source.packet.inventory.sha256});
audio.inputRecords.forEach(run.check);
const disagreements=run.read(run.local('disagreements/disagreements.json'));
assert.deepEqual(disagreements,extractMultiSpeakerDisagreements({...source,...judgments}));
mkdirSync(run.local('adjudication'),{recursive:true});
const put=(suffix,value)=>{const p=run.local(`adjudication/${suffix}`);writeFileSync(p,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});return fileRecord(p);};
const packet=put('packet.json',{
  status:'frozen-anonymous-disputes-only',debateNumber:run.record.debateNumber,debateId:run.record.debateId,
  instructions:'Resolve only the listed disputes by choosing an existing option-a or option-b. No new score, compromise, total or winner. Use the source evidence and rubric, assess incremental teammate contributions only. Preserve all undisputed values. No access to primary pass identities, files, other debates or publication.',
  rubric:'docs/reassessment-rubric-v2.1.md',method:'docs/assessment-multi-speaker-approximation-workflow-v1.md',
  inventory:source.inventory,inventorySha256:source.packet.inventory.sha256,
  audioVerified:true,audioAuditSha256:fileRecord(run.local('audio/audio-verification.json')).sha256,
  disputes:disagreements.disputes,
  outputContract:{schemaVersion:'1.0-multi-speaker-dispute-adjudication',protocolId:disagreements.protocolId,status:'complete-and-schema-valid',debateNumber:run.record.debateNumber,debateId:run.record.debateId,reviewerRole:'isolated-dispute-only-adjudicator',assessmentModel:'5.6 Sol',reasoningEffort:'low',isolation:{passIdentitiesUnavailable:true,calculatedTotalsUnavailable:true,winnerLabelsUnavailable:true,publicationProseUnavailable:true,otherDebatesUnavailable:true,contaminationDetected:false},resolutions:disagreements.disputes.map(d=>({disputeId:d.disputeId,selectedOption:'CHOOSE option-a OR option-b',rationale:'At least 40 characters of source-specific justification.'}))}
});
const output=run.local('adjudication/output.json');
const prompt=put('prompt.txt',`You are a fresh isolated dispute-only adjudicator. Read the entire frozen packet ${packet.path} (SHA256 ${packet.sha256}) and only its named rubric and method. Use only the embedded source evidence and anonymous options, never primary files or other debates. Write JSON matching outputContract to ${output} using apply_patch. Select exactly one existing option per dispute in packet order; no compromise, new values, totals, winner or publication prose. Treat a later teammate contribution only for its prelocked incremental content. One attempt, no retries or other workers. You may inspect only validateMultiSpeakerAdjudication in scripts/lib/assessment-production-multi-speaker-approximation-v1.mjs for structural validation, not other evidence or scoring functions. Preserve failed output and report it rather than repair. Return output hash and actual completion status.\n`);
put('execution-intent.json',{status:'frozen-before-execution',createdAt:new Date().toISOString(),modelSlug:'gpt-5.6-sol',reasoningEffort:'low',authentication:'ChatGPT subscription',directIncrementalCostUsd:0,forkTurns:'none',attemptsAllowed:1,packet,prompt,output,audio:fileRecord(run.local('audio/audio-verification.json'))});
console.log(JSON.stringify({packet,prompt,output,disputes:disagreements.disputes.length}));
