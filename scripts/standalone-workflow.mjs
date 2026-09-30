#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { openRun, prepare, status, runStage, timingEvent, inside, readJson, loadPlan } from './lib/standalone-workflow.mjs';
import { holdCandidate, handoffRequest } from './lib/standalone-handoff.mjs';
import { prepareBrowserReplay, reconcileGraph } from './lib/standalone-publication-check.mjs';

const {values:a,positionals}=parseArgs({allowPositionals:true,options:Object.fromEntries([
  'debate','phase','stage','plan','kind','event','id','approval','sha256','start','count','origin','output','prefix','session','agent','step','input','approved-sha','date','source-note-file'
].map(k=>[k,{type:'string'}]).concat([['dry-run',{type:'boolean'}],['check-only',{type:'boolean'}]]))});
const [command,action]=positionals;
if(command==='help'||!command) {
  console.log(`Usage: node scripts/standalone-workflow.mjs COMMAND --debate NNN
  status                              Show existing phases and timing; never retry
  prepare --phase PHASE [--dry-run]    Freeze lossless role packets and isolated plans
  read --plan PATH [--start 1 --count 120]  Read bounded, numbered input lines
  stage --stage NAME                  Run an existing deterministic repository stage once
  time --stage NAME --kind active|wait|repair --event start|stop --id ID
  authenticate --plan PATH --session PATH --agent AGENT --stage reading|complete --output PATH
  mechanical --step NAME [--check-only]  Reuse maintained inventory/publication/tag tools
  handoff hold --plan PATH            Read candidate JSON from stdin; validate and hold in RAM
  handoff read --plan PATH [--start 0 --count 16000]
  handoff status --plan PATH
  handoff release --plan PATH --approval PATH --sha256 HASH
  graph                               Compare all published section scores with generated analytics
  browser --origin URL --output PATH [--prefix NAME]  Prepare the same full local/live replay

prepare phases: inventory, primary, adjudication, publication, rhetorical, rhetorical-adjudication
stage names: judgment-packet, disagreements, assemble-ledger, score-once, build-adapter, audit
No inference, paid services, automatic retries, score overrides, or Git publication occurs here.`);
  process.exit(0);
}
try {
  const run=openRun(process.cwd(),a.debate,{writable:['prepare','time','stage'].includes(command)&&!a['dry-run']&&a.stage!=='audit'});
  let result;
  if(command==='status') result=status(run);
  else if(command==='prepare') result=prepare(run,a.phase,{dryRun:a['dry-run']});
  else if(command==='stage') result=runStage(run,a.stage);
  else if(command==='time') result=timingEvent(run,a);
  else if(command==='mechanical') {
    const files={inventory:'lock-inventory.mjs','publication-skeleton':'prepare-publication.mjs','source-eligibility':'review-resolved-ledger.mjs',tags:'apply-rhetorical.mjs',integrate:'integrate-publication.mjs','rhetorical-packets':'prepare-rhetorical.py'};
    const file=files[a.step];assert(file,'Unknown mechanical step');
    if(!a['check-only'])assert.notEqual(run.entry.status,'published-and-frozen','Published evidence is immutable');
    const args=[`scripts/standalone/${file}`,'--debate',a.debate];
    if(a['check-only'])args.push('--check-only');
    if(a.step==='inventory') {assert(a.input&&a['approved-sha']);inside(run.root,a.input);args.push('--input',a.input,'--approved-sha',a['approved-sha']);}
    if(a.step==='publication-skeleton') {assert(a.date&&a['source-note-file']);args.push('--date',a.date,'--source-note',fs.readFileSync(inside(run.root,a['source-note-file']),'utf8').trim());}
    if(a.step==='rhetorical-packets'){assert(['blind','adjudication'].includes(a.phase));args.push('--phase',a.phase);}
    const child=spawnSync(file.endsWith('.py')?'python3':process.execPath,args,{cwd:run.root,encoding:'utf8',maxBuffer:16*1024*1024});
    assert.equal(child.status,0,child.stderr||child.stdout);
    result={step:a.step,status:'passed',checkOnly:!!a['check-only'],output:child.stdout};
  }
  else if(command==='authenticate') {
    assert.notEqual(run.entry.status,'published-and-frozen','Published evidence is immutable');loadPlan(run,a.plan);
    const child=spawnSync('python3',['scripts/authenticate-standalone-worker.py','--debate',a.debate,'--plan',a.plan,'--session',a.session,'--agent',a.agent,'--stage',a.stage,'--output',a.output],{cwd:run.root,encoding:'utf8'});
    assert.equal(child.status,0,child.stderr||child.stdout);result=JSON.parse(child.stdout);
  }
  else if(command==='graph') result=await reconcileGraph(run);
  else if(command==='browser') result=await prepareBrowserReplay(run,a);
  else if(command==='read') {
    const plan=loadPlan(run,a.plan),lines=fs.readFileSync(inside(run.root,plan.allowedInputs[0].path),'utf8').split('\n');
    const start=Number(a.start||1),count=Number(a.count||120);
    assert(Number.isInteger(start)&&start>=1&&Number.isInteger(count)&&count>0&&count<=300);
    console.log(lines.slice(start-1,start-1+count).map((s,i)=>`${start+i}\t${s}`).join('\n'));
    console.log(`Lines ${start}–${Math.min(start+count-1,lines.length)} of ${lines.length}; input ${plan.allowedInputs[0].path}`);
    process.exit(0);
  } else if(command==='handoff') {
    if(action==='hold') {const held=await holdCandidate(run,a.plan,fs.readFileSync(0));result=held.state;}
    else {
      assert(['status','read','release'].includes(action));
      const options=Object.fromEntries(Object.entries({start:a.start,length:a.count,approval:a.approval,sha256:a.sha256}).filter(([,v])=>v!==undefined));
      result=await handoffRequest(run,a.plan,action,options);
    }
  } else throw Error('Unknown command; use help');
  console.log(JSON.stringify(result,null,2));
} catch(error) {console.error(error.message);process.exitCode=1;}
