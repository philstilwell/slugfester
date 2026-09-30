import argparse, hashlib, json, re
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--debate',required=True)
p.add_argument('--phase',choices=['blind','adjudication'],required=True)
p.add_argument('--check-only',action='store_true')
a=p.parse_args();root=Path.cwd()
read=lambda p:json.loads(Path(p).read_text())
entry=next(x for x in read('docs/assessment-production/standalone-debates-v1/registry.json')['debates'] if x['debateNumber']==a.debate)
base=Path(entry['root']);folder=base/'publication/rhetorical-tag-review-1';manifest=read(base/'manifest.json')
def record(p):
    p=Path(p);assert not p.is_absolute() and p.resolve().is_relative_to(root)
    d=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(d).hexdigest(),'bytes':len(d)}
def write(p,o):
    assert not p.exists(),p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(o,indent=2,ensure_ascii=False)+'\n')
sourcepath=folder/'source-packet.json';catalogpath=folder/'catalog.json'
catalog=read(catalogpath);assert record(catalog['source']['path'])==catalog['source']
if a.phase=='blind':
    inv=read(base/'inventory/inventory.json');pub=read(base/'publication/output.json');candidate=pub['candidate']
    byid={m['moveId']:m for m in inv['moves']};moves=[]
    for section in candidate['sections']:
        for row in section['exchanges']:
            for side in ['pro','con']:
                if side not in row:continue
                card=row[side];m=byid[card['ledgerMoveId']];assert m['side']==side and m['sectionId']==section['sectionId']
                assert 'Locked score:' in card['critique']
                critique=card['critique'].split('Locked score:',1)[0].strip()
                assert not re.search(r'\b(?:locked score|overall score|winner)\b',critique,re.I)
                moves.append({**m,'description':card['words'],'critique':critique,'sectionTitle':section['title']})
    assert len(moves)==len(byid) and len({m['moveId'] for m in moves})==len(byid)
    source={'schemaVersion':'1.0-source-grounded-rhetorical-source-packet','debateNumber':a.debate,'debateId':entry['debateId'],'motion':inv['motion'],'sourceRestrictions':(base/'source/assessment-source-notes.md').read_text(),'moves':moves,'evidenceBoundary':'Follow the identical frozen assessed window and source restrictions in the inventory/source notes; outside-window material and all moderator premises/arguments are unscored context under the explicit approved scope. The two primary speakers’ own arguments and replies remain eligible, but neither receives credit for moderator reasoning. Scores, tag frequencies and existing tags are unavailable. Only defects already reflected in the frozen critique may receive catalog labels.'}
    if a.check_only:
        prior=read(sourcepath);assert source==prior,'Source extraction differs from fixture';print('Read-only fixture extraction matches exactly.');raise SystemExit
    write(sourcepath,source)
    write(folder/'controller-initialization.json',{'debateNumber':a.debate,'debateId':entry['debateId'],'status':'initialized-before-blind-reviews','acceptanceOverrides':[],'rejectionOverrides':[],'relabelingOverrides':[],'contextOverrides':[],'catalog':record(catalogpath),'policy':'Any later deterministic correction must name a current locked move and exact current catalog definition with separate authenticated evidence. No inherited overrides or tag quotas.'})
    targets=[folder/'pass-a',folder/'pass-b'];mode='blind-review';extra={'expectedMoveIds':[m['moveId'] for m in moves]}
else:
    source=read(sourcepath);ids=[m['moveId'] for m in source['moves']];union={}
    for name in ['pass-a','pass-b']:
        review=read(folder/name/'output.json');assert review['reviewedMoveIds']==ids
        for c in review['candidateReviews']:
            key=(c['moveId'],c['type'],c['label']);assert key[0] in ids
            union.setdefault(key,[]).append({k:v for k,v in c.items() if k not in ['moveId','type','label']})
    keys=sorted(union,key=lambda k:(ids.index(k[0]),k[1],k[2]))
    candidates=[{'moveId':k[0],'type':k[1],'label':k[2],'anonymousReviews':union[k]} for k in keys]
    extra={'candidates':candidates,'expectedCandidateCount':len(candidates),'outputSchemaBounds':{'decisions':{'minItems':len(candidates),'maxItems':len(candidates)}}}
    if a.check_only:print(json.dumps({'candidateCount':len(candidates),'keys':keys}));raise SystemExit
    targets=[folder/'adjudication'];mode='anonymous-adjudication'
for target in targets:
    packet={'mode':mode,'debateNumber':a.debate,'debateId':entry['debateId'],'sourcePacket':record(sourcepath),'catalogSnapshot':record(catalogpath),**extra}
    packetpath=target/'packet.json';write(packetpath,packet)
    inputs=[folder/'contract.md',packetpath,sourcepath,catalogpath,Path(manifest['sourceLocks']['indexedTranscript']['path']),base/'source/assessment-source-notes.md',folder/'check-review.mjs']
    output=target/'output.json';assert not output.exists()
    plan={'schemaVersion':'1.0-isolated-worker-execution-plan','status':'frozen-before-execution','phase':mode,'debateNumber':a.debate,'debateId':entry['debateId'],'model':manifest['modelSettings'],'allowedInputs':[record(x) for x in inputs],'fullReadRequiredForAllAllowedInputs':True,'outputPath':str(root/output),'allowedOutputPaths':[str(root/output)],'portableOutputPath':str(output),'attempts':1,'retries':0,'directIncrementalCostUsd':0,'instructions':'Confirm absolute destination, completely read every input in untruncated bounded chunks, and await authenticated reading release. Build actual unsaved JSON in persistent memory, validate via checker stdin, emit complete reconstructable slices and wait for source-specific submission release. Save once and stop; no other files, no peers, no paid calls.','isolation':'Fresh subscription context, fork none, protocol-restricted inputs and disjoint output; no OS sandbox claimed.'}
    write(target/'execution-plan.json',plan);print(json.dumps({'plan':str(target/'execution-plan.json'),'mode':mode,'outputPath':str(root/output)}))
