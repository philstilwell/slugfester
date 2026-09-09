import assert from 'node:assert/strict';
import {validateTeamTagReview,teamTagUnion,validateTeamTagAdjudication,publicTag} from './lib/assessment-team-tags-v1.mjs';
const definition='A synthetic exact definition for validating a synthetic contract only.';
const packet={moves:[{moveId:'m1',speaker:'Speaker A'},{moveId:'m2',speaker:'Speaker B'}],catalog:[{type:'fallacy',label:'Synthetic label',url:'https://example.com/synthetic',definition}]};
const row={moveId:'m1',type:'fallacy',label:'Synthetic label',url:'https://example.com/synthetic',definition,decision:'accepted',context:'Speaker A: This synthetic conduct demonstrates the contract without assessing any real debate.',rationale:'This synthetic rationale contains enough words to test the required minimum length honestly.',critiqueBasis:'This synthetic critique basis contains enough words for structural testing.'};
const review={status:'complete-blind-rhetorical-review',reviewedMoveIds:['m1','m2'],moveReviews:packet.moves.map(m=>({moveId:m.moveId,screenedTypes:['fallacy','bias'],rationale:row.rationale})),candidateReviews:[row],acceptedTags:[publicTag(row)]};
validateTeamTagReview(packet,review);
for(const mutation of [r=>r.reviewedMoveIds.reverse(),r=>r.moveReviews.pop(),r=>r.moveReviews[0].screenedTypes.pop(),r=>r.candidateReviews[0].definition='Wrong definition',r=>r.candidateReviews[0].context='Speaker B: This is actually the wrong speaker within this synthetic contract.',r=>r.candidateReviews.push(row),r=>r.acceptedTags=[]]){const c=structuredClone(review);mutation(c);assert.throws(()=>validateTeamTagReview(packet,c));}
const rejected=structuredClone(review);rejected.candidateReviews[0].decision='rejected';rejected.acceptedTags=[];validateTeamTagReview(packet,rejected);
const strayField=structuredClone(review);strayField.moveReviews[0].moveIdId='m1';assert.throws(()=>validateTeamTagReview(packet,strayField));
const union=teamTagUnion(packet,[review,rejected]);assert.equal(union.length,1);assert.equal(union[0].anonymousAssessments.length,2);
const adjudicationPacket={...packet,candidates:union},output={status:'complete-anonymous-rhetorical-adjudication',decisions:[{...row,candidateKey:'m1|fallacy|Synthetic label'}]};
validateTeamTagAdjudication(adjudicationPacket,output);assert.throws(()=>validateTeamTagAdjudication(adjudicationPacket,{...output,decisions:[]}));
console.log('Team rhetorical contract tests passed: exact definitions, complete screening, actual speaker, complete candidate union and full adjudication.');
