import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileRecord,serializedJson} from './lib/assessment-production-standalone-debate-v1.mjs';
const [planPath,sessionPath]=process.argv.slice(2),read=p=>JSON.parse(readFileSync(p));
const route=read('docs/assessment-production/standalone-debates-v1/registry.json').debates.find(d=>d.debateNumber==='261');
assert.ok(planPath.startsWith(`${route.root}/publication/`)&&sessionPath.startsWith('/Users/philstilwell/.codex/sessions/'));
const plan=read(planPath);assert.equal(plan.debateNumber,route.debateNumber);assert.equal(plan.debateId,route.debateId);
assert.equal(plan.model,'gpt-5.6-sol');assert.equal(plan.reasoningEffort,'low');assert.deepEqual(plan.inputBundle,fileRecord(plan.inputBundle.path));
const destination=plan.readingAuthenticationPath??`${path.dirname(planPath)}/reading-authentication.json`;assert.equal(existsSync(destination),false);
const expected=readFileSync(plan.inputBundle.path,'utf8'),buffer=readFileSync(sessionPath),rows=buffer.toString().trim().split('\n').map(JSON.parse),metadata=rows.find(r=>r.type==='session_meta').payload;
const contexts=rows.filter(r=>r.type==='turn_context');assert.ok(contexts.length&&contexts.every(r=>r.payload.model===plan.model&&r.payload.effort===plan.reasoningEffort));
const calls=rows.filter(r=>['function_call','custom_tool_call'].includes(r.payload?.type));
assert.ok(calls.every(r=>['exec','send_message','wait_agent'].includes(r.payload.name)));assert.equal(calls.filter(r=>String(r.payload.input??r.payload.arguments).includes('apply_patch')).length,0);
const pages=[];
function visit(x){if(Array.isArray(x)){for(const item of x)visit(item);}else if(Number.isInteger(x?.start)&&Number.isInteger(x?.end)&&typeof x?.text==='string')pages.push(x);else if(typeof x?.output==='string')inspect(x.output);}
function inspect(text){assert.ok(!text.includes('Warning: truncated output')&&!text.includes('tokens truncated'));for(const line of text.split('\n')){let x;try{x=JSON.parse(line);}catch{continue;}visit(x);}}
for(const r of rows.filter(r=>['function_call_output','custom_tool_call_output'].includes(r.payload?.type))){const o=r.payload.output;if(Array.isArray(o)){for(const b of o)if(typeof b.text==='string')inspect(b.text);}else if(typeof o==='string')inspect(o);}
const byteSeekException=process.argv.includes('--document-shard-05-byte-seek-overlap');
if(byteSeekException){assert.ok(planPath.endsWith('/depth-repair-1/shard-05/execution-plan.json'));assert.ok(calls.filter(r=>r.payload.name==='exec').every(r=>String(r.payload.input??r.payload.arguments).includes('f.seek(s)')));assert.equal(Buffer.from(expected).subarray(0,14000).toString('utf8').length,13996);assert.deepEqual(pages.map(p=>p.start),[0,7000,14000,21000]);}
let next=0;const actual=[],emptyPastEof=[],clampedEnd=[],offsetCorrections=[];
for(const raw of pages){
 let p=raw;
 if(byteSeekException&&raw.start>=14000){
  const sourceStart=raw.start-4,sourceEnd=raw.end-4;assert.ok(raw.text===expected.slice(sourceStart,sourceEnd),'Byte-seek content mismatch');assert.ok(sourceStart<=next);const overlap=next-sourceStart;assert.ok(overlap===4||overlap===0);
  offsetCorrections.push({declaredStart:raw.start,declaredEnd:raw.end,actualSourceStart:sourceStart,actualSourceEnd:sourceEnd,repeatedCharacters:overlap});p={start:next,end:sourceEnd,text:raw.text.slice(overlap)};
 }
 if(p.start>=expected.length&&p.text===''&&p.end===expected.length){assert.equal(next,expected.length);emptyPastEof.push({start:p.start,end:p.end,textLength:0});continue;}
 assert.equal(p.start,next);assert.ok(p.end>p.start&&p.end-p.start<=7000);assert.ok(p.text===expected.slice(p.start,p.end),`Page ${p.start}–${p.end} text does not match declared character range`);
 const end=Math.min(p.end,expected.length);if(end!==p.end)clampedEnd.push({start:p.start,requestedEnd:p.end,actualEnd:end});actual.push({start:p.start,end,text:p.text});next=end;
}
assert.equal(next,expected.length);assert.equal(actual.map(p=>p.text).join(''),expected);
const result={schemaVersion:'1.0-authenticated-isolated-stage-reading',status:'complete-exact-reading-authenticated-release-permitted',debateNumber:route.debateNumber,debateId:route.debateId,agentPath:metadata.agent_path,model:plan.model,reasoningEffort:plan.reasoningEffort,plan:fileRecord(planPath),packet:plan.inputBundle,sessionPrefix:{path:sessionPath,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex'),observedAt:new Date().toISOString()},authenticatedPages:actual.map(({start,end})=>({start,end})),exactCharacterCount:next,completePacketMatched:true,emptyPastEofReads:emptyPastEof,requestedEndClamps:clampedEnd,byteSeekOffsetCorrections:offsetCorrections,transportNote:offsetCorrections.length?'The second Python text-stream seek used a byte offset instead of a character offset. Exact comparison proves four repeated characters, zero missing characters, and complete unchanged first-occurrence coverage through EOF. Raw offsets are preserved above; no content or model output was repaired.':emptyPastEof.length||clampedEnd.length?'EOF-only page metadata normalized; every actual source character is present exactly once in order. Empty reads after EOF expose no content and are recorded separately.':'Raw page intervals are exact and contiguous to EOF.',outputTruncations:0,preReleaseWrites:0,writablePath:plan.writablePath,attemptsAuthorizedAfterRelease:1,retries:0,directIncrementalCostUsd:0};
writeFileSync(destination,serializedJson(result),{flag:'wx'});console.log(JSON.stringify({agent:metadata.agent_path,status:result.status,characters:next,pages:actual.length,emptyPastEofReads:emptyPastEof,record:fileRecord(destination)}));
