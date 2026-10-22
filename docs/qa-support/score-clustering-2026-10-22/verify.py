"""Independent arithmetic and randomization check using Python's standard library."""
import collections
import json
import math
from pathlib import Path
import random
import statistics

root = Path(__file__).resolve().parents[3]
rows = json.loads((root / 'docs/analysis/corpus-papers-2026-10-09/debates.json').read_text())
rows = [r for r in rows if r['ranking_eligible'] and r['cohort'] != 'unlocked']
counts = collections.Counter(name for r in rows for name in r['speakers'].values())
names = sorted(name for name, count in counts.items() if count >= 6)
assert len(names) == 31 and sum(counts[name] for name in names) == 314
rng = random.Random(20261023)

def spread(swapped):
    by_name = {name: [] for name in names}
    for row, swap in zip(rows, swapped):
        for side, other in [('pro', 'con'), ('con', 'pro')]:
            name = row['speakers'][side]
            if name in by_name:
                by_name[name].append(row[other if swap else side])
    # Independent implementation: weighted sample variances, rather than the
    # JavaScript code's explicit deviations from each participant mean.
    numerator = sum((len(scores)-1)*statistics.variance(scores) for scores in by_name.values())
    return math.sqrt(numerator / sum(len(scores)-1 for scores in by_name.values()))

saved = json.loads((Path(__file__).parent / 'results.json').read_text())
observed = spread([False]*len(rows))
assert math.isclose(observed, saved['observedPooledSd'], abs_tol=1e-12)
assert math.isclose(saved['zeroHit95UpperBound'], 1 - 0.05**(1/100000), abs_tol=1e-15)
assert saved['plusOnePermutationP'] == 1/100001
extreme = sum(spread([rng.random() < 0.5 for _ in rows]) <= observed + 1e-10 for _ in range(10000))
assert extreme == 0, extreme
print(f'Independent check passed: observed pooled SD {observed:.12f}; {extreme}/10,000 random assignments as clustered (separate random generator and seed).')
