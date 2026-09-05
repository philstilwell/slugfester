#!/usr/bin/env python3
"""Create and execute a compact reader-facing numerical audit companion."""
import sys
from pathlib import Path
import nbformat
from nbclient import NotebookClient
from jupyter_client import KernelManager

HERE=Path(__file__).resolve().parent
md=nbformat.v4.new_markdown_cell;code=nbformat.v4.new_code_cell
nb=nbformat.v4.new_notebook(cells=[
md('''# September 4, 2026 corpus-paper audit

## tl;dr
The frozen archive contains 253 assessments, 237 comparable locked records,
187 religious-versus-skeptical comparisons, and 5,282 verified scored moves.
The mean substantive-position gap is 6.3422 points; the raw CON gap is 4.6962.
The 61.7% pooled untagged-loss majority reverses in the later process.
This notebook independently checks the exported counts and key arithmetic.
It does not re-judge transcripts or validate the AI's underlying interpretations.

## Context & Methods
Source revision: `76d006b37`. Reproduce source extraction with `analyze.py`.
The primary deliverables are seven PDFs; this is their inspectable audit companion.

### Key Assumptions
- Frozen, selected archive; no random-population claim.
- One observation per debate for paired gaps.
- Position classifications are explicit and contestable.
- Two scoring-process families must not be treated as a uniform tag detector.
- Resampling uncertainty does not include all source or judging errors.
'''),
md('## Data\n### 1. Load the frozen exports'),
code('''from pathlib import Path
import json, math, statistics
from collections import Counter
analysis_dir = Path.cwd()
debates = json.loads((analysis_dir / 'debates.json').read_text())
moves = json.loads((analysis_dir / 'moves.json').read_text())
results = json.loads((analysis_dir / 'results.json').read_text())
losses = json.loads((analysis_dir / 'losses.json').read_text())
print(f"{len(debates)} published assessments; {len(moves)} comparable scored moves")'''),
md('### 2. Validate identifiers, coverage, and join counts'),
code('''assert len({row['id'] for row in debates}) == len(debates) == 253
assert len({row['youtube'] for row in debates}) == 253
assert len({(move['number'], move['move_id']) for move in moves}) == len(moves) == 5282
comparable = [row for row in debates if row['cohort'] != 'unlocked']
religious = [row for row in comparable if row['theist_side']]
assert len(comparable) == 237 and len(religious) == 187
assert sum(row['public_moves'] for row in debates) == 5492
print('Process counts:', dict(Counter(row['cohort'] for row in debates)))
print('Scoring checks:', results['checks'])'''),
md('## Results\n### 3. Recompute the main means directly from exported debate rows'),
code('''position_sum = sum(row[row['non_side']] - row[row['theist_side']] for row in religious)
role_sum = sum(row['con'] - row['pro'] for row in comparable)
assert position_sum == 1186 and role_sum == 1113
assert math.isclose(position_sum / 187, results['p1']['gap']['mean'])
assert math.isclose(role_sum / 237, results['p4']['raw']['mean'])
print(f"Position gap: {position_sum} / 187 = {position_sum / 187:.6f} points")
print(f"Role gap: {role_sum} / 237 = {role_sum / 237:.6f} points")
print('Topic counts:', {t['topic']: t['n'] for t in results['p2']['topics']})
assert sum(t['n'] for t in results['p2']['topics']) == 187'''),
md('### 4. Reconcile the weighted score gap'),
code('''contributions = results['p1']['contributions']
reconstructed = sum(contributions.values()) + results['p1']['rounding'] + results['p1']['adjustment']
assert math.isclose(reconstructed, position_sum / 187)
for dimension, value in contributions.items():
    print(f"{dimension}: {value:.4f} overall points")
print(f"With rounding and adjustment: {reconstructed:.6f}")'''),
md('### 5. Test the pooled fallacy claim against each process family'),
code('''assert len(losses) == 243
assert sum(row['lower_no_fallacy'] for row in losses) == 150
for family in ['earlier', 'later', 'unlocked']:
    selected = [row for row in losses if row['cohort'] == family]
    untagged = sum(row['lower_no_fallacy'] for row in selected)
    print(f"{family}: {untagged}/{len(selected)} = {100*untagged/len(selected):.1f}%")
print(f"Combined: 150/243 = {100*150/243:.1f}%")'''),
md('### 6. Check rank-field size and the small neighboring gaps'),
code('''ranking = results['p7']['ranking']
assert len(ranking) == 50
assert sum(row['n'] for row in ranking) == 334
adjacent = [a['mean'] - b['mean'] for a, b in zip(ranking, ranking[1:])]
print(f"50 ranked speakers; median neighboring gap {statistics.median(adjacent):.4f}")
print('Median empirical rank width:', results['p7']['median_empirical_rank_width'])
print('Median model rank width:', results['p7']['median_model_rank_width'])'''),
md('''## Takeaways
- The key totals and headline gaps reconcile.
- The position gap is a performance-score contrast, not a probability that a worldview is true.
- The original slogan-risk rule covers 146 debates; the separate final-score check covers 187.
- The archive-wide untagged-loss majority does not describe the later process.
- Rank averages are informative, but neighboring positions are far more precise-looking than the evidence warrants.

For full resampling, the 51-speaker scale bridge, and rank-model calculations, run `analyze.py`.
For PDF checks and rendered-page contacts, run `verify_papers.py`.
The seven manuscripts put the limitations next to the relevant findings.
''')])
nb.metadata.kernelspec={'display_name':'Python 3','language':'python','name':'python3'}
nbformat.validate(nb)
manager=KernelManager(kernel_name='python3')
manager.kernel_spec.argv=[sys.executable,'-m','ipykernel_launcher','-f','{connection_file}']
client=NotebookClient(nb,timeout=120,kernel_name='python3',resources={'metadata':{'path':str(HERE)}},km=manager)
client.execute()
nbformat.write(nb,HERE/'audit.ipynb')
print('Audit notebook executed successfully top-to-bottom.')
