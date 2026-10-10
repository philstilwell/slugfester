"""Independently check paper seven's stability evidence without changing results."""
import json
from collections import defaultdict
from pathlib import Path
import numpy as np

HERE=Path(__file__).resolve().parent
R=json.loads((HERE/'results.json').read_text())
P=R['p7']
records=json.loads((HERE/'debates.json').read_text())
grouped=defaultdict(list)
for debate in records:
    if debate['cohort']=='unlocked' or not debate['ranking_eligible']:continue
    for side in ['pro','con']:
        grouped[debate['speakers'][side]].append((debate['number'],debate[side],debate['cohort']))
eligible={name:rows for name,rows in grouped.items() if len(rows)>=3}
names=sorted(eligible,key=lambda name:(-np.mean([r[1] for r in eligible[name]]),-len(eligible[name]),name))
scores=[np.array([r[1] for r in eligible[name]],float) for name in names]

def ranks(values):
    """Average tied positions; independent of SciPy's implementation."""
    _,inverse,counts=np.unique(values,return_inverse=True,return_counts=True)
    return (np.cumsum(counts)-(counts-1)/2)[inverse]

def correlation(a,b):return float(np.corrcoef(ranks(a),ranks(b))[0,1])
def close(actual,expected):assert np.allclose(actual,expected,rtol=0,atol=1e-12),(actual,expected)

N=sum(map(len,scores));G=len(scores);grand=np.mean(np.concatenate(scores))
within=sum(np.sum((g-g.mean())**2) for g in scores)/(N-G)
between_ms=sum(len(g)*(g.mean()-grand)**2 for g in scores)/(G-1)
effective_n=(N-sum(len(g)**2 for g in scores)/N)/(G-1)
between=max(0,(between_ms-within)/effective_n)
close(within,P['repeatability']['within_variance'])
close(between,P['repeatability']['between_variance'])
for n in [1,3,10]:
    close(between/(between+within/n),P['repeatability']['single'] if n==1 else P['repeatability']['means'][str(n)])
assert (N,G)==(416,57)
# Advance through the publication's deterministic random stream without reusing
# its analysis function; then reproduce its 3,000 random splits exactly.
rng=np.random.default_rng(R['seed']+400)
for g in scores:rng.choice(g,(R['draws'],len(g)),replace=True)
variance=np.array([1/(1/between+len(g)/within) for g in scores])
means=np.array([v*(grand/between+len(g)*g.mean()/within) for v,g in zip(variance,scores)])
rng.normal(means,np.sqrt(variance),(R['draws'],G))
split_names=[name for name,rows in eligible.items() if len(rows)>=6]
assert len(split_names)==P['split_half']['n']==31
correlations=[]
for _ in range(3000):
    halves=[[],[]]
    for name in split_names:
        values=rng.permutation([r[1] for r in eligible[name]]);cut=len(values)//2
        halves[0].append(values[:cut].mean());halves[1].append(values[cut:].mean())
    correlations.append(correlation(*halves))
close(np.median(correlations),P['split_half']['median'])
close(np.quantile(correlations,[.025,.975]),P['split_half']['interval'])
halves=[[],[]]
for name in split_names:
    values=[r[1] for r in sorted(eligible[name])];cut=len(values)//2
    halves[0].append(np.mean(values[:cut]));halves[1].append(np.mean(values[cut:]))
close(correlation(*halves),P['split_half']['sequence_split_spearman'])
centers={cohort:np.mean([r[1] for rows in grouped.values() for r in rows if r[2]==cohort]) for cohort in ['earlier','later']}
centered=[np.mean([r[1]-centers[r[2]] for r in eligible[name]]) for name in names]
close(correlation(np.arange(1,G+1),ranks(-np.array(centered))),P['centered_rank_spearman'])
print('Verified unchanged stability evidence: 31-person random and ordered splits, 57-person process sensitivity, and modeled repeatability.')
