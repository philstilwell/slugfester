import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileRecord,validateStandalonePrimaryJudgment} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';

export function auditPrimarySession(sessionPath,debateNumber,pass) {
  const read=p=>JSON.parse(fs.readFileSync(p));
  const rec=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(r=>r.debateNumber===debateNumber);assert(rec);
  const plan=read(rec.root+'/judgments/execution-plan.json'),instructions=read(rec.root+'/judgments/execution-instructions.json');
  const assigned=plan.passes.find(p=>p.pass===pass);assert(assigned);
  for(const lock of plan.inputs)assert.equal(fileRecord(lock.path).sha256,lock.sha256,lock.path);
  const inventory=read(rec.root+'/inventory/inventory.json'),output=read(assigned.outputPath);
  const validation=validateStandalonePrimaryJudgment(output,inventory,{expectedPass:pass,expectedInventorySha256:instructions.inventorySha256});
  const bytes=fs.readFileSync(sessionPath),rows=bytes.toString().trim().split('\n').map(JSON.parse);
  const calls=new Map(rows.filter(r=>r.type==='response_item'&&['function_call','custom_tool_call'].includes(r.payload.type)).map(r=>[r.payload.call_id,r]));
  const input=r=>r?.payload.input??r?.payload.arguments??'';
  const unwrap=v=>{
    if(Array.isArray(v))return v.map(unwrap).join('\n');
    if(typeof v==='object'&&v!==null)return typeof v.output==='string'?unwrap(v.output):typeof v.text==='string'?unwrap(v.text):JSON.stringify(v);
    if(typeof v!=='string')return String(v);
    try {const p=JSON.parse(v);return typeof p==='object'?unwrap(p):v;} catch{return v;}
  };
  const returns=new Map(rows.filter(r=>r.type==='response_item'&&['function_call_output','custom_tool_call_output'].includes(r.payload.type)).map(r=>[r.payload.call_id,unwrap(r.payload.output)]));
  const writeInvocations=[...calls.values()].filter(r=>input(r).includes('tools.apply_patch('));
  const failedBeforeExecution=writeInvocations.filter(r=>{
    const diagnostic=returns.get(r.payload.call_id)??'';
    return /^Script failed/m.test(diagnostic)&&(/Script error:\s*SyntaxError:|ReferenceError: btoa is not defined/.test(diagnostic)||(/Script error:\s*Error: file:.*\[eval1\]/.test(diagnostic)&&input(r).includes('if(r.exit_code!==0) throw new Error(r.output)')));
  });
  const writes=writeInvocations.filter(r=>!failedBeforeExecution.includes(r));
  const firstWrite=writes[0]?.ordinal??Infinity;
  const sourcePath='.assessment-cache/captions/'+rec.videoId+'/indexed-transcript.txt';
  const sourceLines=fs.readFileSync(sourcePath,'utf8').trimEnd().split('\n'),sourceSet=new Set(sourceLines),covered=new Set();
  const evidence=[],readCalls=[],texts=[],allBeforeTexts=[],draftChecks=[];
  for(const row of rows){
    if(row.type!=='response_item'||!['function_call_output','custom_tool_call_output'].includes(row.payload.type))continue;
    const call=calls.get(row.payload.call_id),command=input(call),text=unwrap(row.payload.output);
    const truncated=/Warning: truncated output|tokens truncated|original_token_count.*truncat/i.test(text),before=row.ordinal<firstWrite;
    if(before)allBeforeTexts.push({callId:row.payload.call_id,text,truncated});
    if(before&&!truncated){texts.push(text);const matches=text.split('\n').filter(l=>sourceSet.has(l));matches.forEach(l=>covered.add(l));if(matches.length)evidence.push({callId:row.payload.call_id,time:row.timestamp,events:matches.map(l=>Number(l.split('\t')[0])),untruncated:true,beforeSubmission:true});}
    if(command.includes('exec_command'))readCalls.push({callId:row.payload.call_id,time:row.timestamp,command,outputCharacters:text.length,truncated,beforeSubmission:before});
    if(command.includes('validateStandalonePrimaryJudgment')&&command.includes('node')){
      const guardedWithinSubmissionCell=call?.ordinal===firstWrite&&command.indexOf('validateStandalonePrimaryJudgment')<command.indexOf('tools.apply_patch(')&&command.includes('exit_code')&&/exit\(\)|throw new Error/.test(command);
      draftChecks.push({callId:row.payload.call_id,time:row.timestamp,beforeSubmission:before||guardedWithinSubmissionCell,guardedWithinSubmissionCell,result:/("status"\s*:\s*"passed"|In-memory validation passed)/.test(text)?'passed':/Error|ERR_/.test(text)?'draft-or-invocation-error':'inspect',diagnosticExcerpt:text.slice(0,500)});
    }
  }
  const joined=texts.join('\n'),nonemptyLines=new Set(joined.split('\n').map(s=>s.trim()).filter(Boolean));
  const textAuthentication=[];
  for(const item of plan.inputs.filter(p=>p.path.endsWith('.md')||p.path.endsWith('/judgment-packet.json')||p.path.endsWith('/execution-instructions.json')||p.path.endsWith('/source-lock.json'))){
    const lines=fs.readFileSync(item.path,'utf8').trimEnd().split('\n').map(s=>s.trim()).filter(Boolean),unique=[...new Set(lines)];
    const fullText=fs.readFileSync(item.path,'utf8').trimEnd(),exactWholeDocument=allBeforeTexts.filter(r=>r.text.includes(fullText));
    const missing=exactWholeDocument.length?[]:unique.filter(l=>!nonemptyLines.has(l));
    textAuthentication.push({path:item.path,sha256:item.sha256,uniqueNonemptyLines:unique.length,authenticatedUniqueLines:unique.length-missing.length,complete:missing.length===0,exactWholeDocumentCalls:exactWholeDocument.map(r=>({callId:r.callId,aggregateTruncationElsewhere:r.truncated,requiredDocumentComplete:true})),missingLines:missing});
  }
  const projection=structuredClone(inventory);for(const move of projection.moves)delete move.sourceSpan.excerpt;
  const strings=[];const walk=x=>{if(typeof x==='string')strings.push(x);else if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')Object.values(x).forEach(walk);};walk(projection);
  const uniqueStrings=[...new Set(strings)],missingStrings=uniqueStrings.filter(s=>!joined.includes(s)&&!joined.includes(JSON.stringify(s).slice(1,-1)));
  const models=rows.filter(r=>r.type==='turn_context').map(r=>({model:r.payload.model,reasoningEffort:r.payload.effort}));
  assert(models.length&&models.every(m=>m.model===plan.model.model&&m.reasoningEffort===plan.model.reasoningEffort));
  const checks=output.sourceReview?.checks??[];assert.deepEqual(checks.map(c=>c.moveId),inventory.moves.map(m=>m.moveId));
  assert.equal(output.sourceReview.completeTranscriptReviewed,true);assert.equal(output.sourceReview.audioVerified,false);
  return {schemaVersion:'1.0-primary-session-authentication',pass,debateNumber:rec.debateNumber,debateId:rec.debateId,validation,session:{path:sessionPath,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length},agentPath:rows.find(r=>r.type==='session_meta')?.payload.agent_path,actualContextModels:models,inputs:plan.inputs,output:fileRecord(path.relative(process.cwd(),assigned.outputPath)),completeUntruncatedIndexedSourceReadBeforeSubmission:sourceLines.every(l=>covered.has(l)),expectedSourceEvents:sourceLines.length,authenticatedSourceEvents:covered.size,missingSourceEvents:sourceLines.filter(l=>!covered.has(l)).map(l=>Number(l.split('\t')[0])),sourceReadEvidence:evidence,textAuthentication,inventoryProjectionAuthentication:{uniqueStrings:uniqueStrings.length,authenticatedUniqueStrings:uniqueStrings.length-missingStrings.length,allSemanticStringsExposed:missingStrings.length===0,missingStrings},draftChecks,failedBeforeExecution:failedBeforeExecution.map(r=>({callId:r.payload.call_id,time:r.timestamp,result:returns.get(r.payload.call_id)})),submissions:writes.map(r=>({callId:r.payload.call_id,time:r.timestamp,authorizedAbsolutePathPresent:input(r).includes(assigned.outputPath)})),sourceUncertainties:checks.filter(c=>c.attributionSupported!==true||c.materialUncertainty!==false),readCalls,directIncrementalCostUsd:0};
}
if(process.argv[2])console.log(JSON.stringify(auditPrimarySession(process.argv[2],process.argv[3],process.argv[4]),null,2));
