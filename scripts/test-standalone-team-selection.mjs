import assert from "node:assert/strict";
import { TEAM_PROFILE, validateTeamSelection } from "./lib/assessment-standalone-team-debate-v1.mjs";
const identity = {debateNumber:"999",debateId:"synthetic-team",motion:"Does the proposed inference hold?",pro:{speakers:["A","B"]},con:{speakers:["C","D"]}};
const authorization = {validationProfile:TEAM_PROFILE,identity};
const fixture = () => ({
  debateNumber:identity.debateNumber,debateId:identity.debateId,motion:identity.motion,
  sides:{pro:{speakers:["A","B"]},con:{speakers:["C","D"]}},
  sections:[{sectionId:"central-inference"}],
  moves:["A","C","B","D"].map((speaker,index)=>({
    moveId:`m${index}`,speaker,side:index%2===0?"pro":"con",sectionId:"central-inference",
    sourceSpan:{startMs:index*1000,endMs:index*1000+900},
    inferenceGroupId:`claim-${index}`,incrementalContribution:`Distinct source inference ${index}`,
    extendsMoveIds:[],repeatedInferenceOnly:false
  })),
  formatFitness:{twoSidedFit:"clear",publicFormat:"debate",scorecardEligible:true},
  selectionBalanceAudit:{totalBySide:{pro:2,con:2},sections:[{sectionId:"central-inference",pro:2,con:2}]},
  sourceScope:{assessedWindow:{startMs:0,endMs:4000},excludedIntervals:[]},excludedRepetitions:[]
});
assert.equal(validateTeamSelection(fixture(),authorization).status,"passed");
for (const mutate of [
  x=>{x.motion="Different question";},
  x=>{x.moves[0].speaker="Moderator";},
  x=>{x.selectionBalanceAudit.totalBySide.pro=9;},
  x=>{x.sourceScope.excludedIntervals.push({startMs:200,endMs:300,reason:"Host intervention"});},
  x=>{x.moves[2].inferenceGroupId=x.moves[0].inferenceGroupId;},
  x=>{x.moves[2].inferenceGroupId=x.moves[0].inferenceGroupId;x.moves[2].extendsMoveIds=["m0"];x.moves[2].repeatedInferenceOnly=true;},
  x=>{x.moves[2].inferenceGroupId=x.moves[0].inferenceGroupId;x.moves[2].extendsMoveIds=["m0"];x.moves[2].incrementalContribution=x.moves[0].incrementalContribution;},
  x=>{x.excludedRepetitions=[{speaker:"C",retainedMoveId:"m0",startMs:500,endMs:600,rationale:"Invalid transfer between teams"}];},
  x=>{x.formatFitness.twoSidedFit="approximate";}
]) {
  const candidate=fixture();mutate(candidate);assert.throws(()=>validateTeamSelection(candidate,authorization));
}
const extension=fixture();extension.moves[2].inferenceGroupId=extension.moves[0].inferenceGroupId;extension.moves[2].extendsMoveIds=["m0"];
assert.equal(validateTeamSelection(extension,authorization).status,"passed");
console.log("Team selection tests passed: identity, ownership, counts, exclusions, repetition, and distinct teammate development.");
