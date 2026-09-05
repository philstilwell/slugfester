#!/usr/bin/env python3
"""Frozen 253-assessment analysis. No AI calls; never changes an assessment.

Run with numpy/scipy installed. All interval resampling uses seed 20260904.
Public scores, moves, section weights and final ledgers are cross-checked.
"""
from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import math
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from scipy.stats import rankdata, spearmanr

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SEED, DRAWS = 20260904, 20000
DIMS = dict(logicalCoherence=.25, evidenceWarrant=.20, responsiveness=.20,
            relevanceBurden=.15, precisionClarity=.10, calibrationCharity=.10)
LABELS = ['Logical coherence', 'Evidence and warrant', 'Responsiveness',
          'Relevance and burden', 'Precision and clarity', 'Confidence and fairness']
SOURCE_COMMIT = '76d006b37'

# Retain the 169 explicitly reviewed September 1 classifications, not an
# open-ended rule that PRO means theism. Every added debate has a decision.
ADDITIONS = {
    227: ('pro', 'Religion, culture & meaning', 'Religious purpose versus secular meaning'),
    228: ('con', 'Scripture, revelation & doctrine', 'Religious reliability defense versus skeptical history'),
    229: ('', '', 'A historical Jesus does not imply a divine Jesus'),
    230: ('', '', 'Idealism versus naturalism does not itself establish a God contrast'),
    231: ('', '', 'A nonphysical soul does not itself imply God; consistent with exclusions 190/201'),
    232: ('pro', 'General theism & naturalism', 'Finite theism versus naturalism'),
    233: ('pro', 'General theism & naturalism', 'Christianity as a rational worldview versus naturalistic atheism'),
    234: ('', '', 'Two nonstandard mind-first views; no clean religious-versus-skeptical contrast'),
    235: ('', '', 'Soul existence alone is religion-adjacent, not a theism contrast'),
    236: ('', '', 'Moral realism versus anti-realism is not theism versus atheism'),
    237: ('pro', 'Resurrection & historical evidence', 'Resurrection defense versus skeptical historical method'),
    238: ('pro', 'General theism & naturalism', 'Christian rationality versus skeptical challenge'),
    239: ('pro', 'Religion, culture & meaning', 'Religious narrative necessity versus secular alternatives'),
    240: ('', '', 'Both sides defend cosmic purpose; alternatives include a limited designer'),
    241: ('pro', 'General theism & naturalism', 'Mind-like spiritual God versus evidential skepticism'),
    242: ('', '', 'Two religious readings of Jesus; consistent with Borg/Crossan exclusions'),
    243: ('pro', 'General theism & naturalism', 'Christian truth versus evidential challenge'),
    244: ('pro', 'Cosmology, science & design', 'Necessary divine mind versus insufficient identification'),
    245: ('pro', 'Mind, reason & logic', 'Explicit nontraditional theism versus skeptical objections'),
    246: ('pro', 'Scripture, revelation & doctrine', 'Classical-theist doctrine versus agnostic criticism; broad-set only'),
    247: ('con', 'Morality & moral foundations', 'God-independent goodness versus foundation in Christ'),
    248: ('pro', 'Scripture, revelation & doctrine', 'Classical-theist explanation versus agnostic criticism; broad-set only'),
    249: ('', '', 'Stance-independent morality is not equivalent to theism'),
    250: ('pro', 'Mind, reason & logic', 'Theistic versus naturalistic explanation of logic'),
    251: ('con', 'Evil, suffering & hiddenness', 'Evil-God challenge versus divine-goodness defense'),
    252: ('pro', 'Evil, suffering & hiddenness', 'Christian permission-of-evil defense versus suffering challenge'),
    253: ('pro', 'Evil, suffering & hiddenness', 'Christian plausibility versus hiddenness and hell challenge'),
}
TOPICS = {
 'Religion, culture & meaning': [3,6,9,15,16,21,46,62,89,101,106,124,145,171,172,207,214,216,217,218],
 'Scripture, revelation & doctrine': [7,25,39,42,50,53,63,66,90,93,102,120,142,157,176,177,178,215,220],
 'Mind, reason & logic': [5,12,49,67,68,70,72,76,80,91,99,100,104,108,114,143,147,197],
 'Evil, suffering & hiddenness': [1,11,27,48,74,98,103,113,116,118,119,122,123,128,209,210,211],
 'Morality & moral foundations': [10,13,20,24,47,54,57,58,61,97,127,148,151,155,156,160,162,164,198,204],
 'Cosmology, science & design': [17,22,33,43,51,55,59,65,75,83,85,92,107,117,121,126,139,144,168,169,191,206,223],
 'General theism & naturalism': [2,8,14,26,28,29,30,36,64,77,79,81,86,88,94,109,112,140,141,152,161,163,165,166,167,170,175,194,195,196,200,202,203,205,219,222],
 'Resurrection & historical evidence': [31,37,52,60,69,78,87,130,136,137,138,150,158,179,181,212],
}
NARROW_EXCLUDE = {7,13,20,24,25,42,47,54,57,61,90,97,160,176,177,178,228,246,248}

