import argparse, hashlib, json, re
from pathlib import Path
from datetime import datetime, timezone

p=argparse.ArgumentParser()
p.add_argument('--debate',required=True)
p.add_argument('--plan',required=True)
p.add_argument('--session',required=True)
p.add_argument('--agent',required=True)
p.add_argument('--output',required=True)
p.add_argument('--stage',choices=['reading','complete'],required=True)
a=p.parse_args()
root=Path.cwd().resolve()
reg=json.loads((root/'docs/assessment-production/standalone-debates-v1/registry.json').read_text())
entry=next(x for x in reg['debates'] if x['debateNumber']==a.debate)
assert entry['status'] != 'published-and-frozen', 'Published evidence is immutable'
base=(root/entry['root']).resolve()
assert base.is_relative_to(root)
planpath=(root/a.plan).resolve()
assert planpath.is_relative_to(base)
plan=json.loads(planpath.read_text())
assert plan['debateNumber']==a.debate and plan['debateId']==entry['debateId']
session=Path(a.session)
raw=session.read_bytes()
rows=[json.loads(s) for s in raw.decode().splitlines()]
meta=next(x['payload'] for x in rows if x['type']=='session_meta')
assert meta['agent_path']==a.agent
models=sorted({(x['payload']['model'],x['payload'].get('effort')) for x in rows if x['type']=='turn_context'})
assert models==[(plan['model']['model'],plan['model']['reasoningEffort'])],models
calls={}
outputs=[]
def strings(value):
    if isinstance(value,str):
        yield value
        try:
            decoded=json.loads(value)
        except (ValueError,TypeError):
            return
        if not isinstance(decoded,str): yield from strings(decoded)
    elif isinstance(value,list):
        for v in value: yield from strings(v)
    elif isinstance(value,dict):
        for k,v in value.items():
            if k in ['text','output','content','value']: yield from strings(v)
for row in rows:
    q=row.get('payload',{})
    if row['type']!='response_item':continue
    if q.get('type') in ['function_call','custom_tool_call']:
        args=q.get('arguments',q.get('input',''))
        calls[q['call_id']]={'tool':q['name'],'arguments':args}
    elif q.get('type') in ['function_call_output','custom_tool_call_output']:
        outputs.append((q['call_id'],list(strings(q['output']))))
def record(path):
    path=Path(path).resolve();assert path.is_relative_to(root);data=path.read_bytes()
    return {'path':str(path.relative_to(root)),'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
for rec in plan.get('sourceInputs', []) + plan.get('toolInputs', []) + ([plan['packet']] if 'packet' in plan else []):
    assert record(root/rec['path']) == rec, ('changed pinned source or tool', rec['path'])
inputs=[record(planpath),*plan['allowedInputs']]
evidence=[]
for rec in inputs:
    f=root/rec['path'];assert f.is_file()
    assert record(f)==rec,(str(f),'input changed')
    lines=f.read_text().splitlines()
    matched=set();bycall=[]
    for callid,parts in outputs:
        args=calls.get(callid,{}).get('arguments','')
        if f.name not in args and str(f) not in args and rec['path'] not in args:
            if not (plan.get('schemaVersion')=='2.0-isolated-worker-execution-plan' and 'standalone-workflow.mjs read' in args and a.plan in args and rec in plan['allowedInputs']):continue
        rawlines=[line for part in parts for line in part.splitlines()]
        available=set(rawlines)
        available.update(re.sub(r"^\s*\d+\t", "", line) for line in rawlines if re.match(r"^\s*\d+\t", line))
        present={i for i,line in enumerate(lines,1) if line.strip() and line in available}
        if present:
            matched.update(present)
            bycall.append({'callId':callid,'sourceLineCount':len(present),'firstSourceLine':min(present),'lastSourceLine':max(present)})
    missing=[i for i,line in enumerate(lines,1) if line.strip() and i not in matched]
    assert not missing,(rec['path'],'missing source lines',missing[:30])
    evidence.append({**rec,'literalCompleteReadAuthenticated':True,'nonemptyLines':sum(bool(x.strip()) for x in lines),'missingLines':missing,'toolOutputEvidence':bycall})
out=(root/a.output).resolve()
assert out.is_relative_to(base) and not out.exists()
doc={'schemaVersion':'2.0-authenticated-subscription-worker-evidence','status':'authenticated-and-released-for-first-unsaved-candidate' if a.stage=='reading' else 'authenticated-completed-first-submission','debateNumber':a.debate,'debateId':entry['debateId'],'createdAt':datetime.now(timezone.utc).isoformat(),'agentPath':a.agent,'actualContextModels':[{'model':m,'reasoningEffort':e} for m,e in models],'plan':record(planpath),'sessionSnapshot':{'externalLocalSessionPath':str(session),'sessionId':meta['id'],'parentThreadId':meta['parent_thread_id'],'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'rawSessionCommitted':False},'authentication':'ChatGPT subscription via built-in collaboration; no API inference','isolation':'Fresh fork-none context, restricted inputs and disjoint output. No operating-system sandbox claimed. Controller inspects tool calls separately.','attempts':plan.get('attempts',1),'retries':plan.get('retries',0),'attemptNumber':plan.get('attemptNumber',1),'replacementAuthorization':plan.get('replacementAuthorization'),'directIncrementalCostUsd':0,'inputs':evidence,'toolCallRecords':[{'callId':k,'tool':v['tool'],'argumentsSha256':hashlib.sha256(v['arguments'].encode()).hexdigest()} for k,v in calls.items()]}
if a.stage=='reading':
    assert not Path(plan['outputPath']).exists();doc['outputAbsentAtRelease']=True
else:
    doc['output']=record(plan['outputPath'])
    if plan.get('schemaVersion')=='2.0-isolated-worker-execution-plan':
        handoff=json.loads(Path(plan['outputPath']+'.handoff.json').read_text())
        assert handoff['status']=='submitted-once' and handoff['output']==doc['output']
        assert handoff['plan']==record(planpath)
        assert handoff['candidateSha256']==doc['output']['sha256']
        doc['handoff']=record(plan['outputPath']+'.handoff.json')
out.parent.mkdir(parents=True,exist_ok=True)
with out.open('x') as f: f.write(json.dumps(doc,indent=2)+'\n')
print(json.dumps({'status':doc['status'],'inputs':len(evidence),'model':models,'toolCalls':len(calls),'output':str(out)}))
