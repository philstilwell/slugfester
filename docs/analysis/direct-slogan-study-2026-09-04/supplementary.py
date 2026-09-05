"""Small interpretive checks; no new model readings and no changed classifications."""
import json
from collections import Counter
from pathlib import Path
from analyze_light import summarize

HERE = Path(__file__).resolve().parent
rows = json.loads((HERE / 'light-debates.json').read_text())
incidents = json.loads((HERE / 'light-incidents.json').read_text())
assert len(rows) == 187
out = {'note': 'Inclusive checks add uncertain cases to confirmed cases; uncertain-only fields are not inclusive totals.'}
inclusive = []
for row in rows:
    r = dict(row)
    for side in ['theist', 'non_theist']:
        r[side + '_inclusive_unsupported'] = r[side + '_unsupported'] + r[side + '_borderline_unsupported']
        r[side + '_inclusive_protected'] = r[side + '_protected_slogan'] + r[side + '_borderline_protected']
    inclusive.append(r)
out['inclusive'] = {k: summarize(inclusive, k) for k in ['inclusive_unsupported', 'inclusive_protected']}
out['without_two_largest_theist_debates'] = {
    'removed': [5, 142], 'selection': 'Exploratory: chosen after seeing the two largest theist protected-slogan counts.',
    'statistics': {k: summarize([r for r in rows if r['number'] not in [5, 142]], k) for k in ['unsupported', 'protected_slogan']}}
out['lennox'] = {k: summarize([r for r in rows if r['theist_speaker'] == 'John Lennox'], k) for k in ['unsupported', 'protected_slogan']}
out['emotion'] = {}
for side in ['theist', 'non_theist']:
    selected = [i for i in incidents if i['position'] == side and i['disposition'] == 'eligible' and i['flags']['unsupported']]
    count = sum(any(d not in ['none', 'unclear'] for d in i['emotionalDevices']) for i in selected)
    out['emotion'][side] = {'with_emotion': count, 'all_unsupported': len(selected), 'percent': 100 * count / len(selected),
        'devices': dict(Counter(d for i in selected for d in i['emotionalDevices'] if d not in ['none', 'unclear']))}
uncertain = [i for i in incidents if i['disposition'] in ['uncertain-speaker', 'mixed-or-uncertain-event']]
out['unassigned_candidates'] = {'total': len(uncertain), 'unsupported': sum(i['flags']['unsupported'] for i in uncertain),
    'protected_slogan': sum(i['flags']['protected_slogan'] for i in uncertain),
    'note': 'Excluded from side counts. These are detected candidates, not an upper bound on all missed speech.'}
(HERE / 'supplementary-results.json').write_text(json.dumps(out, indent=2) + '\n')
print(json.dumps(out, indent=2))
