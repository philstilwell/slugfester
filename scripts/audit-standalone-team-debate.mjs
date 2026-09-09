import assert from 'node:assert/strict';
import {debates} from '../src/data/debates.js';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage,validateTeamResolvedStage,validateTeamScoreStage,validateTeamSiteLedgerAdapter} from './lib/assessment-standalone-team-pipeline-v1.mjs';

const args=process.argv.slice(2),number=args[args.indexOf('--debate')+1];
assert(args.includes('--debate'));assert.match(number??'',/^\d{2,}$/);
const modes=['--source','--inventory','--audit'].filter(m=>args.includes(m));assert.equal(modes.length,1);
assert.equal(args.length,args.includes('--repository-only')?4:3);
const run=openTeamRun(number),repositoryOnly=args.includes('--repository-only');
for(const key of ['debateNumber','debateId','videoId','root'])assert.equal(new Set(run.registry.debates.map(r=>r[key])).size,run.registry.debates.length);
const source=validateTeamSourceStage(run,{repositoryOnly});
if(modes[0]!=='--audit'){
  console.log(JSON.stringify({status:'passed-source-and-inventory',debateNumber:number,publicationReady:false,inventory:source.inventoryValidation}));
}else{
  assert.equal(run.record.status,'published-and-frozen');
  const judgment=validateTeamJudgmentStage(run,source),resolved=validateTeamResolvedStage(run,source,judgment),score=validateTeamScoreStage(run,source,judgment,resolved);
  const candidate=debates.find(d=>d.number===number&&d.id===run.record.debateId);assert(candidate);
  run.check(run.record.productionLedger);
  const adapter=run.read(run.record.productionLedger.path);
  const result=validateTeamSiteLedgerAdapter({adapter,candidate,repositoryOnly});
  const validation=run.read(run.local('validation-summary.json'));assert.equal(validation.status,'passed');assert.equal(validation.debateNumber,number);assert.equal(validation.scorePasses,score.scorePasses);
  console.log(JSON.stringify({...result,sections:candidate.sections.length,scores:score.scores.overall,sourceMode:repositoryOnly?'repository-only authenticated replay':'complete local-source replay'}));
}
