import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { hash, inside, json, loadPlan, now, readJson, record, verify, writeOnce } from './standalone-workflow.mjs';

export function handoffLocation(run, planPath) {
  const key=hash(run.root+'\n'+planPath).slice(0,32);
  return {socket:path.join(os.tmpdir(),`sf-${key}.sock`),metadata:`.assessment-cache/workflow-handoff/${key}.json`};
}

export function validateApproval(run, planPath, candidate, approvalPath) {
  const plan=loadPlan(run,planPath), approval=readJson(inside(run.root,approvalPath));
  assert(approvalPath.startsWith(run.base+'/'), 'Approval must be durable debate evidence');
  assert.equal(approval.status,'approved-first-submission');
  assert.equal(approval.candidateSha256,hash(candidate),'Approval is for different bytes');
  assert.deepEqual(approval.plan,record(run.root,planPath));
  assert.equal(approval.sourceEditorialReview?.status,'passed','Controller source/editorial review required');
  assert(typeof approval.sourceEditorialReview.notes==='string' && approval.sourceEditorialReview.notes.trim().length>=40,'Source-specific review notes required');
  verify(run.root,approval.readingEvidence);
  const reading=readJson(inside(run.root,approval.readingEvidence.path));
  assert.equal(reading.status,'authenticated-and-released-for-first-unsaved-candidate');
  assert.deepEqual(reading.plan,record(run.root,planPath));
  assert.equal(reading.outputAbsentAtRelease,true);
  assert(reading.inputs.length>=2 && reading.inputs.every(x=>x.literalCompleteReadAuthenticated===true));
  assert.deepEqual(reading.actualContextModels,[{model:plan.model.model,reasoningEffort:plan.model.reasoningEffort}]);
  return plan;
}

export async function holdCandidate(run, planPath, bytes) {
  const plan=loadPlan(run,planPath);
  assert.notEqual(run.entry.status,'published-and-frozen','Published evidence is immutable');
  assert(!fs.existsSync(plan.outputPath),'A submission already exists');
  assert(bytes.length>0 && bytes.length<=8*1024*1024,'Candidate must be nonempty and at most 8 MiB');
  JSON.parse(bytes.toString('utf8'));
  const check=spawnSync(plan.checker[0],plan.checker.slice(1),{cwd:run.root,input:bytes,encoding:'utf8',maxBuffer:8*1024*1024});
  assert.equal(check.status,0,`Candidate checker failed: ${check.stderr||check.stdout}`);
  const loc=handoffLocation(run,planPath);
  assert(!fs.existsSync(loc.socket),'A handoff is already running; inspect it instead of retrying');
  const meta=inside(run.root,loc.metadata);
  assert(!fs.existsSync(meta),'An earlier handoff exists; inspect its preserved status, do not restart automatically');
  fs.mkdirSync(path.dirname(meta),{recursive:true});
  const state={status:'held-in-memory',createdAt:now(),pid:process.pid,plan:record(run.root,planPath),candidateSha256:hash(bytes),candidateBytes:bytes.length,socket:loc.socket,checkerExitCode:check.status,checkerOutputSha256:hash((check.stdout||'')+(check.stderr||''))};
  const saveState=()=>fs.writeFileSync(meta,json(state),{mode:0o600});
  const server=http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');
      assert.equal(req.method,'GET');
      if(url.pathname==='/status') { res.end(json(state)); return; }
      if(url.pathname==='/read') {
        const start=Number(url.searchParams.get('start')||0),length=Number(url.searchParams.get('length')||16000);
        assert(Number.isInteger(start)&&start>=0&&Number.isInteger(length)&&length>0&&length<=32000);
        const text=bytes.toString('utf8');res.end(json({candidateSha256:state.candidateSha256,start,end:Math.min(start+length,text.length),totalCharacters:text.length,text:text.slice(start,start+length)}));return;
      }
      assert.equal(url.pathname,'/release');
      assert.equal(state.status,'held-in-memory');
      const approvalPath=url.searchParams.get('approval');
      assert.equal(url.searchParams.get('sha256'),state.candidateSha256);
      validateApproval(run,planPath,bytes,approvalPath);
      const output=writeOnce(run.root,plan.portableOutputPath,bytes);
      state.status='submitted-once';state.completedAt=now();state.output=output;state.approval=record(run.root,approvalPath);saveState();
      writeOnce(run.root,plan.portableOutputPath+'.handoff.json',json(state));
      res.end(json(state));server.close();
    } catch(error) {res.statusCode=409;res.end(json({error:error.message}));}
  });
  const clean=()=>{if(fs.existsSync(loc.socket))fs.unlinkSync(loc.socket);};
  server.on('close',clean);
  const interrupt=()=>{state.status='interrupted-unsaved';state.completedAt=now();saveState();server.close();};
  process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(loc.socket,resolve);});
  fs.chmodSync(loc.socket,0o600);saveState();
  return {server,state};
}

export function handoffRequest(run,planPath,action,options={}) {
  const loc=handoffLocation(run,planPath);
  const query=new URLSearchParams(options);
  return new Promise((resolve,reject)=>{
    const req=http.get({socketPath:loc.socket,path:`/${action}?${query}`},res=>{
      let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);res.on('end',()=>{
        try {const data=JSON.parse(text);assert.equal(res.statusCode,200,data.error);resolve(data);}catch(e){reject(e);}
      });
    });req.on('error',error=>{
      if(action==='status' && ['ENOENT','ECONNREFUSED'].includes(error.code)) {
        try {
          const state=readJson(inside(run.root,loc.metadata));
          assert.deepEqual(state.plan,record(run.root,planPath));
          resolve({...state,status:state.status==='held-in-memory'?'unreachable-held-candidate':state.status,serverReachable:false,automaticRetry:false});
        } catch(e) {reject(e);}
      } else reject(error);
    });
  });
}
