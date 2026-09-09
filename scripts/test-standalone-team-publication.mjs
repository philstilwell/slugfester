import assert from 'node:assert/strict';
import {validateTeamCandidate} from './lib/assessment-standalone-team-publication-v1.mjs';
import {MULTI_SPEAKER_RUBRIC} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
const inventory={debateId:'synthetic-team',debateNumber:'test',motion:'A synthetic question?',sides:{pro:{speakers:['A','B']},con:{speakers:['C','D']}},sections:[{sectionId:'test-section'}],moves:[{moveId:'m1',speaker:'A',side:'pro',quoteEligibleExactSpans:['A complete synthetic quotation']},{moveId:'m2',speaker:'D',side:'con',quoteEligibleExactSpans:['Another complete synthetic quotation']}]};
const scores={overall:{pro:{score:70},con:{score:75}},sections:[{title:'Synthetic section',sides:{pro:{score:70,moves:[{moveId:'m1',score:70}]},con:{score:75,moves:[{moveId:'m2',score:75}]}}}]};
const diagnostics={interlocutorRankingEligible:false,speakerContributionScoresPublishable:false};
const candidate={id:inventory.debateId,number:inventory.debateNumber,motion:inventory.motion,assessmentFormat:'team',assessmentRubric:MULTI_SPEAKER_RUBRIC,assessmentModel:'5.6 Sol',interlocutorRankingEligible:false,teamDiagnostics:diagnostics,sides:{pro:{speakers:['A','B'],speaker:'A & B',name:'Affirmative'},con:{speakers:['C','D'],speaker:'C & D',name:'Negative'}},score:{pro:70,con:75},overall:{pro:{score:70,strengths:['a','b','c'],blunders:['a','b']},con:{score:75,strengths:['a','b','c'],blunders:['a','b']}},sections:[{sectionId:'test-section',title:'Synthetic section',score:{pro:70,con:75},exchanges:[{pro:{ledgerMoveId:'m1',speaker:'A',score:70},con:{ledgerMoveId:'m2',speaker:'D',score:75}}]}],quotes:{pro:{speaker:'A',text:'A complete synthetic quotation'},con:{speaker:'D',text:'Another complete synthetic quotation'}}};
inventory.moves.forEach(m=>{m.sectionId='test-section';m.sourceSpan={startMs:1000,endMs:5000};});
candidate.sections[0].timebox='0:01–0:05';Object.values(candidate.sections[0].exchanges[0]).forEach(c=>c.time='0:01');
scores.winner='con';candidate.score.winner='con';
assert.equal(validateTeamCandidate(candidate,inventory,scores,diagnostics).status,'passed');
for(const mutate of [
 c=>c.interlocutorRankingEligible=true,
 c=>c.teamDiagnostics.speakerContributionScoresPublishable=true,
 c=>c.sides.pro.speakers.reverse(),
 c=>c.sections[0].exchanges[0].pro.speaker='B',
 c=>c.sections[0].exchanges[0].pro.score++,
 c=>c.overall.con.score++,
 c=>c.sections[0].exchanges[0].con.ledgerMoveId='m1',
 c=>c.quotes.pro.speaker='B',
 c=>c.quotes.con.text='Invented wording',
 c=>c.sections[0].exchanges[0].pro.time='0:02',
 c=>c.sections[0].timebox='0:01–0:06',
 c=>c.score.winner='pro'
]){const changed=structuredClone(candidate);mutate(changed);assert.throws(()=>validateTeamCandidate(changed,inventory,scores,diagnostics));}
console.log('Team publication mapping tests passed: team-only totals, locked scores, individual ownership, exact quotations, and diagnostic retention. This is not an end-to-end publication audit.');
