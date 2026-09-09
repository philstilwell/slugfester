import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fileRecord} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');
const run=openTeamRun(args[1]),source=validateTeamSourceStage(run);validateTeamJudgmentStage(run,source);
const review=run.read(run.local('audio/controller-review-1.json')),plan=run.read(run.local('audio/continuation-plan-1.json'));
assert.equal(review.status,'completed-source-comparison-with-material-attribution-findings');
const findings=review.reviewed.filter(x=>x.result==='material-attribution-finding');assert(findings.length>0);
const raw=source.inventory.moves.map(m=>{const clip=plan.clips.find(c=>c.moveId===m.moveId);const lock=fileRecord(run.local(`audio/${clip.reuse?'raw-pilot-1':'raw-continuation-1'}/${m.moveId}.json`));return {moveId:m.moveId,...lock};});
let estimatedSuccessfulCallTotalUsd=0;
for(const lock of raw){const out=run.read(lock.path);assert.equal(out.usage.type,'tokens');estimatedSuccessfulCallTotalUsd+=(out.usage.input_tokens*plan.cost.inputUsdPerMillion+out.usage.output_tokens*plan.cost.outputUsdPerMillion)/1e6;}
const stop={status:'blocked-before-final-audio-gate',at:new Date().toISOString(),debateNumber:run.record.debateNumber,debateId:run.record.debateId,reason:'Audio exposes material mixed-speaker source spans and affected primary judgments. The bounded inventory correction allowance is exhausted; additional authorization is required.',
  inventory:source.packet.inventory,inventoryAudit:source.packet.inventoryAudit,authorization:fileRecord(run.local('recovery-authorization-2.json')),review:fileRecord(run.local('audio/controller-review-1.json')),primaryExecution:fileRecord(run.local('judgments/execution.json')),rawAudioResponses:raw,
  reviewedMoves:review.reviewed.length,supportedMoves:review.reviewed.filter(x=>x.result==='supported').length,findings,
  cost:{estimatedSuccessfulCallTotalUsd,basis:'Returned token usage, not an account invoice',priorRejectedRequestUsageReported:false,priorRejectedRequestReserveUsd:plan.cost.priorRejectedRequestReserveUsd,authorizedCumulativeMaximumUsd:plan.cost.cumulativeMaximumUsd},
  finalAudioAuditPassed:false,adjudicatorDispatched:false,finalLedgerAssembled:false,officialScorePasses:0,published:false,
  proposedRecovery:'One ownership-focused correction and independent re-audit for the identified moves; fresh isolated affected judgment replacements and only genuinely dependent burden fields, preserving all unaffected judgments and original evidence. No additional paid audio is expected.'};
const target=run.local('audio/stop-1.json');writeFileSync(target,JSON.stringify(stop,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output:fileRecord(target),supportedMoves:stop.supportedMoves,findings:findings.map(x=>x.moveId),estimatedSuccessfulCallTotalUsd}));
