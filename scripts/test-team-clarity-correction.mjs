import assert from 'node:assert/strict';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage,validateTeamResolvedStage,validateTeamScoreStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
import {validateClarityOutput} from './lib/assessment-team-clarity-correction-v1.mjs';
import {applyCorrectedTeamProse} from './lib/assessment-team-corrected-prose-v1.mjs';
import {validateTeamProseProvenance} from './lib/assessment-team-publication-audit-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],'--debate');const r=openTeamRun(args[1]);assert(r.correction);
const s=validateTeamSourceStage(r),j=validateTeamJudgmentStage(r,s),l=validateTeamResolvedStage(r,s,j),score=validateTeamScoreStage(r,s,j,l),p=validateTeamProseProvenance(r),folder=r.correction.folder;
const packet=r.read(`${folder}/packet.json`),good=r.read(`${folder}/pass-a/output.json`);
for(const mutate of [x=>x.value=101,x=>x.dimension='evidenceWarrant',x=>x.moveId='not-inventory',x=>x.extra=true,x=>x.rationale='short',x=>x.status='passed']){const x=structuredClone(good);mutate(x);assert.throws(()=>validateClarityOutput(packet,x));}
const cp=r.read(`${folder}/critique/packet.json`),co=r.read(`${folder}/critique/output.json`);assert.deepEqual(applyCorrectedTeamProse(p.prior.publication,score.scores,score.diagnostics,cp,co),p.publication);
const changed=structuredClone(score.scores);const unrelated=changed.sections.flatMap(s=>Object.values(s.sides).flatMap(x=>x.moves)).find(x=>x.moveId!==packet.move.moveId);unrelated.score+=1;assert.throws(()=>applyCorrectedTeamProse(p.prior.publication,changed,score.diagnostics,cp,co));
const original=s.sourceCorrection.prior.inventory,next=s.inventory;assert.deepEqual(next.moves.filter(m=>m.moveId!==packet.move.moveId),original.moves.filter(m=>m.moveId!==packet.move.moveId));
for(const key of ['passA','passB']){const a=structuredClone(j[key]),b=structuredClone(j.clarityPrior[key]);delete a.judgments.find(m=>m.moveId===packet.move.moveId).dimensions.precisionClarity;delete b.judgments.find(m=>m.moveId===packet.move.moveId).dimensions.precisionClarity;assert.deepEqual(a,b);}
assert.equal(score.scorePasses,2);console.log(JSON.stringify({status:'passed',negativeCases:7,unchangedSourceMoves:next.moves.length-1,unchangedOtherJudgments:true,originalResultsVerified:true,scorePasses:2}));
