"""New studies 8–10. Read-only source extraction; no assessment scores changed."""
from pathlib import Path
import json, hashlib, csv, collections, itertools
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BASE = ROOT / 'docs/analysis/corpus-papers-2026-10-09'
def read(p): return json.loads(p.read_text())
def save(name, value): (HERE/name).write_text(json.dumps(value, indent=2, ensure_ascii=False)+'\n')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
debates = read(BASE/'debates.json')
moves = {(m['number'],m['move_id']):m for m in read(BASE/'moves.json')}
public = {(m['number'],m['move_id']):m for m in read(BASE/'casebook.json')}
assert len(debates)==308 and len(moves)==7032
frozen = {x['path']:x['sha256'] for x in read(BASE/'source-manifest.json')['files']}
paths = {BASE/x for x in ['debates.json','moves.json','casebook.json','source-manifest.json']}
raw = {}; edges=[]; reply_rows=[]; counts=collections.Counter(); anomalies=[]
for d in debates:
    if d['cohort']!='later': continue
    adapter=ROOT/'docs/assessment-ledgers'/f"{d['id']}.json"
    assert digest(adapter)==frozen[str(adapter.relative_to(ROOT))]
    a=read(adapter); path=ROOT/a['evidenceLocks']['finalLedger']['path']
    assert digest(path)==a['evidenceLocks']['finalLedger']['sha256']==frozen[str(path.relative_to(ROOT))]
    paths.update([adapter,path]); ledger=read(path)
    lookup={m['moveId']:m for m in ledger['moves']}
    for m in ledger['moves']:
        raw[(d['number'],m['moveId'])]=m
        if m['moveKind']!='reply': continue
        targets=m.get('respondsToIds',[])
        counts['replies']+=1; counts['with_target']+=bool(targets)
        counts['multiple_targets']+=len(targets)>1
        reply_rows.append(dict(number=d['number'],move_id=m['moveId'],speaker=d['speakers'][m['side']],targets=targets,score=moves[(d['number'],m['moveId'])]['score']))
        for target in targets:
            counts['edges']+=1
            if target not in lookup:
                anomalies.append([d['number'],m['moveId'],target,'missing']); continue
            t=lookup[target]; opposite=m['side']!=t['side']
            counts['opposite_side_edges']+=opposite
            counts['reply_to_reply_edges']+=t['moveKind']=='reply'
            ms=m.get('sourceSpan',{}).get('startMs'); ts=t.get('sourceSpan',{}).get('startMs')
            if ms is not None and ts is not None:
                counts['timed_edges']+=1; counts['target_starts_no_later']+=ts<=ms
            edges.append(dict(number=d['number'],reply=m['moveId'],target=target,opposite_side=opposite,target_kind=t['moveKind']))
assert counts['replies']==2444 and not anomalies
save('reply-links.json',reply_rows)
save('reply-edges.json',edges)

# Purposive cases: function contrasts, not a score-ranked or representative sample.
selections={
 'replies':[(308,'fundamental-errors-require-correction'),(306,'meyer-order-versus-functional-sequence'),(303,'foreknowledge-modal-reply'),(308,'truth-and-interpersonal-harm-without-exclusivism'),(245,'concession-and-remaining-scope'),(308,'mistake-accommodation-and-shared-moral-framework'),(303,'rational-committee-normativity-critique'),(265,'option-count-depends-on-partition-granularity')],
 'bridges':[(244,'pro-stage-structure'),(303,'personal-first-cause'),(265,'value-sensitive-theism-outpredicts-naturalism'),(244,'pro-unlimited-parsimony'),(244,'pro-trinity-perfect-community'),(245,'limited-power-and-suffering'),(270,'horn-resurrection-best-explanation'),(306,'meyer-data-not-biblical-deduction')]
}
db={d['number']:d for d in debates}
def evidence(n,mid):
    m=raw[(n,mid)]; d=db[n]; p=public[(n,mid)]
    return dict(number=n,debate_id=d['id'],title=d['title'],youtube=d['youtube'],move_id=mid,speaker=d['speakers'][m['side']],side=m['side'],kind=m['moveKind'],time=p['time'],score=p['score'],claim=m.get('claim',m.get('proposition','')),warrant=m.get('warrant',''),inference=m.get('inference',m.get('inferentialBridge','')),source_span=m.get('sourceSpan',{}),targets=m.get('respondsToIds',[]),public_paraphrase=p['words'],existing_critique=p['critique'])
casebook={k:[dict(evidence(n,mid),target_evidence=[evidence(n,t) for t in raw[(n,mid)].get('respondsToIds',[])]) for n,mid in items] for k,items in selections.items()}
save('selected-evidence.json',casebook)

# Opponent study: full comparable one-on-one set, with no personal-religion coding.
eligible=[d for d in debates if d['cohort'] in ['earlier','later']]
appearances=[]; pairs=collections.defaultdict(list)
for d in eligible:
    names=tuple(sorted(d['speakers'].values()))
    pairs[names].append(d)
    for side,other in [('pro','con'),('con','pro')]:
        appearances.append(dict(number=d['number'],speaker=d['speakers'][side],opponent=d['speakers'][other],side=side,cohort=d['cohort'],score=d[side],opponent_score=d[other],topic=d['topic'] or 'Other questions'))
