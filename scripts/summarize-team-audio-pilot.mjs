import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileRecord} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
const root='docs/assessment-production/standalone-debates-v1/debate-254';
const plan=JSON.parse(readFileSync(`${root}/audio/clip-plan-1.json`));
const outputs=['m13','m15','m16'].map(moveId=>{
  const record=fileRecord(`output/transcribe/team254-attribution-1/pilot-repaired/${moveId}.transcript.json`);
  const result=JSON.parse(readFileSync(record.path));
  assert(result.usage.type==='tokens');
  const estimatedBilledUsd=(result.usage.input_tokens*2.5+result.usage.output_tokens*10)/1e6;
  return {moveId,record,durationSeconds:result.duration,usage:result.usage,estimatedBilledUsd,speakers:[...new Set(result.segments.map(s=>s.speaker))]};
});
const pilotUsd=outputs.reduce((s,x)=>s+x.estimatedBilledUsd,0);
const pilotSeconds=outputs.reduce((s,x)=>s+x.durationSeconds,0);
const fullClipSeconds=plan.clips.reduce((s,x)=>s+x.durationSeconds,0);
const projectedTotalUsd=pilotUsd/pilotSeconds*fullClipSeconds;
const summary={status:'paused-before-further-paid-calls',outputs,cost:{basis:'Reported token usage multiplied by official model rates; not an account invoice.',pricingSource:plan.cost.pricingSource,inputUsdPerMillion:2.5,outputUsdPerMillion:10,knownSuccessfulCallEstimatedUsd:pilotUsd,failedRequestUsageReported:false,initialEstimateUsd:plan.cost.estimatedUsd,projectedTotalUsd,authorizedMaximumUsd:1,proposedNewCumulativeMaximumUsd:2,requiresFurtherAuthorization:projectedTotalUsd>1},evidenceStatus:{allSelectedMovesVerified:false,confirmedMoves:0,sourceAttributionAuditPending:true,notes:'Diarized pilot responses identify multiple speakers and cross-talk. These preserved raw responses are evidence for later review, not a completed speaker or quotation verification audit.'},nextStep:'Obtain authorization before any more paid calls because pilot-based projected total exceeds the existing cap. Complete independent inventory correction and re-audit without paid calls.'};
writeFileSync(`${root}/audio/pilot-summary-1.json`,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary.cost,null,2));
