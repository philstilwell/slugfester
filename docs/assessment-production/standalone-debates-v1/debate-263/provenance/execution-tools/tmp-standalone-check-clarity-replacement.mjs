import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileRecord} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
export function checkClarityReplacement(o,p){
 const keys=(o,ks)=>assert.deepEqual(Object.keys(o).sort(),ks.toSorted());
 for(const k of ['schemaVersion','debateNumber','debateId','pass','shardId','kind','inventorySha256'])assert.equal(o[k],p.outputIdentity[k],k);
 assert.equal(o.assessmentModel,p.model.displayLabel);assert.equal(o.reasoningEffort,p.model.reasoningEffort);
 for(const lock of[p.source,p.events,...p.controls])assert.equal(fileRecord(lock.path).sha256,lock.sha256);
 const events=JSON.parse(fs.readFileSync(p.events.path));
 assert.deepEqual(o.replacements.map(r=>({moveId:r.moveId,dimension:r.dimension})),p.assignedFields);
 for(const r of o.replacements){
  keys(r,['moveId','dimension','value','rationale','evidence','sourceLimitations']);
  assert.equal(r.dimension,'precisionClarity');assert(Number.isInteger(r.value)&&r.value>=0&&r.value<=100);
  assert(typeof r.rationale==='string'&&r.rationale.length>=80);
  const e=r.evidence;keys(e,['firstEvent','lastEvent','anchor','observation']);
  assert(Number.isInteger(e.firstEvent)&&Number.isInteger(e.lastEvent)&&e.firstEvent>=0&&e.lastEvent<events.length&&e.firstEvent<=e.lastEvent);
  const selected=p.assignedMoves.find(m=>m.moveId===r.moveId);assert(e.firstEvent>=selected.sourceSpan.startEvent&&e.lastEvent<=selected.sourceSpan.endEvent);
  const text=events.slice(e.firstEvent,e.lastEvent+1).map(e=>e.text).join(' ').replace(/\s+/g,' ').trim();
  assert(typeof e.anchor==='string'&&text.includes(e.anchor)&&e.anchor.trim().split(/\s+/).length>=3&&e.anchor.trim().split(/\s+/).length<=25);
  assert(typeof e.observation==='string'&&e.observation.length>=60);assert(typeof r.sourceLimitations==='string'&&r.sourceLimitations.length>=40);
 }
 const a=o.readingAuthentication;assert(a.completeTranscriptReviewed&&a.packetReadCompletely);assert.equal(a.sourceSha256,p.source.sha256);assert.deepEqual(a.sourceEventRanges,[[0,events.length-1]]);assert.equal(a.directListeningPerformed,false);assert(a.supplementalAudioDerivedTextRead);assert.equal(o.directCostUsd,0);
 assert.deepEqual(a.controlsRead.toSorted(),p.controls.map(c=>c.path).toSorted());
 return {status:'mechanically-valid-editorial-review-required',shardId:p.shardId,fields:o.replacements.length};
}
if(process.argv[2]==='--check-stdin')console.log(JSON.stringify(checkClarityReplacement(JSON.parse(fs.readFileSync(0,'utf8')),JSON.parse(fs.readFileSync(process.argv[3])))));
