import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='docs/assessment-production/standalone-debates-v1/debate-254';
const inventoryPath=`${root}/inventory/candidate-1.json`;
const source='/tmp/slugfester-team-gcszn-audio.webm';
const out='output/transcribe/team254-attribution-1';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const inventory=JSON.parse(readFileSync(inventoryPath));
assert.equal(hash(inventoryPath),'53e2902b47bf8775f763b4aae8515fb542f3f66f463e04d7cc9c1d58e76a7fa4');
assert(!existsSync(`${root}/audio/clip-plan-1.json`),'Existing plan must be preserved');
mkdirSync(out,{recursive:true});mkdirSync(`${root}/audio`,{recursive:true});
const refs=[['Matt Dillahunty',64,73],['Joshua Bowen',82,94],['Stuart Knechtle',116,128],['Cliffe Knechtle',183.68,195.68]];
function clip(id,start,end){
  const path=`${out}/${id}.wav`;
  assert(!existsSync(path),'Refusing to overwrite audio evidence');
  const result=spawnSync('ffmpeg',['-nostdin','-v','error','-n','-ss',String(start),'-i',source,'-t',String(end-start),'-vn','-ac','1','-ar','16000',path],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  return {path,sha256:hash(path),startSeconds:start,endSeconds:end,durationSeconds:end-start};
}
const references=refs.map(([speaker,start,end],i)=>({speaker,...clip(`reference-${i+1}`,start,end),basis:'Explicit introduction and uninterrupted first reply; Stuart identifies the other member as having spoken on campuses for forty years. Reference identities are source-based, not inferred from the later disputed clips.'}));
const clips=inventory.moves.map(m=>({moveId:m.moveId,expectedSpeaker:m.speaker,...clip(m.moveId,Math.max(0,m.sourceSpan.startMs/1000-5),m.sourceSpan.endMs/1000+5)}));
const minutes=(clips.reduce((s,c)=>s+c.durationSeconds,0)+clips.length*references.reduce((s,r)=>s+r.durationSeconds,0))/60;
const estimate=minutes*0.006;
assert(estimate<0.8,'Leave headroom below authorized $1 cap');
writeFileSync(`${root}/audio/clip-plan-1.json`,JSON.stringify({status:'prepared-not-yet-transcribed-or-verified',inventory:{path:inventoryPath,sha256:hash(inventoryPath)},source:{path:source,sha256:hash(source)},model:'gpt-4o-transcribe-diarize',references,clips,cost:{estimatedMinutesIncludingRepeatedReferences:minutes,estimatedUsd:estimate,maximumCumulativeUsd:1,rateBasis:'Estimated $0.006/minute; actual token billing may vary. Published model token rates $2.50 input/$10 output per million.',pricingSource:'https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize'},verification:'Speaker labels must be compared with the proposed source spans; a response alone is not an assertion that attribution or cross-talk has been resolved.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({clips:clips.length,estimatedUsd:estimate,outputDirectory:out}));
