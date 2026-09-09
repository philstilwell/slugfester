import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {debates} from '../src/data/debates.js';
import {fileRecord,MULTI_SPEAKER_RUBRIC} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage,validateTeamResolvedStage,validateTeamScoreStage,validateTeamSiteLedgerAdapter,TEAM_ADAPTER_VERSION,teamPublicationEvidencePaths} from './lib/assessment-standalone-team-pipeline-v1.mjs';
import {validateTeamProseProvenance,validateTeamTagProvenance,validateTeamEditorialAndRendering} from './lib/assessment-team-publication-audit-v1.mjs';
const args=process.argv.slice(2);assert.equal(args[0],'--debate');assert.equal(args.length,2);
const run=openTeamRun(args[1]),source=validateTeamSourceStage(run),judgments=validateTeamJudgmentStage(run,source),resolved=validateTeamResolvedStage(run,source,judgments),score=validateTeamScoreStage(run,source,judgments,resolved),prose=validateTeamProseProvenance(run),tags=validateTeamTagProvenance(run,source,prose),candidate=tags.publication.candidate;
assert.deepEqual(debates.find(d=>d.number===run.record.debateNumber),candidate);validateTeamEditorialAndRendering(run,candidate);
for(const argv of [['scripts/validate-debates.mjs','--team-staging-debate',run.record.debateNumber],['scripts/audit-assessment-production-standalone-content-parity.mjs','--debate',run.record.debateNumber,'--candidate',run.local('publication/output.json')]]){
  const result=spawnSync(process.execPath,argv,{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);
}
const evidenceLocks=Object.fromEntries(Object.entries(teamPublicationEvidencePaths(run)).map(([key,path])=>[key,fileRecord(path)]));
const adapter={schemaVersion:TEAM_ADAPTER_VERSION,debateNumber:run.record.debateNumber,debateId:run.record.debateId,model:'5.6 Sol',rubric:MULTI_SPEAKER_RUBRIC,standalonePostCampaign:true,campaignBatch:null,evidenceLocks,calculated:score.scores,audit:{scorePasses:score.scorePasses,manualScoreOverrides:0,modelAuthoredTotals:0,mappedMoves:source.inventory.moves.length}};
validateTeamSiteLedgerAdapter({adapter,candidate,repositoryOnly:false});
writeFileSync(run.record.productionLedger.path,JSON.stringify(adapter,null,2)+'\n',{flag:'wx'});
run.record.productionLedger=fileRecord(run.record.productionLedger.path);run.record.status='published-and-frozen';
run.record.contentParity={auditPath:run.local('publication/content-parity-audit.json')};
writeFileSync('docs/assessment-production/standalone-debates-v1/registry.json',JSON.stringify(run.registry,null,2)+'\n');
console.log(JSON.stringify({status:'locally-frozen-publication-awaiting-repository-checks-and-protected-branch-release',productionLedger:run.record.productionLedger}));
