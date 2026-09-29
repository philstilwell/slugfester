import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateStandaloneInventory, fileRecord, sha256} from '../../scripts/lib/assessment-production-standalone-debate-v1.mjs';
const arg=(name)=>{const i=process.argv.indexOf(name);assert(i>=0,`${name} required`);return process.argv[i+1];};
const root=process.cwd();
const registry=JSON.parse(fs.readFileSync('docs/assessment-production/standalone-debates-v1/registry.json'));
const entry=registry.debates.find(x=>x.debateNumber===arg('--debate'));assert(entry);
const base=entry.root;
const read=p=>JSON.parse(fs.readFileSync(p));
const auth=read(`${base}/authorization.json`),manifest=read(`${base}/manifest.json`),lock=read(`${base}/source/source-lock.json`);
const input=path.resolve(arg('--input'));assert(input.startsWith(path.resolve(base,'inventory')+path.sep));
const parts=read(input);assert.equal(parts.motion,auth.identity.motion);
assert.equal(sha256(JSON.stringify(parts)),arg('--approved-sha'));
const events=read(manifest.sourceLocks.events.path);
const inventory={schemaVersion:manifest.inventoryControls.schemaVersion,protocolId:auth.protocolId,status:'complete-and-frozen',debateNumber:entry.debateNumber,debateId:entry.debateId,assessmentModel:auth.execution.recordedDisplayModel,reasoningEffort:auth.execution.reasoningEffort,assessedDebateWindowMs:lock.participants.assessedDebateWindowMs,...parts,audit:{calculatedTotalsAbsent:true,completeTranscriptReviewed:true,allSpansSourceExact:true},moves:parts.moves.map(m=>{const {startEvent,endEvent,...rest}=m;assert(events[startEvent]&&events[endEvent]);return {...rest,sourceSpan:{startEvent,endEvent,startMs:events[startEvent].startMs,endMs:events[endEvent].startMs+events[endEvent].durationMs,excerpt:events.slice(startEvent,endEvent+1).map(e=>e.text).join(' ').replace(/\s+/g,' ').trim()}};})};
const derived=inventory.sections.map(s=>{const pro=inventory.moves.filter(m=>m.sectionId===s.sectionId&&m.side==='pro').length,con=inventory.moves.filter(m=>m.sectionId===s.sectionId&&m.side==='con').length;return {sectionId:s.sectionId,pro,con,absoluteDifference:Math.abs(pro-con)};});
const pro=inventory.moves.filter(m=>m.side==='pro').length,con=inventory.moves.filter(m=>m.side==='con').length;
assert.deepEqual(parts.selectionBalanceAudit.totals,{pro,con,absoluteDifference:Math.abs(pro-con)});
assert.deepEqual(parts.selectionBalanceAudit.sections,derived);
assert.equal(parts.selectionBalanceAudit.rationaleRequired,Math.abs(pro-con)>=3||derived.some(x=>x.absoluteDifference>=2));
for(const [i,s] of derived.entries()){
 const a=parts.publicationCapacityAudit.sections[i];assert.equal(a.sectionId,s.sectionId);assert.equal(a.pro,s.pro);assert.equal(a.con,s.con);
 assert.equal(a.withinCapacity,s.pro<=4&&s.con<=4);assert.equal(a.fourthRowRequired,s.pro===4||s.con===4);assert.equal(a.fourthRowAuthorized,true);
 if(a.fourthRowRequired)assert(a.rationale.length>=40);
}
for(const m of inventory.moves){const route=inventory.routes.find(r=>r.side===m.side);assert(route.bridges.some(b=>b.bridgeId===m.burdenContact.bridgeId));assert.equal(m.speaker,auth.identity[m.side].speaker);assert.deepEqual([...new Set(m.responseComponents.map(r=>r.targetMoveId))].sort(),[...m.respondsToIds].sort());}
const result=validateStandaloneInventory(inventory,events);
const out=`${base}/inventory/inventory.json`,audit=`${base}/inventory/mechanical-validation.json`;
if(process.argv.includes('--check-only')){console.log(JSON.stringify({status:'passed-check-only',result,derived},null,2));process.exit(0);}
assert(!fs.existsSync(out)&&!fs.existsSync(audit));
fs.writeFileSync(out,JSON.stringify(inventory,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(audit,JSON.stringify({status:'passed',debateNumber:entry.debateNumber,sourceParts:fileRecord(path.relative(root,input),root),inventory:fileRecord(out,root),result,independentlyDerivedCounts:{pro,con,sections:derived},exactSourceSpansChecked:true,quotesChecked:true,chronologyChecked:true,responseTargetsChecked:true,burdenSideOwnershipChecked:true,controllerModelAuthoredSubstance:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({inventory:fileRecord(out,root),audit:fileRecord(audit,root),result}));
