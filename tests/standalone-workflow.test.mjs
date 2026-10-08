import "./publication-source-language.test.mjs";
import "./featured-quote-correction.test.mjs";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { packDocuments,unpackDocuments,readerText,openRun,prepare,loadPlan,inside,record,writeOnce,json,hash,timingSummary,timingEvent,stageCommand,status,REGISTRY } from '../scripts/lib/standalone-workflow.mjs';
import { holdCandidate,handoffRequest,handoffLocation } from '../scripts/lib/standalone-handoff.mjs';
import { distribution } from '../scripts/lib/standalone-publication-check.mjs';

const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'sf-workflow-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const base='docs/assessment-production/standalone-debates-v1/debate-900';
  const put=(p,v)=>{const file=path.join(root,p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof v==='string'?v:json(v));};
  put(REGISTRY,{debates:[{debateNumber:'900',debateId:'fixture-debate',videoId:'fixture',root:base,validationProfile:'semantic-balanced-capacity-v2',status:'authorized'}]});
  put('.assessment-cache/captions/fixture/indexed-transcript.txt','[00:01] Speaker A: complete source.\n[00:05] Speaker B: complete reply.\n');
  put(`${base}/source/assessment-source-notes.md`,'Exclude 00:10–00:12; no credit, penalty, or absence inference.');
  put(`${base}/source/source-lock.json`,{debateId:'fixture-debate',source:'locked'});
  put(`${base}/manifest.json`,{debateNumber:'900',debateId:'fixture-debate',modelSettings:{model:'fixture-model',reasoningEffort:'low',displayLabel:'Fixture'},sourceLocks:{indexedTranscript:record(root,'.assessment-cache/captions/fixture/indexed-transcript.txt')}});
  put(`${base}/judgments/contract.md`,'Assess the entire source independently; preserve the excluded interval.');
  put(`${base}/judgments/judgment-packet.json`,{motion:'Does the fixture hold?',instruction:'No peer judgments or publication.'});
  put(`${base}/inventory/inventory.json`,{moves:[{moveId:'first',source:'Complete source.',side:'pro'},{moveId:'second',source:'Complete reply.',side:'con'}]});
  put('docs/reassessment-rubric-v2.1.md','Fixture rubric.');
  put(`${base}/judgments/check-judgment.mjs`,"import fs from 'node:fs'; const v=JSON.parse(fs.readFileSync(0,'utf8')); if(v.valid!==true)process.exit(1); console.log('passed');\n");
  for(const p of ['scripts/standalone-workflow.mjs','scripts/lib/standalone-workflow.mjs','scripts/lib/standalone-handoff.mjs','scripts/authenticate-standalone-worker.py'])put(p,fs.readFileSync(path.join(repository,p),'utf8'));
  return {root,base,put,run:openRun(root,'900')};
}

test('lossless packing preserves repeated nested arguments, exclusions, Unicode and order',()=>{
  const shared={text:'An exact quotation, with punctuation — and qualifications. '.repeat(20),exclusion:{start:12,end:16}};
  const docs=[{path:'inventory.json',value:{moves:[shared,shared],motion:'X?'}},{path:'ledger.json',value:{move:shared}},{path:'transcript.txt',value:'Complete\nsource\n'+shared.text}];
  const packet=packDocuments(docs);
  assert.deepEqual(unpackDocuments(packet),docs);
  assert(readerText(packet).includes(shared.text));
  assert(Buffer.byteLength(json(packet))<Buffer.byteLength(json(docs)));
  assert.throws(()=>packDocuments([{value:{$workflowRef:'fake'}}]),/Reserved/);
  const bad=structuredClone(packet);bad.documents[0].value={$workflowRef:'missing'};
  assert.throws(()=>unpackDocuments(bad),/Missing/);
});

