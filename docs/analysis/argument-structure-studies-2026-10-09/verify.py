"""Independent arithmetic and publication checks for research papers 8–10."""
from pathlib import Path
import json,hashlib,subprocess,collections,re
from urllib.parse import urlparse,unquote
import numpy as np
from pypdf import PdfReader
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];BASE=ROOT/'docs/analysis/corpus-papers-2026-10-09'
def load(p):return json.loads(p.read_text())
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
R=load(HERE/'results.json');checks=[]
for item in load(HERE/'source-manifest.json')['files']:
    assert digest(ROOT/item['path'])==item['sha256'],item['path']
checks.append('Every recorded source fingerprint matches')

# Freshly traverse raw ledgers instead of trusting exported reply tables.
ds=load(BASE/'debates.json');raw_counts=collections.Counter()
for d in ds:
    if d['cohort']!='later':continue
    a=load(ROOT/'docs/assessment-ledgers'/f"{d['id']}.json")
    ms=load(ROOT/a['evidenceLocks']['finalLedger']['path'])['moves'];lookup={x['moveId']:x for x in ms}
    raw_counts['debates']+=1;raw_counts['moves']+=len(ms)
    for m in ms:
        if m['moveKind']!='reply':continue
        raw_counts['replies']+=1;raw_counts['with_target']+=bool(m['respondsToIds']);raw_counts['multiple_targets']+=len(m['respondsToIds'])>1
        for mid in m['respondsToIds']:
            t=lookup[mid];raw_counts['edges']+=1
            raw_counts['opposite_side_edges']+=m['side']!=t['side'];raw_counts['reply_to_reply_edges']+=t['moveKind']=='reply'
            raw_counts['timed_edges']+=1;raw_counts['target_starts_no_later']+=t['sourceSpan']['startMs']<=m['sourceSpan']['startMs']
assert dict(raw_counts)==R['reply_graph']
checks.append('Reply census independently reconstructed from 112 raw ledgers')
rows=load(HERE/'opponent-appearances.json')
for a in rows:
    outside=[x['score'] for x in rows if x['speaker']==a['opponent'] and x['opponent']!=a['speaker']]
    same=[x['score'] for x in rows if x['speaker']==a['opponent'] and x['opponent']!=a['speaker'] and x['cohort']==a['cohort']]
    assert a['opponent_other_n']==len(outside) and a['opponent_same_process_n']==len(same)
    if outside:assert abs(a['opponent_other_mean']-sum(outside)/len(outside))<1e-10
    if same:assert abs(a['opponent_same_process_mean']-sum(same)/len(same))<1e-10
checks.append('Every opponent proxy excludes every meeting of the focal pair')
for key,m in {**R['models'],'matched_sample_pooled_proxy':R['matched_sample_pooled_proxy']}.items():
    sample=rows
    if key in ['earlier','later']:sample=[a for a in rows if a['cohort']==key]
    if key=='same_process_opponent_proxy':sample=[dict(a,opponent_other_n=a['opponent_same_process_n'],opponent_other_mean=a['opponent_same_process_mean']) for a in rows]
    if key=='matched_sample_pooled_proxy':sample=[a for a in rows if a['opponent_same_process_n']>=3]
    sample=[a for a in sample if a['opponent_other_n']>=m['threshold']]
    counts=collections.Counter(a['speaker'] for a in sample);sample=[a for a in sample if counts[a['speaker']]>=2]
    names=sorted(set(a['speaker'] for a in sample));cols=[[float(a['speaker']==s) for a in sample] for s in names]
    for control in m['controls']:
        for v in sorted(set(a[control] for a in sample))[1:]:cols.append([float(a[control]==v) for a in sample])
    cols.append([a['opponent_other_mean'] for a in sample])
    X=np.asarray(cols).T;y=np.asarray([a['score'] for a in sample])
    weights=np.asarray([1/counts[a['speaker']] if m['equal_person'] else 1 for a in sample])**.5
    # Full simultaneous fit, independent of the residualization in analyze.py.
    beta=np.linalg.lstsq(X*weights[:,None],y*weights,rcond=None)[0][-1]
    assert abs(beta-m['slope'])<1e-9,(key,beta,m['slope'])
    assert len(sample)==m['appearances'] and len(names)==m['speakers']
checks.append('All eight model coefficients and the matched-sample check independently reproduced by full design-matrix fits')
pair_groups=collections.defaultdict(list)
for d in ds:
    if d['cohort']=='unlocked':continue
    ns=tuple(sorted(d['speakers'].values()));side='pro' if d['speakers']['pro']==ns[0] else 'con';other='con' if side=='pro' else 'pro'
    pair_groups[ns].append((d['cohort'],d[side]-d[other]))
repeat=[xs for xs in pair_groups.values() if len(xs)>1]
reversed_pairs=sum(min(x[1] for x in xs)<0<max(x[1] for x in xs) for xs in repeat)
assert len(repeat)==21 and sum(map(len,repeat))==43 and reversed_pairs==2
same_groups=[[v for c,v in xs if c==cohort] for xs in repeat for cohort in ['earlier','later']]
same_groups=[xs for xs in same_groups if len(xs)>1]
assert len(same_groups)==12 and not any(min(xs)<0<max(xs) for xs in same_groups)
assert np.median([max(v for _,v in xs)-min(v for _,v in xs) for xs in repeat])==3
assert np.median([max(xs)-min(xs) for xs in same_groups])==2
checks.append('Repeated-pair counts, reversals and margin ranges independently reproduced')

cases=load(HERE/'selected-evidence.json');coding=load(HERE/'case-analysis.json');pub=load(HERE/'publication-manifest.json')
for key,debate_count in [('replies',5),('bridges',6)]:
    assert len(cases[key])==len(coding[key])==8
    assert len(set(c['number'] for c in cases[key]))==debate_count
    assert [(c['number'],c['move_id']) for c in cases[key]]==[(c['number'],c['move_id']) for c in coding[key]]
    for c in cases[key]:assert c['source_span']['excerpt'] and (ROOT/'debate'/c['debate_id']/'index.html').exists()
checks.append('All 16 focal passages have source excerpts, timestamps, coding and existing debate pages')
for m in pub:
    p=ROOT/m['path'];assert digest(p)==m['sha256'];pdf=PdfReader(p)
    assert len(pdf.pages)==m['pages'] and m['pages']>=6 and m['words']>1800
    text='\n'.join(page.extract_text() for page in pdf.pages)
    assert 'Methods and sources' in text and 'conclu' in text.lower()
    assert '\ufffd' not in text and '{{' not in text
    fonts=subprocess.check_output(['/opt/homebrew/bin/pdffonts',str(p)],text=True)
    for line in fonts.splitlines()[2:]:
        fields=line.split();assert fields[-5]=='yes',line
    for page in pdf.pages:
        for a in page.get('/Annots',[]):
            link=a.get_object().get('/A',{}).get('/URI','');url=urlparse(link)
            if url.netloc=='slugfester.com':
                target=ROOT/unquote(url.path).lstrip('/')
                assert target.exists(),link
    assert all(len(page.extract_text().split())>50 for page in pdf.pages)
checks.append('Three PDFs have embedded fonts, meaningful page text, valid internal-site links and matching hashes')
for m in load(BASE/'publication-manifest.json'):
    assert digest(ROOT/m['path'])==m['sha256'],m['path']
checks.append('All seven original PDF files retain their exact published fingerprints')
result=dict(status='passed',checks=checks,papers=[{k:m[k] for k in ['number','pages','figures','words','sha256']} for m in pub])
(HERE/'verification-results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
