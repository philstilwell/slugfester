import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateStandaloneInventory} from '../../../../../scripts/lib/assessment-production-standalone-debate-v1.mjs';
import {validateEditorScopedSource} from '../../../../../scripts/lib/assessment-editor-scoped-source.mjs';
const base=path.dirname(path.dirname(fileURLToPath(import.meta.url))),root=process.cwd(),read=p=>JSON.parse(fs.readFileSync(p));
const auth=read(path.join(base,'authorization.json')),lock=read(path.join(base,'source/source-lock.json')),id=auth.identity;
assert.equal(process.argv[process.argv.indexOf('--debate')+1],id.debateNumber);
const entry=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(x=>x.debateNumber===id.debateNumber);
assert.equal(path.resolve(entry.root),base);assert.equal(entry.debateId,id.debateId);assert.equal(entry.videoId,id.videoId);
const e=read(path.join(root,'.assessment-cache/captions',id.videoId,'events.json')),p=JSON.parse(fs.readFileSync(0,'utf8'));
assert.deepEqual(Object.keys(p).sort(),['motion','routes','sections','moves','coverageAudit','speakerAttributionReview','selectionBalanceAudit','publicationCapacityAudit','moderatorContextAudit'].sort());assert.equal(p.motion,id.motion);
const inv={schemaVersion:'1.2-standalone-score-blind-inventory',protocolId:auth.protocolId,status:'complete-and-frozen',debateNumber:id.debateNumber,debateId:id.debateId,assessmentModel:auth.execution.recordedDisplayModel,reasoningEffort:auth.execution.reasoningEffort,assessedDebateWindowMs:lock.participants.assessedDebateWindowMs,editorApprovedScope:id.editorApprovedScope,...p,audit:{calculatedTotalsAbsent:true,completeTranscriptReviewed:true,allSpansSourceExact:true},moves:p.moves.map(m=>{const {startEvent,endEvent,...rest}=m;assert(Number.isInteger(startEvent)&&Number.isInteger(endEvent)&&e[startEvent]&&e[endEvent]);return {...rest,sourceSpan:{startEvent,endEvent,startMs:e[startEvent].startMs,endMs:e[endEvent].startMs+e[endEvent].durationMs,excerpt:e.slice(startEvent,endEvent+1).map(x=>x.text).join(' ').replace(/\s+/g,' ').trim()}}})};
for(const m of inv.moves){assert.equal(m.speaker,id[m.side].speaker);assert(m.sourceSpan.startMs>=inv.assessedDebateWindowMs.start&&m.sourceSpan.endMs<=inv.assessedDebateWindowMs.end);for(const x of lock.excludedIntervals)assert(!(m.sourceSpan.startMs<x.endMs&&m.sourceSpan.endMs>x.startMs),'Excluded source overlap: '+m.moveId);assert(p.routes.find(x=>x.side===m.side).bridges.some(x=>x.bridgeId===m.burdenContact.bridgeId));assert.deepEqual([...new Set(m.responseComponents.map(x=>x.targetMoveId))].sort(),[...m.respondsToIds].sort());assert(m.sourceSpanSelectionRationale?.length>=40);if(m.sourceSpan.excerpt.length>2200)assert(m.sourceSpanSelectionRationale.length>=100);}
for(const side of ['pro','con'])assert(inv.moves.some(m=>m.side===side&&m.quoteEligibleExactSpans.length));
console.log(JSON.stringify({status:'passed-unsaved-inventory-mechanics',result:validateStandaloneInventory(inv,e),scope:validateEditorScopedSource({authorization:auth,sourceLock:lock,inventory:inv}),audioTriggers:inv.moves.filter(m=>m.attributionConfidence!=='high').map(m=>({moveId:m.moveId,reason:m.audioVerificationReason}))},null,2));
