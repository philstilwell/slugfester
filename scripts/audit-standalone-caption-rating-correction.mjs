import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {canonicalJson,fileRecord,validateStandalonePrimaryJudgment,extractStandaloneDisagreements} from './lib/assessment-production-standalone-debate-v1.mjs';

export function auditCaptionRatingCorrection(number){
  const read=p=>JSON.parse(fs.readFileSync(p));
  const check=r=>assert.deepEqual(fileRecord(r.path),r);
  const entry=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(x=>x.debateNumber===number);assert(entry);
  const root=entry.root,base=`${root}/judgments/caption-correction-1`,authorization=read(`${base}/authorization.json`),plan=read(`${base}/execution-plan.json`),execution=read(`${base}/execution.json`),completion=read(`${base}/completion-audit.json`);
  for(const x of [authorization,plan,execution,completion]){assert.equal(x.debateNumber,number);assert.equal(x.debateId,entry.debateId);}
  assert.equal(authorization.status,'authorized-and-frozen-before-correction');assert(authorization.userApproval.length>0);
  assert.equal(execution.status,'complete-and-validated');assert.equal(completion.status,'passed-authorized-correction-hold-resolved');
  for(const r of [authorization.hold,plan.authorization,execution.authorization,execution.plan,completion.hold,completion.authorization,completion.execution,completion.canonicalExecution,completion.newDisagreements,...completion.canonicalPasses])check(r);
  for(const p of Object.values(authorization.preservedOriginals)){check(p.preserved);assert.equal(p.original.sha256,p.preserved.sha256);assert.equal(p.original.bytes,p.preserved.bytes);}
  const invPath=`${root}/inventory/inventory.json`,inventory=read(invPath),inventorySha256=fileRecord(invPath).sha256;
  let replaced=0,unchanged=0;const candidates={};
  assert.deepEqual(execution.passes.map(p=>p.pass),['pass-a','pass-b']);
  for(const [i,p]of execution.passes.entries()){
    assert.equal(p.pass,plan.passes[i].pass);assert.equal(p.agentTask,plan.passes[i].agentTask);assert.equal(p.attemptCount,1);assert.equal(p.retryCount,0);
    for(const r of [p.packet,p.rawCorrection,p.correctedOutput,p.originalOutput])check(r);
    // Cache-only full scoped source may be absent in repository-only replay; its frozen hash remains in the authenticated packet.
    for(const r of p.allowedInputs)if(!r.path.startsWith('.assessment-cache/'))check(r);
    const raw=read(p.rawCorrection.path),original=read(p.originalOutput.path),candidate=structuredClone(original),mask=authorization.fieldsByPass[p.pass];
    assert.deepEqual(raw.replacements.map(x=>x.field),mask);assert.deepEqual(p.allowedFields,mask);
    for(const r of raw.replacements){const [id,key]=r.field.split('.');assert(Number.isInteger(r.value)&&r.value>=0&&r.value<=100);assert(r.rationale.length>=40);const m=candidate.judgments.find(x=>x.moveId===id);assert(Object.hasOwn(m.dimensions,key));m.dimensions[key]={value:r.value,rationale:r.rationale};}
    assert.equal(canonicalJson(candidate),canonicalJson(read(p.correctedOutput.path)));assert.equal(canonicalJson(candidate),canonicalJson(read(`${root}/judgments/${p.pass}/output.json`)));
    validateStandalonePrimaryJudgment(candidate,inventory,{expectedPass:p.pass,expectedInventorySha256:inventorySha256});
    assert.deepEqual(candidate.burdenCompletionAdjustment,original.burdenCompletionAdjustment);
    assert.deepEqual(candidate.judgments.map(x=>x.assessmentConfidence),original.judgments.map(x=>x.assessmentConfidence));
    assert.equal(raw.audit.captionQualityNotPenalized,true);assert.equal(raw.audit.oldAffectedRatingsUnavailable,true);assert.equal(raw.audit.otherJudgmentUnavailable,true);assert.equal(raw.audit.calculatedTotalsUnavailable,true);
    candidates[p.pass]=candidate;replaced+=mask.length;unchanged+=inventory.moves.length*6-mask.length;
  }
  assert.equal(replaced,authorization.affectedDimensionJudgments);assert.equal(unchanged,authorization.unaffectedDimensionJudgments);
  const derived=extractStandaloneDisagreements({inventory,passA:candidates['pass-a'],passB:candidates['pass-b']});
  const actual=read(`${root}/disagreements/disagreements.json`),{evidenceLocks,...body}=actual;
  assert.equal(canonicalJson(derived),canonicalJson(body));
  assert.equal(evidenceLocks.inventory.sha256,inventorySha256);
  for(const [name,pass]of [['passA','pass-a'],['passB','pass-b']])assert.equal(evidenceLocks[name].sha256,fileRecord(`${root}/judgments/${pass}/output.json`).sha256);
  return {status:'passed',debateNumber:number,replacedDimensionJudgments:replaced,unaffectedDimensionJudgments:unchanged,burdenJudgmentsUnchanged:4,originalOutputsPreserved:true,disputes:derived.disputes.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const n=process.argv[process.argv.indexOf('--debate')+1];assert(/^\d{3,}$/.test(n));console.log(JSON.stringify(auditCaptionRatingCorrection(n),null,2));}
