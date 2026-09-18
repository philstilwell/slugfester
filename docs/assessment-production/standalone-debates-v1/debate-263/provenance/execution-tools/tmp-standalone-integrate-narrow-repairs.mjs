import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileRecord,serializedJson,validateStandaloneInventory,validatePrimarySpeakerScopeException} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
import {checkNarrowRepair} from './tmp-standalone-check-narrow-repair.mjs';
const args=process.argv.slice(2);assert(args.length===2||args.length===3);assert.equal(args[0],'--debate');if(args[2])assert.equal(args[2],'--freeze');
const read=p=>JSON.parse(fs.readFileSync(p));
const rec=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(r=>r.debateNumber===args[1]);assert(rec);
const root=rec.root+'/inventory/narrow-repairs-1',amend=root+'/semantic-amendment-1',auth=read(amend+'/authorization.json'),manifest=read(rec.root+'/manifest.json');
assert.equal(auth.debateId,rec.debateId);assert.equal(auth.debateNumber,rec.debateNumber);
for(const lock of [auth.baseline,auth.priorCheckpoint,auth.source,...auth.retainedOutputs,...Object.values(manifest.sourceLocks),...Object.values(manifest.controlLocks)])assert.equal(fileRecord(lock.path).sha256,lock.sha256,lock.path);
const baseline=read(auth.baseline.path),amended=structuredClone(baseline);
const replacementDir=root+'/evidence-12-replacement-1',replacementAuth=read(replacementDir+'/authorization.json');
assert.equal(replacementAuth.debateNumber,rec.debateNumber);assert.equal(replacementAuth.debateId,rec.debateId);
assert.equal(replacementAuth.maxAttempts,1);assert.equal(replacementAuth.retries,0);
for(const lock of [replacementAuth.previousFailedOutput,replacementAuth.originalPacket,...replacementAuth.retainedOutputs])assert.equal(fileRecord(lock.path).sha256,lock.sha256,lock.path);
const originalFinalPacket=read(replacementAuth.originalPacket.path),replacementPacket=read(replacementDir+'/packet.json');
assert.deepEqual(replacementAuth.allowedMoveIds,originalFinalPacket.moves.map(m=>m.moveId));
for(const k of ['moves','source','sourceEventsFile','baseline','model','authorization'])assert.deepEqual(replacementPacket[k],originalFinalPacket[k],k+': replacement must preserve original frozen input');
for(const edit of auth.edits){const move=amended.moves.find(m=>m.moveId===edit.moveId);assert(move);const keys=edit.field.split('.');let target=move;for(const key of keys.slice(0,-1))target=target[key];assert.equal(target[keys.at(-1)],edit.before);target[keys.at(-1)]=edit.after;}
const candidate=structuredClone(amended),selectedIds=baseline.moves.filter(m=>m.sourceSpan.excerpt.length>2200).map(m=>m.moveId),processed=[];
const oldReview=read(root+'/controller-checkpoint.json'),records=[],reviews=[];
for(let n=1;n<=12;n++){
  const id='evidence-'+String(n).padStart(2,'0'),dir=n===4?amend+'/evidence-04':n===12?replacementDir:root+'/'+id,p=read(dir+'/packet.json'),o=read(p.outputPath),execution=read(dir+'/execution.json');
  assert(execution.completeUntruncatedPacketReadBeforeSubmission&&execution.completeUntruncatedAssignedSourceReadBeforeSubmission,dir+': incomplete read authentication');
  assert.equal(execution.submissions.length,1);assert.equal(execution.output.sha256,fileRecord(path.relative(process.cwd(),p.outputPath)).sha256);
  assert.equal(execution.packet.sha256,fileRecord(dir+'/packet.json').sha256);
  const check=checkNarrowRepair(o,p),review=n<=3?{status:'accepted-narrow-delta',moves:oldReview.reviews.filter(m=>o.repairs.some(r=>r.moveId===m.moveId))}:read(dir+'/controller-review.json');
  assert.equal(review.status,'accepted-narrow-delta');assert.deepEqual(review.moves.map(m=>m.moveId),o.repairs.map(m=>m.moveId));
  if(n>3)assert.equal(review.output.sha256,execution.output.sha256);
  for(const [i,repair] of o.repairs.entries()){
    const m=candidate.moves.find(m=>m.moveId===repair.moveId);assert(m&&!processed.includes(m.moveId));processed.push(m.moveId);
    const expected=structuredClone(amended.moves.find(x=>x.moveId===repair.moveId));delete expected.sourceSpan.excerpt;delete expected.longerCompleteArgumentRationale;
    assert.deepEqual(p.moves[i],expected,repair.moveId+': packet semantic mismatch');
    m.sourceSpan=check.moves[i].sourceSpan;m.quoteEligibleExactSpans=repair.quoteEligibleExactSpans;
    if(repair.longerCompleteArgumentRationale)m.longerCompleteArgumentRationale=repair.longerCompleteArgumentRationale;else delete m.longerCompleteArgumentRationale;
  }
  records.push({packet:fileRecord(dir+'/packet.json'),execution:fileRecord(dir+'/execution.json'),output:fileRecord(path.relative(process.cwd(),p.outputPath))});reviews.push(review);
}
assert.deepEqual(processed,selectedIds);
const adir=amend+'/audit-explanations',ap=read(adir+'/packet.json'),ao=read(ap.outputPath),ae=read(adir+'/execution.json'),ar=read(adir+'/controller-review.json');
assert.equal(ao.debateId,rec.debateId);assert.equal(ao.debateNumber,rec.debateNumber);assert(ae.completeUntruncatedPacketReadBeforeSubmission);assert.equal(ae.submissions.length,1);assert.equal(ar.status,'accepted-audit-explanations');assert.equal(ar.output.sha256,fileRecord(path.relative(process.cwd(),ap.outputPath)).sha256);
candidate.selectionBalanceAudit.rationale=ao.selectionBalanceRationale;candidate.publicationCapacityAudit.sections[4].rationale=ao.evilScriptureCapacityRationale;
for(const [i,m]of candidate.moves.entries()){
  const x=structuredClone(m),y=structuredClone(amended.moves[i]);
  if(selectedIds.includes(m.moveId))for(const k of ['sourceSpan','quoteEligibleExactSpans','longerCompleteArgumentRationale']){delete x[k];delete y[k];}
  assert.deepEqual(x,y,m.moveId+': unauthorized semantic delta');
}
for(const key of Object.keys(amended))if(!['moves','selectionBalanceAudit','publicationCapacityAudit'].includes(key))assert.deepEqual(candidate[key],amended[key],key);
const sb=structuredClone(candidate.selectionBalanceAudit),osb=structuredClone(amended.selectionBalanceAudit);delete sb.rationale;delete osb.rationale;assert.deepEqual(sb,osb);
const pc=structuredClone(candidate.publicationCapacityAudit),opc=structuredClone(amended.publicationCapacityAudit);delete pc.sections[4].rationale;delete opc.sections[4].rationale;assert.deepEqual(pc,opc);
const events=read('.assessment-cache/captions/'+rec.videoId+'/events.json'),authorization=read(rec.root+'/authorization.json'),source=read(rec.root+'/source/source-lock.json');
let nextEvent=0;const coveredMoveIds=[];
for(const segment of candidate.completeTranscriptCoverage){
  assert.equal(segment.startEvent,nextEvent,'Coverage partition gap or overlap');
  assert(Number.isInteger(segment.endEvent)&&segment.endEvent>=segment.startEvent&&segment.endEvent<events.length);
  assert(typeof segment.reason==='string'&&segment.reason.length>40);
  for(const id of segment.moveIds){const move=candidate.moves.find(m=>m.moveId===id);assert(move&&!coveredMoveIds.includes(id));assert(move.sourceSpan.startEvent>=segment.startEvent&&move.sourceSpan.endEvent<=segment.endEvent,id+': outside coverage segment');coveredMoveIds.push(id);}
  nextEvent=segment.endEvent+1;
}
assert.equal(nextEvent,events.length);assert.deepEqual(coveredMoveIds.toSorted(),candidate.moves.map(m=>m.moveId).toSorted());
assert.equal(candidate.motion,authorization.identity.motion);
const validation=validateStandaloneInventory(candidate,events),scope=validatePrimarySpeakerScopeException({authorization,sourceLock:source,inventory:candidate});
const counts=candidate.sections.map(s=>({sectionId:s.sectionId,pro:candidate.moves.filter(m=>m.sectionId===s.sectionId&&m.side==='pro').length,con:candidate.moves.filter(m=>m.sectionId===s.sectionId&&m.side==='con').length,weightPercent:s.weightPercent}));
const audit={schemaVersion:'1.0-authorized-narrow-inventory-integration',status:'accepted-before-primary-judgment',debateNumber:rec.debateNumber,debateId:rec.debateId,checkedAt:new Date().toISOString(),baseline:auth.baseline,semanticAmendment:fileRecord(amend+'/authorization.json'),records,auditExplanations:{packet:fileRecord(adir+'/packet.json'),execution:fileRecord(adir+'/execution.json'),output:fileRecord(path.relative(process.cwd(),ap.outputPath)),review:fileRecord(adir+'/controller-review.json')},validation,scope,counts,moveCount:candidate.moves.length,repairedSourcePassages:processed.length,semanticChangesOnlyApproved:auth.edits,allOtherSemanticFieldsUnchanged:true,directCostUsd:0};
audit.finalEvidenceReplacementAuthorization=fileRecord(replacementDir+'/authorization.json');
audit.coverageReplay={eventCount:events.length,partitionedEvents:nextEvent,uniqueCoveredMoveCount:coveredMoveIds.length,complete:true};
if(args[2]==='--freeze'){
  const invPath=rec.root+'/inventory/inventory.json',auditPath=rec.root+'/inventory/acceptance.json';for(const p of [invPath,auditPath])assert(!fs.existsSync(p),'Preserve '+p);
  fs.writeFileSync(invPath,serializedJson(candidate),{flag:'wx'});audit.inventory=fileRecord(invPath);fs.writeFileSync(auditPath,serializedJson(audit),{flag:'wx'});
}
console.log(JSON.stringify({status:audit.status,validation,scope,counts,moveCount:audit.moveCount,repairedSourcePassages:processed.length,frozen:args[2]==='--freeze'},null,2));
