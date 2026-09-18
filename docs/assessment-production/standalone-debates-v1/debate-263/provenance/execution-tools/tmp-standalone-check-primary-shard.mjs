import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileRecord} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
const dims=['logicalCoherence','evidenceWarrant','responsiveness','relevanceBurden','precisionClarity','calibrationCharity'];
const keys=(x,k,label)=>assert.deepEqual(Object.keys(x).sort(),k.toSorted(),label);
const string=(s,n,label)=>assert(typeof s==='string'&&s.trim().length>=n,label);
export function checkPrimaryShard(o,p){
  for(const k of ['schemaVersion','debateNumber','debateId','pass','shardId','kind','inventorySha256'])assert.equal(o[k],p.outputIdentity[k],k);
  assert.equal(o.assessmentModel,p.model.displayLabel);assert.equal(o.reasoningEffort,p.model.reasoningEffort);
  assert.equal(fileRecord(p.events.path).sha256,p.events.sha256);assert.equal(fileRecord(p.source.path).sha256,p.source.sha256);
  const events=JSON.parse(fs.readFileSync(p.events.path));
  const anchor=a=>{
    assert(Number.isInteger(a.firstEvent)&&Number.isInteger(a.lastEvent)&&a.firstEvent>=0&&a.lastEvent<events.length&&a.firstEvent<=a.lastEvent,'Invalid evidence events');
    const text=events.slice(a.firstEvent,a.lastEvent+1).map(e=>e.text).join(' ').replace(/\s+/g,' ').trim();
    const words=a.anchor?.trim().split(/\s+/).length;
    assert(words>=3&&words<=25&&text.includes(a.anchor),'Evidence anchor is not exact or 3–25 words');
  };
  const authentic=new Set(p.allMoveIds),burdens=new Set(p.routes.flatMap(r=>r.bridges.map(b=>b.bridgeId)));
  assert.equal(o.readingAuthentication.completeTranscriptReviewed,true);assert.equal(o.readingAuthentication.packetReadCompletely,true);assert.equal(o.readingAuthentication.sourceSha256,p.source.sha256);assert.equal(o.readingAuthentication.audioPerformed,false);
  assert.deepEqual(o.readingAuthentication.sourceEventRanges,[[0,events.length-1]]);
  if(p.kind==='section'){
    assert.deepEqual(o.judgments.map(x=>x.moveId),p.assignedMoves.map(x=>x.moveId));
    assert.deepEqual(o.sourceReview.map(x=>x.moveId),p.assignedMoves.map(x=>x.moveId));
    const normalized=[];
    for(const item of o.judgments){
      assert(['high','medium','low'].includes(item.assessmentConfidence));keys(item.dimensions,dims,'dimension keys');keys(item.dimensionEvidence,dims,'evidence keys');
      for(const d of dims){const v=item.dimensions[d];keys(v,['value','rationale'],'dimension shape');assert(Number.isInteger(v.value)&&v.value>=0&&v.value<=100);string(v.rationale,40,'Specific dimension rationale required');
        assert(!/the rating reflects|is assessed from the source-grounded claim|the stated reasons are evaluated as presented|at a material premise or consequence; the rating/i.test(v.rationale),'Generic assessment scaffold is not a rationale');
        anchor(item.dimensionEvidence[d]);string(item.dimensionEvidence[d].observation,40,'Explain what the source evidence establishes for this dimension');
        normalized.push(v.rationale.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim());
      }
    }
    assert.equal(new Set(normalized).size,normalized.length,'Duplicate dimension rationales');
    for(const check of o.sourceReview){assert(typeof check.attributionSupported==='boolean'&&typeof check.materialUncertainty==='boolean');string(check.rationale,80,'Move-specific source review required');anchor(check.attributionEvidence);anchor(check.wordingEvidence);}
    return{status:'mechanically-valid-editorial-review-required',shardId:p.shardId,moves:o.judgments.length,dimensions:o.judgments.length*dims.length,sourceUncertainties:o.sourceReview.filter(c=>!c.attributionSupported||c.materialUncertainty).map(c=>c.moveId)};
  }
  assert.equal(p.kind,'burden');keys(o.burdenCompletionAdjustment,['pro','con'],'Both burden adjustments');
  for(const side of['pro','con']){
    const a=o.burdenCompletionAdjustment[side];keys(a,['value','rationale','eligibility'],'Adjustment shape');assert(Number.isInteger(a.value)&&a.value>=-5&&a.value<=5);string(a.rationale,80,'Source-specific burden rationale');
    const e=a.eligibility;keys(e,['distinctDebateWideConsequence','affectsBurdenCompletion','notAlreadyScored','affectedBurdenIds','completionCriterion','relatedMoveIds','distinctConsequence','alreadyCapturedBy','counterfactual'],'Eligibility keys');
    for(const k of['distinctDebateWideConsequence','affectsBurdenCompletion','notAlreadyScored'])assert(typeof e[k]==='boolean');
    assert(e.affectedBurdenIds.every(x=>burdens.has(x)));assert(e.relatedMoveIds.every(x=>authentic.has(x)));assert(e.relatedMoveIds.length>0,'Identify actual moves bearing on completion or duplicate capture');
    for(const k of['completionCriterion','distinctConsequence','counterfactual'])string(e[k],30,'Explain '+k);
    assert(Array.isArray(e.alreadyCapturedBy));for(const id of e.alreadyCapturedBy)assert(authentic.has(id.split(':')[0]),'Use actual moveId or moveId:dimension in alreadyCapturedBy');
    if(e.alreadyCapturedBy.length||!e.notAlreadyScored)assert.equal(a.value,0);
    if(a.value!==0)assert(e.distinctDebateWideConsequence&&e.affectsBurdenCompletion&&e.notAlreadyScored&&e.affectedBurdenIds.length&&e.alreadyCapturedBy.length===0);
    const review=o.completionEvidence[side];assert(Array.isArray(review)&&review.length>=2);for(const entry of review){assert(authentic.has(entry.moveId));anchor(entry);string(entry.observation,40,'Explain completion evidence');}
  }
  return{status:'mechanically-valid-editorial-review-required',shardId:p.shardId,burdenSides:2};
}
if(process.argv[2]==='--check-stdin'){const packet=JSON.parse(fs.readFileSync(process.argv[3]));console.log(JSON.stringify(checkPrimaryShard(JSON.parse(fs.readFileSync(0,'utf8')),packet),null,2));}
