import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileRecord} from './lib/assessment-production-multi-speaker-approximation-v1.mjs';
import {openTeamRun,validateTeamSourceStage,validateTeamJudgmentStage,validateTeamResolvedStage,validateTeamScoreStage} from './lib/assessment-standalone-team-pipeline-v1.mjs';
import {clarityInputs,correctedClarityLedger,validateClarityScore} from './lib/assessment-team-clarity-correction-v1.mjs';
import {validateTeamProseProvenance} from './lib/assessment-team-publication-audit-v1.mjs';
import {applyCorrectedTeamProse} from './lib/assessment-team-corrected-prose-v1.mjs';
import {validateTeamProse} from './lib/assessment-team-prose-v1.mjs';
const a=process.argv.slice(2);assert.equal(a.length,4);assert.equal(a[0],'--debate');assert.equal(a[2],'--amendment');const r=openTeamRun(a[1]),am=r.read(a[3]);assert(!r.correction);assert.equal(am.debateId,r.record.debateId);const folder=am.folder;assert(folder.startsWith(`${r.record.root}/recovery/`));assert(!existsSync(`${folder}/activation.json`));
const source=validateTeamSourceStage(r),judgments=validateTeamJudgmentStage(r,source),resolved=validateTeamResolvedStage(r,source,judgments);validateTeamScoreStage(r,source,judgments,resolved);const inputs=clarityInputs(r,folder,source,judgments),locks=Object.fromEntries(['authorization','erratum','execution','correctedInventory'].map(k=>[k,am[k]]));const ledger=correctedClarityLedger(source,resolved,inputs,locks);assert.deepEqual(ledger,r.read(am.finalLedger.path));const score=validateClarityScore(r,folder,ledger,{...source,inventory:inputs.inventory},inputs);
const priorHold=r.record.publicationHold;assert(priorHold);const authority=r.read(am.authorization.path);r.check(authority.confirmation);assert.equal(authority.scope.critiqueLeafFields,1);
// Validate the preserved old prose independently of the now-resolved hold. No
// original file or registry state is modified by this historical-only replay.
const prior=validateTeamProseProvenance({...r,record:{...r.record,publicationHold:undefined}});
const intent=r.read(`${folder}/critique/execution-intent.json`),dispatch=r.read(`${folder}/critique/dispatch.json`);for(const k of ['packet','prompt','authorization'])r.check(intent[k]);const packet=r.read(intent.packet.path),replacement=r.read(intent.output);
const publication=applyCorrectedTeamProse(prior.publication,score.scores,score.diagnostics,packet,replacement);
const put=(n,x)=>{const p=`${folder}/${n}`;mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});return fileRecord(p);};
const output=put('publication/prose-output.json',publication),context={...dispatch,intent:fileRecord(`${folder}/critique/execution-intent.json`),dispatch:fileRecord(`${folder}/critique/dispatch.json`),packet:intent.packet,prompt:intent.prompt,output:fileRecord(intent.output)};
const proseExecution=put('publication/prose-execution.json',{status:'passed-publication-prose',correctionKind:'authorized-source-word-clarity-correction',at:new Date().toISOString(),authorization:am.authorization,assessmentAmendment:fileRecord(a[3]),priorExecution:fileRecord(r.local('publication/prose-execution.json')),priorOutput:prior.execution.output,context,output,validation:validateTeamProse(publication.candidate),otherEditorialFieldChanges:0,mechanicalChanges:['affected card and any dependent calculated display values','source and calculation provenance notes'],directIncrementalCostUsd:0});
const activation=put('activation.json',{status:'activated-authorized-clarity-and-publication-correction',at:new Date().toISOString(),debateNumber:r.record.debateNumber,debateId:r.record.debateId,folder,assessmentAmendment:fileRecord(a[3]),proseExecution,priorPublicationHold:priorHold,originalArtifactsPreserved:true});
r.record.clarityCorrection=activation;r.record.status='score-frozen-corrected-prose-ready-for-rhetorical-review';delete r.record.publicationHold;
writeFileSync('docs/assessment-production/standalone-debates-v1/registry.json',JSON.stringify(r.registry,null,2)+'\n');
const next=openTeamRun(a[1]),s=validateTeamSourceStage(next),j=validateTeamJudgmentStage(next,s),l=validateTeamResolvedStage(next,s,j);validateTeamScoreStage(next,s,j,l);validateTeamProseProvenance(next);
console.log(JSON.stringify({status:'correction-activated-and-audited',activation,overall:score.scores.overall,prose:validateTeamProse(publication.candidate)}));