def dump(name, obj):
    (OUT/name).write_text(json.dumps(obj, indent=2, ensure_ascii=False, allow_nan=False)+'\n')

def csvout(name, rows):
    with (OUT/name).open('w', newline='', encoding='utf-8') as f:
        w=csv.DictWriter(f, fieldnames=list(rows[0]),lineterminator='\n'); w.writeheader(); w.writerows(rows)

def mean(x): return float(np.mean(x))
def rnd(x): return math.floor(x+.5)
def interval(x): return [float(v) for v in np.quantile(x,[.025,.975])]

def move_score(dimensions):
    # Python 3.12's compensated sum changes some half-point edge cases.
    # Match the published JavaScript left-to-right floating-point reducer.
    total=0.0
    for k,w in DIMS.items(): total+=dimensions[k]*w
    return rnd(total)

def boots(x, offset=0):
    x=np.asarray(x,dtype=float); rng=np.random.default_rng(SEED+offset)
    return np.concatenate([rng.choice(x,(1000,len(x)),replace=True).mean(axis=1) for _ in range(DRAWS//1000)])

def stats(x):
    x=np.asarray(x,dtype=float)
    return dict(n=len(x), mean=mean(x), median=float(np.median(x)), sd=float(x.std(ddof=1)) if len(x)>1 else 0,
                ci=interval(boots(x)), positive=int(sum(x>0)), zero=int(sum(x==0)), negative=int(sum(x<0)))

def precision(f):
    if f['propositionRecoverability']=='failed': return 35
    if f['termStability']=='materially-unstable' or f['scopeStability']=='materially-unstable' or f['qualificationExplicitness']=='materially-misleading': return 60
    if f['propositionRecoverability']=='partial' or f['termStability']=='partly-unstable' or f['scopeStability']=='partly-unstable' or f['qualificationExplicitness']=='missing': return 75
    return 85 if f['qualificationExplicitness']=='implicit' else 95

def calibration(f):
    if f['warrantFit'] in ['radically-overstated','materially-overstated','slightly-overstated']:
        return dict(zip(['radically-overstated','materially-overstated','slightly-overstated'],[35,60,75]))[f['warrantFit']]
    return 95 if f['qualificationStatus'] in ['explicit','not-needed'] and f['uncertaintyAcknowledged'] in ['yes','not-needed'] else 85

def public():
    code="""
import {publishedDebates} from './src/data/debates.js';
import {avatarsForSpeakerText} from './src/data/interlocutors.js';
console.log(JSON.stringify(publishedDebates.map(d=>({...d,
  canonical:Object.fromEntries(['pro','con'].map(s=>[s,avatarsForSpeakerText(d.sides[s].speaker).map(x=>x.name)]))
}))));
"""
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))

def main():
    public_rows=public(); assert len(public_rows)==253
    assert len({p['id'] for p in public_rows})==253
    assert len({p['youtubeUrl'] for p in public_rows})==253
    old={int(x['number']):x for x in csv.DictReader((ROOT/'docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv').open())}
    topic_by_n={n:t for t,ns in TOPICS.items() for n in ns}
    assert len(topic_by_n)==169
    hash_paths={ROOT/'src/data'/name for name in ['debates.js','interlocutors.js','topic-assignments.js','topics.js','ai-contributions.js']}
    hash_paths.add(ROOT/'docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv')
    rows=[]; moves=[]; casebook=[]; checks=Counter(); raw_sources={}
    for p in public_rows:
        n=int(p['number']); path=ROOT/'docs/assessment-ledgers'/f"{p['id']}.json"
        detail=ROOT/'src/data/debate-details'/f"{p['id']}.js"
        if detail.exists(): hash_paths.add(detail)
        cards=[]
        for sec in p.get('sections',[]):
            for exc in sec.get('exchanges',[]):
                for side in ['pro','con']:
                    raw=exc.get(side); seq=raw if isinstance(raw,list) else [raw]
                    for card in seq:
                        if not isinstance(card,dict): continue
                        cards.append(dict(number=n,side=side,move_id=card.get('ledgerMoveId'),score=card['score'],
                          words=card.get('words',''),critique=card.get('critique',''),time=card.get('time',''),
                          fallacies=[t['label'] for t in card.get('tags',[]) if t['type']=='fallacy'],
                          biases=[t['label'] for t in card.get('tags',[]) if t['type']=='bias']))
        r=dict(number=n,id=p['id'],title=p['title'],motion=p['motion'],youtube=p['youtubeUrl'],date=p.get('date'),
          model=p.get('assessmentModel'),rubric=p.get('assessmentRubric'),
          pro=p['score']['pro'],con=p['score']['con'],con_gap=p['score']['con']-p['score']['pro'],
          speakers={s:p['canonical'][s][0] if len(p['canonical'][s])==1 else p['sides'][s]['speaker'] for s in ['pro','con']},
          ranking_eligible=p.get('interlocutorRankingEligible') is not False and all(len(p['canonical'][s])==1 for s in ['pro','con']),
          cohort='unlocked',theist_side='',topic='',narrow=False,reason='Multi-speaker or non-comparable scoring format',
          public_moves=len(cards),public_fallacies={s:sum(bool(c['fallacies']) for c in cards if c['side']==s) for s in ['pro','con']},
          public_anytags={s:sum(bool(c['fallacies'] or c['biases']) for c in cards if c['side']==s) for s in ['pro','con']})
        if n in old:
            r['reason']=old[n]['reason']
            if old[n]['included']=='True': r.update(theist_side=old[n]['theist_side'],topic=topic_by_n[n])
        elif n in ADDITIONS:
            r['theist_side'],r['topic'],r['reason']=ADDITIONS[n]
        if r['theist_side']:
            r['non_side']='con' if r['theist_side']=='pro' else 'pro'
            r['gap']=r[r['non_side']]-r[r['theist_side']]
            r['narrow']=r['topic']!='Religion, culture & meaning' and n not in NARROW_EXCLUDE
        if path.exists():
            hash_paths.add(path); a=json.loads(path.read_text()); calc=a['calculated']
            if 'scoringJudgment' in a:
                r['cohort']='earlier'; src=a['scoringJudgment']['moves']
            else:
                r['cohort']='later'; final=ROOT/a['evidenceLocks']['finalLedger']['path']; hash_paths.add(final)
                assert hashlib.sha256(final.read_bytes()).hexdigest()==a['evidenceLocks']['finalLedger']['sha256']
                checks['final_ledger_hashes']+=1; src=json.loads(final.read_text())['moves']
            raw_sources[n]=src
            by_id={}
            for m in src:
                if r['cohort']=='earlier':
                    d={k:m['ratings'][k]['value'] for k in list(DIMS)[:4]}
                    d['precisionClarity']=precision(m['precisionFindings'])
                    d['calibrationCharity']=rnd((calibration(m['calibrationFindings'])+m['ratings']['representationalCharity']['value'])/2)
                    f=m['precisionFindings']; c=m['calibrationFindings']
                    flags=dict(low_warrant=d['evidenceWarrant']<70,
                      overclaim=c['warrantFit'] in ['materially-overstated','radically-overstated'],
                      compression=f['termStability']!='stable' or f['scopeStability']!='stable' or f['qualificationExplicitness'] in ['missing','materially-misleading'])
                    flags['slogan_risk']=all(flags.values())
                else:
                    d={k:m['finalDimensions'][k]['value'] for k in DIMS}; flags={}
                item=dict(number=n,move_id=m['moveId'],side=m['side'],speaker=r['speakers'][m['side']],
                     cohort=r['cohort'],kind=m.get('moveKind','unknown'),importance=int(m['importance']),dimensions=d,
                     score=move_score(d),flags=flags,
                     theist=(m['side']==r['theist_side']) if r['theist_side'] else None)
                by_id[m['moveId']]=item
            assert len(by_id)==len(src)
            seen=set(); r['dimensions']={}; r['adjustments']={}
            for s in ['pro','con']:
                d={k:0. for k in DIMS}; tot=0.
                assert sum(x['weightPercent'] for x in calc['sections'])==100
                for sec in calc['sections']:
                    its=sec['sides'][s]['moves']; den=sum(x['importance'] for x in its)
                    for it in its:
                        m=by_id[it['moveId']]; assert (m['side'],m['score'],m['importance'])==(s,it['score'],it['importance']), (n,it['moveId'],m['score'],it['score'])
                        seen.add(it['moveId']); checks['move_scores']+=1
                    sc=rnd(sum(x['importance']*x['score'] for x in its)/den)
                    assert sc==sec['sides'][s]['score']; checks['section_scores']+=1
                    tot+=sc*sec['weightPercent']/100
                    for k in d: d[k]+=sum(by_id[x['moveId']]['dimensions'][k]*x['importance'] for x in its)/den*sec['weightPercent']/100
                adj=calc['overall'][s].get('burdenCompletionAdjustment',0)
                assert rnd(tot+adj)==calc['overall'][s]['score']==r[s], (n,s,tot,adj,r[s])
                checks['overall_scores']+=1; r['dimensions'][s]=d; r['adjustments'][s]=adj
            assert seen==set(by_id)
            assert len(cards)==len(src), (n,len(cards),len(src))
            assert {c['move_id'] for c in cards}==set(by_id)
            for c in cards:
                assert c['score']==by_id[c['move_id']]['score'],(n,c['move_id'])
                checks['public_move_scores']+=1
                by_id[c['move_id']]['fallacies']=c['fallacies']; by_id[c['move_id']]['biases']=c['biases']
                casebook.append({**c,'debate_id':r['id'],'youtube':r['youtube'],'speaker':r['speakers'][c['side']], 'dimensions':by_id[c['move_id']]['dimensions']})
            moves.extend(by_id.values())
            if r['theist_side']:
                t,nt=r['theist_side'],r['non_side']
                r['dimension_gaps']={k:r['dimensions'][nt][k]-r['dimensions'][t][k] for k in DIMS}
                r['contributions']={k:r['dimension_gaps'][k]*w for k,w in DIMS.items()}
                r['adjustment_gap']=r['adjustments'][nt]-r['adjustments'][t]
                r['rounding_gap']=r['gap']-sum(r['contributions'].values())-r['adjustment_gap']
        else:
            casebook.extend({**c,'debate_id':r['id'],'youtube':r['youtube'],'speaker':r['speakers'][c['side']]} for c in cards)
        rows.append(r)
    assert len(rows)==253
    locked=[r for r in rows if r['cohort']!='unlocked']; religious=[r for r in locked if r['theist_side']]
    assert len(locked)==237 and len(religious)==187
    assert len([r for r in religious if r['number']<=226])==169
    by_n={r['number']:r for r in rows}; m_by_n=defaultdict(list)
    for m in moves: m_by_n[m['number']].append(m)
    result=dict(edition='September 4, 2026',source_commit=SOURCE_COMMIT,seed=SEED,draws=DRAWS,
      counts=dict(published=len(rows),locked=len(locked),cohorts=dict(Counter(r['cohort'] for r in rows)),
          locked_moves=len(moves),public_moves=sum(r['public_moves'] for r in rows),religious=len(religious),
          religious_moves=sum(len(m_by_n[r['number']]) for r in religious),models=dict(Counter(r['model'] for r in rows))),checks=dict(checks))
    # Paper 1: equal-debate contrasts, weighted decomposition, exclusions.
    p1={'gap':stats([r['gap'] for r in religious]), 'means':{s:mean([r[r[s+'_side']] for r in religious]) for s in ['theist','non']},
        'dimensions':{k:stats([r['dimension_gaps'][k] for r in religious]) for k in DIMS},
        'contributions':{k:mean([r['contributions'][k] for r in religious]) for k in DIMS},
        'adjustment':mean([r['adjustment_gap'] for r in religious]),'rounding':mean([r['rounding_gap'] for r in religious])}
    p1['sensitivity']={name:stats([r['gap'] for r in subset]) for name,subset in {
       'original169':[r for r in religious if r['number']<=226],
       'added18':[r for r in religious if r['number']>226],
       'narrow':[r for r in religious if r['narrow']],
       'earlier':[r for r in religious if r['cohort']=='earlier'],
       'later':[r for r in religious if r['cohort']=='later'],
       'theist_pro':[r for r in religious if r['theist_side']=='pro'],
       'theist_con':[r for r in religious if r['theist_side']=='con'],
       'without_four_frequent_skeptics':[r for r in religious if r['speakers'][r['non_side']] not in ['Matt Dillahunty',"Alex O’Connor", "Alex O'Connor",'Christopher Hitchens','Graham Oppy']],
    }.items()}
    p1['speaker_balanced']={}
    for role in ['theist','non']:
        grouped=defaultdict(list)
        for r in religious: grouped[r['speakers'][r[role+'_side']]].append(r['gap'])
        p1['speaker_balanced'][role]=stats([mean(v) for v in grouped.values()])
    p1['evidence_thresholds']={}
    for threshold in [60,70,80]:
        group={s:[] for s in ['theist','non']}
        for r in religious:
            for s in group:
                ms=[m for m in m_by_n[r['number']] if m['side']==r[s+'_side']]
                group[s].append(mean([m['dimensions']['evidenceWarrant']<threshold for m in ms]))
        p1['evidence_thresholds'][str(threshold)]={s:mean(v)*100 for s,v in group.items()}
        p1['evidence_thresholds'][str(threshold)]['paired_gap_pp']=stats(100*(np.array(group['theist'])-group['non']))
    p1['counterexamples']=[dict(number=r['number'],title=r['title'],gap=r['gap']) for r in sorted(religious,key=lambda x:x['gap'])[:10]]
    result['p1']=p1
    # Paper 2: topics are explanatory groupings, not a contest with a proven winner.
    topics=[]
    for topic in TOPICS:
        subset=[r for r in religious if r['topic']==topic]
        t={'topic':topic,**stats([r['gap'] for r in subset]),'contributions':{k:mean([r['contributions'][k] for r in subset]) for k in DIMS}}
        for label,sel in {'theist_pro':[r for r in subset if r['theist_side']=='pro'],
            'earlier':[r for r in subset if r['cohort']=='earlier'],
            'later':[r for r in subset if r['cohort']=='later'],
            'without_four':[r for r in subset if r['speakers'][r['non_side']] not in ['Matt Dillahunty',"Alex O’Connor", "Alex O'Connor",'Christopher Hitchens','Graham Oppy']]}.items():
            t[label]=stats([r['gap'] for r in sel]) if sel else None
        topics.append(t)
    # Bootstrap separate topic distributions; highest in these resamples is NOT
    # a posterior probability of being the highest in a population.
    tb=np.column_stack([boots([r['gap'] for r in religious if r['topic']==t['topic']],100+i) for i,t in enumerate(topics)])
    highest=tb.argmax(axis=1)
    for i,t in enumerate(topics): t['highest_resample_share']=float(mean(highest==i))
    subsets={}
    for label,pred in {'all':lambda m:True,'major':lambda m:m['importance']==3,
        'constructive':lambda m:'constructive' in m['kind'], 'reply':lambda m:'reply' in m['kind']}.items():
        gs={k:[] for k in DIMS}; count=Counter()
        for r in religious:
            sm={s:[m for m in m_by_n[r['number']] if m['side']==r[s+'_side'] and pred(m)] for s in ['theist','non']}
            if not all(sm.values()):continue
            for s in sm:count[s]+=len(sm[s])
            for k in DIMS:gs[k].append(mean([m['dimensions'][k] for m in sm['non']])-mean([m['dimensions'][k] for m in sm['theist']]))
        subsets[label]={'moves':dict(count),'dimensions':{k:stats(v) for k,v in gs.items()}}
    result['p2']={'topics':topics,'move_subsets':subsets}
    # Paper 3: original closed findings retained; new moves lack those fields.
    early_rel=[r for r in religious if r['cohort']=='earlier']
    p3={'eligible_debates':len(early_rel),'eligible_moves':sum(len(m_by_n[r['number']]) for r in early_rel),'components':{},'proxy':{}}
    for metric in ['low_warrant','overclaim','compression','slogan_risk']:
        pooled={s:[] for s in ['theist','non']}; pairs=[]; rates={s:[] for s in pooled}
        for r in early_rel:
            each={s:[m['flags'][metric] for m in m_by_n[r['number']] if m['side']==r[s+'_side']] for s in pooled}
            for s in each: pooled[s]+=each[s]; rates[s].append(mean(each[s]))
            pairs.append((mean(each['theist'])-mean(each['non']))*100)
        p3['components'][metric]={'pooled':{s:dict(count=int(sum(v)),n=len(v),pct=100*mean(v)) for s,v in pooled.items()},
          'equal_debate_pct':{s:100*mean(v) for s,v in rates.items()},'paired_pp':stats(pairs),
          'pooled_ratio':mean(pooled['theist'])/mean(pooled['non'])}
    for cname in ['earlier','later','all']:
        rr=[r for r in religious if cname=='all' or r['cohort']==cname]; dif=[]; levels={s:[] for s in ['theist','non']}
        for r in rr:
            for s in levels:
                ms=[m for m in m_by_n[r['number']] if m['side']==r[s+'_side']]
                levels[s].append(mean([m['dimensions']['evidenceWarrant']<70 and m['dimensions']['precisionClarity']<80 and m['dimensions']['calibrationCharity']<80 for m in ms])*100)
        p3['proxy'][cname]={'paired_pp':stats(np.array(levels['theist'])-levels['non']), 'equal_debate_pct':{s:mean(v) for s,v in levels.items()}}
    p3['checks']={}
    for label,pred,rpred in [
        ('constructive',lambda m:m['kind']=='constructive',lambda r:True),
        ('reply',lambda m:m['kind']=='reply',lambda r:True),
        ('major',lambda m:m['importance']==3,lambda r:True),
        ('theist_con',lambda m:True,lambda r:r['theist_side']=='con'),
        ('without_lennox',lambda m:True,lambda r:r['speakers'][r['theist_side']]!='John Lennox'),
    ]:
        dif=[]
        for r in early_rel:
            if not rpred(r):continue
            sm={s:[m['flags']['slogan_risk'] for m in m_by_n[r['number']] if m['side']==r[s+'_side'] and pred(m)] for s in ['theist','non']}
            if all(sm.values()):dif.append(100*(mean(sm['theist'])-mean(sm['non'])))
        p3['checks'][label]=stats(dif)
    lennox=[m for m in moves if m['cohort']=='earlier' and m['theist'] is True and m['speaker']=='John Lennox']
    p3['lennox']={'moves':len(lennox),'flagged':sum(m['flags']['slogan_risk'] for m in lennox)}
    result['p3']=p3
    # All ranking/role analyses retain one-on-one locked comparisons only.
    appearances=[]
    for r in locked:
        if not r['ranking_eligible']:continue
        for s in ['pro','con']:
            appearances.append(dict(number=r['number'],speaker=r['speakers'][s],side=s,cohort=r['cohort'],score=r[s],opponent=r['speakers']['con' if s=='pro' else 'pro']))
    grouped=defaultdict(list)
    for a in appearances:grouped[a['speaker']].append(a)
    cross=[]
    for speaker,aa in grouped.items():
        if len({a['side'] for a in aa})<2:continue
        pro=[a['score'] for a in aa if a['side']=='pro'];con=[a['score'] for a in aa if a['side']=='con']
        cross.append(dict(speaker=speaker,n=len(aa),pro_n=len(pro),con_n=len(con),pro=mean(pro),con=mean(con),gap=mean(con)-mean(pro),weight=len(pro)*len(con)/len(aa)))
    weights=np.array([r['weight'] for r in cross]);cg=np.array([r['gap'] for r in cross])
    rng=np.random.default_rng(SEED+200); ids=rng.integers(0,len(cross),(DRAWS,len(cross)))
    p4={'raw':stats([r['con_gap'] for r in locked]),'strata':{},'cross_speakers':cross,
        'same_speaker_equal':stats(cg),'same_speaker_weighted':dict(estimate=float(np.average(cg,weights=weights)),ci=interval((cg[ids]*weights[ids]).sum(axis=1)/weights[ids].sum(axis=1)))}
    for key,sel in {'theist_pro':[r for r in religious if r['theist_side']=='pro'], 'theist_con':[r for r in religious if r['theist_side']=='con'],
        'outside':[r for r in locked if not r['theist_side']], 'earlier':[r for r in locked if r['cohort']=='earlier'],'later':[r for r in locked if r['cohort']=='later']}.items():
        p4['strata'][key]=stats([r['con_gap'] for r in sel])
    p4['orientation_balanced']={'mean':(p4['strata']['theist_pro']['mean']+p4['strata']['theist_con']['mean'])/2,
      'ci':interval((boots([r['con_gap'] for r in religious if r['theist_side']=='pro'],210)+boots([r['con_gap'] for r in religious if r['theist_side']=='con'],211))/2)}
    result['p4']=p4
    # Paper 5: count named fallacies only, never infer absence of a defect.
    decisive=[r for r in rows if r['con_gap']!=0]; losses=[]
    for r in decisive:
        lo='pro' if r['con_gap']>0 else 'con'; hi='con' if lo=='pro' else 'pro'
        loss=dict(number=r['number'],cohort=r['cohort'],margin=abs(r['con_gap']),lower=lo,
          lower_no_fallacy=r['public_fallacies'][lo]==0,neither_fallacy=sum(r['public_fallacies'].values())==0,
          lower_no_tag=r['public_anytags'][lo]==0,higher_has_fallacy=r['public_fallacies'][hi]>0)
        if 'dimensions' in r:
            loss['dimension_gaps']={k:r['dimensions'][hi][k]-r['dimensions'][lo][k] for k in DIMS}
            loss['dimensions_behind']=sum(v>1e-9 for v in loss['dimension_gaps'].values())
        losses.append(loss)
    p5={'decisive':len(losses),'ties':len(rows)-len(losses),'losses_without_fallacy':sum(x['lower_no_fallacy'] for x in losses),
        'neither_fallacy':sum(x['neither_fallacy'] for x in losses),'losses_without_any_tag':sum(x['lower_no_tag'] for x in losses),
        'winner_with_fallacy':sum(x['higher_has_fallacy'] for x in losses),'cohorts':{}}
    for c in ['earlier','later','unlocked']:
        ll=[x for x in losses if x['cohort']==c]; p5['cohorts'][c]=dict(n=len(ll),no_fallacy=sum(x['lower_no_fallacy'] for x in ll),neither=sum(x['neither_fallacy'] for x in ll))
    lf=[x for x in losses if x['lower_no_fallacy'] and 'dimension_gaps' in x]
    p5['untagged_locked']={'n':len(lf),'behind_distribution':dict(Counter(x['dimensions_behind'] for x in lf)),
       'dimension_gaps':{k:stats([x['dimension_gaps'][k] for x in lf]) for k in DIMS},
       'five_or_six':sum(x['dimensions_behind']>=5 for x in lf)}
    p5['tag_inventory']=dict(Counter(t for c in casebook for t in c['fallacies']))
    p5['tagged_moves']=sum(bool(c['fallacies']) for c in casebook)
    p5['large_untagged_losses']=sorted([x for x in losses if x['lower_no_fallacy']],key=lambda x:-x['margin'])[:15]
    result['p5']=p5
    # Paper 6: compare process families; these were not randomized generations.
    p6={'cohorts':{},'bridge':[]}
    for c in ['earlier','later']:
        rr=[r for r in locked if r['cohort']==c]; mm=[m for m in moves if m['cohort']==c]
        matrix=np.array([[m['dimensions'][k] for k in DIMS] for m in mm]); corr=np.corrcoef(matrix,rowvar=False)
        p6['cohorts'][c]={'debates':len(rr),'moves':len(mm),'midpoints':stats([(r['pro']+r['con'])/2 for r in rr]),
          'absolute_margin':stats([abs(r['con_gap']) for r in rr]),
          'dimensions':{k:mean([(r['dimensions']['pro'][k]+r['dimensions']['con'][k])/2 for r in rr]) for k in DIMS},
          'corr':corr.tolist(),'first_component_share':float(np.linalg.eigvalsh(corr)[-1]/6),
          'tag_pct':100*mean([bool(m['fallacies'] or m['biases']) for m in mm]),
          'fallacy_pct':100*mean([bool(m['fallacies']) for m in mm]),
          'tag_pct_equal_debate':mean([100*sum(r['public_anytags'].values())/r['public_moves'] for r in rr])}
    for speaker,aa in grouped.items():
        e=[a['score'] for a in aa if a['cohort']=='earlier'];l=[a['score'] for a in aa if a['cohort']=='later']
        if e and l:p6['bridge'].append(dict(speaker=speaker,earlier_n=len(e),later_n=len(l),earlier=mean(e),later=mean(l),gap=mean(l)-mean(e)))
    p6['bridge_summary']=stats([b['gap'] for b in p6['bridge']])
    es=[(r['pro']+r['con'])/2 for r in locked if r['cohort']=='earlier'];ls=[(r['pro']+r['con'])/2 for r in locked if r['cohort']=='later']
    p6['level_difference']={'mean':mean(ls)-mean(es),'ci':interval(boots(ls,301)-boots(es,302))}
    p6['sequence']=[dict(number=r['number'],cohort=r['cohort'],midpoint=(r['pro']+r['con'])/2,margin=abs(r['con_gap'])) for r in locked]
    result['p6']=p6
    # Paper 7: finite leaderboard, observed-repeatability and two rank models.
    eligible={s:aa for s,aa in grouped.items() if len(aa)>=3}
    names=sorted(eligible,key=lambda s:(-mean([a['score'] for a in eligible[s]]),-len(eligible[s]),s))
    gs=[np.array([a['score'] for a in eligible[s]],float) for s in names];N=sum(len(g) for g in gs);G=len(gs)
    grand=mean(np.concatenate(gs)); between=sum(len(g)*(mean(g)-grand)**2 for g in gs)/(G-1)
    within=sum(sum((g-mean(g))**2) for g in gs)/(N-G)
    k0=(N-sum(len(g)**2 for g in gs)/N)/(G-1);bv=max(0,(between-within)/k0)
    rng=np.random.default_rng(SEED+400)
    empirical=np.column_stack([rng.choice(g,(DRAWS,len(g)),replace=True).mean(axis=1) for g in gs])
    # Average ranks avoid alphabetical tie-break artefacts in uncertainty.
    eranks=np.stack([rankdata(-r,method='average') for r in empirical])
    postvar=np.array([1/(1/bv+len(g)/within) for g in gs])
    postmean=np.array([v*(grand/bv+len(g)*mean(g)/within) for v,g in zip(postvar,gs)])
    latent=rng.normal(postmean,np.sqrt(postvar),(DRAWS,G));lranks=np.stack([rankdata(-r) for r in latent])
    ranking=[]
    for i,(s,g) in enumerate(zip(names,gs)):
        loo=[]
        for j in range(len(g)):
            av=np.array([mean(h) for h in gs]);av[i]=mean(np.delete(g,j));loo.append(float(rankdata(-av,method='average')[i]))
        ranking.append(dict(speaker=s,rank=i+1,n=len(g),mean=mean(g),sd=float(g.std(ddof=1)),
          earlier_n=sum(a['cohort']=='earlier' for a in eligible[s]),later_n=sum(a['cohort']=='later' for a in eligible[s]),
          empirical_mean_ci=interval(empirical[:,i]),empirical_rank_ci=interval(eranks[:,i]),
          model_mean=float(postmean[i]),model_rank_ci=interval(lranks[:,i]),model_top10=float(mean(lranks[:,i]<=10)),
          leave_one_out=[min(loo),max(loo)]))
    split_names=[s for s,aa in eligible.items() if len(aa)>=6];splitcorr=[]
    for _ in range(3000):
        a=[];b=[]
        for s in split_names:
            g=rng.permutation([x['score'] for x in eligible[s]]);cut=len(g)//2;a.append(mean(g[:cut]));b.append(mean(g[cut:]))
        splitcorr.append(float(spearmanr(a,b).statistic))
    chrono_a=[];chrono_b=[]
    for s in split_names:
        aa=sorted(eligible[s],key=lambda a:a['number']);cut=len(aa)//2;chrono_a.append(mean([a['score'] for a in aa[:cut]]));chrono_b.append(mean([a['score'] for a in aa[cut:]]))
    # Shared positive random weights retain the fixed ranked field and keep
    # opponents paired. This Bayesian-bootstrap-style sensitivity is different
    # from resampling independent appearances and introduces no new performances.
    rn=[r['number'] for r in locked if r['ranking_eligible']]; index={n:i for i,n in enumerate(rn)}
    counts=np.zeros((len(rn),G));totals=counts.copy()
    for j,s in enumerate(names):
        for a in eligible[s]:counts[index[a['number']],j]+=1;totals[index[a['number']],j]+=a['score']
    weights=rng.exponential(1,size=(DRAWS,len(rn)))
    dn=weights@counts;dt=weights@totals
    cr=np.stack([rankdata(-r,method='average') for r in (dt/dn)])
    for j,r in enumerate(ranking):r['paired_resample_rank_ci']=interval(cr[:,j])
    # Generation-centering is a sensitivity exercise, not a calibrated ranking.
    cm={c:mean([a['score'] for a in appearances if a['cohort']==c]) for c in ['earlier','later']}
    centered=[mean([a['score']-cm[a['cohort']] for a in eligible[s]]) for s in names]
    newrank=rankdata(-np.array(centered),method='average')
    for i,r in enumerate(ranking):r['generation_centered_rank']=float(newrank[i])
    p7=dict(appearances=len(appearances),eligible_appearances=N,all_speakers=len(grouped),ranked_speakers=G,
      appearance_counts=dict(Counter(len(aa) for aa in grouped.values())),ranking=ranking,
      repeatability=dict(between_variance=bv,within_variance=within,single=bv/(bv+within),
         means={str(k):bv/(bv+within/k) for k in [3,5,10]},within_sd=math.sqrt(within)),
      split_half=dict(n=len(split_names),median=float(np.median(splitcorr)),interval=interval(splitcorr),draws=3000,
        sequence_split_spearman=float(spearmanr(chrono_a,chrono_b).statistic)),
      median_adjacent_gap=float(np.median(np.diff([-mean(g) for g in gs]))),
      median_empirical_rank_width=float(np.median([r['empirical_rank_ci'][1]-r['empirical_rank_ci'][0] for r in ranking])),
      median_model_rank_width=float(np.median([r['model_rank_ci'][1]-r['model_rank_ci'][0] for r in ranking])),
      median_paired_rank_width=float(np.median([r['paired_resample_rank_ci'][1]-r['paired_resample_rank_ci'][0] for r in ranking])),
      paired_weight_draws=DRAWS,
      zero_variation_speakers=[r['speaker'] for r in ranking if r['sd']==0],
      centered_rank_spearman=float(spearmanr(range(1,G+1),newrank).statistic),
      top4_appearance_share=sum(sorted([len(aa) for aa in grouped.values()],reverse=True)[:4])/len(appearances))
    result['p7']=p7
    dump('results.json',result);dump('debates.json',rows);dump('moves.json',moves);dump('casebook.json',casebook);dump('losses.json',losses)
    csvout('classification.csv',[{k:r.get(k,'') for k in ['number','id','title','motion','cohort','theist_side','topic','narrow','reason','gap']} for r in rows])
    csvout('ranking.csv',ranking)
    hashes=[{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(hash_paths)]
    dump('source-manifest.json',dict(edition='2026-09-04',source_commit=SOURCE_COMMIT,files=hashes,checks=dict(checks),
       exclusions='16 multi-speaker/non-comparable assessments omitted from locked dimension, position and ranking comparisons.'))
    print(json.dumps({k:v for k,v in result.items() if k not in ['p2','p7']},indent=2)[:4000])
    print('P7:',json.dumps({k:v for k,v in p7.items() if k not in ['ranking','appearance_counts']},indent=2))

if __name__=='__main__': main()
