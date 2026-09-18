import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const [session,sourcePath]=process.argv.slice(2);
assert(session&&sourcePath);
const bytes=fs.readFileSync(session),rows=bytes.toString().trim().split('\n').map(JSON.parse);
const sourceLines=fs.readFileSync(sourcePath,'utf8').trimEnd().split('\n');
const sourceSet=new Set(sourceLines),covered=new Set(),evidence=[],readCalls=[];
const calls=new Map(rows.filter(r=>r.type==='response_item'&&['function_call','custom_tool_call'].includes(r.payload.type)).map(r=>[r.payload.call_id,r]));
for(const r of rows){
  if(r.type!=='response_item'||!['function_call_output','custom_tool_call_output'].includes(r.payload.type))continue;
  const out=typeof r.payload.output==='string'?r.payload.output:r.payload.output.map(i=>i.text??'').join('\n');
  const call=calls.get(r.payload.call_id),input=call?.payload.input??call?.payload.arguments??'';
  const truncated=/Warning: truncated output|tokens truncated/i.test(out);
  const matches=out.split('\n').filter(l=>sourceSet.has(l));
  if(matches.length&&!truncated){
    const ids=matches.map(l=>Number(l.split('\t')[0]));
    ids.forEach(n=>covered.add(n));
    evidence.push({callId:r.payload.call_id,readAt:r.timestamp,eventCount:ids.length,firstEvent:Math.min(...ids),lastEvent:Math.max(...ids),untruncated:true});
  }
  if(input.includes('exec_command'))readCalls.push({callId:r.payload.call_id,time:call.timestamp,inputCharacters:input.length,inputPreview:input.slice(0,1500),outputCharacters:out.length,truncated,sourceEventsReturned:matches.length});
}
const models=rows.filter(r=>r.type==='turn_context').map(r=>({model:r.payload.model,reasoningEffort:r.payload.effort}));
const missing=sourceLines.map(l=>Number(l.split('\t')[0])).filter(n=>!covered.has(n));
const writes=[...calls.values()].filter(r=>(r.payload.input??r.payload.arguments??'').includes('tools.apply_patch(')).map(r=>({callId:r.payload.call_id,submittedAt:r.timestamp}));
console.log(JSON.stringify({session:{path:session,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')},actualContextModels:models,sourcePath,expectedEvents:sourceLines.length,authenticatedEvents:covered.size,missingEvents:missing,completeUntruncatedIndexedSourceRead:missing.length===0,sourceReadEvidence:evidence,writeCalls:writes,readCalls},null,2));
