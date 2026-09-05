// Bounded, resumable, source-only model annotation using existing ChatGPT auth.
// No API keys, tools, plugins, prior thread context, or score records are supplied.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const get = (flag, fallback) => { const i=process.argv.indexOf(flag); return i<0?fallback:process.argv[i+1]; };
const phase = get('--phase','light');
if(!['primary','adjudication','light'].includes(phase)) throw new Error('Unknown phase');
const isLight = phase==='light';
const isPrimary = phase!=='adjudication';
const manifest = JSON.parse(readFileSync(join(here,isLight?'light-manifest.json':isPrimary?'packet-manifest.json':'adjudication-manifest.json'),'utf8'));
const debateArg = get('--debates',manifest.pilotDebates?.join(',')??'all');
const selected = new Set(debateArg==='all'?manifest.debates.map(d=>d.number):debateArg.split(',').map(Number));
const passes = get('--passes',isLight?'light':isPrimary?'a,b':'c').split(',');
const limit = Number(get('--limit','12'));
const concurrency = Number(get('--concurrency','2'));
if (!(limit>=1 && limit<=24 && concurrency>=1 && concurrency<=3)) throw new Error('Batch bounds exceeded');
const model = 'gpt-6-astra';
const effort = isLight?'low':'medium';
const hash = b => createHash('sha256').update(b).digest('hex');
const read = p => readFileSync(p,'utf8');
const save = (p,data) => { mkdirSync(dirname(p),{recursive:true}); writeFileSync(p,JSON.stringify(data,null,2)+'\n'); };
const instructions = read(join(here,isLight?'light-instructions.md':isPrimary?'review-instructions.md':'adjudication-instructions.md'));
const schemaPath = join(here,isLight?'light-schema.json':isPrimary?'review-schema.json':'adjudication-schema.json');
const pausePath=join(here,'PAUSE');
if(existsSync(pausePath)) throw new Error('Study paused. Check usage and user direction before removing the PAUSE marker.');
if(hash(instructions)!==manifest.instructionsSha256 || hash(read(schemaPath))!==manifest.schemaSha256 || hash(read(join(here,isLight?'protocol-light.md':'protocol.md')))!==manifest.protocolSha256) throw new Error('Frozen review controls changed');
const jobs=[];
for(const d of manifest.debates.filter(d=>selected.has(d.number))) for(const pass of passes) {
  if(!(isLight?['light']:isPrimary?['a','b']:['c']).includes(pass)) throw new Error('Unknown pass');
  const dir=join(here,isLight?'light-reviews':isPrimary?'reviews':'adjudications',`debate-${String(d.number).padStart(3,'0')}`,pass);
  if(existsSync(join(dir,'execution.json'))) {
    const record=JSON.parse(read(join(dir,'execution.json')));
    const correctionPath=join(dir,'execution-validator-correction.json');
    const corrected=existsSync(correctionPath) && JSON.parse(read(correctionPath)).originalRecordSha256===hash(read(join(dir,'execution.json')));
    if((record.status==='completed'||corrected) && record.packetSha256===d.packetSha256 && record.instructionsSha256===manifest.instructionsSha256) continue;
    throw new Error(`Existing unsuccessful run requires explicit inspection: ${dir}`);
  }
  jobs.push({d,pass,dir});
}
const queue=jobs.slice(0,limit);
console.log(JSON.stringify({phase:'start',reviewPhase:phase,jobs:queue.map(j=>[j.d.number,j.pass]),remainingAfterBatch:jobs.length-queue.length,model,effort,directIncrementalCostUsd:0}));
let cursor=0,failed=false;
async function run(job) {
  const {d,pass,dir}=job;
  mkdirSync(dir,{recursive:true});
  const packet=read(join(root,d.packetPath));
  if(hash(packet)!==d.packetSha256) throw new Error('Packet fingerprint mismatch');
  const work=mkdtempSync(join(tmpdir(),'slugfester-slogan-v1-'));
  const output=join(work,'response.json');
  const prompt=instructions+'\n\n'+packet;
  const args=['exec','--skip-git-repo-check','--ephemeral','--ignore-user-config','--ignore-rules','--json',
    '--output-schema',schemaPath,'--output-last-message',output,'--model',model,'-c',`model_reasoning_effort="${effort}"`,
    '-c','project_doc_max_bytes=0','-c','web_search="disabled"','--sandbox','read-only','--cd',work];
  for(const feature of ['apps','plugins','remote_plugin','shell_tool','unified_exec','multi_agent','browser_use','browser_use_external','computer_use','in_app_browser','image_generation','workspace_dependencies','goals','sleep_tool','view_image','skill_search','tool_suggest','hooks','code_mode_host','shell_snapshot']) args.push('--disable',feature);
  args.push('--enable','skip_host_skill_discovery','-');
  const env={...process.env};
  for(const key of Object.keys(env)) if(/^(OPENAI|ANTHROPIC|GEMINI|GOOGLE).*API_KEY$/.test(key)) delete env[key];
  // Do not alter HOME or CODEX_HOME. --ephemeral, isolated cwd, no tools and no
  // user config provide fresh input isolation while standard auth stays in place.
  const startedAt=new Date().toISOString();
  const child=spawn('codex',args,{cwd:work,env,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',timedOut=false;
  child.stdout.on('data',b=>{stdout+=b;appendFileSync(join(dir,'execution.jsonl'),b);});
  child.stderr.on('data',b=>{stderr+=b;appendFileSync(join(dir,'stderr.txt'),b);});
  child.stdin.on('error',()=>{});child.stdin.end(prompt);
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},25*60*1000);
  const result=await new Promise(resolve=>{child.on('error',e=>resolve({code:null,error:e.message}));child.on('close',(code,signal)=>resolve({code,signal}));});
  clearTimeout(timer);
  writeFileSync(join(dir,'execution.jsonl'),stdout);writeFileSync(join(dir,'stderr.txt'),stderr);
  const events=stdout.split('\n').filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)];}catch{return[];}});
  const toolEvents=events.filter(e=>e.item && !['agent_message','reasoning','error'].includes(e.item.type));
  const runtimeWarnings=events.filter(e=>e.item?.type==='error').map(e=>e.item.message);
  const usage=events.filter(e=>e.type==='turn.completed').at(-1)?.usage??null;
  let response=null,parseError=null;
  if(existsSync(output)) { const raw=read(output);writeFileSync(join(dir,'output.json'),raw);try{response=JSON.parse(raw);}catch(e){parseError=e.message;} }
  const issues=[];
  if(result.code!==0 || timedOut || !response) issues.push('execution-not-complete');
  if(toolEvents.length) issues.push('unexpected-tool-use');
  if(response && isPrimary) {
    if(response.coverageComplete!==true) issues.push('coverage-not-complete');
    let next=0;
    const attribution=(response.attribution??[]).map(s=>{
      if(!isLight)return s;
      const m=/^(\d+)(?:-(\d+))?:([ABOU])$/.exec(s.trim());
      return m?{startEvent:Number(m[1]),endEvent:Number(m[2]??m[1]),speaker:m[3]}:{startEvent:-1,endEvent:-1,speaker:'U'};
    });
    for(const s of attribution) {
      if(s.startEvent!==next || s.endEvent<s.startEvent || s.endEvent>=d.eventCount) issues.push(`invalid-attribution-${next}`);
      next=s.endEvent+1;
    }
    if(next!==d.eventCount) issues.push('incomplete-attribution');
    for(const c of response.candidates??[]) if(!(c.contextStartEvent<=c.startEvent && c.startEvent<=c.endEvent && c.endEvent<=c.contextEndEvent && c.contextEndEvent<d.eventCount)) issues.push('invalid-candidate-span');
  }
  if(response && !isPrimary) {
    if(response.contextSufficient!==true || response.requestedEventRanges?.length) issues.push('additional-context-requested');
    const actual=(response.decisions??[]).map(x=>x.candidateId).sort();
    if(JSON.stringify(actual)!==JSON.stringify([...d.candidateIds].sort())) issues.push('candidate-coverage-mismatch');
    for(const x of response.decisions??[]) for(const e of x.episodes??[]) if(!(e.startEvent<=e.endEvent && e.endEvent<d.eventCount)) issues.push('invalid-episode-span');
  }
  const record={status:issues.length?'needs-inspection':'completed',studyVersion:isLight?'2.0-streamlined':'1.0',reviewPhase:phase,debateNumber:d.number,pass,
    model,reasoningEffort:effort,billingSurface:'ChatGPT subscription',directIncrementalCostUsd:0,
    freshContext:true,priorScoresUnavailable:true,otherReviewUnavailable:isPrimary,toolsUsed:toolEvents.length,runtimeWarnings,
    startedAt,completedAt:new Date().toISOString(),packetSha256:d.packetSha256,instructionsSha256:manifest.instructionsSha256,
    protocolSha256:manifest.protocolSha256,schemaSha256:manifest.schemaSha256,promptSha256:hash(prompt),
    outputSha256:existsSync(join(dir,'output.json'))?hash(read(join(dir,'output.json'))):null,
    usage,exit:result,timedOut,parseError,issues,candidates:response?.candidates?.length??response?.decisions?.length??null,
    attributionIntervals:response?.attribution?.length??null,threadId:events.find(e=>e.type==='thread.started')?.thread_id??null};
  save(join(dir,'execution.json'),record);
  // Only our validated, uniquely created scratch directory is removed. Required
  // evidence was copied to the research record before this cleanup.
  if(dirname(work)===tmpdir() && work.split('/').at(-1).startsWith('slugfester-slogan-v1-')) rmSync(work,{recursive:true});
  console.log(JSON.stringify({phase:'finished',debate:d.number,pass,status:record.status,candidates:record.candidates,usage,issues}));
  if(issues.length) failed=true;
}
await Promise.all(Array.from({length:concurrency},async()=>{while(cursor<queue.length && !failed && !existsSync(pausePath)){const job=queue[cursor++];await run(job);}}));
console.log(JSON.stringify({phase:'batch-finished',failed,paused:existsSync(pausePath),startedJobs:cursor,totalPlanned:queue.length}));
if(failed)process.exitCode=1;
