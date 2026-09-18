import fs from 'node:fs';import assert from 'node:assert/strict';
import {fileRecord} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
export function checkNarrowRepair(output,packet){
  for(const k of ['shardId','debateNumber','debateId'])assert.equal(output[k],packet[k]);
  assert.equal(fileRecord(packet.sourceEventsFile.path).sha256,packet.sourceEventsFile.sha256);
  assert.deepEqual(output.repairs.map(r=>r.moveId),packet.moves.map(m=>m.moveId));
  const e=JSON.parse(fs.readFileSync(packet.sourceEventsFile.path));const result=[];
  const span=(a,b)=>e.slice(a,b+1).map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();
  const wc=s=>s.trim().split(/\s+/).length;
  for(const [i,r]of output.repairs.entries()){
    const m=packet.moves[i];assert.deepEqual(Object.keys(r).sort(),['moveId','startEvent','endEvent','quoteEligibleExactSpans','supportMap','boundaryJustification','longerCompleteArgumentRationale'].sort());
    assert(Number.isInteger(r.startEvent)&&Number.isInteger(r.endEvent)&&r.startEvent>=m.sourceSpan.startEvent&&r.endEvent<=m.sourceSpan.endEvent&&r.startEvent<=r.endEvent,`${r.moveId}: bounds outside assigned original evidence`);
    const excerpt=span(r.startEvent,r.endEvent);
    assert(Array.isArray(r.quoteEligibleExactSpans)&&r.quoteEligibleExactSpans.length>=1&&r.quoteEligibleExactSpans.length<=2);
    for(const q of r.quoteEligibleExactSpans)assert(wc(q)>=3&&wc(q)<=18&&excerpt.includes(q),`${r.moveId}: non-exact quote ${q}`);
    assert(Array.isArray(r.supportMap)&&['claim','reason','conclusion'].every(k=>r.supportMap.some(a=>a.kind===k)));
    for(const a of r.supportMap){assert(['claim','reason','conclusion'].includes(a.kind));assert(typeof a.description==='string'&&a.description.length>=25);assert(Number.isInteger(a.firstEvent)&&Number.isInteger(a.lastEvent)&&a.firstEvent>=r.startEvent&&a.lastEvent<=r.endEvent&&a.firstEvent<=a.lastEvent);assert(wc(a.anchor)>=3&&wc(a.anchor)<=25&&span(a.firstEvent,a.lastEvent).includes(a.anchor),`${r.moveId}: invalid source support anchor`);}
    assert.deepEqual(Object.keys(r.boundaryJustification).sort(),['startWhy','endWhy','removedPrefix','removedSuffix'].sort());
    for(const v of Object.values(r.boundaryJustification))assert(typeof v==='string'&&v.length>=40);
    assert(typeof r.longerCompleteArgumentRationale==='string');
    if(excerpt.length>2200){assert(r.longerCompleteArgumentRationale.length>=160,`${r.moveId}: source-specific long-span rationale required`);assert(!r.longerCompleteArgumentRationale.includes('The complete passage is necessary because it develops the named reasoning in sequence'));assert(/\d/.test(r.longerCompleteArgumentRationale),'Cite actual event numbers in long-span rationale');}else assert.equal(r.longerCompleteArgumentRationale,'');
    result.push({moveId:r.moveId,events:[r.startEvent,r.endEvent],characters:excerpt.length,originalCharacters:span(m.sourceSpan.startEvent,m.sourceSpan.endEvent).length,sourceSpan:{startEvent:r.startEvent,endEvent:r.endEvent,startMs:e[r.startEvent].startMs,endMs:e[r.endEvent].startMs+e[r.endEvent].durationMs,excerpt}});
  }
  assert.equal(output.readingAuthentication.sourceReadCompletely,true);assert.equal(output.readingAuthentication.sourceSha256,packet.source.sha256);
  return{status:'mechanically-valid-semantic-review-required',shardId:packet.shardId,moves:result};
}
if(process.argv[2]==='--check-stdin'){
  const p=JSON.parse(fs.readFileSync(process.argv[3])),o=JSON.parse(fs.readFileSync(0,'utf8'));const r=checkNarrowRepair(o,p);console.log(JSON.stringify({...r,moves:r.moves.map(({sourceSpan,...m})=>m)},null,2));
}
