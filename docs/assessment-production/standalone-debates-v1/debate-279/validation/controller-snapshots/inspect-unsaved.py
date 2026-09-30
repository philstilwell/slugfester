import argparse, hashlib, json, re
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--session',required=True)
p.add_argument('--call-id',required=True)
p.add_argument('--collection')
p.add_argument('--start',type=int,default=0)
p.add_argument('--end',type=int)
p.add_argument('--events')
p.add_argument('--metadata',action='store_true')
a=p.parse_args()

def objects(v):
    if isinstance(v,dict):
        yield v
        for k in ['text','output','content','value','result']:
            if k in v:yield from objects(v[k])
    elif isinstance(v,list):
        for x in v:yield from objects(x)
    elif isinstance(v,str):
        decoder=json.JSONDecoder()
        for i,c in enumerate(v):
            if c not in '{[':continue
            try:x,_=decoder.raw_decode(v[i:])
            except ValueError:continue
            yield from objects(x)
            break

rows=[json.loads(x) for x in Path(a.session).read_text().splitlines()]
callids=a.call_id.split(',')
outputs=[x['payload']['output'] for callid in callids for x in rows if x['type']=='response_item' and x.get('payload',{}).get('call_id')==callid and x['payload'].get('type') in ['function_call_output','custom_tool_call_output']]
chunktexts=[]
for out in outputs:
    texts=[out] if isinstance(out,str) else [x['text'] for x in out if x.get('type')=='input_text'] if isinstance(out,list) else []
    chunktexts.extend(t for t in texts if re.search(r'(?:chars(?: |\[)|bytes [0-9]|offset=[0-9])',t.split('\n',1)[0]))
if chunktexts and all('\n' in t for t in chunktexts):
    joined=''.join(t.split('\n',1)[1] for t in chunktexts)
    parsed,stop=json.JSONDecoder().raw_decode(joined)
    trailer=joined[stop:].strip()
    assert not trailer or all(re.fullmatch(r'(?:SHA256|CANONICAL_RAW_SHA256|CANONICAL_RAW_BYTES|CHECKER_STDIN_WITH_TERMINAL_NEWLINE_SHA256|CHECKER_STDIN_BYTES) [a-f0-9]+',line) for line in trailer.splitlines()),('Unexpected slice trailer',trailer)
    candidates=[parsed]
elif len(callids)>1:
    chunks=[]
    for out in outputs:
        assert isinstance(out,list)
        texts=[x['text'] for x in out if x.get('type')=='input_text']
        index=next(i for i,t in enumerate(texts) if 'chars ' in t.split('\n',1)[0])
        inline=texts[index].split('\n',1)[1] if '\n' in texts[index] else ''
        chunks.append(inline+''.join(texts[index+1:]))
    joined=''.join(chunks)
    parsed,stop=json.JSONDecoder().raw_decode(joined)
    trailer=joined[stop:].strip()
    assert not trailer or all(re.fullmatch(r'(?:SHA256|CANONICAL_RAW_SHA256|CANONICAL_RAW_BYTES|CHECKER_STDIN_WITH_TERMINAL_NEWLINE_SHA256|CHECKER_STDIN_BYTES) [a-f0-9]+',line) for line in trailer.splitlines()),('Unexpected slice trailer',trailer)
    candidates=[parsed]
else:
    candidates=[x for out in outputs for x in objects(out) if (isinstance(x.get('moves'),list) and 'routes' in x) or 'judgments' in x or 'resolutions' in x or 'candidate' in x or 'moveReviews' in x or 'decisions' in x]
assert len(candidates)==1,('Candidate match count',len(candidates))
o=candidates[0]
canonical=json.dumps(o,ensure_ascii=False,separators=(',',':')).encode()
print(json.dumps({'canonicalSha256':hashlib.sha256(canonical).hexdigest(),'canonicalBytes':len(canonical),'keys':list(o)},ensure_ascii=False))
if a.metadata:
    print(json.dumps({k:v for k,v in o.items() if k not in ['moves','judgments','resolutions','candidate','moveReviews','candidateReviews','acceptedTags','decisions']},ensure_ascii=False,indent=2))
elif a.collection:
    items=o[a.collection][a.start:a.end]
    if a.events:
        events=json.loads(Path(a.events).read_text())
        items=[{**x,'exactSupportingCaptionText':' '.join(e['text'] for e in events[x['startEvent']:x['endEvent']+1])} for x in items]
    print(json.dumps(items,ensure_ascii=False,indent=2))
else:
    print(json.dumps(o,ensure_ascii=False,indent=2))
