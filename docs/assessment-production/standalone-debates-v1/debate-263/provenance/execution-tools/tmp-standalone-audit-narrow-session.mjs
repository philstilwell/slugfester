import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileRecord} from './scripts/lib/assessment-production-standalone-debate-v1.mjs';

export function auditNarrowSession(sessionPath, packetPath) {
  const bytes=fs.readFileSync(sessionPath);
  const rows=bytes.toString().trim().split('\n').map(JSON.parse);
  const packetText=fs.readFileSync(packetPath,'utf8'),packet=JSON.parse(packetText);
  const sourceText=packet.source?fs.readFileSync(packet.source.path,'utf8'):'';
  if(packet.source)assert.equal(fileRecord(packet.source.path).sha256,packet.source.sha256);
  const expected=sourceText.trimEnd().split('\n').filter(l=>/^\d+\t/.test(l));
  const expectedSet=new Set(expected),covered=new Set();
  const calls=new Map(rows.filter(r=>r.type==='response_item'&&['function_call','custom_tool_call'].includes(r.payload.type)).map(r=>[r.payload.call_id,r]));
  const writes=[...calls.values()].filter(r=>(r.payload.input??r.payload.arguments??'').includes('tools.apply_patch('));
  const firstWrite=writes[0]?.ordinal??Infinity;
  const outputText=payload=>{
    const parts=typeof payload==='string'?[payload]:payload.map(x=>x.text??'');
    return parts.map(s=>{try{const j=JSON.parse(s);return typeof j.output==='string'?j.output:s;}catch{return s;}}).join('\n');
  };
  let packetRead=false;
  const packetLines=packetText.trimEnd().split('\n'),packetSet=new Set(packetLines),packetCovered=new Set();
  const readEvidence=[],draftChecks=[];
  for(const r of rows){
    if(r.type!=='response_item'||!['function_call_output','custom_tool_call_output'].includes(r.payload.type))continue;
    const call=calls.get(r.payload.call_id),input=call?.payload.input??call?.payload.arguments??'';
    const text=outputText(r.payload.output),truncated=/Warning: truncated output|tokens truncated/i.test(text);
    if(!truncated&&r.ordinal<firstWrite&&input.includes('packet.json')){
      if(text.includes(packetText.trimEnd()))packetRead=true;
      text.split('\n').filter(l=>packetSet.has(l)).forEach(l=>packetCovered.add(l));
    }
    if(input.includes('source.txt')&&!truncated&&r.ordinal<firstWrite){
      const matched=text.split('\n').filter(l=>expectedSet.has(l));
      matched.forEach(l=>covered.add(l));
      if(matched.length)readEvidence.push({callId:r.payload.call_id,time:r.timestamp,events:matched.map(l=>Number(l.split('\t')[0])),untruncated:true,beforeSubmission:true});
    }
    if(input.includes('tmp-standalone-check-narrow-repair.mjs')&&(input.includes('node ')||input.includes('node -'))){
      draftChecks.push({callId:r.payload.call_id,time:r.timestamp,beforeSubmission:r.ordinal<firstWrite,result:text.includes('mechanically-valid-semantic-review-required')?'passed':(/SyntaxError|ReferenceError|AssertionError|ERR_/i.test(text)?'draft-or-invocation-error':'inspect'),diagnosticExcerpt:text.includes('mechanically-valid-semantic-review-required')?undefined:text.slice(0,800)});
    }
  }
  const models=rows.filter(r=>r.type==='turn_context').map(r=>({model:r.payload.model,reasoningEffort:r.payload.effort}));
  assert(models.every(m=>m.model==='gpt-5.6-sol'&&m.reasoningEffort==='low'));
  return {
    schemaVersion:'1.0-narrow-session-authentication',shardId:packet.shardId,
    session:{path:sessionPath,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')},
    agentPath:rows.find(r=>r.type==='session_meta')?.payload.agent_path,
    actualContextModels:models,packet:fileRecord(packetPath),source:packet.source?fileRecord(packet.source.path):null,
    completeUntruncatedPacketReadBeforeSubmission:packetRead||packetLines.every(l=>packetCovered.has(l)),
    packetUniqueLines:packetSet.size,packetAuthenticatedUniqueLines:packetCovered.size,
    expectedSourceEvents:expected.length,authenticatedSourceEvents:covered.size,
    completeUntruncatedAssignedSourceReadBeforeSubmission:expected.every(l=>covered.has(l)),
    missingEvents:expected.filter(l=>!covered.has(l)).map(l=>Number(l.split('\t')[0])),
    sourceReadEvidence:readEvidence,draftChecks,
    submissions:writes.map(r=>({callId:r.payload.call_id,time:r.timestamp,authorizedAbsolutePathPresent:(r.payload.input??r.payload.arguments??'').includes(packet.outputPath)})),
    output:fs.existsSync(packet.outputPath)?fileRecord(path.relative(process.cwd(),packet.outputPath)):null,
    fullDebateReadClaimed:false,directCostUsd:0
  };
}
if(process.argv[2])console.log(JSON.stringify(auditNarrowSession(process.argv[2],process.argv[3]),null,2));