by_speaker=collections.defaultdict(list)
for a in appearances: by_speaker[a['speaker']].append(a)
for a in appearances:
    # Exclude EVERY meeting of this pair, not just this event, from the opponent proxy.
    other=[x['score'] for x in by_speaker[a['opponent']] if x['opponent']!=a['speaker']]
    a['opponent_other_n']=len(other)
    a['opponent_other_mean']=float(np.mean(other)) if other else None
    same=[x['score'] for x in by_speaker[a['opponent']] if x['opponent']!=a['speaker'] and x['cohort']==a['cohort']]
    a['opponent_same_process_n']=len(same)
    a['opponent_same_process_mean']=float(np.mean(same)) if same else None
    own=[x['score'] for x in by_speaker[a['speaker']] if x['opponent']!=a['opponent']]
    a['speaker_other_mean']=float(np.mean(own)) if own else None
repeated=[]
for names,ds in pairs.items():
    if len(ds)<2:continue
    entries=[]
    for d in sorted(ds,key=lambda x:x['number']):
        side='pro' if d['speakers']['pro']==names[0] else 'con'
        other='con' if side=='pro' else 'pro'
        entries.append(dict(number=d['number'],cohort=d['cohort'],title=d['title'],id=d['id'],first_score=d[side],second_score=d[other],first_minus_second=d[side]-d[other]))
    signs={np.sign(x['first_minus_second']) for x in entries}
    repeated.append(dict(speakers=names,meetings=len(ds),entries=entries,margin_range=max(x['first_minus_second'] for x in entries)-min(x['first_minus_second'] for x in entries),strict_reversal=(-1 in signs and 1 in signs)))
repeated.sort(key=lambda x:(-x['meetings'],x['speakers']))
save('opponent-appearances.json',appearances);save('repeated-pairs.json',repeated)

def association(rows,threshold=3,controls=('cohort','side'),equal_person=False):
    rows=[a for a in rows if a['opponent_other_n']>=threshold]
    groups=collections.Counter(a['speaker'] for a in rows)
    rows=[a for a in rows if groups[a['speaker']]>=2]
    if not rows:return None
    speakers=sorted(set(a['speaker'] for a in rows))
    columns=[[float(a['speaker']==s) for a in rows] for s in speakers]
    for key in controls:
        for v in sorted(set(a[key] for a in rows))[1:]: columns.append([float(a[key]==v) for a in rows])
    X=np.array(columns).T; y=np.array([a['score'] for a in rows]); z=np.array([a['opponent_other_mean'] for a in rows])
    group_counts=collections.Counter(a['speaker'] for a in rows)
    w=np.array([1/group_counts[a['speaker']] if equal_person else 1 for a in rows])**.5
    Xw=X*w[:,None]
    yr=y-X@np.linalg.lstsq(Xw,y*w,rcond=None)[0]
    zr=z-X@np.linalg.lstsq(Xw,z*w,rcond=None)[0]
    beta=float(np.sum(w*w*zr*yr)/np.sum(w*w*zr*zr))
    return dict(appearances=len(rows),speakers=len(speakers),debates=len(set(a['number'] for a in rows)),threshold=threshold,controls=list(controls),equal_person=equal_person,own_score_change_per_5_opponent_points=beta*5,within_correlation=float(np.corrcoef(zr,yr)[0,1]),residual_opponent_sd=float(np.std(zr)),slope=beta)
models={
 'speaker_only':association(appearances,controls=()),
 'speaker_process_role':association(appearances),
 'plus_broad_topic':association(appearances,controls=('cohort','side','topic')),
 'equal_person':association(appearances,equal_person=True),
 'opponent_min5':association(appearances,threshold=5),
 'earlier':association([a for a in appearances if a['cohort']=='earlier'],controls=('side',)),
 'later':association([a for a in appearances if a['cohort']=='later'],controls=('side',)),
 'same_process_opponent_proxy':association([dict(a,opponent_other_n=a['opponent_same_process_n'],opponent_other_mean=a['opponent_same_process_mean']) for a in appearances]),
}
same_process=[]
for p in repeated:
    for c in ['earlier','later']:
        es=[e for e in p['entries'] if e['cohort']==c]
        if len(es)>=2:
            signs={np.sign(x['first_minus_second']) for x in es}
            same_process.append(dict(speakers=p['speakers'],cohort=c,meetings=len(es),margin_range=max(x['first_minus_second'] for x in es)-min(x['first_minus_second'] for x in es),strict_reversal=(-1 in signs and 1 in signs)))
counts_op=dict(debates=len(eligible),appearances=len(appearances),speakers=len(by_speaker),three_opponents=sum(len(set(a['opponent'] for a in xs))>=3 for xs in by_speaker.values()),unique_pairs=len(pairs),repeated_pairs=len(repeated),repeated_pair_debates=sum(x['meetings'] for x in repeated),strict_reversal_pairs=sum(x['strict_reversal'] for x in repeated),median_margin_range=float(np.median([x['margin_range'] for x in repeated])),same_process_pair_groups=len(same_process),same_process_reversals=sum(x['strict_reversal'] for x in same_process),same_process_median_range=float(np.median([x['margin_range'] for x in same_process])))
save('same-process-repeats.json',same_process)
matched_sample=association([a for a in appearances if a['opponent_same_process_n']>=3])
save('results.json',dict(source_commit='e65bc3c0b6',snapshot='2026-10-09',reply_graph=dict(debates=112,moves=3609,**counts),opponents=counts_op,models=models,matched_sample_pooled_proxy=matched_sample))
save('source-manifest.json',dict(source_commit='e65bc3c0b6',files=[dict(path=str(p.relative_to(ROOT)),sha256=digest(p)) for p in sorted(paths)]))
print(json.dumps(read(HERE/'results.json'),indent=2))
