import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {canonicalJson, sha256} from './lib/assessment-production-standalone-debate-v1.mjs';

export function auditFormalRoundsScope(number, {requireInventory=true, requirePublication=false}={}) {
  const read=p=>JSON.parse(fs.readFileSync(p));
  const registry=read('docs/assessment-production/standalone-debates-v1/registry.json');
  const record=registry.debates.find(r=>r.debateNumber===number);
  assert(record, 'Debate must be registered');
  const base=record.root, authorization=read(`${base}/authorization.json`);
  const scope=authorization.identity.formalRoundsScope;
  assert(scope, 'Explicit formal-rounds authorization is required');
  const approval=read(scope.authorization.path);
  assert.equal(sha256(fs.readFileSync(scope.authorization.path)),scope.authorization.sha256);
  assert.equal(approval.status,'authorized-before-inventory-or-judgment');
  assert.equal(approval.primarySpeakerScopeExceptionUsed,false);
  assert.equal(authorization.identity.primarySpeakerScopeException.enabled,false);
  assert.equal(approval.videoId,record.videoId);
  assert.equal(approval.debateId,record.debateId);
  assert.equal(approval.motion,authorization.identity.motion);
  assert.equal(canonicalJson(scope.assessedWindow),canonicalJson(approval.assessedWindow));
  const w=scope.assessedWindow;
  assert(w.endEvent>=w.startEvent && w.endMs>w.startMs && w.durationMs===w.endMs-w.startMs);
  const source=read(`${base}/source/source-lock.json`);
  assert.equal(canonicalJson(source.formalRoundsScope),canonicalJson(scope));
  assert.deepEqual(source.participants.assessedDebateWindowMs,{start:w.startMs,end:w.endMs});
  const packet=read(`.assessment-cache/captions/${record.videoId}/formal-rounds-source.json`);
  assert.equal(sha256(fs.readFileSync(`.assessment-cache/captions/${record.videoId}/formal-rounds-source.json`)),source.hashes.formalRoundsSourceSha256);
  assert.equal(packet.events.length,w.endEvent-w.startEvent+1);
  for(const [i,event] of packet.events.entries()) {
    assert.equal(event.eventIndex,w.startEvent+i);
    assert(event.startMs>=w.startMs && event.startMs+event.durationMs<=w.endMs,'Source packet enters excluded interval');
  }
  let moveCount=0;
  if(requireInventory) {
    const inventory=read(`${base}/inventory/inventory.json`);
    assert.equal(inventory.motion,approval.motion);
    assert.deepEqual(inventory.assessedDebateWindowMs,{start:w.startMs,end:w.endMs});
    assert.equal(canonicalJson(inventory.formalRoundsScope),canonicalJson(scope));
    const ids=new Set(inventory.moves.map(m=>m.moveId));
    for(const move of inventory.moves) {
      const s=move.sourceSpan;
      assert(s.startEvent>=w.startEvent && s.endEvent<=w.endEvent && s.startMs>=w.startMs && s.endMs<=w.endMs,`${move.moveId}: evidence outside approved window`);
      assert(move.respondsToIds.every(id=>ids.has(id)),`${move.moveId}: external response target`);
      if(move.materialWordingConfidence!=='high')assert.notEqual(move.attributionConfidence,'high',`${move.moveId}: uncertain wording must trigger audio`);
    }
    moveCount=inventory.moves.length;
    const coverage=inventory.fullTranscriptCoverageAudit;
    assert.equal(coverage.assessedWindowOnly,true);
    assert.equal(coverage.reviewOfExcludedRecording,false);
    let next=w.startEvent;
    for(const interval of coverage.intervals) {
      assert.equal(interval.startEvent,next,'Coverage gap or overlap');
      assert(interval.endEvent>=interval.startEvent && interval.endEvent<=w.endEvent);
      assert(interval.moveIds.every(id=>ids.has(id)));
      next=interval.endEvent+1;
    }
    assert.equal(next,w.endEvent+1,'Incomplete formal-rounds review');
  }
  if(requirePublication) {
    const publication=read(`${base}/publication/output.json`).candidate;
    assert.equal(publication.motion,approval.motion);
    assert(publication.sourceNote.includes(scope.requiredReaderDisclosure),'Published scope disclosure absent or changed');
    assert(/formal rounds/i.test(publication.title),'Title must identify the partial-recording scope');
    const inventory=read(`${base}/inventory/inventory.json`),ids=new Set(inventory.moves.map(m=>m.moveId));
    const cards=publication.sections.flatMap(s=>s.exchanges.flatMap(e=>['pro','con'].flatMap(side=>e[side]?[e[side]]:[])));
    assert.equal(cards.length,moveCount);
    assert.equal(new Set(cards.map(c=>c.ledgerMoveId)).size,moveCount);
    assert(cards.every(c=>ids.has(c.ledgerMoveId)));
    for(const side of ['pro','con'])assert(inventory.moves.some(m=>m.side===side && m.quoteEligibleExactSpans.some(span=>span.includes(publication.quotes[side].text))),'Quotation must come from a formal-rounds locked move');
  }
  return {status:'passed',debateNumber:number,window:w,sourceEvents:packet.events.length,moves:moveCount,publicationChecked:requirePublication};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const args=process.argv.slice(2),i=args.indexOf('--debate');
  assert(i>=0 && /^\d{2,}$/.test(args[i+1]),'Use --debate NNN');
  console.log(JSON.stringify(auditFormalRoundsScope(args[i+1],{requireInventory:!args.includes('--source-only'),requirePublication:args.includes('--publication')}),null,2));
}
