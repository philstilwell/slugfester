import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileRecord,validateStandaloneInventory,validatePrimarySpeakerScopeException} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';

// Read-only pre-submission validation: no artifacts are created by this helper.
export function applyCorrection(correction, packet) {
  const read=p=>JSON.parse(fs.readFileSync(p));
  const base=read(packet.baseline.path);
  assert.equal(fileRecord(packet.baseline.path).sha256,packet.baseline.sha256);
  for(const lock of packet.sourceLocks)assert.equal(fileRecord(lock.path).sha256,lock.sha256);
  assert.equal(correction.debateNumber,base.debateNumber);
  assert.equal(correction.debateId,base.debateId);
  assert.equal(correction.baselineSha256,packet.baseline.sha256);
  assert.deepEqual(correction.moves.map(m=>m.moveId),base.moves.map(m=>m.moveId));
  const events=read(packet.eventsPath),candidate=structuredClone(base);
  candidate.sections=structuredClone(correction.sections);
  assert.equal(typeof correction.balanceRationale,'string');
  assert(correction.balanceRationale.length>=80);
  assert.equal(correction.sectionRationales.length,candidate.sections.length);
  assert.deepEqual(correction.sectionRationales.map(s=>s.sectionId),candidate.sections.map(s=>s.sectionId));
  const evidenceReview=[];
  for(const [i,delta]of correction.moves.entries()){
    assert.deepEqual(Object.keys(delta).sort(),['moveId','sectionId','startEvent','endEvent','quoteEligibleExactSpans','evidenceRationale','longerCompleteArgumentRationale'].sort());
    const move=candidate.moves[i];
    assert(Number.isInteger(delta.startEvent)&&Number.isInteger(delta.endEvent)&&delta.startEvent>=0&&delta.endEvent>=delta.startEvent&&delta.endEvent<events.length);
    assert(typeof delta.evidenceRationale==='string'&&delta.evidenceRationale.length>=60);
    move.sectionId=delta.sectionId;
    move.sourceSpan={startEvent:delta.startEvent,endEvent:delta.endEvent,startMs:events[delta.startEvent].startMs,endMs:events[delta.endEvent].startMs+events[delta.endEvent].durationMs,excerpt:events.slice(delta.startEvent,delta.endEvent+1).map(e=>e.text).join(' ').replace(/\s+/g,' ').trim()};
    assert(move.sourceSpan.startMs>=base.assessedDebateWindowMs.start&&move.sourceSpan.endMs<=base.assessedDebateWindowMs.end);
    move.quoteEligibleExactSpans=structuredClone(delta.quoteEligibleExactSpans);
    assert(move.quoteEligibleExactSpans.length>=1);
    assert(typeof delta.longerCompleteArgumentRationale==='string');
    if(move.sourceSpan.excerpt.length>2200){assert(delta.longerCompleteArgumentRationale.length>=100,`${move.moveId}: specific long-span rationale required`);move.longerCompleteArgumentRationale=delta.longerCompleteArgumentRationale;}
    else assert.equal(delta.longerCompleteArgumentRationale,'',`${move.moveId}: unnecessary long-span rationale`);
    evidenceReview.push({moveId:move.moveId,characters:move.sourceSpan.excerpt.length,changedBounds:delta.startEvent!==base.moves[i].sourceSpan.startEvent||delta.endEvent!==base.moves[i].sourceSpan.endEvent,rationale:delta.evidenceRationale});
  }
  const counts=candidate.sections.map(s=>({sectionId:s.sectionId,pro:candidate.moves.filter(m=>m.sectionId===s.sectionId&&m.side==='pro').length,con:candidate.moves.filter(m=>m.sectionId===s.sectionId&&m.side==='con').length}));
  const totals={pro:candidate.moves.filter(m=>m.side==='pro').length,con:candidate.moves.filter(m=>m.side==='con').length};totals.absoluteDifference=Math.abs(totals.pro-totals.con);
  candidate.selectionBalanceAudit={thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals,sections:counts.map(s=>({...s,absoluteDifference:Math.abs(s.pro-s.con)})),rationaleRequired:totals.absoluteDifference>=3||counts.some(s=>Math.abs(s.pro-s.con)>=2),rationale:correction.balanceRationale};
  candidate.publicationCapacityAudit={maximumSelectedMovesPerSidePerSection:4,sections:counts.map((s,i)=>{const fourth=s.pro===4||s.con===4;const rationale=correction.sectionRationales[i].rationale;assert(typeof rationale==='string'&&rationale.length>=(fourth?100:40));return{...s,withinCapacity:s.pro<=4&&s.con<=4,fourthRowRequired:fourth,fourthRowAuthorized:true,rationale};}),allSectionsWithinCapacity:counts.every(s=>s.pro<=4&&s.con<=4),allFourthRowsPreauthorized:true};
  const validation=validateStandaloneInventory(candidate,events);
  const scope=validatePrimarySpeakerScopeException({authorization:read(packet.authorizationPath),sourceLock:read(packet.sourceLockPath),inventory:candidate});
  for(const[i,m]of candidate.moves.entries()){
    const original={...base.moves[i]},updated={...m};
    for(const k of ['sectionId','sourceSpan','quoteEligibleExactSpans','longerCompleteArgumentRationale']){delete original[k];delete updated[k];}
    assert.deepEqual(updated,original,`${m.moveId}: unauthorized semantic change`);
  }
  for(const key of Object.keys(base))if(!['sections','moves','selectionBalanceAudit','publicationCapacityAudit'].includes(key))assert.deepEqual(candidate[key],base[key],`Unauthorized field ${key}`);
  return{candidate,validation,scope,counts,evidenceReview};
}

if(process.argv[2]==='--check-stdin'){
  const packet=JSON.parse(fs.readFileSync(process.argv[3]));
  const correction=JSON.parse(fs.readFileSync(0,'utf8'));
  const result=applyCorrection(correction,packet);
  console.log(JSON.stringify({status:'passed-read-only-pre-submission-validation',validation:result.validation,scope:result.scope,counts:result.counts,evidenceReview:result.evidenceReview},null,2));
}
