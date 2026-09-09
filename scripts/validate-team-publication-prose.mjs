import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage,validateTeamResolvedStage,validateTeamScoreStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
import {validateTeamCandidate} from './lib/assessment-standalone-team-publication-v1.mjs';
import {validateTeamProse} from './lib/assessment-team-prose-v1.mjs';
const args=process.argv.slice(2);assert.equal(args.length,4);assert.equal(args[0],'--debate');assert.equal(args[2],'--file');
const run=openTeamRun(args[1]),source=validateTeamSourceStage(run),j=validateTeamJudgmentStage(run,source),l=validateTeamResolvedStage(run,source,j),s=validateTeamScoreStage(run,source,j,l),output=JSON.parse(readFileSync(args[3],'utf8'));
assert.equal(output.status,'complete-publication-candidate');const packet=run.read(run.local('publication/packet.json'));
function unchanged(template,actual,p='candidate'){if(template==='WRITE'){assert(typeof actual==='string'&&actual.trim()&&actual!=='WRITE',p);return;}if(template&&typeof template==='object'){assert.deepEqual(Object.keys(actual),Object.keys(template),p);for(const k of Object.keys(template))unchanged(template[k],actual[k],`${p}.${k}`);}else assert.deepEqual(actual,template,p);}
unchanged(packet.candidateTemplate,output.candidate);
validateTeamCandidate(output.candidate,source.inventory,s.scores,s.diagnostics);
const result=validateTeamProse(output.candidate);console.log(JSON.stringify(result,null,2));if(result.status!=='passed')process.exitCode=1;
