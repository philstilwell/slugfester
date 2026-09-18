import fs from 'node:fs';import assert from 'node:assert/strict';
import {fileRecord} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
import {checkClarityReplacement} from './tmp-standalone-check-clarity-replacement.mjs';
import {authenticateSubmissionHistory} from './tmp-standalone-source-resolutions.mjs';
export function integrateAuthorizedClarity(base,pass,original,review){
 const read=p=>JSON.parse(fs.readFileSync(p)),root=base+'/judgments/clarity-replacement-1',plan=read(root+'/execution-plan.json'),auth=read(plan.authorization.path);
 assert.equal(fileRecord(plan.authorization.path).sha256,plan.authorization.sha256);assert.equal(auth.status,'authorized-before-execution');assert.equal(auth.attemptsPerField,1);assert.equal(auth.retries,0);
 const allowed=auth.approvedFields.find(x=>x.pass===pass),rec=plan.records.find(x=>x.pass===pass);assert(allowed&&rec);
 assert.equal(fileRecord(allowed.preservedOutput.path).sha256,allowed.preservedOutput.sha256);assert.equal(allowed.preservedOutput.sha256,review.output.sha256);
 assert.equal(review.status,'blocked-narrow-substantive-field-replacement-required');
 assert.deepEqual(review.blockedFields.map(x=>({moveId:x.moveId,dimension:x.field})),allowed.fields);
 assert.equal(fileRecord(rec.packet.path).sha256,rec.packet.sha256);
 const p=read(rec.packet.path),o=read(rec.outputPath),dir=rec.packet.path.replace('/packet.json',''),execution=read(dir+'/execution.json'),accepted=read(dir+'/controller-review.json');
 checkClarityReplacement(o,p);assert.deepEqual(p.assignedFields,allowed.fields);assert.equal(p.pass,pass);
 assert(execution.completeRequiredInputRead&&execution.completeSourceReadBeforeSubmission);authenticateSubmissionHistory(execution,accepted,p);
 assert.equal(execution.output.sha256,fileRecord(execution.output.path).sha256);assert.equal(accepted.output.sha256,execution.output.sha256);assert.equal(accepted.status,'accepted-source-specific-clarity-replacement');assert.equal(accepted.unresolvedAssessmentQualityFields,0);assert.deepEqual(accepted.acceptedFields,allowed.fields);
 const adjusted=structuredClone(original);
 for(const r of o.replacements){const j=adjusted.judgments.find(j=>j.moveId===r.moveId);assert(j);j.dimensions[r.dimension]={value:r.value,rationale:r.rationale};j.dimensionEvidence[r.dimension]=r.evidence;}
 const restored=structuredClone(adjusted);for(const f of allowed.fields){const target=restored.judgments.find(j=>j.moveId===f.moveId),old=original.judgments.find(j=>j.moveId===f.moveId);target.dimensions[f.dimension]=old.dimensions[f.dimension];target.dimensionEvidence[f.dimension]=old.dimensionEvidence[f.dimension];}assert.deepEqual(restored,original);
 return {output:adjusted,record:{authorization:plan.authorization,plan:fileRecord(root+'/execution-plan.json'),packet:rec.packet,output:execution.output,execution:fileRecord(dir+'/execution.json'),review:fileRecord(dir+'/controller-review.json'),replacedFields:allowed.fields,originalPreserved:allowed.preservedOutput,manualRatingEdits:0,allOtherFieldsUnchanged:true}};
}
