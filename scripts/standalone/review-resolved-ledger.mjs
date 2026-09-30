import {openRun} from '../lib/standalone-workflow.mjs';
const runArg=process.argv.indexOf('--debate');
openRun(process.cwd(),process.argv[runArg+1],{writable:!process.argv.includes('--check-only')});
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assembleStandaloneFinalLedger, validateStandalonePrimaryJudgment, validateStandaloneAdjudication, validatePrimarySpeakerScopeException, fileRecord, sha256, serializedJson} from '../../scripts/lib/assessment-production-standalone-debate-v1.mjs';
import {validateEditorScopedSource} from '../lib/assessment-editor-scoped-source.mjs';
const args=process.argv.slice(2),di=args.indexOf('--debate');assert(di>=0);
const read=p=>JSON.parse(fs.readFileSync(p));
const entry=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(e=>e.debateNumber===args[di+1]);assert(entry);const base=entry.root;
const p={inventory:`${base}/inventory/inventory.json`,passA:`${base}/judgments/pass-a/output.json`,passB:`${base}/judgments/pass-b/output.json`,disagreements:`${base}/disagreements/disagreements.json`,adjudication:`${base}/adjudication/output.json`,audio:`${base}/audio/audio-verification.json`};
const records=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,fileRecord(v)]));
const inputs=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,read(v)]));
validateStandalonePrimaryJudgment(inputs.passA,inputs.inventory,{expectedPass:'pass-a',expectedInventorySha256:records.inventory.sha256});
validateStandalonePrimaryJudgment(inputs.passB,inputs.inventory,{expectedPass:'pass-b',expectedInventorySha256:records.inventory.sha256});
validateStandaloneAdjudication(inputs.adjudication,inputs.disagreements);
const ledger=assembleStandaloneFinalLedger({...inputs,...Object.fromEntries(Object.entries(records).map(([k,v])=>[`${k}Sha256`,v.sha256]))});
const authorization=read(`${base}/authorization.json`),sourceLock=read(`${base}/source/source-lock.json`);
assert.deepEqual(authorization.availableRecordingScope,sourceLock.availableRecordingScope);
assert.deepEqual(inputs.inventory.availableRecordingScope,authorization.availableRecordingScope);
if(authorization.availableRecordingScope){
 assert.equal(authorization.availableRecordingScope.explicitDebateSpecificApproval,true);
 assert.equal(authorization.availableRecordingScope.videoId,entry.videoId);
 for(const m of ledger.moves){for(const x of authorization.availableRecordingScope.excludedIntervals||[]){assert(!(m.sourceSpan.startMs<x.endMs&&m.sourceSpan.endMs>x.startMs),`Excluded source interval entered by ${m.moveId}`);}}
}
if(authorization.identity.editorApprovedScope||sourceLock.participants.editorApprovedScope||inputs.inventory.editorApprovedScope)validateEditorScopedSource({authorization,sourceLock,inventory:inputs.inventory});
if(entry.validationProfile==='semantic-balanced-capacity-primary-speaker-v1'||authorization.identity.primarySpeakerScopeException||sourceLock.participants.primarySpeakerScopeException||inputs.inventory.primarySpeakerScopeAudit)validatePrimarySpeakerScopeException({authorization,sourceLock,inventory:inputs.inventory});
for(const [i,m] of ledger.moves.entries()){
 const {judgments,finalDimensions,assessmentConfidence,...evidence}=m;assert.deepEqual(evidence,inputs.inventory.moves[i]);
 assert.deepEqual(judgments.passA,inputs.passA.judgments[i]);assert.deepEqual(judgments.passB,inputs.passB.judgments[i]);
 for(const [dimension,v] of Object.entries(finalDimensions)){
  if(v.resolution==='rounded-mean'){assert.equal(v.value,Math.round((judgments.passA.dimensions[dimension].value+judgments.passB.dimensions[dimension].value)/2));continue;}
  const r=inputs.adjudication.resolutions.find(r=>r.disputeId===`${m.moveId}:${dimension}`);assert(r);
  const chosen=(r.selectedOption==='option-a'?judgments.passA:judgments.passB).dimensions[dimension];
  assert.equal(v.value,chosen.value);assert.equal(v.rationale,chosen.rationale);assert.equal(v.adjudicationRationale,r.rationale);
 }
}
const serial=serializedJson(ledger),expectedHash=sha256(serial);
if(args.includes('--check-only')){const existing=fs.readFileSync(`${base}/final-ledger/final-ledger.json`);assert.equal(sha256(existing),expectedHash);console.log(JSON.stringify({status:'passed-read-only-ledger-fixture',moves:ledger.moves.length,sha256:expectedHash}));process.exit(0);}
assert(!fs.existsSync(`${base}/score-pass/input.json`)&&!fs.existsSync(`${base}/score-pass/output.json`));
const compliancePaths=[`${base}/judgments/pass-a/source-eligibility-review.json`,`${base}/judgments/pass-b/source-eligibility-review.json`,`${base}/adjudication/source-eligibility-review.json`];
for(const p of compliancePaths){const o=read(p);assert(o.status.startsWith('passed'));assert.deepEqual(o.violations,[]);}
const audit={status:'passed-before-score-input-freeze',debateNumber:entry.debateNumber,debateId:entry.debateId,expectedFinalLedgerSha256:expectedHash,expectedFinalLedgerBytes:Buffer.byteLength(serial),inputRecords:records,reusedUnchangedComplianceReviews:compliancePaths.map(p=>fileRecord(p)),reviewedMoveIds:ledger.moves.map(m=>m.moveId),reviewedBurdenSides:['pro','con'],sourceRestrictionsApplied:true,allInventoriedEvidenceUnchanged:true,allFinalReasonsDerivedOnlyFromReviewedInputs:true,allSelectedOptionsAuthenticated:true,roundedMeanReasonsProceduralOnly:true,violations:[],scoreInputManifestAbsentAtReview:true,scoreOutputAbsentAtReview:true,assessmentSubstanceEditedByController:false,disposition:'Resolved ledger assembled and inspected in memory before the score-input manifest. Every source field, accepted judgment, and selected adjudication rationale is unchanged from the individually source-reviewed inputs. Rounded means follow the frozen deterministic rule. No score calculator was called by this check.'};
const out=`${base}/final-ledger/source-eligibility-review.json`;assert(!fs.existsSync(out));fs.mkdirSync(`${base}/final-ledger`,{recursive:true});fs.writeFileSync(out,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({review:fileRecord(out),expectedFinalLedgerSha256:expectedHash}));