test('paired primary plans are identical in evidence, disjoint in outputs and exclude peer/score files',t=>{
  const f=fixture(t),result=prepare(f.run,'primary');
  const [a,b]=result.plans.map(r=>loadPlan(f.run,r.path));
  assert.deepEqual(a.allowedInputs,b.allowedInputs);assert.deepEqual(a.packet,b.packet);assert.notEqual(a.outputPath,b.outputPath);
  assert(!a.sourceInputs.some(r=>/pass-[ab]\/output|score-pass|publication\//.test(r.path)));
  assert(a.sourceInputs.some(r=>r.path.endsWith('indexed-transcript.txt')));
  assert(a.sourceInputs.some(r=>r.path.endsWith('assessment-source-notes.md')));
  assert.throws(()=>prepare(f.run,'primary'),/Existing frozen plan/);
  f.put(`${f.base}/source/assessment-source-notes.md`,'Changed exclusion');
  assert.throws(()=>loadPlan(f.run,result.plans[0].path),/Changed input/);
});

test('frozen runs reject preparation and score execution; duplicate submissions remain exact',t=>{
  const f=fixture(t);const r=JSON.parse(fs.readFileSync(path.join(f.root,REGISTRY)));r.debates[0].status='published-and-frozen';f.put(REGISTRY,r);
  assert.throws(()=>openRun(f.root,'900',{writable:true}),/immutable/);
  const frozen=openRun(f.root,'900');assert.throws(()=>prepare(frozen,'primary'),/immutable/);assert.throws(()=>stageCommand(frozen,'score-once'),/immutable/);
  const bytes=Buffer.from('{"valid":true}\n\n');writeOnce(f.root,'output/once.json',bytes);
  assert.throws(()=>writeOnce(f.root,'output/once.json','different'),/EEXIST/);assert.deepEqual(fs.readFileSync(path.join(f.root,'output/once.json')),bytes);
  f.put(`${f.base}/score-pass/output.json`,{score:72});assert.throws(()=>stageCommand(f.run,'score-once'),/already exists/);
});

test('repository paths reject traversal and links outside the checkout',t=>{
  const f=fixture(t);assert.throws(()=>inside(f.root,'../outside'),/escapes/);assert.throws(()=>inside(f.root,'/tmp/absolute'),/relative/);
  fs.symlinkSync(os.tmpdir(),path.join(f.root,'external'));assert.throws(()=>inside(f.root,'external/file'),/Symlink/);
});

test('timing distinguishes parallel worker effort, elapsed intervals, waiting and unfinished work',()=>{
  const e=(id,event,ms,kind='active')=>({id,event,stage:'judgments',kind,at:new Date(ms).toISOString()});
  const summary=timingSummary([e('a','start',0),e('a','stop',10000),e('b','start',5000),e('b','stop',15000),e('wait','start',15000,'wait')],20000);
  assert.equal(summary.trackedWallMs,20000);assert.equal(summary.summedIntervalMs,25000);assert.equal(summary.summedWorkMs,20000);assert.equal(summary.waitingWallMs,5000);
  assert.equal(summary.byStageAndKind['judgments/active'].wallMs,15000);assert.deepEqual(summary.openIntervals,['wait']);
});

test('timing rejects unmatched stops and conflicting interval ownership',t=>{
  const f=fixture(t);assert.throws(()=>timingEvent(f.run,{stage:'x',kind:'wait',event:'stop',id:'one'}));
  timingEvent(f.run,{stage:'x',kind:'wait',event:'start',id:'one'});
  assert.throws(()=>timingEvent(f.run,{stage:'y',kind:'wait',event:'stop',id:'one'}));
});

test('graph counts preserve duplicate section scores and exact bin boundaries',()=>{
  const d=distribution([54,54,55,56,100]);assert.equal(d.sectionSideScores,5);assert.equal(d.buckets[0].count,3);assert.equal(d.buckets.at(-1).count,1);
  assert.throws(()=>distribution([NaN]));assert.throws(()=>distribution([101]));
});

test('handoff authenticates reading, keeps candidate unsaved, blocks stale approval and saves exact bytes once',async t=>{
  const f=fixture(t),plans=prepare(f.run,'primary').plans,planPath=plans[0].path,plan=loadPlan(f.run,planPath);
  const session=path.join(f.root,'session.jsonl');
  const payloads=[{type:'session_meta',payload:{id:'fixture-session',agent_path:'/fixture/reviewer',parent_thread_id:'fixture-parent'}},{type:'turn_context',payload:{model:'fixture-model',effort:'low'}}];
  for(const [i,rec] of [record(f.root,planPath),...plan.allowedInputs].entries()){
    payloads.push({type:'response_item',payload:{type:'function_call',name:'exec',call_id:String(i),arguments:`read ${rec.path}`}});
    payloads.push({type:'response_item',payload:{type:'function_call_output',call_id:String(i),output:fs.readFileSync(path.join(f.root,rec.path),'utf8')}});
  }
  fs.writeFileSync(session,payloads.map(x=>JSON.stringify(x)).join('\n')+'\n');
  const evidence=`${f.base}/judgments/pass-a/reading-release.json`;
  const auth=spawnSync('python3',[path.join(repository,'scripts/authenticate-standalone-worker.py'),'--debate','900','--plan',planPath,'--session',session,'--agent','/fixture/reviewer','--output',evidence,'--stage','reading'],{cwd:f.root,encoding:'utf8'});
  assert.equal(auth.status,0,auth.stderr);
  const candidate=Buffer.from('{"valid":true,"text":"Exact — bytes"}\n\n');
  const held=await holdCandidate(f.run,planPath,candidate);
  t.after(()=>{held.server.close();});
  assert(!fs.existsSync(plan.outputPath));
  const preview=await handoffRequest(f.run,planPath,'read');assert.equal(preview.text,candidate.toString());
  const approvalPath=`${f.base}/judgments/pass-a/submission-release.json`;
  const approval={status:'approved-first-submission',candidateSha256:hash(candidate),plan:record(f.root,planPath),readingEvidence:record(f.root,evidence),sourceEditorialReview:{status:'passed',notes:'Fixture review confirms the complete arguments and the stated exclusion are preserved.'}};
  f.put(approvalPath,approval);
  await assert.rejects(handoffRequest(f.run,planPath,'release',{approval:approvalPath,sha256:'wrong'}));
  assert(!fs.existsSync(plan.outputPath));
  const released=await handoffRequest(f.run,planPath,'release',{approval:approvalPath,sha256:hash(candidate)});
  assert.equal(released.status,'submitted-once');assert.deepEqual(fs.readFileSync(plan.outputPath),candidate);
  await assert.rejects(holdCandidate(f.run,planPath,candidate),/already exists/);
});

test('invalid candidate never enters handoff or creates a submission',async t=>{
  const f=fixture(t),plans=prepare(f.run,'primary').plans;
  await assert.rejects(holdCandidate(f.run,plans[0].path,Buffer.from('{"valid":false}')),/checker failed/);
  assert(!fs.existsSync(loadPlan(f.run,plans[0].path).outputPath));
});

test('resumption reports interrupted handoffs and attempted stages without requiring a live socket',async t=>{
  const f=fixture(t),plans=prepare(f.run,'primary').plans,planPath=plans[0].path;
  const loc=handoffLocation(f.run,planPath);
  f.put(loc.metadata,{status:'interrupted-unsaved',plan:record(f.root,planPath),socket:loc.socket});
  f.put(`${f.base}/workflow/stages/score-once-attempt.json`,{stage:'score-once',automaticRetry:false});
  const held=await handoffRequest(f.run,planPath,'status');assert.equal(held.status,'interrupted-unsaved');assert.equal(held.serverReachable,false);
  const summary=status(f.run);assert.equal(summary.handoffs[0].status,'interrupted-unsaved');assert.equal(summary.deterministicAttempts[0].stage,'score-once');
  f.put(loc.metadata,{status:'held-in-memory',plan:record(f.root,planPath),socket:loc.socket});
  assert.equal((await handoffRequest(f.run,planPath,'status')).status,'unreachable-held-candidate');
});

// Run the public dispatcher against copied evidence; never call mutation helpers
// from the production checkout or substitute weaker validators in these fixtures.
function mechanicalFixture(t, number='900') {
  const f=fixture(t);
  const copy=p=>f.put(p,fs.readFileSync(path.join(repository,p),'utf8'));
  for(const p of [
    'scripts/lib/standalone-publication-check.mjs','scripts/lib/featured-quote-correction.mjs','scripts/lib/source-note-correction.mjs','scripts/lib/standalone-browser-replay.mjs',
    'scripts/lib/assessment-production-standalone-debate-v1.mjs','scripts/lib/reassessment-scoring.mjs',
    'scripts/lib/assessment-editor-scoped-source.mjs','scripts/standalone/review-resolved-ledger.mjs',
    'scripts/standalone/prepare-publication.mjs','scripts/standalone/apply-rhetorical.mjs'
  ])copy(p);
  f.put('package.json',{type:'module'});
  if(number!=='900') {
    const registry=JSON.parse(fs.readFileSync(path.join(repository,REGISTRY),'utf8'));
    const entry=registry.debates.find(e=>e.debateNumber===number);assert(entry);
    f.put(REGISTRY,{debates:[entry]});f.base=entry.root;
    copy(`${f.base}/manifest.json`);
  }
  return {...f,number,copy,read:p=>JSON.parse(fs.readFileSync(path.join(f.root,p),'utf8')),
    command:(...args)=>spawnSync(process.execPath,['scripts/standalone-workflow.mjs','mechanical','--debate',number,...args],{cwd:f.root,encoding:'utf8',maxBuffer:16*1024*1024})};
}

function passedMechanical(result) {
  assert.equal(result.status,0,result.stderr||result.stdout);
  return JSON.parse(JSON.parse(result.stdout).output);
}

function tagFixture(t,{zeroAccepted=false}={}) {
  const f=mechanicalFixture(t,'279'),folder=`${f.base}/publication/rhetorical-tag-review-1`;
  for(const p of ['publication/output.json','score-pass/output.json',
    'publication/rhetorical-tag-review-1/source-packet.json','publication/rhetorical-tag-review-1/catalog.json',
    'publication/rhetorical-tag-review-1/controller-initialization.json','publication/rhetorical-tag-review-1/check-review.mjs'])f.copy(`${f.base}/${p}`);
  for(const role of ['pass-a','pass-b','adjudication'])for(const name of ['packet.json','output.json','execution.json','execution-plan.json','source-definition-review.json'])f.copy(`${folder}/${role}/${name}`);
  f.put('src/data/debates.js',`export const debates = ${JSON.stringify(Array.from({length:25},(_,i)=>({number:String(171+i),sections:[{exchanges:[{pro:{tags:[]},con:{tags:[]}}]}]})))};\n`);
  if(!zeroAccepted) {
    f.copy(`${folder}/preserved-prior-output.json`);
    return {...f,folder};
  }
  // A synthetic, internally consistent zero-tag execution. Keep the actual
  // source-grounded rejected decisions; its modeled union contains only those
  // candidates. This is a transport fixture, not a reassessment of this debate.
  const key=c=>[c.moveId,c.type,c.label].join('|');
  const adjudication=f.read(`${folder}/adjudication/output.json`);
  adjudication.decisions=adjudication.decisions.filter(c=>c.decision==='rejected');
  assert(adjudication.decisions.length>0);
  const keys=new Set(adjudication.decisions.map(key));
  f.put(`${folder}/adjudication/output.json`,adjudication);
  const packet=f.read(`${folder}/adjudication/packet.json`);
  packet.candidates=packet.candidates.filter(c=>keys.has(key(c)));
  packet.expectedCandidateCount=packet.candidates.length;
  packet.outputSchemaBounds={decisions:{minItems:packet.candidates.length,maxItems:packet.candidates.length}};
  f.put(`${folder}/adjudication/packet.json`,packet);
  for(const role of ['pass-a','pass-b']) {
    const output=f.read(`${folder}/${role}/output.json`);
    output.candidateReviews=output.candidateReviews.filter(c=>keys.has(key(c)));
    output.acceptedTags=output.acceptedTags.filter(c=>keys.has(key(c)));
    f.put(`${folder}/${role}/output.json`,output);
  }
  for(const role of ['pass-a','pass-b','adjudication']) {
    const planPath=`${folder}/${role}/execution-plan.json`,outputPath=`${folder}/${role}/output.json`;
    f.put(planPath,{fixtureOnly:true,debateNumber:f.number,role,packet:record(f.root,`${folder}/${role}/packet.json`),outputPath});
    const receipt=f.read(`${folder}/${role}/execution.json`);
    receipt.plan=record(f.root,planPath);receipt.output=record(f.root,outputPath);
    f.put(`${folder}/${role}/execution.json`,receipt);
    f.put(`${folder}/${role}/source-definition-review.json`,{status:'passed-synthetic-fixture',violations:[],output:receipt.output,plan:receipt.plan});
  }
  const publication=f.read(`${f.base}/publication/output.json`);
  for(const section of publication.candidate.sections)for(const exchange of section.exchanges)for(const card of [exchange.pro,exchange.con].filter(Boolean))card.tags=[];
  f.put(`${f.base}/publication/output.json`,publication);
  const registry=f.read(REGISTRY);registry.debates[0].status='authorized';delete registry.debates[0].rhetoricalTagReview;f.put(REGISTRY,registry);
  return {...f,folder};
}

test('public source-eligibility checks accept ordinary and explicitly scoped frozen ledgers',t=>{
  for(const number of ['274','279']) {
    const f=mechanicalFixture(t,number);
    const inputs=['authorization.json','source/source-lock.json','inventory/inventory.json','judgments/pass-a/output.json','judgments/pass-b/output.json','disagreements/disagreements.json','adjudication/output.json','audio/audio-verification.json','final-ledger/final-ledger.json'];
    for(const p of inputs)f.copy(`${f.base}/${p}`);
    const before=inputs.map(p=>record(f.root,`${f.base}/${p}`));
    assert.equal(Boolean(f.read(`${f.base}/authorization.json`).availableRecordingScope),number==='279');
    assert.equal(passedMechanical(f.command('--step','source-eligibility','--check-only')).status,'passed-read-only-ledger-fixture');
    assert.deepEqual(inputs.map(p=>record(f.root,`${f.base}/${p}`)),before);
    assert(!fs.existsSync(path.join(f.root,f.base,'final-ledger/source-eligibility-review.json')));
  }
});

test('public tag checks reject changed authenticated output and plan bytes for every reviewer',t=>{
  const f=tagFixture(t);
  assert.equal(passedMechanical(f.command('--step','tags','--check-only')).status,'passed-read-only-tag-application-fixture');
  for(const role of ['pass-a','pass-b','adjudication'])for(const name of ['output','execution-plan']) {
    const relative=`${f.folder}/${role}/${name}.json`,file=path.join(f.root,relative),original=fs.readFileSync(file);
    // Valid JSON whitespace changes still invalidate the exact authenticated bytes.
    fs.writeFileSync(file,Buffer.concat([original,Buffer.from('\n')]));
    const failed=f.command('--step','tags','--check-only');
    assert.notEqual(failed.status,0);
    assert.match(failed.stderr,new RegExp(name==='output'?'Authenticated output changed':'Authenticated plan changed'));
    fs.writeFileSync(file,original);
  }
  assert.equal(passedMechanical(f.command('--step','tags','--check-only')).status,'passed-read-only-tag-application-fixture');
});

test('public publication preparation rejects missing metrics before any output is saved',t=>{
  const f=mechanicalFixture(t),b=f.base;
  f.put(`${b}/authorization.json`,{protocolId:'synthetic-fixture',identity:{title:'Synthetic Fixture (2026)',label:'Fixture',topicCategory:'fixture',canonicalUrl:'https://www.youtube.com/watch?v=fixture',motion:'Does the fixture hold?',pro:{position:'Yes',speaker:'A'},con:{position:'No',speaker:'B'}}});
  f.put(`${b}/inventory/inventory.json`,{assessedDebateWindowMs:{start:0,end:120000},moves:['pro','con'].map((side,i)=>({moveId:side,sectionId:'fixture',side,moveKind:i?'reply':'constructive',sourceSpan:{startMs:i*20000,endMs:(i+1)*20000}}))});
  f.put(`${b}/score-pass/output.json`,{debateId:'fixture-debate',status:'single-deterministic-score-pass-complete',overall:{pro:{score:60},con:{score:60}},sections:[{sectionId:'fixture',title:'Fixture',sides:Object.fromEntries(['pro','con'].map(side=>[side,{score:60,moves:[{moveId:side,score:60}]}]))}]});
  const note=`${b}/publication/source-note.txt`;
  f.put(note,'Synthetic fixture only. This note exercises preparation with complete source qualifications and does not represent a real debate or a new assessment.');
  const args=['--step','publication-skeleton','--date','2026-09-30','--source-note-file',note];
  for(const extra of [['--check-only'],[]]) {
    const failed=f.command(...args,...extra);assert.notEqual(failed.status,0);assert.match(failed.stderr,/reference-metrics\.json/);
    for(const name of ['skeleton.json','build-packet.json'])assert(!fs.existsSync(path.join(f.root,b,'publication',name)));
  }
  f.put(`${b}/publication/reference-metrics.json`,{fixtureOnly:true});
  assert.equal(passedMechanical(f.command(...args)).status,'prepared');
  assert.deepEqual(f.read(`${b}/publication/build-packet.json`).buildInputs.skeleton,record(f.root,`${b}/publication/skeleton.json`));
});

test('zero accepted tags produce an unchanged publication and can be checked without a prior-output archive',t=>{
  const f=tagFixture(t,{zeroAccepted:true}),publication=`${f.base}/publication/output.json`,before=record(f.root,publication);
  const applied=passedMechanical(f.command('--step','tags'));
  assert.equal(applied.status,'review-complete-no-tags-accepted');assert.equal(applied.accepted,0);assert.equal(applied.publicationWrites,0);
  assert.deepEqual(record(f.root,publication),before);
  assert(!fs.existsSync(path.join(f.root,f.folder,'preserved-prior-output.json')));
  const audit=f.read(`${f.folder}/audit.json`);
  assert(audit.completeCandidateUnion.length>0);assert.deepEqual(audit.acceptedTags,[]);
  assert(audit.candidateReviews.every(c=>c.decision==='rejected'));
  const checked=passedMechanical(f.command('--step','tags','--check-only'));
  assert.equal(checked.status,'passed-read-only-tag-application-fixture');assert.equal(checked.accepted,0);
  assert.deepEqual(record(f.root,publication),before);
});
