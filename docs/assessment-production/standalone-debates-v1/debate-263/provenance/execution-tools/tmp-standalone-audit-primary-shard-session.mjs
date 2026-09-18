import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {fileRecord} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';
import {checkPrimaryShard} from './tmp-standalone-check-primary-shard.mjs';
export function auditPrimaryShardSession(sessionPath,packetPath,validate=checkPrimaryShard){
 const read=p=>JSON.parse(fs.readFileSync(p));const p=read(packetPath),o=read(p.outputPath),validation=validate(o,p);
 for(const lock of[p.source,p.events,p.checker,...p.controls])assert.equal(fileRecord(lock.path).sha256,lock.sha256,lock.path);
 const bytes=fs.readFileSync(sessionPath),rows=bytes.toString().trim().split('\n').map(JSON.parse);
 const calls=new Map(rows.filter(r=>r.type==='response_item'&&['custom_tool_call','function_call'].includes(r.payload.type)).map(r=>[r.payload.call_id,r]));
 const input=r=>r?.payload.input??r?.payload.arguments??'';
 const unwrap=v=>{if(Array.isArray(v))return v.map(unwrap).join('\n');if(v&&typeof v==='object')return typeof v.output==='string'?unwrap(v.output):typeof v.text==='string'?unwrap(v.text):JSON.stringify(v);if(typeof v!=='string')return String(v);try{const j=JSON.parse(v);return j&&typeof j==='object'?unwrap(j):v;}catch{return v;}};
 const returns=new Map(rows.filter(r=>r.type==='response_item'&&['custom_tool_call_output','function_call_output'].includes(r.payload.type)).map(r=>[r.payload.call_id,{row:r,text:unwrap(r.payload.output)}]));
 const writeCells=[...calls.values()].filter(r=>input(r).includes('tools.apply_patch('));
 const successfulCells=writeCells.filter(r=>!(returns.get(r.payload.call_id)?.text??'').startsWith('Script failed'));
 const firstWrite=successfulCells[0]?.ordinal??Infinity;
 const source=fs.readFileSync(p.source.path,'utf8').trimEnd().split('\n'),sourceSet=new Set(source),seenSource=new Set();
 const textResults=[],sourceEvidence=[],checks=[],toolCalls=[];
 for(const [id,result]of returns){const c=calls.get(id),cmd=input(c),text=result.text,before=result.row.ordinal<firstWrite,truncated=/tokens truncated|Warning: truncated output/.test(text);
  if(before)textResults.push({id,text,truncated});
  if(before){const matched=text.split('\n').filter(l=>sourceSet.has(l));matched.forEach(l=>seenSource.add(l));const ranges=[];for(const line of matched){const n=Number(line.split('\t')[0]),last=ranges.at(-1);if(last&&last[1]+1===n)last[1]=n;else ranges.push([n,n]);}if(matched.length)sourceEvidence.push({callId:id,time:result.row.timestamp,eventCount:matched.length,firstEvent:Number(matched[0].split('\t')[0]),lastEvent:Number(matched.at(-1).split('\t')[0]),visibleEventRanges:ranges,untruncated:!truncated,onlyExactVisibleLinesCredited:true,beforeSubmission:true});}
  if(/checkPrimaryShard|--check-stdin/.test(cmd))checks.push({callId:id,time:result.row.timestamp,beforeSubmission:before,sameSubmissionCell:c?.ordinal===firstWrite,result:text.includes('mechanically-valid-editorial-review-required')?'passed':/Error|ERR_/.test(text)?'draft-or-invocation-error':'inspect',diagnostic:text.slice(0,600)});
  toolCalls.push({callId:id,name:c?.payload.name,time:result.row.timestamp,commandSha256:crypto.createHash('sha256').update(cmd).digest('hex'),commandPreview:cmd.slice(0,600),outputCharacters:text.length,truncated,beforeSubmission:before});
 }
 // A truncated aggregate still exposes its literal prefix and suffix. Credit
 // only exact lines actually returned to the reviewer; never credit the omitted
 // middle. Any missing line must appear in a separate read before submission.
 const visibleLines=new Set(textResults.flatMap(r=>r.text.split('\n').map(s=>s.trim())).filter(Boolean));
 const inputAuthentication=[fileRecord(packetPath),...p.controls].map(lock=>{const raw=fs.readFileSync(lock.path,'utf8').trimEnd(),lines=[...new Set(raw.split('\n').map(s=>s.trim()).filter(Boolean))],completeCalls=textResults.filter(r=>r.text.includes(raw)),missing=completeCalls.length?[]:lines.filter(l=>!visibleLines.has(l));return{...lock,complete:missing.length===0,uniqueLines:lines.length,authenticatedUniqueLines:lines.length-missing.length,visibleFragmentAuthentication:true,completeDocumentCalls:completeCalls.map(r=>({callId:r.id,aggregateTruncationElsewhere:r.truncated})),missingLines:missing};});
 const models=rows.filter(r=>r.type==='turn_context').map(r=>({model:r.payload.model,reasoningEffort:r.payload.effort}));assert(models.length&&models.every(m=>m.model===p.model.model&&m.reasoningEffort===p.model.reasoningEffort));
 return{schemaVersion:'1.0-primary-shard-execution-audit',debateNumber:p.debateNumber,debateId:p.debateId,pass:p.pass,shardId:p.shardId,kind:p.kind,agentPath:rows.find(r=>r.type==='session_meta')?.payload.agent_path,session:{path:sessionPath,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')},actualContextModels:models,validation,packet:fileRecord(packetPath),source:p.source,checker:p.checker,inputAuthentication,completeRequiredInputRead:inputAuthentication.every(r=>r.complete),completeSourceReadBeforeSubmission:source.every(l=>seenSource.has(l)),expectedSourceEvents:source.length,authenticatedSourceEvents:seenSource.size,missingSourceEvents:source.filter(l=>!seenSource.has(l)).map(l=>Number(l.split('\t')[0])),sourceReadEvidence:sourceEvidence,draftChecks:checks,successfulSubmissionCells:successfulCells.map(r=>({callId:r.payload.call_id,time:r.timestamp,absoluteOutputPathPresent:input(r).includes(p.outputPath)})),failedWriteContainingCells:writeCells.filter(r=>!successfulCells.includes(r)).map(r=>({callId:r.payload.call_id,time:r.timestamp,diagnostic:returns.get(r.payload.call_id)?.text.slice(0,1000),requiresControllerPrewriteFailureConfirmation:true})),output:fileRecord(path.relative(process.cwd(),p.outputPath)),toolCalls,directCostUsd:0};
}
if(process.argv[2])console.log(JSON.stringify(auditPrimaryShardSession(process.argv[2],process.argv[3]),null,2));
