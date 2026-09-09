import assert from 'node:assert/strict';
import {wordCount} from './assessment-team-prose-v1.mjs';
export const tagKey=t=>`${t.moveId}|${t.type}|${t.label}`;
export const publicTag=t=>Object.fromEntries(['moveId','type','label','url','context','rationale'].map(k=>[k,t[k]]));
const exactKeys=(value,keys)=>assert.deepEqual(Object.keys(value).sort(),[...keys].sort());
export function teamTagReviewBase(run,pass){
 const folder=run.local('publication/rhetorical-tags'),recovery=run.record.rhetoricalReviewRecovery;
 if(recovery?.pass!==pass)return `${folder}/${pass}`;
 run.check(recovery.authorization);run.check(recovery.priorFailure);run.check(recovery.retainedReview);const authority=run.read(recovery.authorization.path),failure=run.read(recovery.priorFailure.path);
 assert.equal(authority.status,'explicitly-authorized-single-blind-review-replacement');assert.equal(authority.debateId,run.record.debateId);assert.equal(authority.pass,pass);assert.equal(authority.additionalAttempts,1);assert.equal(authority.directIncrementalCostUsd,0);assert.equal(authority.scoreChanges,0);assert.equal(authority.proseChanges,0);assert.equal(authority.judgmentChanges,0);assert.deepEqual(authority.priorFailure,recovery.priorFailure);assert.deepEqual(authority.retainedReview,recovery.retainedReview);
 for(const key of ['sourcePacket','scoreAttestation','proseOutput'])run.check(authority[key]);assert.equal(authority.sourcePacket.path,`${folder}/source-packet.json`);assert.equal(authority.scoreAttestation.path,run.local('score-pass/attestation.json'));assert.equal(authority.proseOutput.path,run.local('publication/prose-output.json'));
 for(const key of ['originalIntent','originalDispatch','rejectedOutput'])run.check(failure[key]);assert.equal(failure.status,'rejected-output-differs-from-validated-draft');assert.equal(failure.failedOutputAccepted,false);assert.equal(recovery.base,`${folder}/${pass}-replacement-1`);
 return recovery.base;
}
export function validateTeamTagReview(packet,review){
  exactKeys(review,['status','reviewedMoveIds','moveReviews','candidateReviews','acceptedTags']);
  assert.equal(review.status,'complete-blind-rhetorical-review');
  assert.deepEqual(review.reviewedMoveIds,packet.moves.map(m=>m.moveId));
  assert.deepEqual(review.moveReviews.map(m=>m.moveId),review.reviewedMoveIds);
  for(const row of review.moveReviews){exactKeys(row,['moveId','screenedTypes','rationale']);assert.deepEqual(row.screenedTypes,['fallacy','bias']);assert(wordCount(row.rationale)>=12);}
  const seen=new Set();
  for(const c of review.candidateReviews){
    exactKeys(c,['moveId','type','label','url','definition','decision','context','rationale','critiqueBasis']);
    const m=packet.moves.find(m=>m.moveId===c.moveId);assert(m);assert(!seen.has(tagKey(c)));seen.add(tagKey(c));
    const d=packet.catalog.find(d=>d.type===c.type&&d.label===c.label);assert(d);assert.equal(c.url,d.url);assert.equal(c.definition,d.definition);
    assert(['accepted','rejected'].includes(c.decision));assert(wordCount(c.rationale)>=12);assert(wordCount(c.critiqueBasis)>=8);
    assert(wordCount(c.context)>=8&&wordCount(c.context)<=35);assert(c.context.startsWith(`${m.speaker}:`));
  }
  assert.deepEqual(review.acceptedTags,review.candidateReviews.filter(c=>c.decision==='accepted').map(publicTag));
  return {status:'passed',moves:review.reviewedMoveIds.length,candidates:seen.size,accepted:review.acceptedTags.length};
}
export function teamTagUnion(packet,reviews){
  const union=[];
  for(const m of packet.moves)for(const d of packet.catalog){
    const rows=reviews.flatMap(r=>r.candidateReviews.filter(c=>c.moveId===m.moveId&&c.type===d.type&&c.label===d.label));
    if(rows.length)union.push({candidateKey:`${m.moveId}|${d.type}|${d.label}`,moveId:m.moveId,type:d.type,label:d.label,url:d.url,definition:d.definition,anonymousAssessments:rows.map(c=>({decision:c.decision,context:c.context,rationale:c.rationale,critiqueBasis:c.critiqueBasis}))});
  }
  return union;
}
export function validateTeamTagAdjudication(packet,output){
  exactKeys(output,['status','decisions']);
  assert.equal(output.status,'complete-anonymous-rhetorical-adjudication');
  assert.deepEqual(output.decisions.map(d=>d.candidateKey),packet.candidates.map(c=>c.candidateKey));
  for(const d of output.decisions){exactKeys(d,['candidateKey','moveId','type','label','url','definition','decision','context','rationale','critiqueBasis']);const c=packet.candidates.find(c=>c.candidateKey===d.candidateKey),m=packet.moves.find(m=>m.moveId===c.moveId);for(const key of ['moveId','type','label','url','definition'])assert.equal(d[key],c[key]);assert(['accepted','rejected'].includes(d.decision));assert(wordCount(d.rationale)>=12);assert(wordCount(d.critiqueBasis)>=8);assert(wordCount(d.context)>=8&&wordCount(d.context)<=35);assert(d.context.startsWith(`${m.speaker}:`));}
  return {status:'passed',candidates:output.decisions.length,accepted:output.decisions.filter(d=>d.decision==='accepted').length};
}
