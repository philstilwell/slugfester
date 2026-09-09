import assert from 'node:assert/strict';
import {validateOwnershipReplacement} from './lib/assessment-team-ownership-recovery-v1.mjs';
import {DIMENSION_KEYS} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
const fixture=()=>({status:'complete-affected-field-replacement',pass:'pass-a',debateId:'synthetic-team',inventorySha256:'a'.repeat(64),inventoryAuditSha256:'b'.repeat(64),judgments:['alpha','beta'].map(moveId=>({moveId,assessmentConfidence:'medium',dimensions:Object.fromEntries(DIMENSION_KEYS.map(k=>[k,{value:70,rationale:`The synthetic ${k} dimension has a specific source-grounded rationale.`}]))})),burdenCompletionAdjustment:Object.fromEntries(['pro','con'].map(s=>[s,{value:0,rationale:`The synthetic ${s} burden has no distinct unscored consequence.`,distinctUnscoredConsequence:null,relatedMoveIds:['alpha']} ])),isolation:{otherPassUnavailable:true,priorJudgmentsUnavailable:true,calculatedTotalsUnavailable:true,contaminationDetected:false}});
const packet={outputContract:fixture(),affectedMoveIds:['alpha','beta'],dependentBurdenSides:['pro','con'],evidence:{moves:[{moveId:'alpha'},{moveId:'beta'},{moveId:'unchanged'}]}};
assert.equal(validateOwnershipReplacement(packet,fixture(),'pass-a').status,'passed');
for(const mutate of [
 x=>x.judgments.reverse(),x=>x.judgments[0].moveId='unchanged',
 x=>x.judgments[0].dimensions.evidenceWarrant.value=101,
 x=>x.judgments[0].dimensions.logicalCoherence.rationale='Too short',
 x=>x.burdenCompletionAdjustment.con.relatedMoveIds=['unknown'],
 x=>x.burdenCompletionAdjustment.pro.value=1,
 x=>x.isolation.priorJudgmentsUnavailable=false,
 x=>x.inventorySha256='c'.repeat(64),x=>x.total=90,
 x=>x.judgments[0].score=77,x=>delete x.burdenCompletionAdjustment.con
]){const x=fixture();mutate(x);assert.throws(()=>validateOwnershipReplacement(packet,x,'pass-a'));}
console.log('Ownership replacement contract tests passed, including scope, identity, isolation, dimensions and burden dependencies.');
