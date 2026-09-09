import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='docs/assessment-production/standalone-debates-v1/debate-254/audio';
const plan=JSON.parse(readFileSync(`${root}/clip-plan-1.json`));
const references=plan.references.map((ref,i)=>{
  if(ref.durationSeconds<=9)return ref;
  const path=`output/transcribe/team254-attribution-1/reference-${i+1}-short.wav`;
  assert(!existsSync(path));
  const r=spawnSync('ffmpeg',['-nostdin','-v','error','-n','-i',ref.path,'-t','9',path],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  return {...ref,path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),endSeconds:ref.startSeconds+9,durationSeconds:9};
});
writeFileSync(`${root}/reference-repair-1.json`,JSON.stringify({status:'reference-duration-repaired-not-attribution-verified',priorPlan:'clip-plan-1.json',failure:{status:400,code:'invalid_value',parameter:'known_speaker_references',message:'Known speaker references has duration {duration_s} seconds, but must be between 1.2 and 10.0 seconds',outputsProduced:0,reportedUsage:null},targetedChange:'Shorten only overlength reference samples to nine seconds; preserve every original clip and reference.',references,estimateDoesNotIncrease:true},null,2)+'\n',{flag:'wx'});
console.log('Reference repair prepared; all four samples at most nine seconds.');
