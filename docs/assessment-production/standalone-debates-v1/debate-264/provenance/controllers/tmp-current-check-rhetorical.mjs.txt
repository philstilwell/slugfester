import fs from 'node:fs';
import assert from 'node:assert/strict';
const wc = s => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
export function checkRhetoricalReview(output, packet) {
  const contract = packet.outputContract;
  for (const k of ['schemaVersion','status','debateNumber','debateId','reviewedMoveIds','reviewedOverallBlunderIds','definitionKeys','audit']) assert.deepEqual(output[k],contract[k],k);
  const definitions = new Map(packet.referenceDefinitions.map(d => [d.type+'|'+d.label,d]));
  for (const [reviewKey,candidateKey,acceptedKey,idKey,expectedIds] of [
    ['moveReviews','candidateReviews','acceptedTags','moveId',contract.reviewedMoveIds],
    ['overallBlunderReviews','overallBlunderCandidateReviews','acceptedOverallBlunderLinks','blunderId',contract.reviewedOverallBlunderIds]
  ]) {
    const reviews = output[reviewKey], candidates = output[candidateKey];
    assert.deepEqual(reviews.map(r=>r[idKey]),expectedIds,reviewKey+' order');
    assert(Array.isArray(candidates));
    assert.equal(new Set(candidates.map(c=>c.candidateKey)).size,candidates.length,'duplicate candidates');
    let lastIndex=-1;
    for(const c of candidates) {
      const index=expectedIds.indexOf(c[idKey]); assert(index>=lastIndex && index>=0,'candidate publication order'); lastIndex=index;
      const d=definitions.get(c.type+'|'+c.label);assert(d,'unknown definition');assert.equal(c.url,d.url);
      assert.equal(c.candidateKey,c[idKey]+'|'+c.type+'|'+c.label);assert(['accepted','rejected'].includes(c.decision));
      assert(wc(c.context)>=8 && wc(c.context)<=35,'context 8–35 words');assert(wc(c.rationale)>=12,'candidate rationale at least12words');
    }
    for(const r of reviews){assert.deepEqual(r.allDefinitionsConsidered,contract.definitionKeys);assert.deepEqual(r.candidateKeys,candidates.filter(c=>c[idKey]===r[idKey]).map(c=>c.candidateKey));assert(wc(r.rationale)>=12,'review rationale at least12words');}
    assert.deepEqual(output[acceptedKey],candidates.filter(c=>c.decision==='accepted'),'accepted subset must be exact');
  }
  return {status:'mechanically-valid-editorial-review-required',moves:output.moveReviews.length,blunders:output.overallBlunderReviews.length,candidates:output.candidateReviews.length+output.overallBlunderCandidateReviews.length,acceptedMoveTags:output.acceptedTags.length};
}
export function checkRhetoricalAdjudication(output, packet) {
  for(const k of ['schemaVersion','status','debateNumber','debateId','reviewedCandidateKeys','audit'])assert.deepEqual(output[k],packet.outputContract[k],k);
  assert.deepEqual(output.resolutions.map(r=>r.candidateKey),packet.expectedCandidateKeys);
  assert.equal(output.resolutions.length,packet.expectedCandidateCount);
  for(const [i,r]of output.resolutions.entries()){
    const c=packet.completeCandidateUnion[i];for(const k of ['candidateKey','type','label','url'])assert.equal(r[k],c[k]);const idKey=c.moveId?'moveId':'blunderId';assert.equal(r[idKey],c[idKey]);
    assert(['accepted','rejected'].includes(r.decision));assert(wc(r.context)>=8&&wc(r.context)<=35);assert(wc(r.rationale)>=12);
  }
  return{status:'mechanically-valid-editorial-review-required',candidates:output.resolutions.length,accepted:output.resolutions.filter(r=>r.decision==='accepted').length};
}
if(process.argv[2]==='--check-stdin'){const p=JSON.parse(fs.readFileSync(process.argv[3])),o=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(p.completeCandidateUnion?checkRhetoricalAdjudication(o,p):checkRhetoricalReview(o,p)));}
